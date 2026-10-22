# ontology/ — Berry ontology and rules (owner: Asmer) — features 6.2, 6.7, F3

The shared vocabulary (species, zones, visits, reports, ripeness) and the home of the alert
rules. Postgres stays the system of record; each reasoning run builds a small in-memory rdflib
graph. Design: architecture doc §8.

## Suggested layout
```
ontology/
  bpa.ttl            # OWL classes + properties (bpa:Species, bpa:Zone, bpa:Visit, bpa:Report, bpa:RipenessStage …)
  species.ttl        # facts per species: season window, floweringGDD, ripeGDD, habitat, Wikidata IRI, sources
  rules/
    ripe_nearby.rq   # one SPARQL rule per file: id, version, sentence template
  context.jsonld     # JSON-LD @context used by the API (F3 Linked Data)
  tests/             # fixture graphs → expected alerts
```

## Shared with other folders
* Species codes + names + IRIs (D6) — stub in `../data/config/species.yaml`; agree with Hassan in week 1.
* Phenology thresholds (D12) feed ripeness in 6.2 — mark `verified=false` until sourced.
* Habitat suitability rules (D11) — review `../data/config/zone_species_rules.yaml` with Awais.

By 3 Nov: ontology v1 (species, zone, visit, report) + 3 rules as `.rq` files.
