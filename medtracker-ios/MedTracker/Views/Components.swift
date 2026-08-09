import SwiftUI
import Charts

// Shared Health-Medications-style visual vocabulary: every medication gets a
// tinted circular icon whose symbol follows its form. All chrome is standard
// system components so the app picks up the current Liquid Glass design
// automatically when built with a modern SDK.

let medTintNames = ["blue", "teal", "mint", "green", "yellow", "orange",
                    "pink", "red", "purple", "indigo", "brown", "gray"]

func medTint(_ name: String) -> Color {
    switch name {
    case "teal": return .teal
    case "mint": return .mint
    case "green": return .green
    case "yellow": return .yellow
    case "orange": return .orange
    case "pink": return .pink
    case "red": return .red
    case "purple": return .purple
    case "indigo": return .indigo
    case "brown": return .brown
    case "gray": return .gray
    default: return .blue
    }
}

extension MedForm {
    var symbolName: String {
        switch self {
        case .tablet: return "pill.fill"
        case .capsule: return "capsule.fill"
        case .liquid: return "cross.vial.fill"
        case .injection: return "syringe.fill"
        case .inhaler: return "inhaler.fill"
        case .patch: return "bandage.fill"
        case .cream: return "hands.sparkles.fill"
        case .drops: return "drop.fill"
        case .spray: return "wind"
        case .other: return "pills.fill"
        }
    }
}

/// The tinted circle icon used everywhere a medication appears.
struct MedIcon: View {
    let medication: Medication?
    var size: CGFloat = 40

    var body: some View {
        ZStack {
            Circle()
                .fill(medTint(medication?.tintName ?? "gray").gradient)
            Image(systemName: medication?.form.symbolName ?? "pills.fill")
                .font(.system(size: size * 0.42, weight: .medium))
                .foregroundStyle(.white)
        }
        .frame(width: size, height: size)
    }
}

/// Estimated-level curve: solid past from logs, dashed projected future,
/// "now" rule. Y-axis is relative (normalized to window peak) by design.
struct LevelsChartView: View {
    let medication: Medication

    var body: some View {
        let points = PKEngine.curve(for: medication)
        let past = points.filter { !$0.projected }
        let future = points.filter { $0.projected }
        let tint = medTint(medication.tintName)
        if points.isEmpty {
            Text("Log a dose to see estimated levels.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        } else {
            Chart {
                ForEach(past) { p in
                    AreaMark(x: .value("Time", p.date), y: .value("Level", p.level))
                        .foregroundStyle(tint.opacity(0.12))
                        .interpolationMethod(.monotone)
                    LineMark(x: .value("Time", p.date), y: .value("Level", p.level),
                             series: .value("Series", "Actual"))
                        .foregroundStyle(tint)
                        .interpolationMethod(.monotone)
                }
                ForEach(future) { p in
                    LineMark(x: .value("Time", p.date), y: .value("Level", p.level),
                             series: .value("Series", "Projected"))
                        .foregroundStyle(tint.opacity(0.55))
                        .lineStyle(StrokeStyle(lineWidth: 2, dash: [4, 4]))
                        .interpolationMethod(.monotone)
                }
                RuleMark(x: .value("Now", Date.now))
                    .foregroundStyle(.secondary)
                    .lineStyle(StrokeStyle(lineWidth: 1, dash: [2, 3]))
            }
            .chartYAxis(.hidden)
            .chartYScale(domain: 0...1.05)
            .frame(height: 150)
        }
    }
}

/// Sparkline-sized level curve for the Today overview: last ~36 h solid,
/// next 12 h dashed, "now" rule. Axes hidden — the big chart lives on detail.
struct MiniLevelChart: View {
    let medication: Medication

    var body: some View {
        let points = PKEngine.curve(for: medication, pastDays: 1.5, futureDays: 0.5, stepMinutes: 15)
        let tint = medTint(medication.tintName)
        Chart {
            ForEach(points.filter { !$0.projected }) { p in
                LineMark(x: .value("Time", p.date), y: .value("Level", p.level),
                         series: .value("Series", "Actual"))
                    .foregroundStyle(tint)
                    .lineStyle(StrokeStyle(lineWidth: 1.5))
                    .interpolationMethod(.monotone)
            }
            ForEach(points.filter { $0.projected }) { p in
                LineMark(x: .value("Time", p.date), y: .value("Level", p.level),
                         series: .value("Series", "Projected"))
                    .foregroundStyle(tint.opacity(0.5))
                    .lineStyle(StrokeStyle(lineWidth: 1.5, dash: [3, 3]))
                    .interpolationMethod(.monotone)
            }
            RuleMark(x: .value("Now", Date.now))
                .foregroundStyle(.quaternary)
                .lineStyle(StrokeStyle(lineWidth: 1))
        }
        .chartXAxis(.hidden)
        .chartYAxis(.hidden)
        .chartYScale(domain: 0...1.05)
    }
}

/// Standard row: icon, title, subtitle. Trailing content is up to the caller.
struct MedRowLabel: View {
    let medication: Medication?
    let subtitle: String

    var body: some View {
        HStack(spacing: 12) {
            MedIcon(medication: medication)
            VStack(alignment: .leading, spacing: 2) {
                Text(medication?.displayName ?? "—")
                    .font(.body.weight(.semibold))
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }
}
