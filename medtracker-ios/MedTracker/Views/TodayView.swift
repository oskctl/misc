import SwiftUI
import SwiftData

struct TodayView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Medication.name) private var medications: [Medication]
    // Observed so inserting a log re-renders the computed sections.
    @Query private var logs: [DoseLog]

    @State private var now = Date.now
    @State private var showAdHocSheet = false
    private let ticker = Timer.publish(every: 60, on: .main, in: .common).autoconnect()

    var body: some View {
        NavigationStack {
            List {
                let items = todaysItems
                let overdue = items.filter { $0.log == nil && $0.occurrence.date <= now }
                let upcoming = items.filter { $0.log == nil && $0.occurrence.date > now }
                let done = items.filter { $0.log != nil }
                let prn = prnSchedules

                if items.isEmpty && prn.isEmpty {
                    ContentUnavailableView(
                        "Nothing scheduled today",
                        systemImage: "checkmark.circle",
                        description: Text("Add a medication and a schedule to get reminders.")
                    )
                }

                if !overdue.isEmpty {
                    Section("Overdue") {
                        ForEach(overdue) { item in doseRow(item) }
                    }
                }
                if !upcoming.isEmpty {
                    Section("Upcoming") {
                        ForEach(upcoming) { item in doseRow(item) }
                    }
                }
                if !prn.isEmpty {
                    Section("As needed") {
                        ForEach(prn, id: \.uuid) { schedule in prnRow(schedule) }
                    }
                }
                if !done.isEmpty {
                    Section("Done") {
                        ForEach(done) { item in doseRow(item) }
                    }
                }
            }
            .navigationTitle("Today")
            .toolbar {
                Button {
                    showAdHocSheet = true
                } label: {
                    Label("Log a dose", systemImage: "plus.circle")
                }
                .disabled(medications.filter { !$0.isArchived }.isEmpty)
            }
            .sheet(isPresented: $showAdHocSheet) {
                AdHocLogSheet()
            }
            .onReceive(ticker) { now = $0 }
            .onAppear { now = .now }
        }
    }

    // MARK: Data

    private struct DoseItem: Identifiable {
        let occurrence: Occurrence
        let log: DoseLog?
        var id: String { occurrence.id }
    }

    private var todaysItems: [DoseItem] {
        let cal = Calendar.current
        let start = cal.startOfDay(for: now)
        guard let end = cal.date(byAdding: .day, value: 1, to: start) else { return [] }
        return ScheduleEngine
            .allOccurrences(medications: medications, in: DateInterval(start: start, end: end))
            .map { DoseItem(occurrence: $0, log: ScheduleEngine.log(for: $0)) }
    }

    /// everyNHours + asNeeded schedules of active meds.
    private var prnSchedules: [Schedule] {
        medications
            .filter { !$0.isArchived }
            .flatMap { $0.activeSchedules }
            .filter { $0.kind != .fixedTimes }
    }

    // MARK: Rows

    @ViewBuilder
    private func doseRow(_ item: DoseItem) -> some View {
        let med = item.occurrence.schedule.medication
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(med?.displayName ?? "—").font(.headline)
                Text("\(item.occurrence.schedule.doseText) at \(item.occurrence.date.formatted(date: .omitted, time: .shortened))")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            if let log = item.log {
                statusBadge(log.status)
            } else {
                Button {
                    LogService.log(occurrence: item.occurrence, status: .skipped, in: context)
                } label: {
                    Image(systemName: "xmark.circle").font(.title2)
                }
                .buttonStyle(.borderless)
                .foregroundStyle(.orange)
                Button {
                    LogService.log(occurrence: item.occurrence, status: .taken, in: context)
                } label: {
                    Image(systemName: "checkmark.circle.fill").font(.title2)
                }
                .buttonStyle(.borderless)
                .foregroundStyle(.green)
            }
        }
    }

    @ViewBuilder
    private func prnRow(_ schedule: Schedule) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(schedule.medication?.displayName ?? "—").font(.headline)
                Text(prnStatusText(schedule))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button("Log") {
                LogService.log(schedule: schedule, in: context)
            }
            .buttonStyle(.bordered)
        }
    }

    private func prnStatusText(_ schedule: Schedule) -> String {
        var parts: [String] = [schedule.doseText]
        if schedule.kind == .everyNHours {
            if let next = ScheduleEngine.nextAllowed(for: schedule), next > now {
                parts.append("next from \(next.formatted(date: .omitted, time: .shortened))")
            } else {
                parts.append("available now")
            }
        }
        if let cap = schedule.maxPerDay {
            let taken = ScheduleEngine.takenToday(for: schedule)
            parts.append("\(taken) of \(cap) today")
        }
        return parts.joined(separator: " · ")
    }

    @ViewBuilder
    private func statusBadge(_ status: DoseStatus) -> some View {
        switch status {
        case .taken:
            Label("Taken", systemImage: "checkmark.circle.fill")
                .font(.subheadline).foregroundStyle(.green)
        case .skipped:
            Label("Skipped", systemImage: "xmark.circle")
                .font(.subheadline).foregroundStyle(.orange)
        }
    }
}

// MARK: - Ad-hoc log sheet

struct AdHocLogSheet: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \Medication.name) private var medications: [Medication]

    @State private var selected: Medication?
    @State private var quantity = 1.0
    @State private var quantityUnit = "tablet"
    @State private var time = Date.now
    @State private var notes = ""

    private var active: [Medication] { medications.filter { !$0.isArchived } }

    var body: some View {
        NavigationStack {
            Form {
                Picker("Medication", selection: $selected) {
                    Text("Choose…").tag(Medication?.none)
                    ForEach(active) { med in
                        Text(med.displayName).tag(Optional(med))
                    }
                }
                .onChange(of: selected) { _, med in
                    if let med { quantityUnit = med.form.defaultDoseUnit }
                }
                QuantityField(quantity: $quantity, unit: $quantityUnit)
                DatePicker("Time", selection: $time)
                TextField("Notes", text: $notes)
            }
            .navigationTitle("Log a dose")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Log") {
                        if let med = selected {
                            LogService.logAdHoc(medication: med, quantity: quantity,
                                                quantityUnit: quantityUnit, at: time,
                                                notes: notes, in: context)
                        }
                        dismiss()
                    }
                    .disabled(selected == nil)
                }
            }
        }
    }
}

/// Shared quantity + unit editor.
struct QuantityField: View {
    @Binding var quantity: Double
    @Binding var unit: String

    var body: some View {
        HStack {
            Text("Quantity")
            Spacer()
            TextField("1", value: $quantity, format: .number)
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.trailing)
                .frame(width: 60)
            Menu {
                ForEach(doseUnits, id: \.self) { u in
                    Button(u) { unit = u }
                }
            } label: {
                Text(unit).foregroundStyle(.tint)
            }
        }
    }
}
