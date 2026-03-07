#!/bin/bash

# Script dừng hệ thống AutoClip
# Phiên bản: 2.0
# Chức năng: Dừng tất cả dịch vụ AutoClip một cách an toàn

set -euo pipefail

# =============================================================================
# Vùng cấu hình
# =============================================================================

# File PID
BACKEND_PID_FILE="backend.pid"
FRONTEND_PID_FILE="frontend.pid"
CELERY_PID_FILE="celery.pid"

# Thư mục nhật ký
LOG_DIR="logs"

# =============================================================================
# Định nghĩa màu sắc và kiểu
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Định nghĩa biểu tượng
ICON_SUCCESS="✅"
ICON_ERROR="❌"
ICON_WARNING="⚠️"
ICON_INFO="ℹ️"
ICON_STOP="🛑"
ICON_CLEAN="🧹"

# =============================================================================
# Hàm tiện ích
# =============================================================================

log_info() {
    echo -e "${BLUE}${ICON_INFO} $1${NC}"
}

log_success() {
    echo -e "${GREEN}${ICON_SUCCESS} $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}${ICON_WARNING} $1${NC}"
}

log_error() {
    echo -e "${RED}${ICON_ERROR} $1${NC}"
}

log_header() {
    echo -e "\n${PURPLE}${ICON_STOP} $1${NC}"
    echo -e "${PURPLE}$(printf '=%.0s' {1..50})${NC}"
}

# Dừng tiến trình
stop_process() {
    local pid_file="$1"
    local service_name="$2"
    
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            log_info "Đang dừng $service_name (PID: $pid)..."
            
            # Dừng an toàn
            kill "$pid" 2>/dev/null || true
            
            # Chờ tiến trình kết thúc
            local count=0
            while kill -0 "$pid" 2>/dev/null && [[ $count -lt 10 ]]; do
                sleep 1
                ((count++))
            done
            
            # Nếu tiến trình vẫn chạy, ép dừng
            if kill -0 "$pid" 2>/dev/null; then
                log_warning "Đang ép dừng $service_name..."
                kill -9 "$pid" 2>/dev/null || true
                sleep 1
            fi
            
            if kill -0 "$pid" 2>/dev/null; then
                log_error "Không thể dừng $service_name"
            else
                log_success "$service_name đã dừng"
            fi
        else
            log_warning "Tiến trình $service_name không tồn tại"
        fi
        rm -f "$pid_file"
    else
        log_info "File PID $service_name không tồn tại"
    fi
}

# Dừng tất cả tiến trình liên quan
stop_all_processes() {
    log_header "Dừng tất cả dịch vụ AutoClip"
    
    # Dừng các tiến trình quản lý bằng file PID
    stop_process "$BACKEND_PID_FILE" "Dịch vụ backend"
    stop_process "$FRONTEND_PID_FILE" "Dịch vụ frontend"
    stop_process "$CELERY_PID_FILE" "Celery Worker"
    
    # Dừng tất cả tiến trình liên quan
    log_info "Đang dừng tất cả tiến trình Celery Worker..."
    pkill -f "celery.*worker" 2>/dev/null || true
    
    log_info "Đang dừng tất cả tiến trình backend API..."
    pkill -f "uvicorn.*backend.main:app" 2>/dev/null || true
    
    log_info "Đang dừng tất cả máy chủ phát triển frontend..."
    pkill -f "npm.*dev" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    
    # Chờ tiến trình dừng hoàn toàn
    sleep 2
    
    log_success "Tất cả dịch vụ đã dừng"
}

# Dọn dẹp file tạm
cleanup_temp_files() {
    log_header "Dọn dẹp file tạm"
    
    # Dọn file PID
    rm -f "$BACKEND_PID_FILE" "$FRONTEND_PID_FILE" "$CELERY_PID_FILE"
    log_success "Đã dọn file PID"
    
    # Dọn file tạm Celery
    rm -f /tmp/celerybeat-schedule /tmp/celerybeat.pid 2>/dev/null || true
    log_success "Đã dọn file tạm Celery"
    
    # Dọn cache Python
    find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true
    find . -name "*.pyc" -delete 2>/dev/null || true
    log_success "Đã dọn cache Python"
}

# Hiển thị trạng thái hệ thống
show_system_status() {
    log_header "Kiểm tra trạng thái hệ thống"
    
    local services_running=false
    
    # Kiểm tra dịch vụ backend
    if pgrep -f "uvicorn.*backend.main:app" >/dev/null; then
        log_warning "Dịch vụ backend vẫn đang chạy"
        services_running=true
    else
        log_success "Dịch vụ backend đã dừng"
    fi
    
    # Kiểm tra dịch vụ frontend
    if pgrep -f "npm.*dev\|vite" >/dev/null; then
        log_warning "Dịch vụ frontend vẫn đang chạy"
        services_running=true
    else
        log_success "Dịch vụ frontend đã dừng"
    fi
    
    # Kiểm tra Celery Worker
    if pgrep -f "celery.*worker" >/dev/null; then
        log_warning "Celery Worker vẫn đang chạy"
        services_running=true
    else
        log_success "Celery Worker đã dừng"
    fi
    
    if [[ "$services_running" == true ]]; then
        log_warning "Một số dịch vụ vẫn đang chạy, có thể cần dừng thủ công"
        echo ""
        echo "Các tiến trình vẫn đang chạy:"
        pgrep -f "uvicorn.*backend.main:app\|npm.*dev\|vite\|celery.*worker" | while read pid; do
            ps -p "$pid" -o pid,ppid,cmd --no-headers 2>/dev/null || true
        done
    else
        log_success "Tất cả dịch vụ AutoClip đã dừng hoàn toàn"
    fi
}

# Hiển thị thông tin nhật ký
show_log_info() {
    log_header "Thông tin file nhật ký"
    
    if [[ -d "$LOG_DIR" ]]; then
        echo "Vị trí file nhật ký:"
        ls -la "$LOG_DIR"/*.log 2>/dev/null | while read line; do
            echo "  $line"
        done
        echo ""
        echo "Xem nhật ký mới nhất:"
        echo "  Nhật ký backend: tail -f $LOG_DIR/backend.log"
        echo "  Nhật ký frontend: tail -f $LOG_DIR/frontend.log"
        echo "  Nhật ký Celery: tail -f $LOG_DIR/celery.log"
    else
        log_info "Thư mục nhật ký không tồn tại"
    fi
}

# =============================================================================
# Hàm chính
# =============================================================================

main() {
    log_header "Bộ dừng hệ thống AutoClip v2.0"
    
    # Dừng tất cả dịch vụ
    stop_all_processes
    
    # Dọn dẹp file tạm
    cleanup_temp_files
    
    # Hiển thị trạng thái hệ thống
    show_system_status
    
    # Hiển thị thông tin nhật ký
    show_log_info
    
    echo ""
    log_success "Hệ thống AutoClip đã dừng hoàn toàn"
    echo ""
    echo "Để khởi động lại, vui lòng chạy: ./start_autoclip.sh"
}

# Chạy hàm chính
main "$@"
