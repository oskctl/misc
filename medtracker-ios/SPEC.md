# MedTracker — Specification

A lightweight, local-only iOS medication tracker for personal use. Not for App Store
distribution, not a medical device, no server, no accounts.

## Goals

- Add medications with strength, form, and notes.
- Attach one or more dose schedules per medication, covering the common real-world
  regimens (see the schedule matrix below).
- Log every dose (taken or skipped) with quantity and timestamp, stored encrypted
  at rest on-device.
- Fire native iOS notifications at dose times with quick actions to **Log**, **Skip**,
  or **Snooze 15 min** — actionable straight from the lock screen without opening
  the app.
- Ad-hoc (PRN / "as needed") logging with optional per-day maximums.

## Non-goals

- No cloud sync, no sharing, no HealthKit export (all future options; the data layer
  doesn't preclude them).
- No drug database / interaction checking. Medication names are free text.
- No true calendar-monthly schedules ("1st of each month") — `every N days` with
  N=28/30 covers the realistic cases (depot injections, B12, bisphosphonates weekly
  via N=7). Can be added later as a new day pattern.

## Data model

Three SwiftData entities. All fields local, store encrypted at rest (see Security).

### Medication
Strength is a **ratio**, not a single value: amount of active ingredient per unit
of the form. A tablet leaves the denominator implicit (50 mg per 1 tablet); a
concentration sets it explicitly (250 mg per 5 mL, 100 mcg per puff, 100 units/mL).

| Field | Type | Notes |
|---|---|---|
| `name` | String | e.g. "Sertraline" |
| `strengthValue` / `strengthUnit` | Double? / String | numerator: 50 mg |
| `strengthPerValue` / `strengthPerUnit` | Double / String | denominator: per 5 mL; (1, "") = per form unit |
| `halfLifeHours` | Double? | non-nil enables the estimated-levels chart |
| `absorptionHalfLifeHours` | Double | 0.5 oral IR · 2 extended release · 24 weekly injection |
| `form` | enum | tablet, capsule, liquid, injection, inhaler, patch, cream, drops, spray, other |
| `route` | enum | optional: oral, sublingual, subcutaneous, inhaled, topical, transdermal, … |
| `tintName` | String | Health-style icon color |
| `notes` | String | free text |
| `isArchived` | Bool | archived meds keep history but stop reminding |
| `schedules` | [Schedule] | cascade delete |
| `logs` | [DoseLog] | cascade delete |

### Schedule
One medication can have several (e.g. a morning 2-tablet dose and an evening 1-tablet
dose are two schedules; so are "regular daily" + "extra as needed").

| Field | Type | Notes |
|---|---|---|
| `kind` | enum | `fixedTimes`, `everyNHours`, `asNeeded` |
| `dayPattern` | enum | for `fixedTimes`: `daily`, `daysOfWeek`, `everyNDays`, `cycle` |
| `timesOfDay` | [Int] | minutes from midnight, local wall-clock |
| `daysOfWeek` | [Int] | 1=Sun … 7=Sat (Calendar convention) |
| `intervalDays` | Int | for `everyNDays` |
| `cycleDaysOn` / `cycleDaysOff` | Int | e.g. 21 on / 7 off |
| `anchorDate` | Date | day-zero for `everyNDays` and `cycle` phase |
| `hoursBetween` | Double | for `everyNHours`: reminder interval (supports 0.5 steps) |
| `minHoursBetween` | Double? | PRN safety floor for "every 4–6 h": dose allowed from +4 h, reminder at +6 h |
| `maxPerDay` | Int? | optional dose-count cap, surfaced as a warning when exceeded |
| `maxActivePerDay` | Double? | optional cap in active units (paracetamol "4 g/day"); tracked via strength-linked logged amounts. Soft, like all caps |
| `prnReason` | String | "as needed *for migraine*" |
| `quantity` / `quantityMax` | Double / Double? | dose per administration; `quantityMax` makes it a range ("1–2 tablets") — the log sheet asks which was taken |
| `quantityUnit` | String | tablet, capsule, mL, puff, drop, unit, patch, spray, sachet |
| `doseInActiveUnits` | Bool | quantity is in strength units (insulin "10 units") instead of product units |
| `instructions` | String | "with food", "don't lie down for 30 min" |
| `startDate` | Date | |
| `durationKind` | enum | `ongoing` (daily driver, runs until archived) · `courseDays` ("for 10 days") · `courseDoses` ("until it runs out": N doses total) |
| `courseDays` / `courseTotalDoses` | Int / Int | course length; day-based courses expire by date, dose-based when the Nth dose is logged. Progress ("Day 6 of 10", "14 of 20 doses") shows on the medication; completion stops reminders and shows "Course complete" |
| `isPaused` | Bool | mute reminders without deleting the schedule |

Where strength links product and active units, the dose shows both: "2 tablets
(1000 mg)". A dose entered in active units resolves the other way (insulin
"10 units" of a 100 units/mL pen = 0.1 mL).

