# Project Management System (PMS)

Hệ thống quản lý công việc dự án, giao nhiệm vụ, theo dõi tiến độ và trao đổi thông tin dành cho sinh viên/nhân viên.

## Kiến trúc hệ thống
- **Frontend:** ReactJS (Vite), Tailwind CSS, React Router, Context API, Axios, Socket.io-client, Chart.js.
- **Backend:** NodeJS, Express, MySQL2, JWT, Socket.io, Bcryptjs.
- **Database:** MySQL.
- **Containerization:** Docker & Docker Compose.
- **CI/CD:** GitHub Actions (Build test cơ bản).

## Cấu trúc thư mục
- `/backend`: Mã nguồn Backend API.
- `/frontend`: Mã nguồn Frontend React.
- `/db`: Chứa script `init.sql` để khởi tạo Database.
- `docker-compose.yml`: Cấu hình chạy toàn bộ hệ thống.

## Các tính năng chính
- **Thành viên:** Đăng nhập, Xem danh sách dự án/task, Cập nhật trạng thái task, Chat nhóm real-time.
- **Trưởng nhóm:** Tạo dự án, Giao task, Xem tiến độ, Chat nhóm.
- **Quản trị viên:** Quản lý User (Cấp quyền), Thống kê số lượng (Biểu đồ).
- **Tính năng nâng cao:** Chat real-time (Socket.io), Biểu đồ thống kê (Chart.js), Thuật toán mô phỏng gợi ý giao việc (AI simulation ở API `GET /api/suggest-member/:projectId`).

## Hướng dẫn chạy dự án bằng Docker

1. Cài đặt Docker và Docker Compose trên máy của bạn.
2. Mở terminal tại thư mục gốc của dự án.
3. Chạy lệnh:
   ```bash
   docker-compose up --build -d
   ```
4. Hệ thống sẽ tự động khởi tạo Database, cài đặt dependencies và chạy các dịch vụ:
   - **Frontend:** Truy cập tại `http://localhost:5173`
   - **Backend API:** Chạy tại `http://localhost:5000`
   - **MySQL Database:** Chạy tại port `3306`

## Tài khoản mẫu (đã được tạo sẵn trong Database)
- **Admin:** `admin@example.com` / Password: `admin123`
- **Leader:** `leader@example.com` / Password: `admin123`
- **Member:** `member@example.com` / Password: `admin123`

## Chạy Local (Không dùng Docker)
**1. Khởi tạo Database:**
- Chạy MySQL, tạo database `pms` và chạy script trong `db/init.sql`.

**2. Chạy Backend:**
```bash
cd backend
npm install
npm start
```

**3. Chạy Frontend:**
```bash
cd frontend
npm install
npm run dev
```

## Phân công (Mẫu đồ án)
- **Sinh viên A:** Thiết kế CSDL, Xây dựng Backend API (Auth, Projects, Tasks).
- **Sinh viên B:** Xây dựng Frontend React (Login, Dashboard, Admin), tích hợp API.
- **Sinh viên C:** Tích hợp Socket.io (Chat real-time), Chart.js, triển khai Docker & CI/CD.
