# The first backend slice: host, region, basis, invite

**To:** the project owner · **From:** the mobile team · **Deadline 2026-10-17** — partial answers fine:
write under each `>`, or answer the same twelve in
[to-questionnaires-response-sheet.md](to-questionnaires-response-sheet.md) with the other three. Your
answers are recorded in
[ADR-033](docs/adr/ADR-033-the-first-backend-slices-deployment-decisions.md), whose slots carry the
context behind each question; they update questions 3, 5, 15, 16 and 17 of [PROJECT.md](PROJECT.md) and
unblock the deployment. Host candidates are compared in
[docs/host-candidates.md](docs/host-candidates.md). Asked elsewhere instead: who may be invited, and
what a viewer is shown (community-map §2.3–§2.4).

## 1. Where it runs, and who operates it — question 3

**1.1 Which host — and is the managed-Postgres-behind-a-small-TypeScript-API shape adopted?**
>
**1.2 Which repository does the server code live in, and who writes it?**
>
**1.3 Who operates it day to day, and how are its secrets held and rotated?**
>

## 2. Region, processors and DPAs — question 16

**2.1 Which EU region — and does anything leave it?**
>
**2.2 Which processors does this add, and who signs their data-processing agreements?**
>

## 3. Lawful basis, per field — question 15

**3.1 Which basis, which purpose, and in whose words is it explained — per field?**
>
**3.2 Is redeeming an invite the recipient's affirmative action?**
>
**3.3 What may the connection between two accounts be used for — and never?**
>
**3.4 Deletion: rows naming an account deleted at the provider, sooner than the 12-month job (ADR-014)?**
>

## 4. The invite's mechanics — question 26

**4.1 One link per share, or per-person invites with per-person revocation?**
>
**4.2 How long may an invite link be used?**
>
**4.3 What may the sharer see about their recipients?**
>

## Anything else?

>
