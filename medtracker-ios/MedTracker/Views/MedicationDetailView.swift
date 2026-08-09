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
                HStack(spacing: 12) {
                    MedIcon(medication: medication, size: 48)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(medication.displayName)
                            .font(.headline)
                        Text(medication.route == .unspecified
                             ? medication.form.label
                             : "\(medication.form.label) · \(medication.route.label)")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        if !medication.notes.isEmpty {
                            Text(medication.notes)
                                .font(.footnote)
                                .foregroundStyle(.secondary)
                        }
                        if medication.isArchived {
                            Label("Archived — no reminders", systemImage: "archivebox")
                                .font(.footnote)
                                .foregroundStyle(.orange)
                        }
                    }
                    Spacer()
                }
                .padding(.vertical, 2)
            }

            if medication.halfLifeHours != nil {
                Section {
                    LevelsChartView(medication: medication)
                } header: {
                    Text("Estimated level")
                } footer: {
                    Text("Relative to the past week's peak, from a \(medication.halfLifeHours?.compactFormatted ?? "–") h half-life. Dashed = projected if scheduled doses are taken. Indicative only — not medical guidance.")
                }
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
                                Text(schedule.summary)
                                    .font(.subheadline.weight(.medium))
                                Text(schedule.kind.label).font(.footnote).foregroundStyle(.secondary)
                                if let p = schedule.courseProgress {
                                    Text(schedule.isExpired
                                         ? "Course complete"
                                         : (p.unit == "day" ? "Day \(p.done) of \(p.total)"
                                                            : "\(p.done) of \(p.total) doses taken"))
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(schedule.isExpired ? .green : .orange)
                                } else if schedule.isExpired {
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
                let recent = medication.logs.sorted { $0.takenAt > $1.takenAt }.prefix(5)
                if recent.isEmpty {
                    Text("No doses logged yet.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                ForEach(Array(recent), id: \.uuid) { log in
                    HStack {
                        Image(systemName: log.status == .taken ? "checkmark.circle.fill" : "minus.circle.fill")
                            .foregroundStyle(log.status == .taken ? AnyShapeStyle(.green) : AnyShapeStyle(.tertiary))
                            .imageScale(.small)
                        Text("\(log.quantity.compactFormatted) \(log.quantityUnit)")
                        Spacer()
                        Text(log.takenAt.formatted(date: .abbreviated, time: .shortened))
                            .foregroundStyle(.secondary)
                    }
                    .font(.footnote)
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
