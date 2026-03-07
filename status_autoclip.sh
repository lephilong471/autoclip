#!/bin/bash

# Script kiểm tra trạng thái hệ thống AutoClip
# Phiên bản: 2.0
# Chức năng: Kiểm tra trạng thái chạy của các dịch vụ AutoClip

set -euo pipefail

# =============================================================================
# Vùng cấu hình
# =============================================================================

# Cấu hình cổng dịch vụ
BACKEND_PORT=8000
FRONTEND_PORT=3000
REDIS_PORT=6379

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
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Định nghĩa biểu tượng
ICON_SUCCESS="✅"
ICON_ERROR="❌"
ICON_WARNING="⚠️"
ICON_INFO="ℹ️"
ICON_HEALTH="💚"
ICON_SICK="🤒"
ICON_ROCKET="🚀"
ICON_DATABASE="🗄️"
ICON_WORKER="👷"
ICON_WEB="🌐"
ICON_REDIS="🔴"

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
    echo -e "\n${PURPLE}${ICON_ROCKET} $1${NC}"
    echo -e "${PURPLE}$(printf '=%.0s' {1..50})${NC}"
}

# Kiểm tra sức khỏe dịch vụ
check_service_health() {
    local url="$1"
    local service_name="$2"
    
    if curl -fsS "$url" >/dev/null 2>&1; then
        echo -e "${GREEN}${ICON_HEALTH} $service_name hoạt động tốt${NC}"
        return 0
    else
        echo -e "${RED}${ICON_SICK} $service_name không hoạt động${NC}"
        return 1
    fi
}

# Kiểm tra trạng thái tiến trình
check_process_status() {
    local pid_file="$1"
    local service_name="$2"
    local process_pattern="$3"
    
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${GREEN}${ICON_SUCCESS} $service_name đang chạy (PID: $pid)${NC}"
            return 0
        else
            echo -e "${RED}${ICON_ERROR} $service_name file PID tồn tại nhưng tiến trình không tồn tại${NC}"
            return 1
        fi
    else
        # Kiểm tra có tiến trình liên quan đang chạy
        if pgrep -f "$process_pattern" >/dev/null; then
            local pids=$(pgrep -f "$process_pattern" | tr '\n' ' ')
            echo -e "${YELLOW}${ICON_WARNING} $service_name đang chạy nhưng không có file PID (PIDs: $pids)${NC}"
            return 0
        else
            echo -e "${RED}${ICON_ERROR} $service_name không chạy${NC}"
            return 1
        fi
    fi
}

# Lấy thông tin dịch vụ
get_service_info() {
    local service_name="$1"
    local pid_file="$2"
    local process_pattern="$3"
    
    echo -e "\n${CYAN}📊 Thông tin chi tiết $service_name:${NC}"
    
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo "  PID: $pid"
            echo "  Thông tin tiến trình:"
            ps -p "$pid" -o pid,ppid,etime,pcpu,pmem,cmd --no-headers 2>/dev/null | while read line; do
                echo "    $line"
            done
        fi
    else
        local pids=$(pgrep -f "$process_pattern" 2>/dev/null || true)
        if [[ -n "$pids" ]]; then
            echo "  PIDs: $pids"
            echo "  Thông tin tiến trình:"
            echo "$pids" | while read pid; do
                ps -p "$pid" -o pid,ppid,etime,pcpu,pmem,cmd --no-headers 2>/dev/null | while read line; do
                    echo "    $line"
                done
            done
        fi
    fi
}

# =============================================================================
# Hàm kiểm tra
# =============================================================================

check_redis() {
    log_header "Trạng thái dịch vụ Redis"
    
    if redis-cli ping >/dev/null 2>&1; then
        log_success "Dịch vụ Redis hoạt động bình thường"
        
        # Lấy thông tin Redis
        echo -e "\n${CYAN}📊 Thông tin chi tiết Redis:${NC}"
        redis-cli info server | grep -E "(redis_version|uptime_in_seconds|connected_clients)" | while read line; do
            echo "  $line"
        done
        return 0
    else
        log_error "Dịch vụ Redis không chạy hoặc không thể kết nối"
        return 1
    fi
}

check_backend() {
    log_header "Trạng thái dịch vụ API backend"
    
    # Kiểm tra trạng thái tiến trình
    if check_process_status "$BACKEND_PID_FILE" "Dịch vụ backend" "uvicorn.*backend.main:app"; then
        # Kiểm tra sức khỏe
        if check_service_health "http://localhost:$BACKEND_PORT/api/v1/health/" "API Backend"; then
            get_service_info "Dịch vụ backend" "$BACKEND_PID_FILE" "uvicorn.*backend.main:app"
            return 0
        else
            log_warning "Tiến trình backend chạy nhưng API không phản hồi"
            return 1
        fi
    else
        return 1
    fi
}

check_frontend() {
    log_header "Trạng thái dịch vụ frontend"
    
    # Kiểm tra trạng thái tiến trình
    if check_process_status "$FRONTEND_PID_FILE" "Dịch vụ frontend" "npm.*dev\|vite"; then
        # Kiểm tra sức khỏe
        if check_service_health "http://localhost:$FRONTEND_PORT/" "Giao diện frontend"; then
            get_service_info "Dịch vụ frontend" "$FRONTEND_PID_FILE" "npm.*dev\|vite"
            return 0
        else
            log_warning "Tiến trình frontend chạy nhưng dịch vụ không phản hồi"
            return 1
        fi
    else
        return 1
    fi
}

