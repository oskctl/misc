import SwiftUI
import SwiftData

struct TodayView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Medication.name) private var medications: [Medication]
    // Observed so inserting a log re-renders the computed sections.
    @Query private var logs: [DoseLog]

    @State private var now = Date.now
    @State private var selectedItem: DoseItem?
    @State private var selectedPRN: Schedule?
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
                        systemImage: "pills",
                        description: Text("Add a medication and a schedule to get reminders.")
                    )
                }

                if !overdue.isEmpty {
                    Section("Overdue") {
                        ForEach(overdue) { item in pendingRow(item) }
                    }
                }
                if !upcoming.isEmpty {
                    Section("Upcoming") {
                        ForEach(upcoming) { item in pendingRow(item) }
                    }
                }
                if !prn.isEmpty {
                    Section("As Needed") {
                        ForEach(prn, id: \.uuid) { schedule in prnRow(schedule) }
                    }
                }
                if !done.isEmpty {
                    Section("Logged") {
                        ForEach(done) { item in doneRow(item) }
                    }
                }
            }
            .navigationTitle("Today")
            .toolbar {
                Button {
                    showAdHocSheet = true
                } label: {
                    Label("Log a dose", systemImage: "plus")
                }
                .disabled(medications.filter { !$0.isArchived }.isEmpty)
            }
            .sheet(isPresented: $showAdHocSheet) {
                AdHocLogSheet()
            }
            .sheet(item: $selectedItem) { item in
                DoseActionSheet(occurrence: item.occurrence)
            }
            .sheet(item: $selectedPRN) { schedule in
                DoseActionSheet(schedule: schedule)
            }
            .onReceive(ticker) { now = $0 }
            .onAppear { now = .now }
        }
    }

    // MARK: Data

    struct DoseItem: Identifiable {
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
    private func pendingRow(_ item: DoseItem) -> some View {
        let schedule = item.occurrence.schedule
        Button {
            selectedItem = item
        } label: {
            HStack {
                MedRowLabel(medication: schedule.medication,
                            subtitle: "Take \(schedule.doseText)")
                Spacer()
                Text(item.occurrence.date.formatted(date: .omitted, time: .shortened))
                    .font(.subheadline)
                    .foregroundStyle(item.occurrence.date <= now ? AnyShapeStyle(.orange) : AnyShapeStyle(.secondary))
            }
        }
        .foregroundStyle(.primary)
        .swipeActions(edge: .leading, allowsFullSwipe: true) {
            Button {
                LogService.log(occurrence: item.occurrence, status: .taken, in: context)
            } label: {
                Label("Taken", systemImage: "checkmark")
            }
            .tint(.green)
        }
        .swipeActions(edge: .trailing, allowsFullSwipe: false) {
            Button {
                LogService.log(occurrence: item.occurrence, status: .skipped, in: context)
            } label: {
                Label("Skip", systemImage: "xmark")
            }
            .tint(.orange)
        }
    }

    @ViewBuilder
    private func doneRow(_ item: DoseItem) -> some View {
        let schedule = item.occurrence.schedule
        HStack {
            MedRowLabel(medication: schedule.medication,
                        subtitle: subtitleForDone(item))
            Spacer()
            Image(systemName: item.log?.status == .taken ? "checkmark.circle.fill" : "minus.circle.fill")
                .foregroundStyle(item.log?.status == .taken ? AnyShapeStyle(.green) : AnyShapeStyle(.secondary))
                .font(.title3)
        }
    }

    private func subtitleForDone(_ item: DoseItem) -> String {
        guard let log = item.log else { return "" }
        let verb = log.status == .taken ? "Taken" : "Skipped"
        return "\(verb) at \(log.takenAt.formatted(date: .omitted, time: .shortened))"
    }

    @ViewBuilder
    private func prnRow(_ schedule: Schedule) -> some View {
        Button {
            selectedPRN = schedule
        } label: {
            HStack {
                MedRowLabel(medication: schedule.medication,
                            subtitle: prnStatusText(schedule))
                Spacer()
                Image(systemName: "plus.circle.fill")
                    .foregroundStyle(.tint)
                    .font(.title3)
            }
        }
        .foregroundStyle(.primary)
    }

    private func prnStatusText(_ schedule: Schedule) -> String {
        var parts: [String] = [schedule.doseText]
        if !schedule.prnReason.isEmpty { parts.append("for \(schedule.prnReason)") }
        if schedule.kind == .everyNHours {
            if let from = ScheduleEngine.availableFrom(for: schedule), from > now {
                parts.append("allowed from \(from.formatted(date: .omitted, time: .shortened))")
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
}

// MARK: - Dose action card (Health-style)

/// Card sheet for acting on a dose: big icon, context, prominent
/// Taken / Skipped buttons. Works for a planned occurrence or a PRN schedule.
struct DoseActionSheet: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    var occurrence: Occurrence?
    var schedule: Schedule?

    @State private var time = Date.now
    @State private var qty = 1.0

    private var resolvedSchedule: Schedule? { occurrence?.schedule ?? schedule }

    var body: some View {
        VStack(spacing: 16) {
            Capsule()
                .fill(.tertiary)
                .frame(width: 36, height: 5)
                .padding(.top, 8)
            Spacer(minLength: 0)

            MedIcon(medication: resolvedSchedule?.medication, size: 72)
            VStack(spacing: 4) {
                Text(resolvedSchedule?.medication?.displayName ?? "—")
                    .font(.title2.bold())
                    .multilineTextAlignment(.center)
                Text(contextLine)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                if let s = resolvedSchedule, !s.instructions.isEmpty {
                    Text(s.instructions)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                if let warning = capWarning {
                    Label(warning, systemImage: "exclamationmark.triangle.fill")
                        .font(.subheadline)
                        .foregroundStyle(.orange)
                        .padding(.top, 4)
                }
            }

            if let s = resolvedSchedule, let maxQ = s.quantityMax, maxQ > s.quantity {
                Stepper("Quantity: \(qty.compactFormatted) \(qty == 1 ? s.doseUnitLabel : s.doseUnitLabel.pluralized)",
                        value: $qty, in: s.quantity...maxQ, step: 0.5)
                    .padding(.horizontal, 32)
            }
            DatePicker("Time", selection: $time, displayedComponents: .hourAndMinute)
                .datePickerStyle(.compact)
                .padding(.horizontal, 32)

            Spacer(minLength: 0)

            VStack(spacing: 10) {
                Button {
                    act(.taken)
                } label: {
                    Text("Log as Taken")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)

                Button {
                    act(.skipped)
                } label: {
                    Text("Skipped")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)
                .controlSize(.large)
            }
            .padding(.horizontal)
            .padding(.bottom)
        }
        .presentationDetents([.medium])
        .presentationDragIndicator(.hidden)
        .onAppear { qty = resolvedSchedule?.quantity ?? 1 }
    }

    private var contextLine: String {
        guard let s = resolvedSchedule else { return "" }
        if let occ = occurrence {
            return "Take \(s.doseDetailText) · scheduled \(occ.date.formatted(date: .omitted, time: .shortened))"
        }
        return "Take \(s.doseDetailText)"
    }

    private var capWarning: String? {
        guard let s = resolvedSchedule, let cap = s.maxPerDay else { return nil }
        let taken = ScheduleEngine.takenToday(for: s)
        return taken >= cap ? "Already at \(cap) dose limit today" : nil
    }

    private func act(_ status: DoseStatus) {
        if let occ = occurrence {
            LogService.log(occurrence: occ, status: status, at: time, quantity: qty, in: context)
        } else if let s = schedule {
            LogService.log(schedule: s, status: status, at: time, quantity: qty, in: context)
        }
        dismiss()
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
            .navigationTitle("Log a Dose")
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
