import Foundation
import SwiftData

// MARK: - Enums

enum MedForm: String, Codable, CaseIterable, Identifiable {
    case tablet, capsule, liquid, injection, inhaler, patch, cream, drops, spray, other
    var id: String { rawValue }
    var label: String { rawValue.capitalized }
    /// Sensible default unit for a dose of this form.
    var defaultDoseUnit: String {
        switch self {
        case .tablet: return "tablet"
        case .capsule: return "capsule"
        case .liquid: return "mL"
        case .injection: return "unit"
        case .inhaler: return "puff"
        case .patch: return "patch"
        case .cream: return "application"
        case .drops: return "drop"
        case .spray: return "spray"
        case .other: return "dose"
        }
    }
}

enum ScheduleKind: String, Codable, CaseIterable, Identifiable {
    case fixedTimes    // concrete times on a day pattern
    case everyNHours   // N hours after the last logged dose
    case asNeeded      // pure PRN, no reminders
    var id: String { rawValue }
    var label: String {
        switch self {
        case .fixedTimes: return "Scheduled times"
        case .everyNHours: return "Every N hours"
        case .asNeeded: return "As needed"
        }
    }
}

enum DayPattern: String, Codable, CaseIterable, Identifiable {
    case daily, daysOfWeek, everyNDays, cycle
    var id: String { rawValue }
    var label: String {
        switch self {
        case .daily: return "Every day"
        case .daysOfWeek: return "Days of the week"
        case .everyNDays: return "Every N days"
        case .cycle: return "Cycle (on/off)"
        }
    }
}

enum DoseStatus: String, Codable {
    case taken, skipped
}

enum MedRoute: String, Codable, CaseIterable, Identifiable {
    case unspecified, oral, sublingual, subcutaneous, intramuscular,
         inhaled, nasal, topical, transdermal, ophthalmic, rectal, other
    var id: String { rawValue }
    var label: String {
        self == .unspecified ? "Not set" : rawValue.capitalized
    }
}

enum DurationKind: String, Codable, CaseIterable, Identifiable {
    case ongoing      // daily-driver meds: runs until archived/paused
    case courseDays   // finite course: "for 10 days"
    case courseDoses  // finite course: "until it runs out" — N doses total
    var id: String { rawValue }
    var label: String {
        switch self {
        case .ongoing: return "Ongoing"
        case .courseDays: return "For a number of days"
        case .courseDoses: return "For a number of doses"
        }
    }
}

let strengthUnits = ["mg", "mcg", "g", "mL", "IU", "%", "units"]
let doseUnits = ["tablet", "capsule", "mL", "puff", "drop", "unit", "patch", "spray", "sachet", "application", "dose"]

// MARK: - Models

@Model
final class Medication {
    var uuid: UUID = UUID()
    var name: String = ""
    /// Strength is a ratio: `strengthValue strengthUnit` per `strengthPerValue strengthPerUnit`.
    /// The default denominator (1, "") means "per 1 unit of the form" — a 50 mg tablet.
    /// A concentration sets it explicitly: 250 mg per 5 mL; 100 mcg per 1 puff.
    var strengthValue: Double?
    var strengthUnit: String = "mg"
    var strengthPerValue: Double = 1
    var strengthPerUnit: String = ""
    /// Elimination half-life in hours; non-nil turns on the estimated-levels chart.
    var halfLifeHours: Double?
    /// Absorption half-life in hours (0.5 ≈ regular oral, 2 ≈ extended release, 24 ≈ weekly injection).
    var absorptionHalfLifeHours: Double = 0.5
    var formRaw: String = MedForm.tablet.rawValue
    /// Optional administration route; mostly useful when the same drug is taken two ways.
    var routeRaw: String = MedRoute.unspecified.rawValue
    /// Health-style icon tint; one of `medTintNames`.
    var tintName: String = "blue"
    var notes: String = ""
    var isArchived: Bool = false
    var createdAt: Date = Date.now

    @Relationship(deleteRule: .cascade, inverse: \Schedule.medication)
    var schedules: [Schedule] = []
    @Relationship(deleteRule: .cascade, inverse: \DoseLog.medication)
    var logs: [DoseLog] = []

    init(name: String = "", strengthValue: Double? = nil, strengthUnit: String = "mg",
         form: MedForm = .tablet, notes: String = "") {
        self.name = name
        self.strengthValue = strengthValue
        self.strengthUnit = strengthUnit
        self.formRaw = form.rawValue
        self.notes = notes
    }

