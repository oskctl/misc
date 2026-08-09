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
        // Match what the row displays (name + strength), not just the name.
        return medications.filter { $0.displayName.localizedCaseInsensitiveContains(q) }
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
                } else if filtered.isEmpty {
                    ContentUnavailableView.search(text: searchText)
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
        let schedules = sortedSchedules(med)
        HStack(spacing: 10) {
            MedIcon(medication: med)
            VStack(alignment: .leading, spacing: 1) {
                Text(med.displayName)
                    .font(.body.weight(.medium))
                    .lineLimit(1)
                if schedules.isEmpty {
                    Text("No schedule")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                ForEach(schedules, id: \.uuid) { s in
                    Text(s.isPaused ? s.summary + " · paused" : s.summary)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                if let badge = statusBadge(schedules) {
                    Text(badge)
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.orange)
                }
            }
        }
    }

    /// Deterministic order — the SwiftData to-many relationship is unordered.
    private func sortedSchedules(_ med: Medication) -> [Schedule] {
        med.schedules.sorted {
            ($0.startDate, $0.uuid.uuidString) < ($1.startDate, $1.uuid.uuidString)
        }
    }

    /// A running course wins; "complete" only when no course is still running.
    private func statusBadge(_ schedules: [Schedule]) -> String? {
        let courses = schedules.filter { $0.durationKind != .ongoing }
        if let running = courses.first(where: { !$0.isExpired }) {
            return running.courseProgressText
        }
        if courses.contains(where: { $0.isExpired }) {
            return "Course complete"
        }
        return nil
    }

    private func save() {
        try? context.save()
        NotificationManager.shared.refreshAll()
    }
}
