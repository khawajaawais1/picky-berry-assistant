# Feature X.Y Deep Dive – <name>

> Copy to `docs/features/<id>-<slug>.md` (e.g. `6.3-gps-visit-detection.md`), fill every
> section, link it in [README.md](README.md), and get one review from each co-owner.
> Keep it self-contained: someone should be able to build the feature from this file +
> the architecture doc. Same structure as the 6.2 deep dive.

**Lead:** … · **Co-owners:** … · **Sprint(s):** … · **Status:** 📝

## 1. What we are building
One paragraph a picker would understand. Why it matters and what plugs into it.

**User stories**
1. As a …, I …

**Acceptance criteria (definition of done)**

| # | Criterion | How we check |
|---|-----------|--------------|
| X1 | … | test / tool |

**Not in this feature:** …

## 2. Dependencies
Everything that must exist first. Each one has an owner and a **stub** so nobody waits.

| ID | Dependency | Owner | Needed by | Stub until ready | Status |
|----|------------|-------|-----------|------------------|--------|

## 3. Architecture
Which modules, which jobs, what runs on the phone vs. the server. A small diagram helps.

## 4. API endpoints

| Method & path | Auth | Returns | Cache |
|---------------|------|---------|-------|

Request/response examples and the Pydantic models.

## 5. Data model
New or changed tables (DDL), indexes, retention. Who writes, who reads.

## 6. Logic / algorithm
Formulas, state machines, thresholds — all constants in one config file with unit tests.

## 7. App screens and states
Components, data hooks, and every state (loading, empty, offline, error, permission denied).

## 8. Privacy and security
What personal data is touched, lawful basis, retention, who can read what.

## 9. Build plan
Week-by-week tasks, each with an owner and the dependency it delivers.

## 10. Testing
Unit, API, E2E, field tests; a shared golden fixture if formulas are involved.

## 11. Risks and open questions

| Risk | Impact | Mitigation |
|------|--------|------------|

Open questions — owner.
