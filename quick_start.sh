#!/bin/bash

# Script khởi động nhanh AutoClip
# Phiên bản: 2.0
# Chức năng: Khởi động môi trường phát triển nhanh, bỏ qua kiểm tra chi tiết

set -euo pipefail

# =============================================================================
# Vùng cấu hình
# =============================================================================

BACKEND_PORT=8000
FRONTEND_PORT=3000

# =============================================================================
# Định nghĩa màu sắc
# =============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# =============================================================================
# Hàm tiện ích
# =============================================================================

log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# =============================================================================
# Hàm chính
# =============================================================================

main() {
    echo -e "${GREEN}🚀 AutoClip Khởi động nhanh${NC}"
    echo ""
    
    # Kiểm tra môi trường ảo
    if [[ ! -d "venv" ]]; then
        log_warning "Môi trường ảo không tồn tại, vui lòng chạy: python3 -m venv venv"
        exit 1
    fi
    
    # Kích hoạt môi trường ảo
    log_info "Đang kích hoạt môi trường ảo..."
    source venv/bin/activate
    
    # Thiết lập đường dẫn Python
    : "${PYTHONPATH:=}"
    export PYTHONPATH="${PWD}:${PYTHONPATH}"
    
    # Tải biến môi trường
    if [[ -f ".env" ]]; then
        set -a
        source .env
        set +a
    fi
    
    # Khởi động Redis (nếu cần)
    if ! redis-cli ping >/dev/null 2>&1; then
        log_info "Đang khởi động Redis..."
        if command -v brew >/dev/null; then
            brew services start redis
            sleep 2
        fi
    fi
    
    # Tạo thư mục nhật ký
    mkdir -p logs
    
    # Khởi động backend
    log_info "Đang khởi động dịch vụ backend..."
    nohup python -m uvicorn backend.main:app --host 0.0.0.0 --port "$BACKEND_PORT" --reload > logs/backend.log 2>&1 &
    echo $! > backend.pid
    
    # Khởi động Celery Worker
    log_info "Đang khởi động Celery Worker..."
    nohup celery -A backend.core.celery_app worker --loglevel=info --concurrency=2 -Q processing,upload,notification,maintenance > logs/celery.log 2>&1 &
    echo $! > celery.pid
    
    # Khởi động frontend
    log_info "Đang khởi động dịch vụ frontend..."
    cd frontend
    nohup npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT" > ../logs/frontend.log 2>&1 &
    echo $! > ../frontend.pid
    cd ..
    
    # Chờ dịch vụ khởi động
    log_info "Đang chờ dịch vụ khởi động..."
    sleep 5
    
    # Kiểm tra trạng thái dịch vụ
    if curl -fsS "http://localhost:$BACKEND_PORT/api/v1/health/" >/dev/null 2>&1; then
        log_success "Dịch vụ backend đã khởi động"
    else
        log_warning "Dịch vụ backend có thể gặp sự cố khi khởi động"
    fi
    
    if curl -fsS "http://localhost:$FRONTEND_PORT/" >/dev/null 2>&1; then
        log_success "Dịch vụ frontend đã khởi động"
    else
        log_warning "Dịch vụ frontend có thể gặp sự cố khi khởi động"
    fi
    
    echo ""
    log_success "Khởi động nhanh hoàn tất!"
    echo ""
    echo "🌐 Địa chỉ truy cập:"
    echo "  Frontend: http://localhost:$FRONTEND_PORT"
    echo "  Backend:  http://localhost:$BACKEND_PORT"
    echo "  Tài liệu API: http://localhost:$BACKEND_PORT/docs"
    echo ""
    echo "📝 Xem nhật ký:"
    echo "  tail -f logs/backend.log"
    echo "  tail -f logs/frontend.log"
    echo "  tail -f logs/celery.log"
    echo ""
    echo "🛑 Dừng dịch vụ: ./stop_autoclip.sh"
}

# Chạy hàm chính
main "$@"
