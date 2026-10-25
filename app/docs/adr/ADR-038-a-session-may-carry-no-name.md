# ADR-038 — A session may carry no name, and the app says so rather than inventing one

- **Status:** Accepted (2026-10-11)
- **Deciders:** the project owner (the sign-in screen's reading was chosen on 2026-10-11, see
  [ADR-034](ADR-034-signing-in-the-frame-the-journey-and-the-session.md)); the repository writes the
  rule.
- **Supersedes:** nothing. **Amends:** [ADR-029](ADR-029-the-session-carries-the-accounts-name.md)'s
  field, without changing what that ADR decided — the session still carries the account's name.

## Context

[ADR-029](ADR-029-the-session-carries-the-accounts-name.md) made the session carry the name the
account is shown under, because screen 03 collects one and the settings screen has to be able to say
whose settings these are. It sized the field for exactly that journey: a **sign-up**, where the name is
something a screen asked for and the flow therefore always has one.

The sign-in screen changed the shape of the field's own problem. A returning user types an identifier
and receives a code ([ADR-034](ADR-034-signing-in-the-frame-the-journey-and-the-session.md), the
reading chosen for it); **no screen asks them for their name**, because the account already has one —
it is the account service's fact, not something the app collects again. And the account service does
not exist yet: the port's stand-in issues a session from the identifier it was given
([ADR-028](ADR-028-an-authentication-seam-behind-a-port.md)), with no profile and no name to read.

So the field had three candidate meanings and no rule: *a name the flow collected* (the sign-up),
*no name, because a returning account's name is the service's answer and the service is absent* (the
sign-in), and *a caller that meant to pass a name and passed nothing* (a bug). The third must never be
recorded as a session, and the second must not be quietly made into either of the other two.

## Decision

**A session's name is `string | null`. `null` means “this account has a name, and the app does not know
it”; it is not a name, and no screen may present it as one.**

The rule has four parts, and each is enforced where it can be:

1. **The credential tells the two apart structurally, not by inspection.** `Credential.displayName` is
   *optional*: a sign-up passes what screen 03 collected, a sign-in **omits the field** — it did not
   collect one and does not pretend to have done so. The port reads absence as `null` and a
   present-but-blank value as a programming error (`RangeError`, the same treatment an identifier that
   names no account gets): a caller that passed a name and passed nothing is a bug, not an account the
   service cannot name.
2. **The session records `null`, and writes the key.** A stored session always carries `displayName`;
   the value is a name or `null`, and nothing in between. `parseSession` reads the same way it reads
   every other field: a value whose key is missing, empty, or not a string is not a session — an
   unreadable value must never come back as an account (`null` is not produced by guessing).
3. **Screens name the account by what they know.** Frame 14's account row falls back to the identifier
   — the only thing the app holds about that account — and does not print the same identifier twice
   when it does (the line under the name carries the verification claim alone). What the row may not do
   is present the identifier as the account's *name*, or invent a person: an avatar with no initials is
   not a claim about anybody (`profileInitials('')` is `''`).
4. **The deletion path is unchanged.** Nothing here is a second copy of a person: the name, when a
   sign-up collected one, is still handed to the port by screen 04 and nowhere else
   ([ADR-029](ADR-029-the-session-carries-the-accounts-name.md)); when the provider lands, the name it
   returns belongs to the profile it owns, and `null` disappears with the stand-in that needed it.

## Alternatives considered

- **Borrow the identifier as the name.** One string field, no `null`, no new state — and the settings
  row would greet a returning user by their own email address as if it were “Aino Korhonen”. It also
  erases the distinction the moment the real provider arrives, when the account does have a name and
  the app must start showing it: a value the app invented would be indistinguishable from one the
  service sent.
- **Require a name on every credential.** It would make the sign-in screen ask for a name that is not
  the account's — a field collected for no purpose, which GDPR's minimisation rule refuses
  (AGENTS.md §11) — and would let a returning user's own typing overwrite the account's real name.
- **An empty string for “unknown”.** The cheapest to write and the easiest to read as a name with no
  letters: every screen that renders the field would need to test it before rendering, and the one that
  forgets draws an account row with nothing on it. `null` is a state the type system carries.
- **A separate `hasName: boolean`.** Two fields that can disagree; the value that *is* the name already
  answers the question.

## Consequences

- The field is honest in both journeys, and the fallback is a screen decision rather than a stored
  fiction: frame 14's row, the sign-in flow and anything else reading the session agree about what “no
  name” looks like.
- The account service, when it lands, fills this field rather than adding one; no stored session shape
  changes and no screen has to learn a second case.
- One gap stays open and is recorded rather than hidden: with no name and no service, **the app cannot
  show a returning user the name their account has** — the settings row shows the identifier, and the
  row's own test says so. PROJECT.md known issue 27 (what the verification claim owes) and open
  question 12 (where the account service lives) are where that closes.
- Known issue 25's “almost nothing uses the session yet” narrows: the settings row and the account
  screen now read the session's identifier, its name when there is one, and nothing else.

## References

- [ADR-029](ADR-029-the-session-carries-the-accounts-name.md) — the session carries the account's name;
  this ADR says what it holds when nobody collected one.
- [ADR-034](ADR-034-signing-in-the-frame-the-journey-and-the-session.md) — the sign-in reading this
  ADR's second value exists for.
- `src/services/session/session.ts`, `src/services/session/stand-in-port.ts` and their tests;
  `src/features/privacy/domain/profile.ts` for the row that falls back to the identifier.
