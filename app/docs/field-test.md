# The watch field test — protocol, thresholds and results

[ADR-063](adr/ADR-063-the-watch-has-a-cadence-and-an-accuracy-budget.md) chose the foreground
watch's budget — `Accuracy.High`, a 50 m distance filter and a 60 s time ceiling on Android — as a
**ceiling, not a measurement**. This page is the measurement: where the harness is, how to run it,
what its summary means, and what has been recorded so far. `src/features/field-test/` is the
instrument; `src/app/field-test.tsx` is its route; the route redirects away in a production build.

**Status: no run has been recorded.** The rows in §6 are empty on purpose, so the ADR's trade-off
is still the reasoning it was chosen on rather than a figure from a phone. Nothing here may be
filled in from a simulator, a browser or an estimate: the point of the harness is that the battery
half is the device's own reading.

## 1. What the test is for

Two questions, and the ADR answers both only as predictions:

1. **Does the budget see enough?** A picker who crosses a kilometre-scale zone boundary at walking
   pace should be seen inside the new zone within about a minute on Android (50 m at ~1.4 m/s is
   ~36 s, so the distance filter usually answers first) and within about 50 m on iOS. A picker who
   stands still gets no fix at all, which the visit tracker tolerates — a visit stays open until
   evidence of an exit arrives.
2. **What does it cost?** The watch's own battery drain, in percentage points per hour, separate
   from the cost of holding a screen awake and running the rest of the app.

The second question is the one a phone has to answer. A control run — the screen held awake with
**no watch mounted** — gives the baseline; the watch run's drain minus the control run's drain is
what the watch itself spends.

## 2. What the harness measures, and what it refuses to

- **The real seam.** A watch run mounts `useDevicePosition`, so the consent gate
  ([ADR-045](adr/ADR-045-a-position-behind-a-port-and-nothing-kept.md)), the platform's foreground
  permission and `POSITION_WATCH_BUDGET` are the ones a product screen would meet. Nothing about
  the watch is simulated.
- **Aggregates, and only aggregates.** The screen folds each fix into counts, intervals, the
  platform's stated accuracy, a distance total and battery levels. It holds the **newest position
  in memory only**, to measure the distance to the next fix; no coordinate is written, shown,
  logged or sent, and the summary contains none.
- **The platform's battery**, through `expo-battery`, polled once a minute. A run is refused on a
  charger or in Low Power Mode, and a reading that turns invalid mid-run says so rather than
  printing a cost that is not one.
- **Nothing automatic.** The summary is handed to the platform's share sheet by the tester; the app
  uploads nothing and has no destination of its own.

## 3. The protocol

Run the same route **twice per phone** — once as a watch run, once as a control — and keep
everything else equal:

| Thing | Setting |
| ----- | ------- |
| Phone | A physical device of each platform, the build under test (`eas build --profile development`, or a local `npx expo run:ios` / `run:android`). Not a simulator: neither battery nor radio is real there. |
| Build's environment | `development` or `preview` (`EXPO_PUBLIC_APP_ENV`). A production build redirects away from `/field-test`, by design. |
| Consent | Visit tracking **on** (Privacy settings → the visit-tracking switch), and the platform's location permission granted “while the app is open”. A watch run on a phone that has never answered the consent prompt reads nothing and the screen says so. |
| Power | Unplugged at the start, charged to the same level for both runs (80–100 %), **Low Power Mode off**. The harness refuses to start otherwise. |
| Screen | Kept on by the harness (`useKeepAwake`) and **in front** for the whole run. A sleeping phone stops a foreground watch, which would measure the wrong thing. |
| Brightness | Fixed at the same level for both runs; auto-brightness off. |
| Route | The same walk, at the same pace, for both runs: about 30 minutes with a mix of movement and a stop or two, outdoors. |
| Apps | Close what can be closed; the same apps running in both runs. |
| Order | Alternate watch-then-control and control-then-watch between repeats, so a warming phone is not always one mode. |

A run is **invalid for battery** if the phone was plugged in, Low Power Mode came on, or the
platform would not report a power source — the screen states which. The fix half of a watch run
remains readable, because that is about cadence rather than power.

## 4. The thresholds under test

These are the values in `POSITION_WATCH_BUDGET` (`src/services/location/expo-source.ts`), asserted
by `src/services/location/__tests__/expo-source.test.ts`:

