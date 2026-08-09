import SwiftUI
import SwiftData

struct HistoryView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \DoseLog.takenAt, order: .reverse) private var logs: [DoseLog]
    @Query(sort: \Medication.name) private var medications: [Medication]

    @State private var filterMed: Medication?
    @State private var editingLog: DoseLog?
    @State private var searchText = ""

    var body: some View {
        NavigationStack {
            List {
                adherenceHeader
                let grouped = groupedLogs
                if grouped.isEmpty {
                    ContentUnavailableView(
                        "No doses logged",
                        systemImage: "clock.arrow.circlepath",
                        description: Text("Logged and skipped doses appear here.")
                    )
                }
                ForEach(grouped, id: \.day) { group in
                    Section(dayLabel(group.day)) {
                        ForEach(group.entries, id: \.uuid) { log in
                            Button { editingLog = log } label: { logRow(log) }
                                .foregroundStyle(.primary)
                                .swipeActions(edge: .trailing) {
                                    Button("Delete", role: .destructive) {
                                        context.delete(log)
                                        try? context.save()
                                        NotificationManager.shared.refreshAll()
                                    }
                                }
                        }
                    }
                }
            }
            .navigationTitle("History")
            .searchable(text: $searchText, placement: .navigationBarDrawer(displayMode: .automatic))
            .toolbar {
                Menu {
                    Button("All medications") { filterMed = nil }
                    ForEach(medications) { med in
                        Button(med.displayName) { filterMed = med }
                    }
                } label: {
                    Label("Filter", systemImage: filterMed == nil
                          ? "line.3.horizontal.decrease.circle"
                          : "line.3.horizontal.decrease.circle.fill")
                }
            }
            .sheet(item: $editingLog) { log in
                LogEditSheet(log: log)
            }
        }
    }

    // MARK: Data

    private var filteredLogs: [DoseLog] {
        var result = logs
        if let med = filterMed {
            result = result.filter { $0.medication === med }
        }
        let q = searchText.trimmingCharacters(in: .whitespaces)
        if !q.isEmpty {
            result = result.filter {
                ($0.medication?.name.localizedCaseInsensitiveContains(q) ?? false)
                || $0.notes.localizedCaseInsensitiveContains(q)
            }
        }
        return result
    }

    private func dayLabel(_ day: Date) -> String {
        let cal = Calendar.current
        if cal.isDateInToday(day) { return "Today" }
        if cal.isDateInYesterday(day) { return "Yesterday" }
        return day.formatted(date: .abbreviated, time: .omitted)
    }

    private var groupedLogs: [(day: Date, entries: [DoseLog])] {
        let cal = Calendar.current
        let groups = Dictionary(grouping: filteredLogs) { cal.startOfDay(for: $0.takenAt) }
        return groups.keys.sorted(by: >).map { (day: $0, entries: groups[$0] ?? []) }
    }

    // MARK: Rows

    @ViewBuilder
    private var adherenceHeader: some View {
        let stats = ScheduleEngine.adherence(medications: medications, days: 7)
        if stats.scheduled > 0 {
            Section {
                HStack(spacing: 6) {
                    Text("\(Int(Double(stats.taken) / Double(stats.scheduled) * 100))%")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(.green)
                    Text("adherence · \(stats.taken) of \(stats.scheduled) doses · last 7 days")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Spacer()
                }
            }
        }
    }

    @ViewBuilder
    private func logRow(_ log: DoseLog) -> some View {
        HStack(spacing: 10) {
            MedIcon(medication: log.medication, size: 30)
            VStack(alignment: .leading, spacing: 1) {
                Text(log.medication?.displayName ?? "Deleted medication")
                    .font(.body.weight(.medium))
                    .lineLimit(1)
                HStack(spacing: 4) {
                    Text("\(log.quantity.compactFormatted) \(log.quantityUnit)")
                    if log.scheduledAt == nil {
                        Text("· ad hoc")
                    }
                    if !log.notes.isEmpty {
                        Text("· \(log.notes)").lineLimit(1)
                    }
                }
                .font(.footnote)
                .foregroundStyle(.secondary)
            }
            Spacer()
            HStack(spacing: 6) {
                Text(log.takenAt.formatted(date: .omitted, time: .shortened))
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                Image(systemName: log.status == .taken ? "checkmark.circle.fill" : "minus.circle.fill")
                    .foregroundStyle(log.status == .taken ? AnyShapeStyle(.green) : AnyShapeStyle(.tertiary))
                    .imageScale(.small)
            }
        }
    }
}

// MARK: - Edit sheet

struct LogEditSheet: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Bindable var log: DoseLog

    var body: some View {
        NavigationStack {
            Form {
                LabeledContent("Medication", value: log.medication?.displayName ?? "—")
                Picker("Status", selection: $log.statusRaw) {
                    Text("Taken").tag(DoseStatus.taken.rawValue)
                    Text("Skipped").tag(DoseStatus.skipped.rawValue)
                }
                QuantityField(quantity: $log.quantity, unit: $log.quantityUnit)
                DatePicker("Time", selection: $log.takenAt)
                if let scheduled = log.scheduledAt {
                    LabeledContent("Scheduled for",
                                   value: scheduled.formatted(date: .abbreviated, time: .shortened))
                }
                TextField("Notes", text: $log.notes)
            }
            .navigationTitle("Edit entry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        try? context.save()
                        NotificationManager.shared.refreshAll()
                        dismiss()
                    }
                }
            }
        }
    }
}
