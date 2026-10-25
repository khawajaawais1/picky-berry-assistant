# ADR-064 — A yield score is the zone's forecast; a picker's 1–5 is a harvest rating

- **Status:** Accepted (2026-10-25)
- **Deciders:** The project owner, on 2026-10-25, asking for the two score words to be resolved by
  best practice and the project's own vocabulary.
- **Related:** [ADR-009](ADR-009-scoring-model.md) (the scoring model), the team's
  [MVP plan](../plans/team-mvp-plan.md) §4, [CONTEXT.md](../../../CONTEXT.md) (Scoring and the
  glossary), and `src/services/i18n/locales/{en,fi}.ts`.

## Context

Two different readings shared one word:

- the plan and CONTEXT call a **zone's 0–100 forecast** a _yield score_ — “how good a zone is for a
  species right now”;
- the app printed a **picker's 1–5 answer** on a visit as “Yield 4 / 5” in the zone's reports, the
  offline queue and the zone-detail report line.

The same word for a model output and a subjective answer makes a score and a rating look
comparable. They are not: one is computed for a zone from evidence, the other is one person's
finding on one visit.

## Decision

1. **Yield score** is reserved for the **zone's 0–100 forecast**. The map, zone card, zone details
   and alert score keep the word, and the plan's meaning is the project's.
2. A picker's **1–5 plentifulness answer** is a **harvest rating** (Finnish: _arvosana_). The app
   prints “Rating 4 / 5” (fi “Arvosana 4 / 5”) in the zone's reports, the offline queue and the
   zone-detail report line.
3. No formula, field or API changes: the report still stores `yieldRating` (the service contract's
   name), and the UI word changes only.

## Alternatives considered

- **Keep both as “yield”.** Rejected: the ambiguity is the defect; a zone's forecast and a visit's
  rating cannot be compared or translated consistently while they share a word.
- **Call the zone figure a “forecast score”.** Rejected: the plan and CONTEXT already own “yield
  score” for exactly this, and renaming it would separate the app from the team's vocabulary.
- **Call the 1–5 simply “rating”.** Rejected as the primary term: the app also rates confidence and
  ripeness; “harvest rating” names what is being rated.

## Consequences

- The three report/queue/detail strings change in both languages, and their tests change with them.
- CONTEXT gains a **Harvest rating** entry so the two readings stay separate.
- The stored field and the API contract keep `yieldRating`; only what the picker sees changes.
