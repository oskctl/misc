import Foundation
import SwiftData
import UserNotifications

/// Owns everything UNUserNotificationCenter: permission, categories, the 7-day
/// scheduling window, and quick-action handling (Log / Skip / Snooze).
final class NotificationManager: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationManager()

    static let categoryID = "DOSE_REMINDER"
    static let logAction = "LOG_DOSE"
    static let skipAction = "SKIP_DOSE"
    static let snoozeAction = "SNOOZE_DOSE"
    static let dosePrefix = "meddose|"
    static let chainPrefix = "medchain|"
    static let refreshReminderID = "medrefresh"

    /// How far ahead concrete reminders are planted. iOS caps pending local
    /// notifications at 64; we stay well under it.
    static let windowDays = 7
    static let maxRequests = 55

    private override init() { super.init() }

    // MARK: Setup

    func registerCategories() {
        let log = UNNotificationAction(identifier: Self.logAction, title: "Log dose", options: [])
        let skip = UNNotificationAction(identifier: Self.skipAction, title: "Skip", options: [.destructive])
        let snooze = UNNotificationAction(identifier: Self.snoozeAction, title: "Snooze 15 min", options: [])
        let category = UNNotificationCategory(
            identifier: Self.categoryID,
            actions: [log, skip, snooze],
            intentIdentifiers: [],
            options: []
        )
        UNUserNotificationCenter.current().setNotificationCategories([category])
    }

    func requestAuthorization() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { _, _ in
            Task { @MainActor in self.refreshAll() }
        }
    }

    // MARK: Scheduling

    /// Tear down and rebuild every pending reminder from current data.
    /// Called on app foreground, after every log, and after every schedule edit.
    @MainActor
    func refreshAll() {
        let context = DataStore.shared.container.mainContext
        let meds = (try? context.fetch(FetchDescriptor<Medication>())) ?? []
        let requests = buildRequests(medications: meds)

        let center = UNUserNotificationCenter.current()
        center.getPendingNotificationRequests { pending in
            let ours = pending.map(\.identifier).filter {
                $0.hasPrefix(Self.dosePrefix) || $0.hasPrefix(Self.chainPrefix) || $0 == Self.refreshReminderID
            }
            center.removePendingNotificationRequests(withIdentifiers: ours)
            for request in requests {
                center.add(request)
            }
        }
    }

    @MainActor
    private func buildRequests(medications: [Medication]) -> [UNNotificationRequest] {
        var requests: [UNNotificationRequest] = []
        let now = Date.now
        let calendar = Calendar.current
        guard let windowEnd = calendar.date(byAdding: .day, value: Self.windowDays, to: now) else { return [] }

        // 1. Fixed-time occurrences over the window, earliest first, capped.
        let occurrences = ScheduleEngine.allOccurrences(
            medications: medications,
            in: DateInterval(start: now, end: windowEnd)
        ).prefix(Self.maxRequests)

        for occ in occurrences {
            guard let med = occ.schedule.medication else { continue }
            let content = doseContent(medication: med, schedule: occ.schedule)
            content.userInfo = [
                "scheduleUUID": occ.schedule.uuid.uuidString,
                "occurrence": occ.date.timeIntervalSince1970,
            ]
            let comps = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: occ.date)
            let trigger = UNCalendarNotificationTrigger(dateMatching: comps, repeats: false)
            let id = Self.dosePrefix + occ.schedule.uuid.uuidString + "|" + String(Int(occ.date.timeIntervalSince1970))
            requests.append(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
        }

        // 2. everyNHours chains: one reminder at lastTaken + N hours, if in the future.
        for med in medications where !med.isArchived {
            for schedule in med.activeSchedules where schedule.kind == .everyNHours {
                guard let next = ScheduleEngine.nextAllowed(for: schedule), next > now else { continue }
                let content = doseContent(medication: med, schedule: schedule)
                content.userInfo = [
                    "scheduleUUID": schedule.uuid.uuidString,
                    "occurrence": next.timeIntervalSince1970,
                    "chain": true,
                ]
                let trigger = UNTimeIntervalNotificationTrigger(
                    timeInterval: max(1, next.timeIntervalSince(now)), repeats: false)
                let id = Self.chainPrefix + schedule.uuid.uuidString
                requests.append(UNNotificationRequest(identifier: id, content: content, trigger: trigger))
            }
        }

        // 3. Dead-man's switch: if the app isn't opened for the whole window,
        //    remind the user to open it so reminders keep flowing.
        if !requests.isEmpty {
            let content = UNMutableNotificationContent()
            content.title = "MedTracker needs a refresh"
            content.body = "Open MedTracker so your medication reminders keep running."
            content.sound = .default
            let trigger = UNTimeIntervalNotificationTrigger(
                timeInterval: Double(Self.windowDays) * 86400 - 60, repeats: false)
            requests.append(UNNotificationRequest(identifier: Self.refreshReminderID,
                                                  content: content, trigger: trigger))
        }
        return requests
    }

    private func doseContent(medication: Medication, schedule: Schedule) -> UNMutableNotificationContent {
        let content = UNMutableNotificationContent()
        content.title = "Time for \(medication.displayName)"
        var body = "Take \(schedule.doseText)"
        if !schedule.instructions.isEmpty { body += " — \(schedule.instructions)" }
        content.body = body
        content.sound = .default
        content.categoryIdentifier = Self.categoryID
        content.interruptionLevel = .timeSensitive  // silently downgraded without the capability
        return content
    }

    // MARK: Quick actions

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        let action = response.actionIdentifier
        let content = response.notification.request.content
        Task { @MainActor in
            self.handle(action: action, userInfo: userInfo, originalContent: content)
            completionHandler()
        }
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .list])
    }

    @MainActor
    private func handle(action: String, userInfo: [AnyHashable: Any],
                        originalContent: UNNotificationContent) {
        guard let uuidString = userInfo["scheduleUUID"] as? String,
              let uuid = UUID(uuidString: uuidString) else { return }

        let context = DataStore.shared.container.mainContext
        let schedules = (try? context.fetch(FetchDescriptor<Schedule>())) ?? []
        guard let schedule = schedules.first(where: { $0.uuid == uuid }) else { return }

        let isChain = (userInfo["chain"] as? Bool) ?? false
        let occurrenceDate = (userInfo["occurrence"] as? TimeInterval).map { Date(timeIntervalSince1970: $0) }

        switch action {
        case Self.logAction:
            if isChain {
                LogService.log(schedule: schedule, status: .taken, in: context)
            } else if let date = occurrenceDate {
                LogService.log(occurrence: Occurrence(schedule: schedule, date: date),
                               status: .taken, in: context)
            }
        case Self.skipAction:
            if isChain {
                LogService.log(schedule: schedule, status: .skipped, in: context)
            } else if let date = occurrenceDate {
                LogService.log(occurrence: Occurrence(schedule: schedule, date: date),
                               status: .skipped, in: context)
            }
        case Self.snoozeAction:
            let content = originalContent.mutableCopy() as! UNMutableNotificationContent
            let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 15 * 60, repeats: false)
            let id = Self.dosePrefix + "snooze|" + UUID().uuidString
            UNUserNotificationCenter.current().add(
                UNNotificationRequest(identifier: id, content: content, trigger: trigger))
        default:
            break // default tap just opens the app
        }
    }
}