### DoseLog
| Field | Type | Notes |
|---|---|---|
| `takenAt` | Date | actual time of the action |
| `scheduledAt` | Date? | the planned occurrence; nil for ad-hoc doses |
| `status` | enum | `taken`, `skipped` |
| `quantity` / `quantityUnit` | Double / String | copied from schedule, editable |
| `notes` | String | free text |
| `medication` / `schedule` | refs | schedule is nil for ad-hoc |

## Schedule matrix — how common regimens map

| Real-world regimen | Configuration |
|---|---|
| Once daily (statin, SSRI) | `fixedTimes` + `daily`, 1 time |
| Twice / 3× / 4× daily (antibiotics, metformin) | `fixedTimes` + `daily`, 2–4 times (presets fill sensible spread: 08/20, 08/14/20, 08/12/16/20) |
| Morning 2 tablets, evening 1 (levothyroxine titration, insulin split) | two `fixedTimes` schedules with different quantities |
| Weekly (methotrexate, alendronate, GLP-1 injection) | `fixedTimes` + `everyNDays`, N=7 |
| Every other day (some steroids taper) | `everyNDays`, N=2 |
| Every 2 weeks / monthly depot | `everyNDays`, N=14 / 28 |
| Specific weekdays (Mon/Wed/Fri — e.g. dialysis-day meds) | `fixedTimes` + `daysOfWeek` |
| 21 on / 7 off (combined oral contraceptive) | `fixedTimes` + `cycle` 21/7 |
| 5 on / 2 off, weekdays-only | `daysOfWeek` Mon–Fri (or `cycle` 5/2 if phase-anchored) |
| Every 4–6 h after last dose, max 4/day (paracetamol, ibuprofen) | `everyNHours` h=6, `minHoursBetween`=4, `maxPerDay`=4 — allowed from +4 h, reminded at +6 h, chained off the last logged dose |
| 1–2 tablets per dose | `quantity`=1, `quantityMax`=2 — log sheet asks which |
| Insulin 10 units before meals | strength 100 units/mL, `doseInActiveUnits`, 3× daily |
| Finite course (10-day antibiotic) | any of the above + `durationKind: courseDays` |
| "Until it runs out" (20 tablets dispensed) | `durationKind: courseDoses`, total 20 — ends when the 20th dose is logged |
| Daily driver (Adderall, statin — runs until prescription changes) | `durationKind: ongoing` (default) |
| Pure PRN (antihistamine, GTN spray) | `asNeeded` — no reminders, one-tap logging |
| Truly ad hoc (no schedule at all) | "Log a dose" from anywhere; log has no schedule ref |

## Reminders / notifications

- `UNUserNotificationCenter` with a `DOSE_REMINDER` category carrying three actions:
  - **Log** — records a `taken` DoseLog at the tap time against the scheduled occurrence.
  - **Skip** (destructive style) — records a `skipped` log.
  - **Snooze 15 min** — re-schedules the same reminder one-off.
  - Actions carry no `.authenticationRequired` option so they work from the lock screen.
