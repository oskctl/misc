import Foundation

/// Estimated drug-level curves: one-compartment first-order absorption and
/// elimination (Bateman function), summed over doses by superposition.
///
/// Deliberately indicative: no volume of distribution, no bioavailability —
/// the output is normalized to the window's peak, so the y-axis is relative,
/// never a concentration. Half-life is a per-medication editable so the user
/// can tune the curve to their own metabolism.
enum PKEngine {

    struct Point: Identifiable {
        let date: Date
        let level: Double     // 0…1, relative to window peak
        let projected: Bool   // future, assumes scheduled doses are taken
        var id: Date { date }
    }

    /// Relative contribution of one unit dose, `t` hours after taking it.
    static func unitResponse(hoursAfterDose t: Double,
                             halfLife: Double, absorptionHalfLife: Double) -> Double {
        guard t > 0, halfLife > 0 else { return 0 }
        let ke = log(2) / halfLife
        let ka = log(2) / max(absorptionHalfLife, 0.05)
        if abs(ka - ke) < 1e-6 {
            // Degenerate case ka == ke: limit of the Bateman function.
            return ka * t * exp(-ka * t)
        }
        return (ka / (ka - ke)) * (exp(-ke * t) - exp(-ka * t))
    }

    /// Normalized level curve for one medication: solid past from actual logs,
    /// projected future from scheduled occurrences (assumed taken; PRN excluded).
    static func curve(for medication: Medication,
                      pastDays: Double = 7, futureDays: Double = 3,
                      stepMinutes: Double = 30) -> [Point] {
        guard let halfLife = medication.halfLifeHours, halfLife > 0 else { return [] }
        let now = Date.now
        let start = now.addingTimeInterval(-pastDays * 86400)
        let end = now.addingTimeInterval(futureDays * 86400)

        // Doses older than ~5 half-lives before the window contribute < 3% — skip.
        let horizon = start.addingTimeInterval(-5 * halfLife * 3600)
        var doses: [(time: Date, amount: Double)] = medication.logs
            .filter { $0.status == .taken && $0.takenAt > horizon && $0.takenAt <= now }
            .map { ($0.takenAt, $0.schedule?.activeAmount(for: $0.quantity) ?? $0.quantity) }
        let planned = ScheduleEngine.allOccurrences(
            medications: [medication], in: DateInterval(start: now, end: end))
        doses += planned.map { ($0.date, $0.schedule.activeAmount(for: $0.schedule.quantity) ?? $0.schedule.quantity) }
        guard !doses.isEmpty else { return [] }

        var points: [Point] = []
        var t = start
        let step = stepMinutes * 60
        while t <= end {
            var level = 0.0
            for dose in doses {
                level += dose.amount * unitResponse(
                    hoursAfterDose: t.timeIntervalSince(dose.time) / 3600,
                    halfLife: halfLife,
                    absorptionHalfLife: medication.absorptionHalfLifeHours)
            }
            points.append(Point(date: t, level: level, projected: t > now))
            t = t.addingTimeInterval(step)
        }
        guard let peak = points.map(\.level).max(), peak > 0 else { return [] }
        return points.map { Point(date: $0.date, level: $0.level / peak, projected: $0.projected) }
    }

    // MARK: Typical adult elimination half-lives (hours) — prefill only, always
    // user-editable. Substring-matched against the medication name.

    static let typicalHalfLives: [(match: String, hours: Double)] = [
        ("semaglutide", 168), ("ozempic", 168), ("wegovy", 168),
        ("tirzepatide", 120), ("mounjaro", 120), ("zepbound", 120),
        ("liraglutide", 13),
        ("levothyroxine", 168),
        ("fluoxetine", 96), ("prozac", 96),
        ("sertraline", 26), ("zoloft", 26),
        ("escitalopram", 30), ("citalopram", 35),
        ("venlafaxine", 5), ("bupropion", 21),
        ("amphetamine", 11), ("adderall", 11),
        ("lisdexamfetamine", 11), ("vyvanse", 11),
        ("methylphenidate", 3), ("ritalin", 3), ("concerta", 3),
        ("atomoxetine", 5),
        ("diazepam", 43), ("alprazolam", 11), ("lorazepam", 12),
        ("zolpidem", 2.5), ("melatonin", 1),
        ("caffeine", 5),
        ("ibuprofen", 2), ("naproxen", 14),
        ("paracetamol", 2.5), ("acetaminophen", 2.5),
        ("aspirin", 3),
        ("amoxicillin", 1.2), ("azithromycin", 68), ("doxycycline", 18),
        ("metformin", 6), ("omeprazole", 1),
        ("cetirizine", 8), ("loratadine", 8), ("fexofenadine", 14),
        ("prednisone", 3.5), ("prednisolone", 3.5),
    ]

    static func suggestedHalfLife(forName name: String) -> Double? {
        let n = name.lowercased()
        guard !n.isEmpty else { return nil }
        return typicalHalfLives.first { n.contains($0.match) }?.hours
    }
}
