import SwiftUI
import SwiftData
import UIKit

/// Create (schedule == nil) or edit a dose schedule for a medication.
struct ScheduleEditView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    let medication: Medication
    let schedule: Schedule?

    @State private var kind = ScheduleKind.fixedTimes
    @State private var dayPattern = DayPattern.daily
    @State private var timesOfDay: [Int] = [8 * 60]
    @State private var daysOfWeek: Set<Int> = []
    @State private var intervalDays = 2
    @State private var cycleDaysOn = 21
    @State private var cycleDaysOff = 7
    @State private var anchorDate = Calendar.current.startOfDay(for: .now)
    @State private var hoursBetween = 6.0
    @State private var hasMaxPerDay = false
    @State private var maxPerDay = 4
    @State private var quantity = 1.0
    @State private var quantityUnit = "tablet"
    @State private var instructions = ""
    @State private var startDate = Calendar.current.startOfDay(for: .now)
    @State private var hasEndDate = false
    @State private var endDate = Calendar.current.date(byAdding: .day, value: 7, to: .now) ?? .now

    var body: some View {
        NavigationStack {
            Form {
                Section("Type") {
                    Picker("Type", selection: $kind) {
                        ForEach(ScheduleKind.allCases) { k in
                            Text(k.label).tag(k)
                        }
                    }
                    .pickerStyle(.segmented)
                    typeFootnote
                }

                switch kind {
                case .fixedTimes:
                    fixedTimesSections
                case .everyNHours:
                    everyNHoursSection
                case .asNeeded:
                    EmptyView()
                }

                if kind != .fixedTimes {
                    Section("Daily limit") {
                        Toggle("Max doses per day", isOn: $hasMaxPerDay)
                        if hasMaxPerDay {
                            Stepper("\(maxPerDay) per day", value: $maxPerDay, in: 1...24)
                        }
                    }
                }

                Section("Dose") {
                    QuantityField(quantity: $quantity, unit: $quantityUnit)
                    TextField("Instructions (e.g. with food)", text: $instructions)
                }

                Section("Duration") {
                    DatePicker("Starts", selection: $startDate, displayedComponents: .date)
                    Toggle("Ends", isOn: $hasEndDate)
                    if hasEndDate {
                        DatePicker("End date", selection: $endDate, displayedComponents: .date)
                    }
                }
            }
            .navigationTitle(schedule == nil ? "New schedule" : "Edit schedule")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { saveAndDismiss() }
                        .disabled(!isValid)
                }
            }
            .onAppear { loadExisting() }
        }
    }

    // MARK: Sections

    @ViewBuilder
    private var typeFootnote: some View {
        switch kind {
        case .fixedTimes:
            Text("Reminders at set times on a repeating day pattern.")
                .font(.footnote).foregroundStyle(.secondary)
        case .everyNHours:
            Text("No fixed times — after you log a dose, the next reminder fires N hours later. Good for painkillers.")
                .font(.footnote).foregroundStyle(.secondary)
        case .asNeeded:
            Text("No reminders. The medication appears on Today for one-tap logging.")
                .font(.footnote).foregroundStyle(.secondary)
        }
    }

    @ViewBuilder
    private var fixedTimesSections: some View {
        Section("Repeats") {
            Picker("Pattern", selection: $dayPattern) {
                ForEach(DayPattern.allCases) { p in
                    Text(p.label).tag(p)
                }
            }
            switch dayPattern {
            case .daily:
                EmptyView()
            case .daysOfWeek:
                WeekdayPicker(selection: $daysOfWeek)
            case .everyNDays:
                Stepper(intervalDays == 7 ? "Weekly" : "Every \(intervalDays) days",
                        value: $intervalDays, in: 2...90)
                DatePicker("Starting from", selection: $anchorDate, displayedComponents: .date)
            case .cycle:
                Stepper("\(cycleDaysOn) days on", value: $cycleDaysOn, in: 1...90)
                Stepper("\(cycleDaysOff) days off", value: $cycleDaysOff, in: 1...90)
                DatePicker("Cycle starts", selection: $anchorDate, displayedComponents: .date)
            }
        }

        Section {
            ForEach(timesOfDay.indices, id: \.self) { i in
                DatePicker("Time \(i + 1)",
                           selection: minutesBinding(at: i),
                           displayedComponents: .hourAndMinute)
            }
            .onDelete { offsets in
                timesOfDay.remove(atOffsets: offsets)
            }
            Button {
                let last = timesOfDay.last ?? 8 * 60
                timesOfDay.append(min(last + 4 * 60, 23 * 60 + 59))
            } label: {
                Label("Add time", systemImage: "plus")
            }
        } header: {
            Text("Times (\(timesOfDay.count)× per day)")
        } footer: {
            HStack {
                presetButton("1× daily", [9 * 60])
                presetButton("2×", [8 * 60, 20 * 60])
                presetButton("3×", [8 * 60, 14 * 60, 20 * 60])
                presetButton("4×", [8 * 60, 12 * 60, 16 * 60, 20 * 60])
            }
        }
    }

    @ViewBuilder
    private var everyNHoursSection: some View {
        Section("Interval") {
            Stepper("Every \(hoursBetween.compactFormatted) hours",
                    value: $hoursBetween, in: 0.5...48, step: 0.5)
        }
    }

    private func presetButton(_ label: String, _ times: [Int]) -> some View {
        Button(label) { timesOfDay = times }
            .buttonStyle(.bordered)
            .font(.caption)
    }

    private func minutesBinding(at index: Int) -> Binding<Date> {
        Binding<Date> {
            let m = index < timesOfDay.count ? timesOfDay[index] : 8 * 60
            return Calendar.current.date(bySettingHour: m / 60, minute: m % 60, second: 0, of: .now) ?? .now
        } set: { date in
            guard index < timesOfDay.count else { return }
            let c = Calendar.current.dateComponents([.hour, .minute], from: date)
            timesOfDay[index] = (c.hour ?? 8) * 60 + (c.minute ?? 0)
        }
    }

    // MARK: Validation / persistence

    private var isValid: Bool {
        if quantity <= 0 { return false }
        switch kind {
        case .fixedTimes:
            if timesOfDay.isEmpty { return false }
            if dayPattern == .daysOfWeek && daysOfWeek.isEmpty { return false }
            return true
        case .everyNHours, .asNeeded:
            return true
        }
    }

    private func loadExisting() {
        if let s = schedule {
            kind = s.kind
            dayPattern = s.dayPattern
            timesOfDay = s.timesOfDay
            daysOfWeek = Set(s.daysOfWeek)
            intervalDays = s.intervalDays
            cycleDaysOn = s.cycleDaysOn
            cycleDaysOff = s.cycleDaysOff
            anchorDate = s.anchorDate
            hoursBetween = s.hoursBetween
            hasMaxPerDay = s.maxPerDay != nil
            maxPerDay = s.maxPerDay ?? 4
            quantity = s.quantity
            quantityUnit = s.quantityUnit
            instructions = s.instructions
            startDate = s.startDate
            hasEndDate = s.endDate != nil
            endDate = s.endDate ?? endDate
        } else {
            quantityUnit = medication.form.defaultDoseUnit
        }
    }

    private func saveAndDismiss() {
        let s = schedule ?? Schedule()
        s.kind = kind
        s.dayPattern = dayPattern
        s.timesOfDay = timesOfDay.sorted()
        s.daysOfWeek = Array(daysOfWeek).sorted()
        s.intervalDays = intervalDays
        s.cycleDaysOn = cycleDaysOn
        s.cycleDaysOff = cycleDaysOff
        s.anchorDate = anchorDate
        s.hoursBetween = hoursBetween
        s.maxPerDay = hasMaxPerDay ? maxPerDay : nil
        s.quantity = quantity
        s.quantityUnit = quantityUnit
        s.instructions = instructions
        s.startDate = startDate
        s.endDate = hasEndDate ? endDate : nil
        if schedule == nil {
            s.medication = medication
            context.insert(s)
        }
        try? context.save()
        NotificationManager.shared.refreshAll()
        dismiss()
    }
}

/// Seven tappable chips, ordered by the user's locale first-weekday.
struct WeekdayPicker: View {
    @Binding var selection: Set<Int>

    var body: some View {
        let cal = Calendar.current
        HStack(spacing: 6) {
            ForEach(0..<7, id: \.self) { i in
                let weekday = ((cal.firstWeekday - 1 + i) % 7) + 1  // 1=Sun … 7=Sat
                let label = cal.veryShortWeekdaySymbols[weekday - 1]
                let isOn = selection.contains(weekday)
                Button {
                    if isOn { selection.remove(weekday) } else { selection.insert(weekday) }
                } label: {
                    Text(label)
                        .font(.subheadline.weight(.medium))
                        .frame(maxWidth: .infinity, minHeight: 34)
                        .background(isOn ? Color.accentColor : Color(uiColor: .systemGray5))
                        .foregroundStyle(isOn ? Color.white : Color.primary)
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
            }
        }
    }
}
