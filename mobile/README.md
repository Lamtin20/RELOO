# RELOO – bản app thử nghiệm

Android/iOS dùng chung server HTTPS RELOO tại Việt Nam và giao diện responsive của website, cùng các chức năng native camera, microphone, chia sẻ, kết nối mạng và đăng nhập qua trình duyệt hệ thống.

```sh
npm ci
npx cap sync
```

Android: chạy `scripts/build-android.ps1` từ gốc repo sau khi chuẩn bị SDK. APK tại `output/mobile/RELOO-Android-test.apk`.

iOS: cần máy Mac/Xcode 26. Chạy `npm ci`, `npx cap sync ios` và mở `ios/App/App.xcodeproj`. Chọn Team của bạn trước khi build vào iPhone. Project dùng Swift Package Manager.

Đây là bản thử nghiệm, chưa phát hành trên cửa hàng. Cấu hình native không có khóa backend, token eKYC/SePay hoặc dữ liệu người dùng. Tài liệu đầy đủ: `../docs/SHORTS_AND_MOBILE.md`.
