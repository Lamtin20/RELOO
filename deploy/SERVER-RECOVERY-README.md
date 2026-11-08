# Khôi phục RELOO khi Cloudflare báo 1033

Ngày 16/10/2026 đã khôi phục Ubuntu/WSL `100.107.146.119` trên Windows server `100.122.200.65` và cài bộ tự phục hồi. Kiểm tra công khai trang chủ, tin tức và `/api/health` trả HTTP 200; API CRM chưa đăng nhập trả 401 đúng dự kiến.

Đã xác nhận `RELOO-WSL-Web` đang Running, `RELOO-WSL-Watchdog` chạy thành công mỗi hai phút và `reloo-healthcheck.timer` đang active. Thử kết thúc riêng tiến trình giữ WSL: launcher khởi động lại sau 15 giây, website vẫn hoạt động. Cửa sổ PowerShell giữ WSL tạm thời có thể đóng sau khi các trạng thái này được xác nhận; tài khoản KENT vẫn phải còn đăng nhập. Chưa cài chế độ chạy trước khi đăng nhập Windows.

Cấu hình cũ chỉ chạy lúc tài khoản KENT đăng nhập. Việc bật systemd không tự giữ WSL hoạt động. Tài khoản Windows KENT hiện không có mật khẩu; đăng nhập mạng bị Windows chặn với lỗi 1327. Không tắt chính sách chặn mật khẩu trống để sửa website.

Nhật ký Ubuntu trước gián đoạn kết thúc lúc 08:31:24 UTC, phiên WSL hiện tại bắt đầu lúc 12:56:38 UTC; chưa tìm thấy bằng chứng đủ để kết luận nguyên nhân WSL dừng. Windows không khởi động lại tại thời điểm đó. Ổ C chỉ còn khoảng 4,46 GiB trống trên 475,94 GiB; cần bổ sung dung lượng trống cho ổ chứa WSL trước các lần build lớn tiếp theo. Không tự xóa dữ liệu hay thu gọn VHD đang chạy để giải phóng chỗ.

## Khôi phục ngay trên máy Windows server

Đăng nhập tài khoản KENT, mở PowerShell và chạy:

```powershell
wsl -d Ubuntu -u root -- bash -lc "systemctl start docker ssh tailscaled; sleep infinity"
```

Giữ cửa sổ đó mở đến khi cài xong bộ tự phục hồi. Lệnh đang chờ là bình thường vì nó giữ Ubuntu hoạt động. Nếu distro không phải Ubuntu, kiểm tra bằng `wsl --list --verbose` trước.

## Cài bộ tự phục hồi

Giải nén toàn bộ gói trên máy server. Mở PowerShell bằng tài khoản KENT rồi chạy trong thư mục đã giải nén:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\install-server-recovery.ps1 -Distro Ubuntu -PreventSleepOnAC
```

Script xác nhận đúng máy server và đúng chủ distro trước khi thay đổi, sao lưu tác vụ/launcher cũ, cài kiểm tra sức khỏe mỗi phút và tạo tác vụ Windows giám sát mỗi hai phút. Launcher tự chạy lại WSL ngay cả khi lệnh WSL kết thúc với mã 0. Mỗi thành phần chỉ được khởi động lại sau nhiều lần kiểm tra lỗi và có thời gian chờ giữa các lần phục hồi. Các container hiện có được giữ nguyên cấu hình, image, dữ liệu, quyền và mạng.

Chế độ mặc định cần tài khoản KENT còn đăng nhập. Tùy chọn tác vụ lúc khởi động có hai cách, đều yêu cầu PowerShell nâng quyền dưới chính tài khoản KENT:

```powershell
# Có mật khẩu Windows thực: nhập qua hộp bảo mật của Windows.
.\install-server-recovery.ps1 -Distro Ubuntu -StartAtBoot -PreventSleepOnAC

# S4U không lưu mật khẩu; cần kiểm tra thực tế WSL và mạng sau khi khởi động lại.
.\install-server-recovery.ps1 -Distro Ubuntu -StartAtBoot -UseS4U -PreventSleepOnAC
```

S4U là cơ chế tác vụ chính thức của Windows nhưng không cung cấp quyền truy cập mạng Windows hoặc tệp được mã hóa. Không coi lựa chọn này đã đáp ứng chạy khi chưa đăng nhập cho đến khi kiểm tra lại ứng dụng, mạng Ubuntu và tunnel sau một lần khởi động lại được chủ máy cho phép.

## Kiểm tra kết quả

```powershell
Get-ScheduledTask -TaskName RELOO-WSL-Web,RELOO-WSL-Watchdog
wsl -d Ubuntu -u root -- systemctl status reloo-healthcheck.timer --no-pager
wsl -d Ubuntu -u root -- journalctl -t reloo-recovery -n 30 --no-pager
wsl -d Ubuntu -u root -- curl --fail --max-time 10 http://127.0.0.1:3000/api/health
```

Xác nhận `https://reloo.vn/api/health` trả HTTP 200 và JSON `service=reloo,status=ok`. Nhật ký Windows nằm trong `%LOCALAPPDATA%\RELOO-Server\keepalive.log` và `watchdog.log`. Trạng thái kiểm tra Linux nằm trong `/var/lib/reloo-recovery`.

## Tạm dừng khi bảo trì

```powershell
New-Item -ItemType File -Path "$env:LOCALAPPDATA\RELOO-Server\maintenance.flag" -Force
wsl -d Ubuntu -u root -- touch /var/lib/reloo-recovery/maintenance
```

Xóa hai tệp cờ khi kết thúc bảo trì rồi chạy `Start-ScheduledTask RELOO-WSL-Web`. Các bản sao tác vụ Windows và script cũ được ghi lại trong thư mục backup tương ứng. Bộ phục hồi không tự ép tắt WSL, không khởi động lại toàn bộ Docker, không sửa DNS/tunnel token và không mở cổng quản trị công khai. Nó không khắc phục được mất điện, Windows tắt máy, mất Internet hoặc máy ảo bị treo hoàn toàn.

Nguồn chính thức đã đối chiếu:
- https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1033/
- https://learn.microsoft.com/en-us/windows/wsl/systemd
- https://learn.microsoft.com/en-us/windows/win32/api/taskschd/ne-taskschd-task_logon_type

Bộ phục hồi đã được kiểm tra cú pháp PowerShell/Bash, mô phỏng tình huống lỗi/cooldown/bảo trì và cài thực tế trên server. Bản sao cấu hình Windows trước lần cài thành công: `%LOCALAPPDATA%\RELOO-Server\backup-20261016-201634`. Bằng chứng kiểm tra nằm trong `output/deployment/recovery-20261016-status.json`. Chưa thực hiện thử khởi động lại toàn bộ Windows/WSL vì website vừa được khôi phục.
