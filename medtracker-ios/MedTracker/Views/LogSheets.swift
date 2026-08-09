import SwiftUI
import SwiftData

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

            MedIcon(medication: resolvedSchedule?.medication, size: 52)
            VStack(spacing: 4) {
                Text(resolvedSchedule?.medication?.displayName ?? "—")
                    .font(.title3.bold())
                    .multilineTextAlignment(.center)
                Text(contextLine)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                if let s = resolvedSchedule, !s.instructions.isEmpty {
                    Text(s.instructions)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                if let warning = capWarning {
                    Label(warning, systemImage: "exclamationmark.triangle.fill")
                        .font(.footnote.weight(.medium))
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
        guard let s = resolvedSchedule else { return nil }
        if let cap = s.maxPerDay, ScheduleEngine.takenToday(for: s) >= cap {
            return "Already at \(cap) dose limit today"
        }
        if let cap = s.maxActivePerDay, let taken = s.activeTakenToday, taken >= cap,
           let unit = s.medication?.strengthUnit {
            return "Already at \(cap.compactFormatted) \(unit) limit today"
        }
        return nil
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
