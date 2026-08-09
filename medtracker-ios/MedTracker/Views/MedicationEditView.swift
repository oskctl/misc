import SwiftUI
import SwiftData

/// Create (medication == nil) or edit a medication's basic details.
/// Schedules are managed from MedicationDetailView.
struct MedicationEditView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    let medication: Medication?

    @State private var name = ""
    @State private var hasStrength = true
    @State private var strengthValue = 50.0
    @State private var strengthUnit = "mg"
    @State private var hasConcentration = false
    @State private var strengthPerValue = 5.0
    @State private var strengthPerUnit = "mL"
    @State private var form = MedForm.tablet
    @State private var route = MedRoute.unspecified
    @State private var tintName = "blue"
    @State private var notes = ""
    @State private var estimateLevels = false
    @State private var halfLifeHours = 24.0
    @State private var absorption = 0.5

    /// Forms where strength is usually a concentration, not per-unit.
    private var concentrationApplies: Bool {
        [.liquid, .injection, .inhaler, .spray, .drops, .cream].contains(form)
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Medication") {
                    TextField("Name (e.g. Sertraline)", text: $name)
                    Picker("Form", selection: $form) {
                        ForEach(MedForm.allCases) { f in
                            Text(f.label).tag(f)
                        }
                    }
                    Picker("Route", selection: $route) {
                        ForEach(MedRoute.allCases) { r in
                            Text(r.label).tag(r)
                        }
                    }
                }
                Section {
                    Toggle("Has strength", isOn: $hasStrength)
                    if hasStrength {
                        HStack {
                            TextField("50", value: $strengthValue, format: .number)
                                .keyboardType(.decimalPad)
                            Picker("Unit", selection: $strengthUnit) {
                                ForEach(strengthUnits, id: \.self) { Text($0) }
                            }
                            .labelsHidden()
                        }
                        if concentrationApplies {
                            Toggle("Per volume / actuation", isOn: $hasConcentration)
                            if hasConcentration {
                                HStack {
                                    Text("per")
                                    TextField("5", value: $strengthPerValue, format: .number)
                                        .keyboardType(.decimalPad)
                                    TextField("mL", text: $strengthPerUnit)
                                }
                            }
                        }
                    }
                } header: {
                    Text("Strength")
                } footer: {
                    if hasStrength && hasConcentration {
                        Text("e.g. 250 mg per 5 mL, or 100 mcg per 1 puff.")
                    }
                }

                Section {
                    Toggle("Estimate drug levels", isOn: $estimateLevels)
                    if estimateLevels {
                        HStack {
                            Text("Half-life")
                            Spacer()
                            TextField("24", value: $halfLifeHours, format: .number)
                                .keyboardType(.decimalPad)
                                .multilineTextAlignment(.trailing)
                                .frame(width: 70)
                            Text("hours").foregroundStyle(.secondary)
                        }
                        if let suggested = PKEngine.suggestedHalfLife(forName: name),
                           suggested != halfLifeHours {
                            Button("Use typical for \(name): \(suggested.compactFormatted) h") {
                                halfLifeHours = suggested
                            }
                        }
                        Picker("Absorption", selection: $absorption) {
                            Text("Regular oral").tag(0.5)
                            Text("Extended release").tag(2.0)
                            Text("Weekly injection").tag(24.0)
                        }
                    }
                } header: {
                    Text("Levels")
                } footer: {
                    if estimateLevels {
                        Text("Draws an indicative level curve from your logged doses. Half-life varies by person — tune it until the curve matches your experience.")
                    }
                }
                Section("Color") {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 38))], spacing: 10) {
                        ForEach(medTintNames, id: \.self) { name in
                            Button {
                                tintName = name
                            } label: {
                                ZStack {
                                    Circle()
                                        .fill(medTint(name))
                                        .frame(width: 28, height: 28)
                                    if name == tintName {
                                        Circle()
                                            .strokeBorder(medTint(name), lineWidth: 2)
                                            .frame(width: 36, height: 36)
                                    }
                                }
                                .frame(width: 38, height: 38)
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 2)
                }
                Section("Notes") {
                    TextField("Optional notes", text: $notes, axis: .vertical)
                }
                if medication == nil {
                    Section {
                        Text("After saving, open the medication to add dose schedules.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle(medication == nil ? "New medication" : "Edit medication")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { saveAndDismiss() }
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
            .onAppear { loadExisting() }
        }
    }

    private func loadExisting() {
        guard let med = medication else { return }
        name = med.name
        hasStrength = med.strengthValue != nil
        strengthValue = med.strengthValue ?? 50
        strengthUnit = med.strengthUnit
        hasConcentration = !med.strengthPerUnit.isEmpty
        strengthPerValue = med.strengthPerValue == 1 && med.strengthPerUnit.isEmpty ? 5 : med.strengthPerValue
        strengthPerUnit = med.strengthPerUnit.isEmpty ? "mL" : med.strengthPerUnit
        form = med.form
        route = med.route
        tintName = med.tintName
        notes = med.notes
        estimateLevels = med.halfLifeHours != nil
        halfLifeHours = med.halfLifeHours ?? PKEngine.suggestedHalfLife(forName: med.name) ?? 24
        absorption = [0.5, 2.0, 24.0].min {
            abs($0 - med.absorptionHalfLifeHours) < abs($1 - med.absorptionHalfLifeHours)
        } ?? 0.5
    }

    private func saveAndDismiss() {
        let med = medication ?? Medication()
        med.name = name.trimmingCharacters(in: .whitespaces)
        med.strengthValue = hasStrength ? strengthValue : nil
        med.strengthUnit = strengthUnit
        if hasStrength && concentrationApplies && hasConcentration && strengthPerValue > 0 {
            med.strengthPerValue = strengthPerValue
            med.strengthPerUnit = strengthPerUnit.trimmingCharacters(in: .whitespaces)
        } else {
            med.strengthPerValue = 1
            med.strengthPerUnit = ""
        }
        med.form = form
        med.route = route
        med.tintName = tintName
        med.notes = notes
        med.halfLifeHours = estimateLevels && halfLifeHours > 0 ? halfLifeHours : nil
        med.absorptionHalfLifeHours = absorption
        if medication == nil {
            context.insert(med)
        }
        try? context.save()
        NotificationManager.shared.refreshAll()
        dismiss()
    }
}
