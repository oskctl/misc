import SwiftUI

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
