# AutoClip - Hệ thống cắt video thông minh bằng AI

![AutoClip Logo](https://img.shields.io/badge/AutoClip-AI%20Video%20Processing-blue?style=for-the-badge&logo=video)

## Hệ thống xử lý cắt video thông minh dựa trên AI

Hỗ trợ tải video YouTube/B站, cắt tự động, tạo hợp tuyển thông minh

[![Python](https://img.shields.io/badge/Python-3.8+-green?style=flat&logo=python)](https://python.org)
[![React](https://img.shields.io/badge/React-18+-blue?style=flat&logo=react)](https://reactjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Latest-red?style=flat&logo=fastapi)](https://fastapi.tiangolo.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat&logo=typescript)](https://www.typescriptlang.org)
[![Celery](https://img.shields.io/badge/Celery-Latest-green?style=flat&logo=celery)](https://celeryproject.org)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat)](LICENSE)

**Ngôn ngữ**: [English](README-EN.md) | [Tiếng Việt](README-VI.md) | [中文](README.md)  
**Liên hệ**: [christine_zhouye@163.com](mailto:christine_zhouye@163.com)

## Giới thiệu dự án

AutoClip là hệ thống xử lý cắt video thông minh dựa trên AI, có thể tự động tải video từ YouTube, B站 và các nền tảng khác, phân tích bằng AI để trích xuất các đoạn hay, và tạo hợp tuyển thông minh. Hệ thống sử dụng kiến trúc tách biệt frontend-backend hiện đại, cung cấp giao diện web trực quan và năng lực xử lý backend mạnh mẽ.

### Tính năng chính

- **Đa nền tảng**: Tải video YouTube, B站 một chạm, hỗ trợ tải file local
- **Phân tích AI**: Hiểu nội dung video dựa trên mô hình ngôn ngữ lớn thông minh
- **Cắt tự động**: Nhận diện đoạn hay và cắt tự động, hỗ trợ nhiều phân loại
- **Hợp tuyển thông minh**: AI đề xuất và tạo thủ công, hỗ trợ kéo thả sắp xếp
- **Xử lý thời gian thực**: Hàng đợi tác vụ bất đồng bộ, phản hồi tiến độ, giao tiếp WebSocket
- **Giao diện hiện đại**: React + TypeScript + Ant Design, thiết kế responsive
- **Dễ triển khai**: Script khởi động một chạm, hỗ trợ Docker, tài liệu chi tiết

## Khởi động nhanh

### Yêu cầu môi trường

- **Python**: 3.8+ (khuyến nghị 3.9+)
- **Node.js**: 16+ (khuyến nghị 18+)
- **Redis**: 6.0+
- **FFmpeg**: Xử lý video
- **Bộ nhớ**: Tối thiểu 4GB, khuyến nghị 8GB+
- **Lưu trữ**: Tối thiểu 10GB dung lượng trống

### Khởi động

```bash
# Clone dự án
git clone https://github.com/zhouxiaoka/autoclip.git
cd autoclip

# Khởi động nhanh (bỏ qua kiểm tra chi tiết)
./quick_start.sh

# Hoặc khởi động đầy đủ
./start_autoclip.sh

# Dừng hệ thống
./stop_autoclip.sh

# Kiểm tra trạng thái
./status_autoclip.sh
```

### Địa chỉ truy cập

- **Giao diện**: http://localhost:3000
- **API Backend**: http://localhost:8000
- **Tài liệu API**: http://localhost:8000/docs

## Cấu trúc dự án

```
autoclip/
├── backend/          # FastAPI backend
├── frontend/         # React frontend
├── prompt/           # Mẫu prompt AI
├── scripts/          # Script tiện ích
├── quick_start.sh    # Khởi động nhanh
├── start_autoclip.sh # Khởi động đầy đủ
├── stop_autoclip.sh  # Dừng dịch vụ
└── status_autoclip.sh# Kiểm tra trạng thái
```

## Công nghệ

### Backend
- **FastAPI**: Framework web Python, tự động tạo tài liệu API
- **Celery**: Hàng đợi tác vụ, xử lý bất đồng bộ
- **Redis**: Cache và message broker
- **SQLite**: Cơ sở dữ liệu, có thể nâng cấp lên PostgreSQL
- **yt-dlp**: Tải video YouTube
- **FFmpeg**: Xử lý video

### Frontend
- **React 18**: Giao diện người dùng
- **TypeScript**: Type-safe
- **Ant Design**: Thư viện UI
- **Vite**: Build tool, hot reload
- **Zustand**: Quản lý state

## Giấy phép

MIT License - xem file [LICENSE](LICENSE) để biết chi tiết.
