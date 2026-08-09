import SwiftUI
import SwiftData
import UIKit

/// Today is built for speed: glance, tap, done.
/// - Due Now card: circle-check taps log instantly (default dose, now) with an
///   Undo toast — no confirmation. Tapping the row body opens the adjust sheet.
/// - "Log all" batches the whole due group (the 3-pills-at-8am case) into one tap.
/// - Later doses are compact rows; as-needed meds are chips; levels are a
///   horizontal card strip; the logged history collapses to one line.
struct TodayView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \Medication.name) private var medications: [Medication]
    // Observed so inserting a log re-renders the computed sections.
    @Query private var logs: [DoseLog]

    @State private var now = Date.now
    @State private var selectedItem: DoseItem?
    @State private var selectedPRN: Schedule?
    @State private var showAdHocSheet = false
    @State private var showLogged = false
    @State private var undoLogs: [DoseLog] = []
    @State private var undoMessage: String?
    @State private var undoDismissTask: Task<Void, Never>?
    private let ticker = Timer.publish(every: 60, on: .main, in: .common).autoconnect()

    /// Doses inside this window count as "due now" (slightly early is normal).
    private static let dueSoonWindow: TimeInterval = 30 * 60

    var body: some View {
        NavigationStack {
            List {
                let items = todaysItems
                let pending = items.filter { $0.log == nil }
                let dueNow = pending.filter { $0.occurrence.date.timeIntervalSince(now) <= Self.dueSoonWindow }
                let later = pending.filter { $0.occurrence.date.timeIntervalSince(now) > Self.dueSoonWindow }
                let done = items.filter { $0.log != nil }
                let prn = prnSchedules
                let pkMeds = medications.filter { !$0.isArchived && $0.halfLifeHours != nil }

                if items.isEmpty && prn.isEmpty {
                    ContentUnavailableView(
                        "Nothing scheduled today",
                        systemImage: "pills",
                        description: Text("Add a medication and a schedule to get reminders.")
                    )
                } else {
                    statusHeader(done: done.count, total: items.count, later: later)
                }

                if !dueNow.isEmpty {
                    Section("Due Now") {
                        ForEach(dueNow) { item in pendingRow(item) }
                        if dueNow.count > 1 {
                            Button {
                                logAll(dueNow)
                            } label: {
                                Label("Log all \(dueNow.count) as taken", systemImage: "checkmark.circle.fill")
                                    .font(.headline)
                                    .frame(maxWidth: .infinity)
                            }
                            .buttonStyle(.borderedProminent)
                            .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                            .listRowBackground(Color.clear)
                        }
                    }
                }

                if !later.isEmpty {
                    Section("Later Today") {
                        ForEach(later) { item in pendingRow(item) }
                    }
                }

                if !prn.isEmpty {
                    Section("As Needed") {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 8) {
                                ForEach(prn, id: \.uuid) { schedule in prnChip(schedule) }
                            }
                            .padding(.vertical, 2)
                        }
                        .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                        .listRowBackground(Color.clear)
                    }
                }

                if !pkMeds.isEmpty {
                    Section("Levels") {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 10) {
                                ForEach(pkMeds) { med in levelCard(med) }
                            }
                            .padding(.vertical, 2)
                        }
                        .listRowInsets(EdgeInsets(top: 6, leading: 16, bottom: 6, trailing: 16))
                        .listRowBackground(Color.clear)
                    }
                }

                if !done.isEmpty {
                    Section {
                        DisclosureGroup(isExpanded: $showLogged) {
                            ForEach(done) { item in doneRow(item) }
                        } label: {
                            let taken = done.filter { $0.log?.status == .taken }.count
                            let skipped = done.count - taken
                            Label(skipped == 0 ? "\(taken) logged today"
                                                : "\(taken) logged · \(skipped) skipped",
                                  systemImage: "checkmark.circle.fill")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(.green)
                        }
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
            .overlay(alignment: .bottom) { undoToast }
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

    // MARK: Quick logging + undo

    private func quickLog(_ item: DoseItem) {
        guard let entry = LogService.log(occurrence: item.occurrence, status: .taken, in: context) else { return }
        showUndo(message: "Logged \(item.occurrence.schedule.medication?.name ?? "dose")", logs: [entry])
    }

    private func logAll(_ items: [DoseItem]) {
        let entries = items.compactMap {
            LogService.log(occurrence: $0.occurrence, status: .taken, in: context)
        }
        showUndo(message: "Logged \(entries.count) doses", logs: entries)
    }

    private func showUndo(message: String, logs newLogs: [DoseLog]) {
        undoLogs = newLogs
        withAnimation { undoMessage = message }
        undoDismissTask?.cancel()
        undoDismissTask = Task {
            try? await Task.sleep(nanoseconds: 4_000_000_000)
            if !Task.isCancelled {
                withAnimation { undoMessage = nil }
            }
        }
    }

    private func undo() {
        for log in undoLogs { context.delete(log) }
        try? context.save()
        NotificationManager.shared.refreshAll()
        undoLogs = []
        undoDismissTask?.cancel()
        withAnimation { undoMessage = nil }
    }

    @ViewBuilder
    private var undoToast: some View {
        if let message = undoMessage {
            HStack(spacing: 12) {
                Text(message).font(.subheadline.weight(.medium))
                Button("Undo") { undo() }
                    .font(.subheadline.weight(.semibold))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(.regularMaterial, in: Capsule())
            .shadow(color: .black.opacity(0.1), radius: 8, y: 2)
            .padding(.bottom, 4)
            .transition(.move(edge: .bottom).combined(with: .opacity))
        }
    }

    // MARK: Rows

    @ViewBuilder
    private func statusHeader(done: Int, total: Int, later: [DoseItem]) -> some View {
        Section {
            HStack(spacing: 14) {
                Gauge(value: Double(done), in: 0...Double(max(total, 1))) {
                    EmptyView()
                } currentValueLabel: {
                    Text("\(done)")
                        .font(.caption.weight(.bold))
                }
                .gaugeStyle(.accessoryCircularCapacity)
                .tint(.green)
                .scaleEffect(0.8)
                .frame(width: 44, height: 44)
                VStack(alignment: .leading, spacing: 2) {
                    Text(total == 0 ? "No scheduled doses" : "\(done) of \(total) done")
                        .font(.headline)
                    Text(later.first.map {
                        "Next at \($0.occurrence.date.formatted(date: .omitted, time: .shortened))"
                    } ?? (done >= total && total > 0 ? "All caught up" : fmtDate(now)))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Spacer()
            }
        }
    }

    private func fmtDate(_ d: Date) -> String {
        d.formatted(.dateTime.weekday(.wide).month().day())
    }

    /// Pending dose: row body opens the adjust sheet; the trailing circle logs
    /// instantly. Swipes still work for taken/skip.
    @ViewBuilder
    private func pendingRow(_ item: DoseItem) -> some View {
        let schedule = item.occurrence.schedule
        let overdue = item.occurrence.date <= now
        HStack(spacing: 8) {
            Button {
                selectedItem = item
            } label: {
                HStack {
                    MedRowLabel(medication: schedule.medication,
                                subtitle: "Take \(schedule.doseText)")
                    Spacer()
                    Text(item.occurrence.date.formatted(date: .omitted, time: .shortened))
                        .font(.subheadline)
                        .foregroundStyle(overdue ? AnyShapeStyle(.orange) : AnyShapeStyle(.secondary))
                }
            }
            .buttonStyle(.plain)
            Button {
                quickLog(item)
            } label: {
                Image(systemName: "circle")
                    .font(.title2)
                    .foregroundStyle(.tint)
            }
            .buttonStyle(.borderless)
            .accessibilityLabel("Log \(schedule.medication?.name ?? "dose") as taken")
        }
        .swipeActions(edge: .leading, allowsFullSwipe: true) {
            Button {
                quickLog(item)
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
            MedRowLabel(medication: schedule.medication, subtitle: doneSubtitle(item))
            Spacer()
            Image(systemName: item.log?.status == .taken ? "checkmark.circle.fill" : "minus.circle.fill")
                .foregroundStyle(item.log?.status == .taken ? AnyShapeStyle(.green) : AnyShapeStyle(.secondary))
                .font(.title3)
        }
    }

    private func doneSubtitle(_ item: DoseItem) -> String {
        guard let log = item.log else { return "" }
        let verb = log.status == .taken ? "Taken" : "Skipped"
        return "\(verb) at \(log.takenAt.formatted(date: .omitted, time: .shortened))"
    }

    /// Compact as-needed chip: name + availability; tap opens the log card.
    @ViewBuilder
    private func prnChip(_ schedule: Schedule) -> some View {
        let med = schedule.medication
        let lockedUntil = ScheduleEngine.availableFrom(for: schedule).flatMap { $0 > now ? $0 : nil }
        Button {
            selectedPRN = schedule
        } label: {
            HStack(spacing: 6) {
                MedIcon(medication: med, size: 22)
                Text(med?.name ?? "—")
                    .font(.subheadline.weight(.medium))
                if let until = lockedUntil {
                    Text(until.formatted(date: .omitted, time: .shortened))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    Image(systemName: "plus")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.tint)
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 7)
            .background(Capsule().fill(Color(uiColor: .tertiarySystemFill)))
            .opacity(lockedUntil == nil ? 1 : 0.6)
        }
        .buttonStyle(.plain)
    }

    /// Compact level card for the horizontal strip.
    @ViewBuilder
    private func levelCard(_ med: Medication) -> some View {
        NavigationLink {
            MedicationDetailView(medication: med)
        } label: {
            VStack(alignment: .leading, spacing: 5) {
                HStack(spacing: 6) {
                    MedIcon(medication: med, size: 20)
                    Text(med.name)
                        .font(.subheadline.weight(.semibold))
                        .lineLimit(1)
                }
                if let status = PKEngine.currentStatus(for: med) {
                    Text("≈\(Int(status.level * 100))% · \(status.trend)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                } else {
                    Text("No doses yet")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                MiniLevelChart(medication: med)
                    .frame(width: 128, height: 34)
            }
            .padding(10)
            .background(RoundedRectangle(cornerRadius: 12).fill(Color(uiColor: .tertiarySystemFill)))
        }
        .buttonStyle(.plain)
    }
}
