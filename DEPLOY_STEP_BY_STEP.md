# HƯỚNG DẪN CHI TIẾT TỪNG BƯỚC (BƯỚC 1, 2, 3)

Vì máy tính của bạn hiện chưa cài đặt Git lệnh, tôi sẽ hướng dẫn bạn cách **"Kéo & Thả"** cực kỳ đơn giản để đưa code lên mạng.

---

### 🟢 BƯỚC 1: ĐƯA CODE LÊN GITHUB (Cách kéo thả dễ nhất)

1.  **Tạo tài khoản**: Truy cập [github.com](https://github.com/) và đăng ký một tài khoản miễn phí (nếu chưa có).
2.  **Tạo Kho chứa (Repository)**:
    - Nhấn vào nút **"+"** ở góc trên cùng bên phải -> Chọn **"New repository"**.
    - **Repository name**: Nhập `traderview-app`
    - **Public/Private**: Chọn **Public** (để Render dễ dàng truy cập).
    - Nhấn nút xanh **"Create repository"** ở dưới cùng.
3.  **Tải code lên**:
    - Ở trang vừa hiện ra, bạn tìm dòng chữ: *"...or upload an existing file"*. Nhấn vào chữ **upload**.
    - **Quan trọng**: Mở thư mục dự án trên máy tính của bạn (`C:\Users\Administrator\.gemini\antigravity\scratch\traderview-react`).
    - **Chọn tất cả** các file và thư mục **NGOẠI TRỪ** thư mục `node_modules` (thư mục này rất nặng và Render sẽ tự cài lại sau).
    - **Kéo và thả** tất cả đống file đã chọn vào vùng màu xám trên GitHub.
    - Đợi một lát cho nó tải xong (khoảng 1-2 phút).
    - Nhấn nút xanh **"Commit changes"** ở dưới cùng. Đã xong Bước 1!

---

### 🟢 BƯỚC 2: KẾT NỐI GITHUB VỚI RENDER

1.  **Vào Render**: Truy cập [dashboard.render.com](https://dashboard.render.com/).
2.  **Đăng nhập**: Chọn **"Sign in with GitHub"** (nút màu đen). Bạn nhấn "Authorize" nếu nó hỏi.
3.  **Tạo Web Service**:
    - Nhấn nút xanh **"New +"** -> Chọn **"Web Service"**.
    - **Connect a repository**: Bạn sẽ thấy danh sách các dự án GitHub của mình. Hãy nhấn nút **"Connect"** bên cạnh cái tên `traderview-app` bạn vừa tạo ở Bước 1.

---

### 🟢 BƯỚC 3: CẤU HÌNH ĐỂ CHẠY WEB (Nhập chính xác 100%)

Tại màn hình hiện ra, bạn chỉ cần điền đúng vào các ô sau:

1.  **Name**: `traderview-6fx`
2.  **Region**: Chọn **Singapore (Southeast Asia)** (Để nến nhảy mượt mà nhất tại VN).
3.  **Branch**: `main` (mặc định đã đúng).
4.  **Root Directory**: (Để trống).
5.  **Runtime**: Chọn **Node**.
6.  **Build Command**: Copy và dán dòng này vào:
    `npm install && npm run build`
7.  **Start Command**: Copy và dán dòng này vào:
    `npm start`
8.  **Instance Type**: Chọn gói **Free** $0/month.

**Cuối cùng**: Nhấn nút xanh **"Create Web Service"** ở dưới cùng.

---

### ✅ KẾT QUẢ
Sau khi nhấn nút, bạn hãy nhìn vào màn hình đen (Logs). Nếu thấy nó hiện:
`DONE  Compiled in ...ms`
`✅ Server running at http://localhost:8080` (Cổng này Render sẽ tự đổi thành đường dẫn của bạn).

Thì chúc mừng bạn, web của bạn đã chính thức chạy trên mạng! Link truy cập sẽ nằm ở góc trên cùng bên trái màn hình Render (có đuôi `.onrender.com`).