| Setting | Value | Meaning |
| ------- | ----- | ------- |
| Accuracy | `Location.Accuracy.High` | Zone-scale, not row-scale; `Balanced`'s ~100 m is a tenth of a kilometre-scale zone and is widest at the boundary. |
| Distance filter | 50 m | A moved position worth re-answering containment for. Also the platform's own `High` filter. |
| Time ceiling | 60 s, **Android only** | Caps a moving walk at one fix a minute. Expo's `timeInterval` has no iOS effect, so an iPhone reports per 50 m (~36 s at walking pace). |

Both numbers are **limits, not a schedule**: standing still yields no new fix, and moving less than
50 m yields none either. That is accepted for a visit feature whose smallest unit is a 5-minute
dwell, and it is the thing a run should confirm rather than contradict — a median gap much longer
than a minute while walking would mean the budget cannot see a boundary promptly.

## 5. Reading the summary

The share sheet carries one text block. What each line answers:

| Line | Read it as |
| ---- | ---------- |
| `Fixes` / `…/hour (first→last)` | The realised cadence while the run was moving. Compare with the 60 s ceiling and the 50 m filter. |
| `First fix` | Time to the first fix after Start — the platform's warm-up, useful when a run starts cold. |
| `Gap: median · min · max` | Whether cadence looked like the budget. A max far above the median is a stop, a lost signal or a platform deciding differently. |
| `Stated accuracy: median … (n readings)` | What the platform claimed, not ground truth. It should sit at or below zone scale; a large median means the fixes are not the precision the ADR chose. |
| `Distance between fixes` | How far the phone thinks it moved, as a sanity check on the route and the filter. |
| `Battery: a% → b% · n points · n points/hour` | The run's own drain. **The watch's cost is this minus the control run's** — the control is what the screen and the phone cost anyway. |
| `… not a valid cost (reason)` | A charger, Low Power Mode or an unknown power source. Do not subtract it from anything; rerun. |

A 30-minute run reports points per hour by extrapolation, which is why two repeats per mode are
better than one long run: a single hour on one route can hide a warm-up, a cold walk or a phone
doing a background update.

## 6. Results

**Nothing measured yet.** Add one row per run; keep the summaries the share sheet produced as the
record (they carry the window and the device), and keep invalid runs listed rather than deleted, so
a rerun has a reason.

| Date | Device / OS | Mode | Duration | Fixes | Median gap | Median accuracy | Battery | Points/hour | Notes |
| ---- | ----------- | ---- | -------- | ----- | ---------- | --------------- | ------- | ----------- | ----- |
| — | Android | watch | — | — | — | — | — | — | not measured |
| — | Android | control | — | — | — | — | — | — | not measured |
| — | iOS | watch | — | — | — | — | — | — | not measured |
| — | iOS | control | — | — | — | — | — | — | not measured |

## 7. What the answer decides

When the rows are filled, the question ADR-063 left open is answerable in one place:

- **The watch's cost per hour** is `watch run points/hour − control run points/hour`, per platform.
  Whether that figure is acceptable is the owner's line, not the harness's: no document states a
  battery cost the app can afford, and the harness supplies the number to decide against rather
  than the decision. Saying “acceptable” here would put a figure in a record that no measurement
  supports — the thing ADR-063 was careful not to do with the budget itself.
- **The cadence** is answered by the gap line: if a walking run's median gap is close to a minute
  on Android and to the 50 m interval on iOS, the budget behaves as designed. If it is much longer,
  or the fixes cluster only where the phone thinks it moved, the reason is in the max gap and the
  stated accuracy.
- **If the cost is too high**, the alternatives are already costed in ADR-063: `Balanced` (cheaper,
  but ~100 m at exactly the boundary), a 100–200 m filter with a 2–5-minute interval (fewer wakes,
  coarser arrivals), or `Highest` (rejected for the opposite reason). Changing it means changing
  `POSITION_WATCH_BUDGET` and its test — one file, so it cannot be a quiet tweak — and recording a
  new ADR.
- **If the cadence is too coarse for a zone**, that is a different finding: it argues about the
  distance filter or the dwell, not the battery, and the tracker's 5-minute dwell is the thing to
  re-read.

Nothing in this page may be quoted as a measured result until a row above exists. ADR-063's
consequence stays true until then: “no field battery figure exists yet, and one should be taken
before beta.”