check_celery() {
    log_header "Trạng thái Celery Worker"
    
    # Kiểm tra trạng thái tiến trình
    if check_process_status "$CELERY_PID_FILE" "Celery Worker" "celery.*worker"; then
        get_service_info "Celery Worker" "$CELERY_PID_FILE" "celery.*worker"
        
        # Kiểm tra kết nối Celery
        if command -v celery >/dev/null 2>&1; then
            echo -e "\n${CYAN}📊 Thông tin chi tiết Celery:${NC}"
            if PYTHONPATH="${PWD}:${PYTHONPATH:-}" celery -A backend.core.celery_app inspect active >/dev/null 2>&1; then
                log_success "Kết nối Celery bình thường"
                
                # Lấy số tác vụ đang hoạt động
                local active_tasks=$(PYTHONPATH="${PWD}:${PYTHONPATH:-}" celery -A backend.core.celery_app inspect active 2>/dev/null | jq -r '.[] | length' 2>/dev/null || echo "0")
                echo "  Số tác vụ đang hoạt động: $active_tasks"
            else
                log_warning "Kiểm tra kết nối Celery thất bại"
            fi
        fi
        return 0
    else
        return 1
    fi
}

check_database() {
    log_header "Trạng thái cơ sở dữ liệu"
    
    if [[ -f "data/autoclip.db" ]]; then
        log_success "File cơ sở dữ liệu tồn tại"
        
        # Lấy thông tin cơ sở dữ liệu
        echo -e "\n${CYAN}📊 Thông tin chi tiết cơ sở dữ liệu:${NC}"
        local db_size=$(du -h "data/autoclip.db" 2>/dev/null | cut -f1)
        echo "  Kích thước file: $db_size"
        
        # Kiểm tra kết nối cơ sở dữ liệu
        if python -c "
import sys
sys.path.insert(0, '.')
from backend.core.database import test_connection
if test_connection():
    print('Kết nối cơ sở dữ liệu bình thường')
else:
    print('Kết nối cơ sở dữ liệu thất bại')
    sys.exit(1)
" 2>/dev/null; then
            log_success "Kết nối cơ sở dữ liệu bình thường"
        else
            log_error "Kết nối cơ sở dữ liệu thất bại"
            return 1
        fi
    else
        log_warning "File cơ sở dữ liệu không tồn tại"
        return 1
    fi
}

check_logs() {
    log_header "Trạng thái file nhật ký"
    
    if [[ -d "$LOG_DIR" ]]; then
        log_success "Thư mục nhật ký tồn tại"
        
        echo -e "\n${CYAN}📊 Thông tin file nhật ký:${NC}"
        ls -la "$LOG_DIR"/*.log 2>/dev/null | while read line; do
            echo "  $line"
        done
        
        # Hiển thị nhật ký mới nhất
        echo -e "\n${CYAN}📝 Nhật ký mới nhất (10 dòng cuối):${NC}"
        for log_file in "$LOG_DIR"/*.log; do
            if [[ -f "$log_file" ]]; then
                echo -e "\n${YELLOW}$(basename "$log_file"):${NC}"
                tail -n 5 "$log_file" 2>/dev/null | while read line; do
                    echo "  $line"
                done
            fi
        done
    else
        log_warning "Thư mục nhật ký không tồn tại"
    fi
}

# =============================================================================
# Hàm chính
# =============================================================================

main() {
    log_header "Kiểm tra trạng thái hệ thống AutoClip v2.0"
    
    local overall_status=0
    
    # Kiểm tra từng dịch vụ
    check_redis || overall_status=1
    check_database || overall_status=1
    check_celery || overall_status=1
    check_backend || overall_status=1
    check_frontend || overall_status=1
    check_logs
    
    # Hiển thị trạng thái tổng thể
    log_header "Trạng thái tổng thể hệ thống"
    
    if [[ $overall_status -eq 0 ]]; then
        log_success "Tất cả dịch vụ hoạt động bình thường"
        echo ""
        echo -e "${WHITE}🎉 Hệ thống AutoClip hoàn toàn ổn định!${NC}"
        echo ""
        echo -e "${CYAN}🌐 Địa chỉ truy cập:${NC}"
        echo -e "  Giao diện:   http://localhost:$FRONTEND_PORT"
        echo -e "  API Backend: http://localhost:$BACKEND_PORT"
        echo -e "  Tài liệu API: http://localhost:$BACKEND_PORT/docs"
    else
        log_error "Một số dịch vụ gặp vấn đề"
        echo ""
        echo -e "${YELLOW}💡 Gợi ý thao tác:${NC}"
        echo -e "  1. Xem file nhật ký để biết chi tiết lỗi"
        echo -e "  2. Khởi động lại hệ thống: ./stop_autoclip.sh && ./start_autoclip.sh"
        echo -e "  3. Kiểm tra cấu hình môi trường và phụ thuộc"
    fi
    
    echo ""
    echo -e "${CYAN}📋 Lệnh thường dùng:${NC}"
    echo -e "  Khởi động: ./start_autoclip.sh"
    echo -e "  Dừng:      ./stop_autoclip.sh"
    echo -e "  Xem nhật ký: tail -f $LOG_DIR/*.log"
}

# Chạy hàm chính
main "$@"
