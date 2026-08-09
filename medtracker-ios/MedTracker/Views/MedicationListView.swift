import SwiftUI
import SwiftData

struct MedicationListView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Medication.name) private var medications: [Medication]
    @State private var showAddSheet = false

    private var active: [Medication] { medications.filter { !$0.isArchived } }
    private var archived: [Medication] { medications.filter { $0.isArchived } }

    var body: some View {
        NavigationStack {
            List {
                if medications.isEmpty {
                    ContentUnavailableView(
                        "No medications yet",
                        systemImage: "pills",
                        description: Text("Tap + to add your first medication.")
                    )
                }
                Section {
                    ForEach(active) { med in
                        NavigationLink(value: med) { medRow(med) }
                            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                Button("Archive") {
                                    med.isArchived = true
                                    save()
                                }
                                .tint(.orange)
                            }
                    }
                }
                if !archived.isEmpty {
                    Section("Archived") {
                        ForEach(archived) { med in
                            NavigationLink(value: med) { medRow(med) }
                                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                    Button("Unarchive") {
                                        med.isArchived = false
                                        save()
                                    }
                                    .tint(.blue)
                                    Button("Delete", role: .destructive) {
                                        context.delete(med)
                                        save()
                                    }
                                }
                        }
                    }
                }
            }
            .navigationTitle("Medications")
            .navigationDestination(for: Medication.self) { med in
                MedicationDetailView(medication: med)
            }
            .toolbar {
                Button {
                    showAddSheet = true
                } label: {
                    Label("Add medication", systemImage: "plus")
                }
            }
            .sheet(isPresented: $showAddSheet) {
                MedicationEditView(medication: nil)
            }
        }
    }

    @ViewBuilder
    private func medRow(_ med: Medication) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(med.displayName).font(.headline)
            if med.schedules.isEmpty {
                Text("No schedule").font(.subheadline).foregroundStyle(.secondary)
            } else {
                ForEach(med.schedules, id: \.uuid) { s in
                    Text(s.summary + (s.isPaused ? " (paused)" : ""))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    private func save() {
        try? context.save()
        NotificationManager.shared.refreshAll()
    }
}
