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
    @State private var hasMinHours = false
    @State private var minHours = 4.0
    @State private var hasMaxPerDay = false
    @State private var maxPerDay = 4
    @State private var hasMaxActive = false
    @State private var maxActive = 4000.0
    @State private var prnReason = ""
    @State private var quantity = 1.0
    @State private var hasRange = false
    @State private var quantityMaxV = 2.0
    @State private var doseInActive = false
    @State private var quantityUnit = "tablet"
    @State private var instructions = ""
    @State private var startDate = Calendar.current.startOfDay(for: .now)
    @State private var durationKind = DurationKind.ongoing
    @State private var courseDays = 10
    @State private var courseDoses = 20

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
                    Section("Limits") {
                        Toggle("Max doses per day", isOn: $hasMaxPerDay)
                        if hasMaxPerDay {
                            Stepper("\(maxPerDay) per day", value: $maxPerDay, in: 1...24)
                        }
                        if medication.strengthValue != nil {
                            Toggle("Max \(medication.strengthUnit) per day", isOn: $hasMaxActive)
                            if hasMaxActive {
                                HStack {
                                    Text("Limit")
                                    Spacer()
                                    TextField("4000", value: $maxActive, format: .number)
                                        .keyboardType(.decimalPad)
                                        .multilineTextAlignment(.trailing)
                                        .frame(width: 80)
                                    Text(medication.strengthUnit).foregroundStyle(.secondary)
                                }
                            }
                        }
                        TextField("Reason (e.g. for headache)", text: $prnReason)
                    }
                }

                Section {
                    QuantityField(quantity: $quantity, unit: $quantityUnit)
                    Toggle("Dose range (e.g. 1–2)", isOn: $hasRange)
                    if hasRange {
                        Stepper("Up to \(quantityMaxV.compactFormatted)",
                                value: $quantityMaxV, in: quantity + 0.5...50, step: 0.5)
                    }
                    if medication.strengthValue != nil {
                        Toggle("Dose in \(medication.strengthUnit)", isOn: $doseInActive)
                    }
                    TextField("Instructions (e.g. with food)", text: $instructions)
                } header: {
                    Text("Dose")
                } footer: {
                    if doseInActive {
                        Text("The quantity is an amount of \(medication.strengthUnit) (e.g. insulin units), not a count of \(medication.form.defaultDoseUnit.pluralized).")
                    }
                }

                Section("Duration") {
                    DatePicker("Starts", selection: $startDate, displayedComponents: .date)
                    Picker("Duration", selection: $durationKind) {
                        ForEach(DurationKind.allCases) { d in
                            Text(d.label).tag(d)
                        }
                    }
                    if durationKind == .courseDays {
                        Stepper("\(courseDays) days", value: $courseDays, in: 1...365)
                    } else if durationKind == .courseDoses {
                        Stepper("\(courseDoses) doses total", value: $courseDoses, in: 1...500)
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
        Section {
            Stepper("Remind after \(hoursBetween.compactFormatted) hours",
                    value: $hoursBetween, in: 0.5...48, step: 0.5)
            Toggle("Allowed earlier (e.g. every 4–6 h)", isOn: $hasMinHours)
            if hasMinHours {
                Stepper("Allowed after \(minHours.compactFormatted) hours",
                        value: $minHours, in: 0.5...hoursBetween, step: 0.5)
            }
        } header: {
            Text("Interval")
        } footer: {
            if hasMinHours {
                Text("A dose is allowed from \(minHours.compactFormatted) h after the last one; the reminder fires at \(hoursBetween.compactFormatted) h.")
            }
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
            hasMinHours = s.minHoursBetween != nil
            minHours = s.minHoursBetween ?? max(0.5, s.hoursBetween - 2)
            hasMaxPerDay = s.maxPerDay != nil
            maxPerDay = s.maxPerDay ?? 4
            hasMaxActive = s.maxActivePerDay != nil
            maxActive = s.maxActivePerDay ?? 4000
            prnReason = s.prnReason
            quantity = s.quantity
            hasRange = s.quantityMax != nil
            quantityMaxV = s.quantityMax ?? s.quantity + 1
            doseInActive = s.doseInActiveUnits
            quantityUnit = s.quantityUnit
            instructions = s.instructions
            startDate = s.startDate
            durationKind = s.durationKind
            courseDays = s.courseDays
            courseDoses = s.courseTotalDoses
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
        s.minHoursBetween = hasMinHours && minHours < hoursBetween ? minHours : nil
        s.maxPerDay = hasMaxPerDay ? maxPerDay : nil
        s.maxActivePerDay = hasMaxActive && medication.strengthValue != nil && maxActive > 0 ? maxActive : nil
        s.prnReason = prnReason.trimmingCharacters(in: .whitespaces)
        s.quantity = quantity
        s.quantityMax = hasRange && quantityMaxV > quantity ? quantityMaxV : nil
        s.doseInActiveUnits = medication.strengthValue != nil && doseInActive
        s.quantityUnit = quantityUnit
        s.instructions = instructions
        s.startDate = startDate
        s.endDate = nil
        s.durationKind = durationKind
        s.courseDays = courseDays
        s.courseTotalDoses = courseDoses
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