    var form: MedForm {
        get { MedForm(rawValue: formRaw) ?? .other }
        set { formRaw = newValue.rawValue }
    }

    var route: MedRoute {
        get { MedRoute(rawValue: routeRaw) ?? .unspecified }
        set { routeRaw = newValue.rawValue }
    }

    /// "50 mg", "250 mg/5 mL", "100 mcg/puff" — nil when no strength is set.
    var strengthText: String? {
        guard let v = strengthValue else { return nil }
        var s = "\(v.compactFormatted) \(strengthUnit)"
        if !strengthPerUnit.isEmpty {
            s += "/" + (strengthPerValue == 1 ? "" : strengthPerValue.compactFormatted + " ") + strengthPerUnit
        }
        return s
    }

    /// "Sertraline 50 mg" or just the name when no strength is set.
    var displayName: String {
        if let s = strengthText { return "\(name) \(s)" }
        return name
    }

    var activeSchedules: [Schedule] {
        schedules.filter { !$0.isPaused && !$0.isExpired }
    }
}

@Model
final class Schedule {
    var uuid: UUID = UUID()
    var kindRaw: String = ScheduleKind.fixedTimes.rawValue
    var dayPatternRaw: String = DayPattern.daily.rawValue

    /// Minutes from local midnight, sorted; used by `fixedTimes`.
    var timesOfDay: [Int] = [8 * 60]
    /// Calendar weekday numbers, 1=Sunday … 7=Saturday; used by `daysOfWeek`.
    var daysOfWeek: [Int] = []
    /// Used by `everyNDays`.
    var intervalDays: Int = 2
    /// Used by `cycle`.
    var cycleDaysOn: Int = 21
    var cycleDaysOff: Int = 7
    /// Day zero for `everyNDays` stepping and `cycle` phase.
    var anchorDate: Date = Calendar.current.startOfDay(for: .now)

    /// Used by `everyNHours`: the reminder interval ("every 6 h" → remind at +6 h).
    var hoursBetween: Double = 6
    /// Optional PRN safety floor for "every 4–6 h" labels: earliest allowed re-dose.
    /// nil means the floor equals `hoursBetween`.
    var minHoursBetween: Double?
    /// Soft cap surfaced in the UI; never blocks logging.
    var maxPerDay: Int?
    /// Soft cap in active units per day (paracetamol "4 g/day"), when strength
    /// links doses to active amounts. Also never blocks logging.
    var maxActivePerDay: Double?
    /// "as needed *for migraine*" — shown when logging and in summaries.
    var prnReason: String = ""

    /// Dose per administration. `quantityMax` non-nil makes it a range ("1–2 tablets").
    var quantity: Double = 1
    var quantityMax: Double?
    var quantityUnit: String = "tablet"
    /// When true, `quantity` is expressed in the medication's strength units
    /// (insulin "10 units", liquid "250 mg") instead of product units.
    var doseInActiveUnits: Bool = false
    var instructions: String = ""

    var startDate: Date = Calendar.current.startOfDay(for: .now)
    var endDate: Date?
    /// Ongoing (daily driver) vs. a finite course ("for 10 days" / "20 doses total").
    var durationKindRaw: String = DurationKind.ongoing.rawValue
    var courseDays: Int = 10
    var courseTotalDoses: Int = 20
    var isPaused: Bool = false

    var medication: Medication?
    @Relationship(deleteRule: .nullify, inverse: \DoseLog.schedule)
    var logs: [DoseLog] = []

    init(kind: ScheduleKind = .fixedTimes) {
        self.kindRaw = kind.rawValue
    }

    var kind: ScheduleKind {
        get { ScheduleKind(rawValue: kindRaw) ?? .asNeeded }
        set { kindRaw = newValue.rawValue }
    }

    var dayPattern: DayPattern {
        get { DayPattern(rawValue: dayPatternRaw) ?? .daily }
        set { dayPatternRaw = newValue.rawValue }
    }

    var durationKind: DurationKind {
        get { DurationKind(rawValue: durationKindRaw) ?? .ongoing }
        set { durationKindRaw = newValue.rawValue }
    }

    /// Last calendar day this schedule is active, if bounded by dates.
    var effectiveEndDate: Date? {
        switch durationKind {
        case .ongoing:
            return endDate
        case .courseDays:
            let start = Calendar.current.startOfDay(for: startDate)
            return Calendar.current.date(byAdding: .day, value: max(1, courseDays) - 1, to: start)
        case .courseDoses:
            return nil
        }
    }

