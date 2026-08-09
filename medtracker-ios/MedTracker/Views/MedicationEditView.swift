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
    @State private var form = MedForm.tablet
    @State private var tintName = "blue"
    @State private var notes = ""

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
                }
                Section("Strength") {
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
                    }
                }
                Section("Color") {
                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 44))], spacing: 12) {
                        ForEach(medTintNames, id: \.self) { name in
                            Button {
                                tintName = name
                            } label: {
                                ZStack {
                                    Circle()
                                        .fill(medTint(name).gradient)
                                        .frame(width: 36, height: 36)
                                    if name == tintName {
                                        Image(systemName: "checkmark")
                                            .font(.subheadline.weight(.bold))
                                            .foregroundStyle(.white)
                                    }
                                }
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.vertical, 4)
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
        form = med.form
        tintName = med.tintName
        notes = med.notes
    }

    private func saveAndDismiss() {
        let med = medication ?? Medication()
        med.name = name.trimmingCharacters(in: .whitespaces)
        med.strengthValue = hasStrength ? strengthValue : nil
        med.strengthUnit = strengthUnit
        med.form = form
        med.tintName = tintName
        med.notes = notes
        if medication == nil {
            context.insert(med)
        }
        try? context.save()
        NotificationManager.shared.refreshAll()
        dismiss()
    }
}