- Tapping the notification body opens the app on Today.
- Foreground delivery shows banner + sound (`willPresent` returns `.banner .sound .list`).
- **Scheduling window:** iOS caps pending local notifications at 64. The app computes
  concrete occurrences for the next **7 days** (capped at 55 requests, earliest-first)
  and schedules each as a non-repeating calendar trigger, identifier
  `meddose|<scheduleUUID>|<unix-ts>`. The whole set is torn down and rebuilt:
  - on every app foreground,
  - after any log/skip/snooze action,
  - after any medication or schedule edit.
  A final "Open MedTracker to keep reminders running" notification is planted at the
  end of the window as a dead-man's switch in case the app isn't opened for 7 days.
- **`everyNHours` chains:** these have no precomputed occurrences. When a dose is
  logged, one notification is scheduled at `takenAt + hoursBetween`. Skipping does not
  restart the chain. Before the first-ever dose the Today screen shows "available now".
- Notifications request `.timeSensitive` interruption level; without the optional
  Time Sensitive Notifications capability iOS silently downgrades it — no failure.

### Time zones & DST
`timesOfDay` are local wall-clock minutes; triggers are built from `DateComponents`
via `Calendar.current`, so 08:00 stays 08:00 across DST transitions and travel.
`everyNHours` chains are absolute durations (6 h means 6 h regardless of clock changes).

## Estimated drug levels

An opt-in, deliberately **indicative** feature (this is a personal tool, not a
medical device): per-medication level curves computed from logged doses.

