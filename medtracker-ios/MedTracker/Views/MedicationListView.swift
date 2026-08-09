import SwiftUI
import SwiftData

struct MedicationListView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Medication.name) private var medications: [Medication]
    @State private var showAddSheet = false
    @State private var searchText = ""

    private var filtered: [Medication] {
        let q = searchText.trimmingCharacters(in: .whitespaces)
        guard !q.isEmpty else { return medications }
        return medications.filter { $0.name.localizedCaseInsensitiveContains(q) }
    }
    private var active: [Medication] { filtered.filter { !$0.isArchived } }
    private var archived: [Medication] { filtered.filter { $0.isArchived } }

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
            .searchable(text: $searchText, placement: .navigationBarDrawer(displayMode: .automatic))
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
        HStack(spacing: 10) {
            MedIcon(medication: med)
            VStack(alignment: .leading, spacing: 1) {
                Text(med.displayName)
                    .font(.body.weight(.medium))
                    .lineLimit(1)
                Text(scheduleLine(med))
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                if let badge = statusBadge(med) {
                    Text(badge)
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.orange)
                }
            }
        }
    }

    private func scheduleLine(_ med: Medication) -> String {
        med.schedules.isEmpty
            ? "No schedule"
            : med.schedules.map(\.summary).joined(separator: " · ")
    }

    private func statusBadge(_ med: Medication) -> String? {
        if med.schedules.contains(where: { $0.isPaused }) { return "Paused" }
        for s in med.schedules {
            if let p = s.courseProgress {
                return s.isExpired ? "Course complete"
                     : p.unit == "day" ? "Day \(p.done) of \(p.total)"
                                       : "\(p.done) of \(p.total) doses"
            }
        }
        return nil
    }

    private func save() {
        try? context.save()
        NotificationManager.shared.refreshAll()
    }
}
