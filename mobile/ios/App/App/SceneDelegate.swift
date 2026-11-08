import UIKit
import Capacitor
import EventKit
import CryptoKit
import BackgroundTasks
import WebKit
import Security
import CoreLocation

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = RelooBridgeViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

class RelooBridgeViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        NotificationCenter.default.addObserver(self, selector: #selector(applySystemTypography), name: UIContentSizeCategory.didChangeNotification, object: nil)
    }
    override func viewDidAppear(_ animated: Bool) { super.viewDidAppear(animated); applySystemTypography() }
    @objc private func applySystemTypography() {
        // Native Dynamic Type changes the effective viewport; responsive layouts remain in use.
        webView?.pageZoom = max(1, UIFont.preferredFont(forTextStyle: .body).pointSize / 17)
    }
    deinit { NotificationCenter.default.removeObserver(self) }
    override func capacitorDidLoad() { bridge?.registerPluginInstance(RelooCalendarPlugin()); bridge?.registerPluginInstance(RelooLocationPlugin()) }
}

// Foreground, explicit-user-action, one-shot location. No background mode or storage.
@objc(RelooLocationPlugin)
public class RelooLocationPlugin: CAPPlugin, CAPBridgedPlugin, CLLocationManagerDelegate {
    public let identifier = "RelooLocationPlugin"
    public let jsName = "RelooLocation"
    public let pluginMethods: [CAPPluginMethod] = [CAPPluginMethod(name: "current", returnType: CAPPluginReturnPromise)]
    private var manager: CLLocationManager?
    private var pending: CAPPluginCall?
    private var timeout: Timer?
    private var backgroundObserver: NSObjectProtocol?
    private var requested = false
    @objc func current(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.pending == nil else { call.reject("LOCATION_BUSY"); return }
            self.pending = call
            self.backgroundObserver = NotificationCenter.default.addObserver(forName: UIApplication.didEnterBackgroundNotification, object: nil, queue: .main) { [weak self] _ in self?.finish(error: "LOCATION_CANCELLED") }
            let manager = CLLocationManager(); self.manager = manager
            manager.delegate = self; manager.desiredAccuracy = kCLLocationAccuracyHundredMeters
            self.timeout = Timer.scheduledTimer(withTimeInterval: 15, repeats: false) { [weak self] _ in self?.finish(error: "LOCATION_TIMEOUT") }
            if manager.authorizationStatus == .notDetermined { manager.requestWhenInUseAuthorization() }
            else { self.requestIfAllowed() }
        }
    }
    private func requestIfAllowed() {
        guard let manager = manager, pending != nil else { return }
        switch manager.authorizationStatus {
        case .authorizedWhenInUse, .authorizedAlways: if !requested { requested = true; manager.requestLocation() }
        case .denied, .restricted: finish(error: "LOCATION_DENIED")
        default: break
        }
    }
    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) { requestIfAllowed() }
    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last, location.horizontalAccuracy >= 0, abs(location.timestamp.timeIntervalSinceNow) < 60 else { finish(error: "LOCATION_UNCERTAIN"); return }
        let call = pending
        cleanup()
        call?.resolve(["latitude": location.coordinate.latitude, "longitude": location.coordinate.longitude, "accuracy": location.horizontalAccuracy])
    }
    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) { finish(error: "LOCATION_UNAVAILABLE") }
    private func finish(error: String) { let call = pending; cleanup(); call?.reject(error) }
    private func cleanup() { timeout?.invalidate(); timeout = nil; if let observer = backgroundObserver { NotificationCenter.default.removeObserver(observer) }; backgroundObserver = nil; manager?.stopUpdatingLocation(); manager?.delegate = nil; manager = nil; pending = nil; requested = false }
}

private class CalendarNoRedirect: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}

