import SwiftUI
import LocalAuthentication

/// Face ID / Touch ID / passcode gate over the UI. Gates viewing only — the
/// notification quick actions intentionally bypass it (see SPEC.md).
@MainActor
final class AppLockModel: ObservableObject {
    @AppStorage("appLockEnabled") var enabled = false
    @Published var isLocked = false
    private var authInFlight = false

    static var biometryAvailable: Bool {
        var error: NSError?
        return LAContext().canEvaluatePolicy(.deviceOwnerAuthentication, error: &error)
    }

    func lockIfEnabled() {
        if enabled { isLocked = true }
    }

    func unlock() {
        guard isLocked, !authInFlight else { return }
        authInFlight = true
        let context = LAContext()
        context.evaluatePolicy(.deviceOwnerAuthentication,
                               localizedReason: "Unlock your medication data") { success, _ in
            Task { @MainActor in
                self.authInFlight = false
                if success { self.isLocked = false }
            }
        }
    }
}

struct LockScreenView: View {
    @ObservedObject var model: AppLockModel

    var body: some View {
        ZStack {
            Rectangle().fill(.ultraThinMaterial).ignoresSafeArea()
            VStack(spacing: 16) {
                Image(systemName: "lock.fill")
                    .font(.system(size: 44))
                    .foregroundStyle(.secondary)
                Text("MedTracker is locked")
                    .font(.headline)
                Button("Unlock") { model.unlock() }
                    .buttonStyle(.borderedProminent)
            }
        }
    }
}
