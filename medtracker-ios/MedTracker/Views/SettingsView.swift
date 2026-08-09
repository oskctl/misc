import SwiftUI
import SwiftData
import UIKit
import UserNotifications

struct SettingsView: View {
    @Environment(\.modelContext) private var context
    @ObservedObject var lock: AppLockModel
    @Query private var medications: [Medication]
    @Query private var logs: [DoseLog]

    @State private var notifStatus: UNAuthorizationStatus = .notDetermined
    @State private var exportURL: URL?

    var body: some View {
        NavigationStack {
            Form {
                Section("Reminders") {
                    LabeledContent("Notifications", value: notifStatusText)
                    if notifStatus == .denied {
                        Button("Open iOS Settings") {
                            if let url = URL(string: UIApplication.openSettingsURLString) {
                                UIApplication.shared.open(url)
                            }
                        }
                    } else if notifStatus == .notDetermined {
                        Button("Enable notifications") {
                            NotificationManager.shared.requestAuthorization()
                        }
                    }
                    Button("Refresh reminders now") {
                        NotificationManager.shared.refreshAll()
                    }
                }

                Section {
                    Toggle("Require Face ID / passcode", isOn: $lock.enabled)
                        .disabled(!AppLockModel.biometryAvailable)
                } header: {
                    Text("Privacy")
                } footer: {
                    Text("Data never leaves this device. The store is encrypted at rest; notification quick actions still work while locked.")
                }

                Section("Data") {
                    LabeledContent("Medications", value: String(medications.count))
                    LabeledContent("Logged doses", value: String(logs.count))
                    Button("Export JSON…") { export() }
                    if let url = exportURL {
                        ShareLink(item: url) {
                            Label("Share export", systemImage: "square.and.arrow.up")
                        }
                    }
                }

                Section {
                    Text("MedTracker is a personal logging tool, not medical advice. Always follow your prescriber's instructions.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .navigationTitle("Settings")
            .onAppear { refreshNotifStatus() }
        }
    }

    private var notifStatusText: String {
        switch notifStatus {
        case .authorized, .provisional, .ephemeral: return "Enabled"
        case .denied: return "Denied"
        case .notDetermined: return "Not requested"
        @unknown default: return "Unknown"
        }
    }

    private func refreshNotifStatus() {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            DispatchQueue.main.async { notifStatus = settings.authorizationStatus }
        }
    }

    // MARK: Export

    private struct ExportMed: Codable {
        var name: String
        var strength: String
        var form: String
        var notes: String
        var archived: Bool
        var schedules: [String]
    }
    private struct ExportLog: Codable {
        var medication: String
        var status: String
        var quantity: Double
        var unit: String
        var takenAt: Date
        var scheduledAt: Date?
        var notes: String
    }
    private struct ExportFile: Codable {
        var exportedAt: Date
        var medications: [ExportMed]
        var logs: [ExportLog]
    }

    private func export() {
        let file = ExportFile(
            exportedAt: .now,
            medications: medications.map { med in
                ExportMed(name: med.name,
                          strength: med.strengthValue.map { "\($0.compactFormatted) \(med.strengthUnit)" } ?? "",
                          form: med.form.rawValue,
                          notes: med.notes,
                          archived: med.isArchived,
                          schedules: med.schedules.map(\.summary))
            },
            logs: logs.map {
                ExportLog(medication: $0.medication?.displayName ?? "deleted",
                          status: $0.statusRaw,
                          quantity: $0.quantity,
                          unit: $0.quantityUnit,
                          takenAt: $0.takenAt,
                          scheduledAt: $0.scheduledAt,
                          notes: $0.notes)
            }
        )
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        encoder.dateEncodingStrategy = .iso8601
        guard let data = try? encoder.encode(file) else { return }
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent("medtracker-export.json")
        try? data.write(to: url, options: [.atomic, .completeFileProtection])
        exportURL = url
    }
}