// The existing target already compiles this file. No external calendar SDK or
// analytics SDK is introduced. Only local calendar destinations are accepted.
@MainActor
enum RelooCalendarRuntime {
    static let store = EKEventStore()
    static let prefs = UserDefaults(suiteName: "vn.reloo.calendar")!
    static let backgroundID = "vn.reloo.calendar.sync"
    static var granted: Bool {
        let status = EKEventStore.authorizationStatus(for: .event)
        if #available(iOS 17.0, *) { return status == .fullAccess }
        return status == .authorized
    }
    static var device: String {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "vn.reloo.calendar.device", kSecAttrAccount as String: "installation", kSecReturnData as String: true]
        var result: CFTypeRef?
        if SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess, let data = result as? Data, let id = String(data: data, encoding: .utf8) { return id }
        let id = UUID().uuidString.lowercased()
        let add: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: "vn.reloo.calendar.device", kSecAttrAccount as String: "installation", kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly, kSecValueData as String: Data(id.utf8)]
        if SecItemAdd(add as CFDictionary, nil) != errSecSuccess { return "" }; return id
    }
    static func calendars() -> [EKCalendar] { store.calendars(for: .event).filter { $0.source.sourceType == .local && $0.allowsContentModifications } }
    static func hash(_ value: String) -> String { SHA256.hash(data: Data(value.utf8)).map { String(format: "%02x", $0) }.joined() }
    static func failure(_ code: String) -> NSError { NSError(domain: "RelooCalendar", code: 1, userInfo: [NSLocalizedDescriptionKey: code]) }
    static func sync(account: String, job: [String: Any]) throws -> String {
        guard granted else { throw failure("REAUTH") }
        guard prefs.bool(forKey: "enabled"), prefs.string(forKey: "account") == account, job["profile"] as? String == account,
              let calendarID = job["calendar"] as? String, let calendar = calendars().first(where: { $0.calendarIdentifier == calendarID }),
              let connection = job["connection"] as? String, let source = job["source"] as? String, let rental = job["rental"] as? String,
              let dueString = job["end"] as? String, let state = job["state"] as? String else { throw failure("CALENDAR_REVIEW") }
        let formatter = ISO8601DateFormatter(); formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        var due = formatter.date(from: dueString)
        if due == nil { formatter.formatOptions = [.withInternetDateTime]; due = formatter.date(from: dueString) }
        guard let deadline = due else { throw failure("CALENDAR_REVIEW") }
        let key = hash("reloo-calendar:\(connection):\(source):\(rental)"), marker = "reloo://calendar-event/" + key
        let mapKey = "map:" + hash(account + ":" + calendarID + ":" + key)
        var event: EKEvent?
        if let id = prefs.string(forKey: mapKey) ?? job["remoteId"] as? String, let existing = store.event(withIdentifier: id) {
            guard existing.calendar.calendarIdentifier == calendarID && existing.url?.absoluteString == marker else { throw failure("CALENDAR_REVIEW") }
            event = existing
        }
        if event == nil {
            // Crash recovery: inspect only the RELOO URL marker within the target
            // calendar/date window; never export other events or their contents.
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            let recoveryStartRaw = job["recoveryStart"] as? String ?? job["start"] as? String ?? dueString
            let recoveryEndRaw = job["recoveryEnd"] as? String ?? dueString
            var recoveryStart = formatter.date(from: recoveryStartRaw), recoveryEnd = formatter.date(from: recoveryEndRaw)
            formatter.formatOptions = [.withInternetDateTime]
            recoveryStart = recoveryStart ?? formatter.date(from: recoveryStartRaw); recoveryEnd = recoveryEnd ?? formatter.date(from: recoveryEndRaw)
            let predicate = store.predicateForEvents(withStart: (recoveryStart ?? deadline).addingTimeInterval(-86400), end: (recoveryEnd ?? deadline).addingTimeInterval(86400), calendars: [calendar])
            let own = store.events(matching: predicate).filter { $0.url?.absoluteString == marker }
            guard own.count <= 1 else { throw failure("CALENDAR_REVIEW") }; event = own.first
        }
        let returned = state == "RETURNED", remove = state == "CANCELLED" || (returned && job["returnAction"] as? String == "DELETE")
        if remove { if let event { try store.remove(event, span: .thisEvent, commit: true) }; prefs.removeObject(forKey: mapKey); return key }
        if returned && event == nil { return key }
        let current = event ?? EKEvent(eventStore: store), english = job["locale"] as? String == "en-US"
        current.calendar = calendar; current.url = URL(string: marker)
        current.title = returned ? (english ? "Returned · RELOO" : "Đã trả đồ · RELOO") : (english ? "Return reminder · RELOO" : "Nhắc trả đồ · RELOO")
        current.notes = english ? "Open RELOO to check the current rental." : "Mở RELOO để xem đơn và hạn trả hiện tại."
        current.startDate = deadline.addingTimeInterval(-900); current.endDate = deadline; current.timeZone = TimeZone(identifier: "Asia/Ho_Chi_Minh")
        current.alarms = returned ? [] : [EKAlarm(relativeOffset: -86400), EKAlarm(relativeOffset: -3600)]
        try store.save(current, span: .thisEvent, commit: true)
        guard let id = current.eventIdentifier else { throw failure("CALENDAR_FAILED") }; prefs.set(id, forKey: mapKey); return id
    }
    static func registerBackground() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: backgroundID, using: nil) { task in
            let work = Task { @MainActor in let ok = await backgroundSync(); schedule(); task.setTaskCompleted(success: ok) }
            task.expirationHandler = { work.cancel() }
        }
    }
    static func schedule() {
        BGTaskScheduler.shared.cancel(taskRequestWithIdentifier: backgroundID)
        guard prefs.bool(forKey: "enabled") else { return }
        let request = BGAppRefreshTaskRequest(identifier: backgroundID); request.earliestBeginDate = Date(timeIntervalSinceNow: 900)
        try? BGTaskScheduler.shared.submit(request)
    }
    static func post(_ body: [String: Any]) async throws -> [String: Any] {
        let url = URL(string: "https://reloo.vn/api/rental-care")!
        let cookies: [HTTPCookie] = await withCheckedContinuation { continuation in WKWebsiteDataStore.default().httpCookieStore.getAllCookies { continuation.resume(returning: $0.filter { $0.domain == "reloo.vn" || $0.domain == ".reloo.vn" }) } }
        var request = URLRequest(url: url); request.httpMethod = "POST"; request.timeoutInterval = 15
        request.setValue("application/json", forHTTPHeaderField: "Content-Type"); request.setValue("https://reloo.vn", forHTTPHeaderField: "Origin")
        request.setValue("1", forHTTPHeaderField: "X-Reloo-Calendar-Background")
        request.setValue(HTTPCookie.requestHeaderFields(with: cookies)["Cookie"], forHTTPHeaderField: "Cookie"); request.httpBody = try JSONSerialization.data(withJSONObject: body)
        let config = URLSessionConfiguration.ephemeral; config.httpCookieStorage = nil
        let session = URLSession(configuration: config, delegate: CalendarNoRedirect(), delegateQueue: nil); defer { session.finishTasksAndInvalidate() }
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200, data.count < 500000,
              let result = try JSONSerialization.jsonObject(with: data) as? [String: Any] else { throw failure("CALENDAR_FAILED") }
        return result
    }
    static func backgroundSync() async -> Bool {
        guard prefs.bool(forKey: "enabled"), let actor = prefs.string(forKey: "account"), !actor.isEmpty else { return true }
        do {
            if !granted { _ = try await post(["subject": actor, "action": "devicePermission", "device": device, "granted": false]); return false }
            let response = try await post(["subject": actor, "action": "claim", "device": device])
            for job in response["jobs"] as? [[String: Any]] ?? [] {
                guard !Task.isCancelled, prefs.string(forKey: "account") == actor else { return false }
                var remote = job["remoteId"] as? String ?? "", result = "SYNCED"
                do { remote = try sync(account: actor, job: job) } catch { result = error.localizedDescription == "REAUTH" ? "REAUTH" : error.localizedDescription == "CALENDAR_REVIEW" ? "REVIEW" : "FAILED" }
                guard !Task.isCancelled else { return false }
                _ = try await post(["subject": actor,"action": "ack","id": job["id"] ?? "","lease": job["lease"] ?? "","revision": job["revision"] ?? 0,"remote": remote,"result": result])
            }; return true
        } catch { return false }
    }
}

