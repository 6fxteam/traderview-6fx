# Hướng dẫn triển khai Traderview lên Render.com

Dự án này đã được cấu hình sẵn để chạy trên **Render.com** (dịch vụ thay thế InfinityFree mạnh mẽ hơn, hỗ trợ Node.js và SQLite).

## Các bước thực hiện:

1.  **Đưa code lên GitHub/GitLab**:
    - Tạo một repository mới trên GitHub.
    - Đẩy toàn bộ mã nguồn hiện tại lên đó.

2.  **Tạo Web Service trên Render**:
    - Truy cập [dashboard.render.com](https://dashboard.render.com).
    - Chọn **New** -> **Web Service**.
    - Kết nối với Repository GitHub của bạn.

3.  **Cấu hình thông số (Cực kỳ quan trọng)**:
    - **Runtime**: `Node`
    - **Build Command**: `npm install && npm run build`
    - **Start Command**: `npm start`
    - **Instance Type**: `Free` (hoặc nâng cấp nếu muốn chạy Crawler 24/7).

4.  **Lưu ý về Database (SQLite)**:
    - Trên gói **Free**, file database (`traderview.db`) sẽ bị reset mỗi khi server khởi động lại (do cơ chế ổ đĩa tạm thời của Render).
    - Để lưu dữ liệu vĩnh viễn không bao giờ mất, bạn cần thêm một **Disk** (Mất phí khoảng 7$/tháng) hoặc chuyển sang dùng dịch vụ Database ngoài (như MongoDB Atlas - cũng có gói Free). Tuy nhiên, với nhu cầu hiện tại, việc nạp lại dữ liệu bằng Crawler mỗi khi server tỉnh dậy là đã đủ nhanh rồi.

5.  **Cài đặt Biến môi trường (Environment Variables)**:
    - Mặc định ứng dụng sẽ tự nhận diện cổng (PORT). Bạn không cần chỉnh gì thêm.

Chúc mừng! Sau khi Render build xong, bạn sẽ có một đường dẫn `.onrender.com` để truy cập biểu đồ từ bất cứ đâu với đầy đủ tính năng Database và Tốc độ cao!
