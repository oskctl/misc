# MedTracker (iOS)

A lightweight, local-only medication tracker for personal use. SwiftUI + SwiftData,
iOS 17+, zero third-party dependencies, no network code. Full design in [SPEC.md](SPEC.md).

**What it does**

- Medications with strength, form, and notes; archive without losing history.
- Dose schedules covering the common regimens: fixed times per day, specific weekdays,
  every N days (weekly/fortnightly/depot), on/off cycles (21/7), "every N hours after
  the last dose" chains with an optional per-day cap, pure as-needed, and finite
  courses with end dates. Multiple schedules per medication.
- Native notifications with lock-screen quick actions: **Log dose**, **Skip**,
  **Snooze 15 min**.
- Today timeline (overdue / upcoming / logged / PRN), full history with editing and a
  7-day adherence stat, JSON export, optional Face ID app lock, store encrypted at rest.
- Styled after the Medications feature in Apple Health: tinted per-medication icons
  (form-matched SF Symbols, 12-color palette), tap-a-dose card sheets with big
  Taken/Skipped buttons, swipe quick actions. Built entirely from standard SwiftUI
  components, so it adopts the system's current Liquid Glass design (iOS 26/27)
  automatically when compiled with a current Xcode.

## Building it

You need a Mac with **Xcode 16 or newer** (the project uses the folder-synchronized
project format) and an iPhone on iOS 17+.

1. Clone the repo and open `medtracker-ios/MedTracker.xcodeproj`.
2. In the target's *Signing & Capabilities*: pick your personal team and change the
   bundle identifier from `com.example.MedTracker` to something unique to you
   (e.g. `yourname.MedTracker`).
3. Plug in your iPhone, select it as the run destination, hit **Run**.
4. First launch on-device with a free Apple ID: approve the developer profile in
   *Settings → General → VPN & Device Management*.

Notes on sideloading: with a **free Apple ID** the app signature expires after
**7 days** — just hit Run again to re-install (data is preserved). With a paid
developer account it lasts a year. Since notifications are re-planned 7 days ahead
each time the app opens, normal daily use keeps reminders flowing.

Optional capability: add **Time Sensitive Notifications** under *Signing &
Capabilities* if you want reminders to break through Focus modes. Without it the
notifications still fire, just at normal priority.

If the project file won't open in your Xcode (older than 16):
`brew install xcodegen`, then `cd medtracker-ios && xcodegen` and open the
regenerated project. `project.yml` carries the same settings.

## Caveats

- Written and reviewed on a Linux box without Xcode, so it has **not been compiled**.
  Expect at worst a couple of trivial compiler complaints on first build, not
  structural problems.
- iOS caps pending local notifications at 64, so reminders are planted 7 days out
  and rebuilt whenever the app opens or a notification action fires. If you don't
  touch the app or a reminder for a full week, a final "open MedTracker" notification
  fires as a fallback.
- This is a personal logging tool, not medical advice or a medical device.

## Layout

```
medtracker-ios/
├── SPEC.md                    # full specification
├── project.yml                # XcodeGen fallback
├── MedTracker.xcodeproj/      # Xcode 16 project (folder-synchronized)
└── MedTracker/
    ├── MedTrackerApp.swift    # entry point, notification delegate wiring
    ├── Models.swift           # SwiftData models + shared container
    ├── ScheduleEngine.swift   # schedule → occurrences date math, LogService
    ├── NotificationManager.swift  # reminder window, quick actions
    ├── AppLock.swift          # Face ID / passcode gate
    └── Views/                 # Today, Medications, History, Settings
```
