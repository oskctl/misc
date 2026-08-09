import SwiftUI
import SwiftData
import UserNotifications

@main
struct MedTrackerApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
        }
        .modelContainer(DataStore.shared.container)
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                NotificationManager.shared.refreshAll()
            }
        }
    }
}

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        // Delegate must be set before the app finishes launching so quick
        // actions delivered while the app was dead are routed correctly.
        UNUserNotificationCenter.current().delegate = NotificationManager.shared
        NotificationManager.shared.registerCategories()
        return true
    }
}
