import SwiftUI
import SwiftData

struct MedicationDetailView: View {
    @Environment(\.modelContext) private var context
    @Bindable var medication: Medication

    @State private var showEditSheet = false
    @State private var editingSchedule: Schedule?
    @State private var showNewScheduleSheet = false

    var body: some View {
        List {
            Section {
                VStack(spacing: 10) {
                    MedIcon(medication: medication, size: 76)
                    Text(medication.displayName)
                        .font(.title2.bold())
                        .multilineTextAlignment(.center)
                    Text(medication.form.label)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    if !medication.notes.isEmpty {
                        Text(medication.notes)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    if medication.isArchived {
                        Label("Archived — no reminders", systemImage: "archivebox")
                            .font(.subheadline)
                            .foregroundStyle(.orange)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .listRowBackground(Color.clear)
            }

            Section("Schedules") {
                if medication.schedules.isEmpty {
                    Text("No schedules yet. Add one to get reminders.")
                        .foregroundStyle(.secondary)
                }
                ForEach(medication.schedules, id: \.uuid) { schedule in
                    Button {
                        editingSchedule = schedule
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(schedule.kind.label).font(.headline)
                                Text(schedule.summary).font(.subheadline).foregroundStyle(.secondary)
                                if schedule.isExpired {
                                    Text("Ended").font(.caption).foregroundStyle(.orange)
                                }
                            }
                            Spacer()
                            if schedule.isPaused {
                                Image(systemName: "pause.circle").foregroundStyle(.orange)
                            }
                        }
                    }
                    .foregroundStyle(.primary)
                    .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                        Button(schedule.isPaused ? "Resume" : "Pause") {
                            schedule.isPaused.toggle()
                            save()
                        }
                        .tint(.orange)
                        Button("Delete", role: .destructive) {
                            context.delete(schedule)
                            save()
                        }
                    }
                }
                Button {
                    showNewScheduleSheet = true
                } label: {
                    Label("Add schedule", systemImage: "plus")
                }
            }

            Section("Recent history") {
                let recent = medication.logs.sorted { $0.takenAt > $1.takenAt }.prefix(10)
                if recent.isEmpty {
                    Text("No doses logged yet.").foregroundStyle(.secondary)
                }
                ForEach(Array(recent), id: \.uuid) { log in
                    HStack {
                        Image(systemName: log.status == .taken ? "checkmark.circle.fill" : "xmark.circle")
                            .foregroundStyle(log.status == .taken ? .green : .orange)
                        Text("\(log.quantity.compactFormatted) \(log.quantityUnit)")
                        Spacer()
                        Text(log.takenAt.formatted(date: .abbreviated, time: .shortened))
                            .foregroundStyle(.secondary)
                    }
                    .font(.subheadline)
                }
            }
        }
        .navigationTitle(medication.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            Button("Edit") { showEditSheet = true }
        }
        .sheet(isPresented: $showEditSheet) {
            MedicationEditView(medication: medication)
        }
        .sheet(isPresented: $showNewScheduleSheet) {
            ScheduleEditView(medication: medication, schedule: nil)
        }
        .sheet(item: $editingSchedule) { schedule in
            ScheduleEditView(medication: medication, schedule: schedule)
        }
    }

    private func save() {
        try? context.save()
        NotificationManager.shared.refreshAll()
    }
}
