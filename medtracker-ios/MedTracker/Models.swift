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

let strengthUnits = ["mg", "mcg", "g", "mL", "IU", "%", "units"]
let doseUnits = ["tablet", "capsule", "mL", "puff", "drop", "unit", "patch", "spray", "sachet", "application", "dose"]

// MARK: - Models

@Model
final class Medication {
    var uuid: UUID = UUID()
    var name: String = ""
    var strengthValue: Double?
    var strengthUnit: String = "mg"
    var formRaw: String = MedForm.tablet.rawValue
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

    /// "Sertraline 50 mg" or just the name when no strength is set.
    var displayName: String {
        if let v = strengthValue {
            return "\(name) \(v.compactFormatted) \(strengthUnit)"
        }
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

    /// Used by `everyNHours`.
    var hoursBetween: Double = 6
    /// Soft cap surfaced in the UI; never blocks logging.
    var maxPerDay: Int?

    var quantity: Double = 1
    var quantityUnit: String = "tablet"
    var instructions: String = ""

    var startDate: Date = Calendar.current.startOfDay(for: .now)
    var endDate: Date?
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

    var isExpired: Bool {
        guard let end = endDate else { return false }
        return Calendar.current.startOfDay(for: .now) > Calendar.current.startOfDay(for: end)
    }

    var doseText: String {
        let q = quantity.compactFormatted
        let unit = quantity == 1 ? quantityUnit : quantityUnit.pluralized
        return "\(q) \(unit)"
    }

    /// Short human summary, e.g. "2 tablets · 3× daily at 08:00, 14:00, 20:00".
    var summary: String {
        switch kind {
        case .asNeeded:
            var s = "\(doseText) · as needed"
            if let cap = maxPerDay { s += " · max \(cap)/day" }
            return s
        case .everyNHours:
            var s = "\(doseText) · every \(hoursBetween.compactFormatted) h after last dose"
            if let cap = maxPerDay { s += " · max \(cap)/day" }
            return s
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
            return "\(doseText) · \(days) at \(times)"
        }
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
    var pluralized: String {
        if isEmpty || hasSuffix("s") || self == "mL" { return self }
        return self + "s"
    }
}
