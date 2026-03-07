"""
Công cụ gửi nhiệm vụ
Hàm tiện ích độc lập, tránh vòng lặp import
"""

import logging
from typing import Dict, Any, Optional
from ..core.celery_app import celery_app

logger = logging.getLogger(__name__)

def submit_video_pipeline_task(project_id: str, input_video_path: str, input_srt_path: str) -> Dict[str, Any]:
    """
    Gửi nhiệm vụ pipeline xử lý video
    
    Args:
        project_id: ID dự án
        input_video_path: Đường dẫn video đầu vào
        input_srt_path: Đường dẫn SRT đầu vào
        
    Returns:
        Kết quả gửi nhiệm vụ
    """
    try:
        logger.info(f"Gửi nhiệm vụ pipeline video: {project_id}")
        
        # Dùng celery_app trực tiếp để gửi nhiệm vụ
        logger.info(f"Chuẩn bị gửi nhiệm vụ vào hàng đợi...")
        logger.info(f"Tên nhiệm vụ: backend.tasks.processing.process_video_pipeline")
        logger.info(f"Tham số nhiệm vụ: {[project_id, input_video_path, input_srt_path]}")
        
        try:
            celery_task = celery_app.send_task(
                'backend.tasks.processing.process_video_pipeline',
                args=[project_id, input_video_path, input_srt_path]
            )
            
            logger.info(f"Nhiệm vụ pipeline video đã gửi: {celery_task.id}")
            logger.info(f"Trạng thái nhiệm vụ: {celery_task.state}")
            
            # Kiểm tra nhiệm vụ đã thực sự vào hàng đợi chưa
            import redis
            r = redis.Redis(host='localhost', port=6379, db=0)
            queue_length = r.llen('processing')
            logger.info(f"Độ dài hàng đợi Redis: {queue_length}")
            
        except Exception as e:
            logger.error(f"Lỗi khi gửi nhiệm vụ: {e}")
            raise
        
        return {
            'success': True,
            'task_id': celery_task.id,
            'status': 'PENDING',
            'message': 'Nhiệm vụ pipeline video đã được gửi'
        }
        
    except Exception as e:
        logger.error(f"Gửi nhiệm vụ pipeline video thất bại: {project_id}, lỗi: {e}")
        return {
            'success': False,
            'error': str(e),
            'message': 'Gửi nhiệm vụ thất bại'
        }

def submit_single_step_task(project_id: str, step: str, config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Gửi nhiệm vụ một bước
    
    Args:
        project_id: ID dự án
        step: Tên bước
        config: Cấu hình xử lý
        
    Returns:
        Kết quả gửi nhiệm vụ
    """
    try:
        logger.info(f"Gửi nhiệm vụ bước đơn: {project_id}, {step}")
        
        # Dùng celery_app trực tiếp để gửi nhiệm vụ
        celery_task = celery_app.send_task(
            'tasks.processing.process_single_step',
            args=[project_id, step, config]
        )
        
        logger.info(f"Nhiệm vụ bước đơn đã gửi: {celery_task.id}")
        
        return {
            'success': True,
            'task_id': celery_task.id,
            'step': step,
            'status': 'PENDING',
            'message': f'Nhiệm vụ bước {step} đã được gửi'
        }
        
    except Exception as e:
        logger.error(f"Gửi nhiệm vụ bước đơn thất bại: {project_id}, {step}, lỗi: {e}")
        return {
            'success': False,
            'error': str(e),
            'message': 'Gửi nhiệm vụ thất bại'
        }