    var takenCount: Int {
        logs.filter { $0.status == .taken }.count
    }

    var isExpired: Bool {
        if let end = effectiveEndDate,
           Calendar.current.startOfDay(for: .now) > Calendar.current.startOfDay(for: end) {
            return true
        }
        if durationKind == .courseDoses && takenCount >= courseTotalDoses {
            return true
        }
        return false
    }

    /// ("day 6", "of 10") style progress for finite courses; nil for ongoing.
    var courseProgress: (done: Int, total: Int, unit: String)? {
        switch durationKind {
        case .ongoing:
            return nil
        case .courseDays:
            let cal = Calendar.current
            let day = (cal.dateComponents([.day], from: cal.startOfDay(for: startDate),
                                          to: cal.startOfDay(for: .now)).day ?? 0) + 1
            return (min(max(day, 0), courseDays), courseDays, "day")
        case .courseDoses:
            return (min(takenCount, courseTotalDoses), courseTotalDoses, "dose")
        }
    }

    /// Single source of the course-progress label used across views.
    var courseProgressText: String? {
        guard let p = courseProgress else { return nil }
        if isExpired { return "Course complete" }
        switch durationKind {
        case .courseDays: return "Day \(p.done) of \(p.total)"
        case .courseDoses: return "\(p.done) of \(p.total) doses taken"
        case .ongoing: return nil
        }
    }

    /// Unit label the dose is expressed in (product unit, or strength unit for
    /// active-unit dosing like insulin).
    var doseUnitLabel: String {
        doseInActiveUnits ? (medication?.strengthUnit ?? quantityUnit) : quantityUnit
    }

    /// "2 tablets", "1–2 tablets", "10 units".
    var doseText: String {
        let unit = doseUnitLabel
        if let maxQ = quantityMax, maxQ > quantity {
            return "\(quantity.compactFormatted)–\(maxQ.compactFormatted) \(maxQ == 1 ? unit : unit.pluralized)"
        }
        return "\(quantity.compactFormatted) \(quantity == 1 ? unit : unit.pluralized)"
    }

    /// Dose in the medication's active units, when strength links the two.
    /// Count-based dose × per-unit strength, or volume ÷ per-volume × strength.
    func activeAmount(for qty: Double) -> Double? {
        guard let med = medication, let sv = med.strengthValue, sv > 0 else { return nil }
        if doseInActiveUnits { return qty }
        if med.strengthPerUnit.isEmpty { return qty * sv }
        if quantityUnit == med.strengthPerUnit, med.strengthPerValue > 0 {
            return qty / med.strengthPerValue * sv
        }
        return nil
    }

    /// Active units taken against this schedule today; nil when strength can't
    /// link a logged dose to an active amount.
    var activeTakenToday: Double? {
        guard medication?.strengthValue != nil else { return nil }
        let dayStart = Calendar.current.startOfDay(for: .now)
        var total = 0.0
        for log in logs where log.status == .taken && log.takenAt >= dayStart {
            guard let amount = activeAmount(for: log.quantity) else { return nil }
            total += amount
        }
        return total
    }

    /// "2 tablets (1000 mg)" — dose with the linked active amount when derivable.
    var doseDetailText: String {
        var s = doseText
        if !doseInActiveUnits, let lo = activeAmount(for: quantity), let unit = medication?.strengthUnit {
            if let maxQ = quantityMax, let hi = activeAmount(for: maxQ), hi > lo {
                s += " (\(lo.compactFormatted)–\(hi.compactFormatted) \(unit))"
            } else {
                s += " (\(lo.compactFormatted) \(unit))"
            }
        }
        return s
    }

