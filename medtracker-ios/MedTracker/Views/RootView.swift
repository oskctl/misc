import SwiftUI

struct RootView: View {
    @StateObject private var lock = AppLockModel()
    @Environment(\.scenePhase) private var scenePhase
    @AppStorage("didRequestNotifications") private var didRequestNotifications = false

    var body: some View {
        TabView {
            TodayView()
                .tabItem { Label("Today", systemImage: "sun.max") }
            MedicationListView()
                .tabItem { Label("Medications", systemImage: "pills") }
            HistoryView()
                .tabItem { Label("History", systemImage: "clock.arrow.circlepath") }
            SettingsView(lock: lock)
                .tabItem { Label("Settings", systemImage: "gearshape") }
        }
        .overlay {
            if lock.isLocked {
                LockScreenView(model: lock)
            }
        }
        .onAppear {
            lock.lockIfEnabled()
            lock.unlock()
            if !didRequestNotifications {
                didRequestNotifications = true
                NotificationManager.shared.requestAuthorization()
            }
        }
        .onChange(of: scenePhase) { _, phase in
            switch phase {
            case .background:
                lock.lockIfEnabled()
            case .active:
                lock.unlock()
            default:
                break
            }
        }
    }
}
