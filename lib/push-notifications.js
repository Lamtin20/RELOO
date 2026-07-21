/** Hỗ trợ Web Push / Notification API trên trình duyệt */

export function isPushSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getPushPermission() {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

export function needsPushPermissionBanner() {
  if (!isPushSupported()) return false;
  return Notification.permission !== "granted";
}

function isIosDevice() {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isAndroidDevice() {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

function isStandaloneApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

/**
 * Mở cài đặt thông báo thiết bị — best-effort theo nền tảng.
 * Trình duyệt web có giới hạn; ưu tiên intent/URL native khi có thể.
 */
export function openDeviceNotificationSettings() {
  if (isAndroidDevice()) {
    const intents = [
      "intent:#Intent;action=android.settings.APP_NOTIFICATION_SETTINGS;end",
      "intent:#Intent;action=android.settings.APPLICATION_DETAILS_SETTINGS;end",
      "intent://settings/app_notification#Intent;scheme=android.settings;end",
    ];

    for (const href of intents) {
      try {
        window.location.href = href;
        return { ok: true, action: "android-intent" };
      } catch {
        /* thử intent kế tiếp */
      }
    }
  }

  if (isIosDevice()) {
    // iOS PWA / Safari: app-settings mở trang cài đặt app trong Cài đặt hệ thống
    if (isStandaloneApp()) {
      window.location.href = "app-settings:";
      return { ok: true, action: "ios-app-settings" };
    }
    // Safari tab: hướng dẫn qua AASA không khả dụng — thử app-settings (một số phiên bản vẫn mở Cài đặt)
    window.location.href = "app-settings:";
    return { ok: true, action: "ios-app-settings" };
  }

  return { ok: false, action: "unsupported-platform" };
}

/**
 * Yêu cầu quyền hoặc mở cài đặt thiết bị nếu đã bị từ chối.
 */
export async function enablePushNotifications() {
  if (!isPushSupported()) {
    return { ok: false, reason: "unsupported" };
  }

  const current = Notification.permission;

  if (current === "granted") {
    return { ok: true, status: "granted" };
  }

  if (current === "default") {
    const result = await Notification.requestPermission();
    return { ok: result === "granted", status: result };
  }

  // denied — mở cài đặt thiết bị
  return openDeviceNotificationSettings();
}

/**
 * Theo dõi thay đổi quyền thông báo (Permissions API).
 */
export function watchPushPermission(onChange) {
  if (!isPushSupported()) {
    onChange("unsupported");
    return () => {};
  }

  if (!navigator.permissions?.query) {
    onChange(Notification.permission);
    return () => {};
  }

  let cancelled = false;
  let statusRef = null;

  navigator.permissions
    .query({ name: "notifications" })
    .then((status) => {
      if (cancelled) return;
      statusRef = status;
      onChange(status.state);
      status.onchange = () => onChange(status.state);
    })
    .catch(() => {
      if (!cancelled) onChange(Notification.permission);
    });

  return () => {
    cancelled = true;
    if (statusRef) statusRef.onchange = null;
  };
}
