import Foundation
import SwiftData

/// A concrete planned dose: this schedule, at this wall-clock moment.
struct Occurrence: Identifiable, Hashable {
    let schedule: Schedule
    let date: Date
    var id: String { "\(schedule.uuid.uuidString)|\(Int(date.timeIntervalSince1970))" }
}

/// Pure date math: turns schedule definitions into concrete occurrences.
enum ScheduleEngine {

    /// Is `day` an "on" day for this schedule? (`day` may be any moment in the day.)
    static func isActiveDay(_ day: Date, for schedule: Schedule, calendar: Calendar = .current) -> Bool {
        let dayStart = calendar.startOfDay(for: day)
        if dayStart < calendar.startOfDay(for: schedule.startDate) { return false }
        if let end = schedule.effectiveEndDate, dayStart > calendar.startOfDay(for: end) { return false }

        switch schedule.dayPattern {
        case .daily:
            return true
        case .daysOfWeek:
            let weekday = calendar.component(.weekday, from: dayStart)
            return schedule.daysOfWeek.contains(weekday)
        case .everyNDays:
            let n = max(1, schedule.intervalDays)
            let anchor = calendar.startOfDay(for: schedule.anchorDate)
            guard let days = calendar.dateComponents([.day], from: anchor, to: dayStart).day else { return false }
            // Support anchors after the queried day too (negative distance).
            return ((days % n) + n) % n == 0
        case .cycle:
            let on = max(1, schedule.cycleDaysOn)
            let off = max(0, schedule.cycleDaysOff)
            let period = on + off
            let anchor = calendar.startOfDay(for: schedule.anchorDate)
            guard let days = calendar.dateComponents([.day], from: anchor, to: dayStart).day else { return false }
            let phase = ((days % period) + period) % period
            return phase < on
        }
    }

    /// All occurrences of a `fixedTimes` schedule inside `interval`.
    /// Other kinds have no precomputable occurrences and return [].
    static func occurrences(for schedule: Schedule, in interval: DateInterval,
                            calendar: Calendar = .current) -> [Occurrence] {
        guard schedule.kind == .fixedTimes, !schedule.isPaused else { return [] }
        var result: [Occurrence] = []
        var day = calendar.startOfDay(for: interval.start)
        while day < interval.end {
            if isActiveDay(day, for: schedule, calendar: calendar) {
                for minutes in schedule.timesOfDay.sorted() {
                    if let t = calendar.date(byAdding: .minute, value: minutes, to: day),
                       interval.contains(t) {
                        result.append(Occurrence(schedule: schedule, date: t))
                    }
                }
            }
            guard let next = calendar.date(byAdding: .day, value: 1, to: day) else { break }
            day = next
        }
        return result
    }

    /// Occurrences across all active schedules of all active medications.
    static func allOccurrences(medications: [Medication], in interval: DateInterval,
                               calendar: Calendar = .current) -> [Occurrence] {
        medications
            .filter { !$0.isArchived }
            .flatMap { $0.activeSchedules }
            .flatMap { occurrences(for: $0, in: interval, calendar: calendar) }
            .sorted { $0.date < $1.date }
    }

    /// The most recent `taken` log for a schedule (used by everyNHours chains).
    static func lastTaken(for schedule: Schedule) -> DoseLog? {
        schedule.logs
            .filter { $0.status == .taken }
            .max { $0.takenAt < $1.takenAt }
    }

    /// For an `everyNHours` schedule: when the reminder should fire — last dose
    /// plus the full interval. nil means no dose has ever been taken.
    static func nextAllowed(for schedule: Schedule) -> Date? {
        guard schedule.kind == .everyNHours, let last = lastTaken(for: schedule) else { return nil }
        return last.takenAt.addingTimeInterval(schedule.hoursBetween * 3600)
    }

    /// The safety floor: earliest a re-dose is allowed ("every 4–6 h" → +4 h).
    /// Falls back to the reminder interval when no separate floor is set.
    static func availableFrom(for schedule: Schedule) -> Date? {
        guard schedule.kind == .everyNHours, let last = lastTaken(for: schedule) else { return nil }
        let hours = schedule.minHoursBetween ?? schedule.hoursBetween
        return last.takenAt.addingTimeInterval(hours * 3600)
    }

    /// Count of doses taken today against a schedule (for maxPerDay warnings).
    static func takenToday(for schedule: Schedule, calendar: Calendar = .current) -> Int {
        let dayStart = calendar.startOfDay(for: .now)
        return schedule.logs.filter { $0.status == .taken && $0.takenAt >= dayStart }.count
    }

    /// Find the log answering a specific occurrence, if any (idempotence check).
    static func log(for occurrence: Occurrence) -> DoseLog? {
        occurrence.schedule.logs.first {
            guard let s = $0.scheduledAt else { return false }
            return abs(s.timeIntervalSince(occurrence.date)) < 1
        }
    }

    /// Simple adherence over the trailing `days`: (taken, scheduled) for fixed schedules.
    static func adherence(medications: [Medication], days: Int = 7,
                          calendar: Calendar = .current) -> (taken: Int, scheduled: Int) {
        let end = Date.now
        guard let start = calendar.date(byAdding: .day, value: -days, to: end) else { return (0, 0) }
        let occ = allOccurrences(medications: medications, in: DateInterval(start: start, end: end))
        let taken = occ.filter { log(for: $0)?.status == .taken }.count
        return (taken, occ.count)
    }
}

// MARK: - Logging actions (shared by UI and notification handlers)

@MainActor
enum LogService {

    /// Log or skip a planned occurrence. Idempotent: an occurrence that already
    /// has a log is left untouched.
    @discardableResult
    static func log(occurrence: Occurrence, status: DoseStatus,
                    at time: Date = .now, quantity: Double? = nil,
                    in context: ModelContext) -> DoseLog? {
        if let existing = ScheduleEngine.log(for: occurrence) { return existing }
        let s = occurrence.schedule
        let entry = DoseLog(medication: s.medication, schedule: s, status: status,
                            takenAt: time, scheduledAt: occurrence.date,
                            quantity: quantity ?? s.quantity, quantityUnit: s.doseUnitLabel)
        context.insert(entry)
        try? context.save()
        NotificationManager.shared.refreshAll()
        return entry
    }

    /// Log a dose against a PRN/interval schedule (no planned occurrence).
    @discardableResult
    static func log(schedule: Schedule, status: DoseStatus = .taken,
                    at time: Date = .now, quantity: Double? = nil,
                    notes: String = "", in context: ModelContext) -> DoseLog {
        let entry = DoseLog(medication: schedule.medication, schedule: schedule, status: status,
                            takenAt: time, scheduledAt: nil,
                            quantity: quantity ?? schedule.quantity,
                            quantityUnit: schedule.doseUnitLabel, notes: notes)
        context.insert(entry)
        try? context.save()
        NotificationManager.shared.refreshAll()
        return entry
    }

    /// Fully ad-hoc dose: a medication with no schedule involved.
    @discardableResult
    static func logAdHoc(medication: Medication, quantity: Double, quantityUnit: String,
                         at time: Date = .now, notes: String = "",
                         in context: ModelContext) -> DoseLog {
        let entry = DoseLog(medication: medication, schedule: nil, status: .taken,
                            takenAt: time, scheduledAt: nil,
                            quantity: quantity, quantityUnit: quantityUnit, notes: notes)
        context.insert(entry)
        try? context.save()
        NotificationManager.shared.refreshAll()
        return entry
    }
}
