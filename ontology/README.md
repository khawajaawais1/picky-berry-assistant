# ontology/ — Berry ontology and rules (owner: Asmer) — features 6.2, 6.7, F3

The shared vocabulary (species, zones, visits, reports, ripeness) and the home of the alert
rules. Postgres stays the system of record; each reasoning run builds a small in-memory rdflib
graph. Design: architecture doc §8.

**Status (2026-11-21): v1 vocabulary exists and the backend reads it.** The graph files, the first
rule and its tests are committed, and `backend/app/modules/reasoning/` loads a zone snapshot into
the graph, runs the rule and serves the result at `GET /api/v1/alerts`. What is still missing is
the data: no job builds a snapshot from Postgres and no `alerts` table stores the result, so an app
with no alert source answers 503. Visit and Report are declared classes with no properties until
6.3/6.4's tables land.

## Layout
```
ontology/
  bpa.ttl            # OWL classes + properties (bpa:Species, bpa:Zone, bpa:SpeciesAssessment,
                     #   bpa:RipenessStage, bpa:HabitatClass, bpa:Visit, bpa:Report …)
  species.ttl        # per species: code, FI/EN names, latin, IRI, habitat suitability per class,
                     #   fertility multipliers 1–6, min_suitability
  rules/
    ripe_nearby.rq   # one SPARQL rule per file: id, version, sentence template
  context.jsonld     # JSON-LD @context used by the API (F3 Linked Data)
  tests/             # fixture graph → expected alerts (pytest + rdflib)
    fixtures/zones.ttl
    test_ripe_nearby.py
```

## Running the tests
```bash
cd ../backend
python3.11 -m venv .venv && .venv/bin/pip install -e ".[dev]"
.venv/bin/pytest            # backend/pyproject.toml collects tests/ and ../ontology/tests
```

## Reading it from the backend
`backend/app/modules/reasoning/` is the only reader, and the request path never runs a rule:

* `graph.py` — `load_ontology()` parses `bpa.ttl` + `species.ttl` once; `add_zone_rows()` maps one
  run's zone × species rows (`zones` ⋈ `zone_scores_current` ⋈ `zone_species`) to
  `bpa:Zone`/`bpa:SpeciesAssessment` triples, and refuses a species or ripeness the graph cannot
  name before anything is written.
* `service.py` — `alerts_from_rows()` copies the graph, runs the `.rq` and returns alerts whose
  sentence is the rule's own header template, with the rule's id and version attached.
* `router.py` — `GET /api/v1/alerts` serves what `app.state.alerts_source` holds. That is an
  in-memory list today and the `alerts` table once the job exists; no request runs SPARQL.

`backend/tests/test_ontology_matches_config.py` is the drift guard: it compares every species,
habitat value, fertility multiplier, `min_suitability` and `verified` flag against the two YAMLs.

## Adding a rule
One `.rq` per rule, with the header block `ripe_nearby.rq` uses (id, version, feature, owner,
sentence template, inputs, output). Add the zone rows it needs to `tests/fixtures/zones.ttl` and
a test that covers both what it must return and the row it must **not** fire on — for this rule,
a ripe species in a zone under its habitat minimum.

## Where the facts come from
Everything in `species.ttl` is copied from the committed configs, not sourced afresh:

* `../data/config/species.yaml` — species codes, Latin and FI/EN names, placeholder IRIs (D6).
* `../data/config/zone_species_rules.yaml` — habitat suitability, fertility multipliers,
  `min_suitability: 0.30`, and `verified: false`, which the graph carries as `bpa:verified false`.

Changing a value in either YAML means changing `species.ttl` in the same PR; the ontology does
not read the YAML at runtime.

## Open
* **Phenology thresholds** (`floweringGDD`, `ripeGDD`) have no sourced values (CONTEXT.md §9),
  so v1 declares no such property. Ripeness windows stay in `ml/berry_ml/zones.py` (`RIPENING`)
  until they are signed off; copying them here now would create a second source of truth.
* **Wikidata IRIs and per-species sources** are not in `species.yaml` yet, so deliberately absent.
* **The job and the table.** Nothing builds a snapshot from Postgres yet, so the rule has only
  ever run on fixtures, and `alerts` / `alert_rules_log` are still names in the design.
* **`Visit` / `Report` properties** wait for their tables.
* **Species IRIs** are the YAML's `picky.example` placeholders; they change only with D6.

## Shared with other folders
* Species codes + names + IRIs (D6) — stub in `../data/config/species.yaml`; agree with Hassan in week 1.
* Phenology thresholds (D12) feed ripeness in 6.2 — mark `verified=false` until sourced.
* Habitat suitability rules (D11) — review `../data/config/zone_species_rules.yaml` with Awais.