@objc(RelooCalendarPlugin)
public class RelooCalendarPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RelooCalendarPlugin"
    public let jsName = "RelooCalendar"
    public let pluginMethods: [CAPPluginMethod] = ["identity","requestPermission","calendars","bind","sync"].map { CAPPluginMethod(name: $0, returnType: CAPPluginReturnPromise) }
    @objc func identity(_ call: CAPPluginCall) { Task { @MainActor in call.resolve(["device": RelooCalendarRuntime.device,"granted": RelooCalendarRuntime.granted]) } }
    @objc func requestPermission(_ call: CAPPluginCall) { Task { @MainActor in
        if RelooCalendarRuntime.granted { call.resolve(["granted": true]); return }
        if #available(iOS 17.0, *) { RelooCalendarRuntime.store.requestFullAccessToEvents { granted, _ in call.resolve(["granted": granted]) } }
        else { RelooCalendarRuntime.store.requestAccess(to: .event) { granted, _ in call.resolve(["granted": granted]) } }
    } }
    @objc func calendars(_ call: CAPPluginCall) { Task { @MainActor in
        guard RelooCalendarRuntime.granted else { call.reject("REAUTH"); return }
        call.resolve(["device": RelooCalendarRuntime.device,"calendars": RelooCalendarRuntime.calendars().map { ["id": $0.calendarIdentifier,"name": $0.title] }])
    } }
    @objc func bind(_ call: CAPPluginCall) { Task { @MainActor in
        let account = call.getString("account") ?? ""; RelooCalendarRuntime.prefs.set(account, forKey: "account")
        RelooCalendarRuntime.prefs.set(call.getBool("enabled") == true && !account.isEmpty, forKey: "enabled"); RelooCalendarRuntime.schedule(); call.resolve()
    } }
    @objc func sync(_ call: CAPPluginCall) { Task { @MainActor in
        do { guard let job = call.getObject("job"), let account = call.getString("account") else { throw RelooCalendarRuntime.failure("CALENDAR_REVIEW") }
            call.resolve(["remoteId": try RelooCalendarRuntime.sync(account: account, job: job as [String: Any])])
        } catch { call.reject(error.localizedDescription) }
    } }
}