    /// Short human summary, e.g. "2 tablets · 3× daily at 08:00, 14:00, 20:00 · 10-day course".
    var summary: String {
        var s: String
        switch kind {
        case .asNeeded:
            s = "\(doseText) · as needed"
            if !prnReason.isEmpty { s += " for \(prnReason)" }
            if let cap = maxPerDay { s += " · max \(cap)/day" }
        case .everyNHours:
            let interval: String
            if let minH = minHoursBetween, minH < hoursBetween {
                interval = "\(minH.compactFormatted)–\(hoursBetween.compactFormatted)"
            } else {
                interval = hoursBetween.compactFormatted
            }
            s = "\(doseText) · every \(interval) h after last dose"
            if !prnReason.isEmpty { s += " for \(prnReason)" }
            if let cap = maxPerDay { s += " · max \(cap)/day" }
        case .fixedTimes:
            let times = timesOfDay.sorted().map(\.asTimeString).joined(separator: ", ")
            let days: String
            switch dayPattern {
            case .daily:
                days = timesOfDay.count == 1 ? "daily" : "\(timesOfDay.count)× daily"
            case .daysOfWeek:
                let cal = Calendar.current
                let names = daysOfWeek.sorted().map { cal.shortWeekdaySymbols[$0 - 1] }
                days = names.joined(separator: " ")
            case .everyNDays:
                days = intervalDays == 7 ? "weekly" : "every \(intervalDays) days"
            case .cycle:
                days = "\(cycleDaysOn) on / \(cycleDaysOff) off"
            }
            s = "\(doseText) · \(days) at \(times)"
        }
        switch durationKind {
        case .ongoing: break
        case .courseDays: s += " · \(courseDays)-day course"
        case .courseDoses: s += " · \(courseTotalDoses)-dose course"
        }
        return s
    }
}

@Model
final class DoseLog {
    var uuid: UUID = UUID()
    /// When the user acted (took/skipped).
    var takenAt: Date = Date.now
    /// The planned occurrence this answers; nil for ad-hoc doses.
    var scheduledAt: Date?
    var statusRaw: String = DoseStatus.taken.rawValue
    var quantity: Double = 1
    var quantityUnit: String = "tablet"
    var notes: String = ""

    var medication: Medication?
    var schedule: Schedule?

    init(medication: Medication?, schedule: Schedule?, status: DoseStatus,
         takenAt: Date = .now, scheduledAt: Date? = nil,
         quantity: Double = 1, quantityUnit: String = "tablet", notes: String = "") {
        self.medication = medication
        self.schedule = schedule
        self.statusRaw = status.rawValue
        self.takenAt = takenAt
        self.scheduledAt = scheduledAt
        self.quantity = quantity
        self.quantityUnit = quantityUnit
        self.notes = notes
    }

    var status: DoseStatus {
        get { DoseStatus(rawValue: statusRaw) ?? .taken }
        set { statusRaw = newValue.rawValue }
    }
}

// MARK: - Shared container

@MainActor
final class DataStore {
    static let shared = DataStore()
    let container: ModelContainer

    private init() {
        let schema = Schema([Medication.self, Schedule.self, DoseLog.self])
        let config = ModelConfiguration(schema: schema)
        do {
            container = try ModelContainer(for: schema, configurations: [config])
        } catch {
            fatalError("Failed to open data store: \(error)")
        }
        Self.applyFileProtection(around: config.url)
    }

    /// Encrypt the store at rest, but keep it readable after first unlock so
    /// lock-screen notification actions can still write logs (see SPEC.md).
    private static func applyFileProtection(around storeURL: URL) {
        let fm = FileManager.default
        let dir = storeURL.deletingLastPathComponent()
        let base = storeURL.lastPathComponent
        let candidates = [base, base + "-wal", base + "-shm"].map { dir.appendingPathComponent($0) }
        for url in candidates where fm.fileExists(atPath: url.path) {
            try? fm.setAttributes(
                [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication],
                ofItemAtPath: url.path
            )
        }
    }
}

// MARK: - Formatting helpers

extension Double {
    /// "2", "2.5" — no trailing ".0".
    var compactFormatted: String {
        if self == rounded() && abs(self) < 1e9 {
            return String(Int(self))
        }
        return String(format: "%g", self)
    }
}

extension Int {
    /// Minutes-from-midnight → localized short time string.
    var asTimeString: String {
        let cal = Calendar.current
        let date = cal.date(bySettingHour: self / 60, minute: self % 60, second: 0, of: .now) ?? .now
        return date.formatted(date: .omitted, time: .shortened)
    }
}

extension String {
    /// Naive pluralizer, good enough for dose units ("tablet" → "tablets", "puff" → "puffs").
    /// Measurement units (mg, mL, IU, %) never pluralize.
    var pluralized: String {
        let measurementUnits: Set<String> = ["mg", "mcg", "g", "mL", "L", "IU", "%"]
        if isEmpty || hasSuffix("s") || measurementUnits.contains(self) { return self }
        return self + "s"
    }
}
