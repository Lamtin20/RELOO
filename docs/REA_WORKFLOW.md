# REA cho quy trình phát triển RELOO

REA giúp khảo sát website/app, phân tích bundle và giữ bằng chứng để xây dựng tính năng tương ứng trong dự án hiện có. Nó là công cụ cho coding agent, không phải framework thay RELOO hay một dịch vụ tự viết/deploy ứng dụng liên tục.

## Đã cài trên máy phát triển

- Repo chính thức: https://github.com/morluto/rea.git, checkout `D:\reloo_project\.tooling\rea`, commit trong `tools/rea-toolchain.json`.
- CLI phát hành `rea-agents@6.5.0`, chạy bằng `rea` hoặc `npm run rea -- ...`. Repo nguồn và CLI phát hành được lưu riêng; chưa build lại mã nguồn REA.
- MCP đã đăng ký vào Codex (`~/.codex/config.toml`) và Cursor (`~/.cursor/mcp.json`), giữ cấu hình khác. Bản sao lưu Codex: `~/.codex/config.toml.rea.backup`.
- Skill đồng bộ phiên bản 42: `~/.agents/skills/reverse-engineer-anything`.
- Khởi động lại Codex/Cursor hoặc kết nối lại MCP để phiên mới nạp công cụ. Phiên hiện tại đã kiểm chứng bằng CLI và một MCP server stdio riêng, không giả định agent đang mở đã tự nạp lại.

## Cách sử dụng

```powershell
npm run rea -- --version
npm run rea:doctor
npm run rea -- mcp doctor --json

# Phân tích tĩnh một bundle RELOO đã build, không thực thi bundle:
node scripts/rea.mjs analyze-javascript-application "D:/reloo_project/reloo-app/.next/static/chunks/app/product" --max-heap-mb 256 --analysis-timeout-ms 30000 --json | Out-File -Encoding utf8 output/rea/product-evidence.json
```

Tạo thư mục đầu ra trước khi lưu. Với nơi cài global khác, đặt `RELOO_REA_ENTRYPOINT` tới `rea-agents/scripts/rea.mjs`. Wrapper kiểm tra đúng tên và phiên bản đã pin, không tự tải/gọi bản latest.

Đối với website đang mở, REA dùng `list-browser-targets` để lấy target rồi `analyze-web-bundle <loopback-CDP-endpoint> <targetId>`. Chỉ định đúng origin và đối tượng khảo sát; dùng `--help`/schema của phiên bản đang chạy. Chụp và thao tác UI có thể dùng các công cụ browser scenario của REA hoặc Playwright hiện có. Không suy ra rằng phân tích bundle đã chứng minh mọi hành vi runtime.

## Quy trình cho các yêu cầu tiếp theo

1. Xác định tính năng và nguồn tham khảo. Dùng REA cho website/app đã phát hành, artifact hoặc hành vi cần bằng chứng; đọc source trực tiếp cho kiến trúc repo đầy đủ.
2. Lưu nguồn, thời điểm, ảnh mobile/desktop, Evidence và giới hạn vào `output/rea/`. Chỉ khảo sát phần liên quan, không đưa toàn bộ Evidence lớn vào context.
3. Chuyển kết quả thành yêu cầu cụ thể và map vào module RELOO hiện có, không sao chép nguyên ứng dụng hay thay framework.
4. Sửa code, chạy kiểm tra phù hợp, xem giao diện thật và đối chiếu lại với nguồn.
5. Áp dụng quyền triển khai hiện có của phiên làm việc; REA không tự cấp quyền production hay tự thay chính sách dữ liệu/giá.

## Kiểm chứng đã chạy

- `rea --version`: 6.5.0.
- Doctor với Codex/Cursor và skill: healthy; cả hai registration aligned, skill aligned.
- Production-stdio MCP doctor: handshake và `binary_session` thành công; 207/207 tools và 6/6 prompts, không thiếu/trùng; digest catalog khớp.
- Phân tích bundle trang sản phẩm local: 1 file, 55.425 byte, 44 module, 77 findings, không lỗi parse; Evidence `ev_7f4a60761a814d7f1999b8f7d2de118202b2e8238ee1f4672fd8a273f82bbae9`. Đây là smoke test một bundle, không phải audit toàn bộ web/app.

Artifact cài đặt/kiểm tra lưu dưới `output/rea/`. Bản CLI cuối được cài với `--omit=optional --ignore-scripts` sau khi bước Frida tùy chọn làm chậm cài đặt. Chức năng Frida/native chuyên sâu chưa được xác minh; Hopper/Ghidra/IDA/JADX không được cài thêm. JavaScript tĩnh và MCP đã chạy thật. Không dùng LLM/API trả phí hay gửi dữ liệu RELOO sang dịch vụ phân tích ngoài trong các kiểm tra này.

## Cập nhật và khôi phục

Review release chính thức trước; nâng phiên bản CLI và `tools/rea-toolchain.json` cùng nhau, chạy dry-run/setup đúng Codex/Cursor, doctor và smoke test rồi kết nối lại IDE. Không tự `git pull` hoặc nâng package khi mở project. Giữ backup cấu hình trước khi đổi. Công cụ này không cần chạy trên server production.