- **Model:** one-compartment pharmacokinetics with first-order absorption and
  elimination (the Bateman function). Each dose contributes
  `(ka/(ka−ke))·(e^(−ke·t) − e^(−ka·t))`, with `ke = ln2 / halfLife`; the total
  is the superposition of all doses — valid because elimination is first-order
  for nearly all common drugs. This captures both behaviors that matter:
  **accumulation** (weekly GLP-1s stack toward steady state over ~5 half-lives)
  and **wear-off** (a stimulant's evening roll-off).
- **Normalized, unitless axis.** Absolute concentrations need volume of
  distribution and bioavailability, which are unknowable per person. The curve
  is scaled to the displayed window's peak instead — no mg/L claims, ever.
- **Tunable per person.** Half-life prefills from a built-in table of ~40 common
  medications (substring-matched on the name) but is always editable — the
  intended workflow is nudging it until the curve matches when *you* feel the
  drug wearing off. Absorption is a 3-way choice: regular oral (~0.5 h),
  extended release (~2 h), weekly injection (~24 h).
- **Rendering:** Swift Charts on the medication detail page — solid area+line
  for the past 7 days from actual logs, dashed projection 3 days forward
  assuming scheduled doses are taken (PRN excluded from projection), a dashed
  "now" rule, and a permanent caption: estimated from half-life, indicative only.
- **Today overview:** an "Estimated Levels" section on Today shows each
  PK-enabled medication as a small multiple — sparkline (last 36 h + 12 h
  projection) plus "≈62% of recent peak · falling" — and links to the full
  chart on the detail page. Each medication keeps its own normalized scale;
  curves are never overlaid.
- **Known limits (accepted):** patches/depots (zero-order release) aren't
  modeled; active metabolites are approximated by using the effective half-life;
  nonlinear-elimination drugs (alcohol, high-dose phenytoin) don't fit the
  model; plasma level ≠ felt effect (tolerance, receptor dynamics).

## Security

- **Local only.** No network code anywhere in the app.
- **Encryption at rest:** the SwiftData store files are set to
  `NSFileProtectionCompleteUntilFirstUserAuthentication`. Deliberately *not*
  `...Complete`: lock-screen quick actions (Log/Skip) wake the app in the background
  while the device is locked, and with full protection the store would be unreadable
  and the action would be lost. Until-first-unlock still means encrypted at rest
  (powered-off / before-first-unlock), which is the right trade-off here.
- **App lock (optional, on by settings toggle):** Face ID / Touch ID / passcode via
  `LocalAuthentication`, re-locks when the app leaves the foreground. This gates the
  UI, not the notification actions — by design.
- **Export:** Settings offers a JSON export via share sheet so the data is never
  trapped. Export is explicit user action only.

## Design

The app deliberately mirrors the Medications feature inside Apple Health, using
only standard SwiftUI components so it automatically adopts the current system
design language (Liquid Glass on iOS 26; iOS 27 ships its second iteration, and
standard-component SwiftUI apps pick the updated appearance up on recompile —
no custom chrome to migrate):

- Every medication gets a **tinted circular icon** (12-color Health-style palette,
  user-picked) whose SF Symbol follows the form — pill, capsule, syringe, inhaler,
  vial, patch, drop, spray.
- Tapping a due dose opens a **card sheet** (medium detent): large icon, name,
  dose context, adjustable time, and prominent **Log as Taken** / **Skipped**
  buttons — the Health log interaction.
- Lists are standard inset-grouped with icon-led rows; swipe right-to-left to
  skip, full swipe left-to-right to log taken.
- No custom colors, fonts, or materials beyond the med tints; system large titles,
  standard sheets, `ContentUnavailableView` empty states.

### Speed principles

The daily interaction is "glance, tap, done" — the UI optimizes for that over
completeness-on-screen:

- **One-tap logging with undo, not confirmation.** The circle-check on a row
  logs instantly (default dose, now); an Undo toast covers mistakes. The adjust
  sheet (time/quantity) is progressive disclosure — tap the row body.
- **Batch the common case.** Multiple meds due together get one "Log all N as
  taken" button.
- **Answer "am I on track?" in the header** — a small progress gauge with
  "4 of 7 done · Next at 8 PM".
- **Collapse what's done, compress what's optional.** Logged doses fold to one
  line; as-needed meds are chips; level curves are a horizontal card strip.

## Screens

1. **Today** (default tab), top to bottom: progress header (gauge, done count,
   next dose time) · **Due Now** card (overdue + next 30 min; circle-check
   instant log, "Log all" when >1, swipe to log/skip, row tap opens the adjust
   card) · **Later Today** compact rows · **As Needed** chips (locked chips show
   the allowed-from time) · **Levels** horizontal sparkline cards · collapsed
   **Logged** summary. Toolbar: "Log a dose" for fully ad-hoc entries.
2. **Medications** — active list (name, strength, schedule summary), archived section.
   Add/edit medication; per-medication detail with the estimated-levels chart (when
   enabled), its schedules with course progress ("Day 6 of 10" / "14 of 20 doses" /
   "Course complete"), and recent history.
3. **History** — logs grouped by day, newest first, filterable by medication;
   7-day adherence stat (taken / scheduled for fixed schedules); swipe to delete;
   tap to edit a log entry.
4. **Settings** — notification permission status/re-request, app lock toggle,
   refresh reminders now, JSON export, data counts.

## Edge cases handled

- **Missed doses** stay visible in Today's Overdue until logged or skipped (same-day);
  older unlogged occurrences simply appear as gaps in History/adherence — no nagging.
- **Duplicate protection:** logging from both the notification and the app against the
  same occurrence is idempotent (occurrence already logged ⇒ second log is ignored).
- **Quantity ≠ default:** the in-app log sheet allows overriding quantity/time/notes;
  the notification quick action always logs the schedule's default at tap-time.
- **Archived meds / paused or expired schedules** generate no occurrences and no
  notifications, but their history remains.
- **maxPerDay** on PRN schedules is a soft cap: the UI warns ("4 of 4 taken today")
  but never refuses to log — the log must reflect reality.

## Build / distribution

Personal sideload via Xcode (free Apple ID: re-sign every 7 days; paid developer
account: 1 year). See README.md. iOS 17+, SwiftUI + SwiftData, zero third-party
dependencies.
