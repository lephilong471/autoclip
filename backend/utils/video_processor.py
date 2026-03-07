"""
Công cụ xử lý video
"""
import subprocess
import json
import logging
import re
from typing import List, Dict, Optional
from pathlib import Path

# Sửa lỗi import
try:
    from ..core.shared_config import CLIPS_DIR, COLLECTIONS_DIR
except ImportError:
    # Nếu import tương đối thất bại, thử import tuyệt đối
    import sys
    from pathlib import Path
    backend_path = Path(__file__).parent.parent
    if str(backend_path) not in sys.path:
        sys.path.insert(0, str(backend_path))
    from ..core.shared_config import CLIPS_DIR, COLLECTIONS_DIR

logger = logging.getLogger(__name__)

class VideoProcessor:
    """Lớp công cụ xử lý video"""
    
    def __init__(self, clips_dir: Optional[str] = None, collections_dir: Optional[str] = None):
        # Bắt buộc sử dụng đường dẫn cụ thể của dự án được truyền vào, không dùng đường dẫn toàn cục
        if not clips_dir:
            raise ValueError("Tham số clips_dir là bắt buộc, không thể sử dụng đường dẫn toàn cục")
        if not collections_dir:
            raise ValueError("Tham số collections_dir là bắt buộc, không thể sử dụng đường dẫn toàn cục")
        
        self.clips_dir = Path(clips_dir)
        self.collections_dir = Path(collections_dir)
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """
        Làm sạch tên file, loại bỏ hoặc thay thế các ký tự không hợp lệ
        
        Args:
            filename: Tên file gốc
            
        Returns:
            Tên file đã làm sạch
        """
        # Loại bỏ hoặc thay thế các ký tự không hợp lệ
        # Các ký tự không được phép trên Windows và Unix: < > : " | ? * \ /
        # Thay thế bằng gạch dưới
        sanitized = re.sub(r'[<>:"|?*\\/]', '_', filename)
        
        # Loại bỏ khoảng trắng và dấu chấm ở đầu cuối
        sanitized = sanitized.strip(' .')
        
        # Giới hạn độ dài, tránh tên file quá dài
        if len(sanitized) > 100:
            sanitized = sanitized[:100]
        
        # Đảm bảo tên file không rỗng
        if not sanitized:
            sanitized = "untitled"
            
        return sanitized
    
    @staticmethod
    def convert_srt_time_to_ffmpeg_time(srt_time: str) -> str:
        """
        Chuyển định dạng thời gian SRT sang FFmpeg
        
        Args:
            srt_time: Định dạng thời gian SRT (vd: "00:00:06,140" hoặc "00:00:06.140")
            
        Returns:
            Định dạng thời gian FFmpeg (vd: "00:00:06.140")
        """
        # Thay dấu phẩy bằng dấu chấm
        return srt_time.replace(',', '.')
    
    @staticmethod
    def convert_seconds_to_ffmpeg_time(seconds: float) -> str:
        """
        Chuyển số giây sang định dạng thời gian FFmpeg
        
        Args:
            seconds: Số giây
            
        Returns:
            Định dạng thời gian FFmpeg (vd: "00:00:06.140")
        """
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        secs = int(seconds % 60)
        milliseconds = int((seconds % 1) * 1000)
        
        return f"{hours:02d}:{minutes:02d}:{secs:02d}.{milliseconds:03d}"
    
    @staticmethod
    def convert_ffmpeg_time_to_seconds(time_str: str) -> float:
        """
        Chuyển định dạng thời gian FFmpeg sang số giây
        
        Args:
            time_str: Định dạng thời gian FFmpeg (vd: "00:00:06.140")
            
        Returns:
            Số giây
        """
        try:
            # Xử lý phần mili giây
            if '.' in time_str:
                time_part, ms_part = time_str.split('.')
                milliseconds = int(ms_part)
            else:
                time_part = time_str
                milliseconds = 0
            
            # Phân tích giờ phút giây
            h, m, s = map(int, time_part.split(':'))
            
            return h * 3600 + m * 60 + s + milliseconds / 1000
        except Exception as e:
            logger.error(f"Chuyển đổi định dạng thời gian thất bại: {time_str}, lỗi: {e}")
            return 0.0
    
    @staticmethod
    def extract_clip(input_video: Path, output_path: Path, 
                    start_time: str, end_time: str) -> bool:
        """
        Trích xuất đoạn video trong khoảng thời gian chỉ định
        
        Args:
            input_video: Đường dẫn video đầu vào
            output_path: Đường dẫn video đầu ra
            start_time: Thời gian bắt đầu (định dạng: "00:01:25,140")
            end_time: Thời gian kết thúc (định dạng: "00:02:53,500")
            
        Returns:
            Thành công hay không
        """
        try:
            # Đảm bảo thư mục đầu ra tồn tại
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Chuyển định dạng thời gian: từ SRT sang FFmpeg
            ffmpeg_start_time = VideoProcessor.convert_srt_time_to_ffmpeg_time(start_time)
            ffmpeg_end_time = VideoProcessor.convert_srt_time_to_ffmpeg_time(end_time)
            
            # Tính thời lượng
            start_seconds = VideoProcessor.convert_ffmpeg_time_to_seconds(ffmpeg_start_time)
            end_seconds = VideoProcessor.convert_ffmpeg_time_to_seconds(ffmpeg_end_time)
            duration = end_seconds - start_seconds
            
            # Xây dựng lệnh FFmpeg tối ưu
            # Dùng -ss trước input để định vị chính xác, -t để chỉ định thời lượng
            cmd = [
                'ffmpeg',
                '-ss', ffmpeg_start_time,  # Định vị trước input, chính xác hơn
                '-i', str(input_video),
                '-t', str(duration),  # Dùng thời lượng thay vì thời gian kết thúc tuyệt đối
                '-c:v', 'copy',  # Sao chép luồng video
                '-c:a', 'copy',  # Sao chép luồng âm thanh
                '-avoid_negative_ts', 'make_zero',
                '-y',  # Ghi đè file đầu ra
                str(output_path)
            ]
            
            # Thực thi lệnh
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
            
            if result.returncode == 0:
                logger.info(f"Trích xuất đoạn video thành công: {output_path} ({ffmpeg_start_time} -> {ffmpeg_end_time}, thời lượng: {duration:.2f}s)")
                return True
            else:
                logger.error(f"Trích xuất đoạn video thất bại: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Lỗi xử lý video: {str(e)}")
            return False
    
    @staticmethod
    def create_collection(clips_list: List[Path], output_path: Path) -> bool:
        """
        Ghép nhiều đoạn video thành bộ sưu tập
        
        Args:
            clips_list: Danh sách đường dẫn đoạn video
            output_path: Đường dẫn file bộ sưu tập đầu ra
            
        Returns:
            Thành công hay không
        """
        try:
            # Kiểm tra tham số đầu vào
            if not clips_list:
                logger.error("clips_list rỗng, không thể tạo bộ sưu tập")
                return False
            
            # Kiểm tra tất cả file video có tồn tại
            valid_clips = []
            for clip_path in clips_list:
                if not clip_path.exists():
                    logger.warning(f"File video không tồn tại, bỏ qua: {clip_path}")
                    continue
                valid_clips.append(clip_path)
            
            if not valid_clips:
                logger.error("Không có file video hợp lệ, không thể tạo bộ sưu tập")
                return False
            
            # Đảm bảo thư mục đầu ra tồn tại
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Tạo file concat
            concat_file = output_path.parent / "concat_list.txt"
            
            with open(concat_file, 'w', encoding='utf-8') as f:
                for clip_path in valid_clips:
                    # Dùng đường dẫn tuyệt đối và escape dấu nháy đơn
                    abs_path = clip_path.absolute()
                    escaped_path = str(abs_path).replace("'", "'\"'\"'")
                    f.write(f"file '{escaped_path}'\n")
            
            # Kiểm tra nội dung file concat
            if concat_file.stat().st_size == 0:
                logger.error("File concat rỗng, không thể tạo bộ sưu tập")
                concat_file.unlink(missing_ok=True)
                return False
            
            # Xây dựng lệnh FFmpeg - dùng H.264 đảm bảo tương thích
            cmd = [
                'ffmpeg',
                '-f', 'concat',
                '-safe', '0',
                '-i', str(concat_file),
                '-c:v', 'libx264',  # Mã hóa video H.264
                '-preset', 'ultrafast',  # Preset mã hóa nhanh nhất
                '-crf', '28',  # Giảm chất lượng nhẹ để tăng tốc
                '-c:a', 'aac',  # Mã hóa âm thanh AAC
                '-b:a', '128k',  # Bitrate âm thanh
                '-movflags', '+faststart',  # Tối ưu phát trực tuyến
                '-y',
                str(output_path)
            ]
            
            logger.info(f"Thực thi lệnh FFmpeg: {' '.join(cmd)}")
            
            # Thực thi lệnh
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
            
            # Xóa file tạm
            concat_file.unlink(missing_ok=True)
            
            if result.returncode == 0:
                logger.info(f"Tạo bộ sưu tập thành công: {output_path}")
                return True
            else:
                logger.error(f"Tạo bộ sưu tập thất bại: {result.stderr}")
                logger.error(f"FFmpeg stdout: {result.stdout}")
                return False
                
        except Exception as e:
            logger.error(f"Lỗi ghép video: {str(e)}")
            return False
    
    @staticmethod
    def extract_thumbnail(video_path: Path, output_path: Path, time_offset: int = 5) -> bool:
        """
        Trích xuất ảnh xem trước từ video
        
        Args:
            video_path: Đường dẫn file video
            output_path: Đường dẫn ảnh xem trước đầu ra
            time_offset: Điểm thời gian trích xuất (giây)
            
        Returns:
            Thành công hay không
        """
        try:
            # Đảm bảo thư mục đầu ra tồn tại
            output_path.parent.mkdir(parents=True, exist_ok=True)
            
            # Xây dựng lệnh FFmpeg
            cmd = [
                'ffmpeg',
                '-i', str(video_path),
                '-ss', str(time_offset),
                '-vframes', '1',
                '-q:v', '2',  # Chất lượng cao
                '-y',  # Ghi đè file đầu ra
                str(output_path)
            ]
            
            # Thực thi lệnh
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
            
            if result.returncode == 0 and output_path.exists():
                logger.info(f"Trích xuất ảnh xem trước thành công: {output_path}")
                return True
            else:
                logger.error(f"Trích xuất ảnh xem trước thất bại: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"Lỗi trích xuất ảnh xem trước: {str(e)}")
            return False
    
    @staticmethod
    def get_video_info(video_path: Path) -> Dict:
        """
        Lấy thông tin video
        
        Args:
            video_path: Đường dẫn file video
            
        Returns:
            Từ điển thông tin video
        """
        try:
            cmd = [
                'ffprobe',
                '-v', 'quiet',
                '-print_format', 'json',
                '-show_format',
                '-show_streams',
                str(video_path)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
            
            if result.returncode == 0:
                info = json.loads(result.stdout)
                return {
                    'duration': float(info['format']['duration']),
                    'size': int(info['format']['size']),
                    'bitrate': int(info['format']['bit_rate']),
                    'streams': info['streams']
                }
            else:
                logger.error(f"Lấy thông tin video thất bại: {result.stderr}")
                return {}
                
        except Exception as e:
            logger.error(f"Lỗi lấy thông tin video: {str(e)}")
            return {}
    
    def batch_extract_clips(self, input_video: Path, clips_data: List[Dict]) -> List[Path]:
        """
        Trích xuất hàng loạt các đoạn video
        
        Args:
            input_video: Đường dẫn video đầu vào
            clips_data: Danh sách dữ liệu đoạn, mỗi phần tử chứa id, title, start_time, end_time
            
        Returns:
            Danh sách đường dẫn các đoạn trích xuất thành công
        """
        successful_clips = []
        
        for clip_data in clips_data:
            clip_id = clip_data['id']
            title = clip_data.get('title', f"Đoạn_{clip_id}")
            start_time = clip_data['start_time']
            end_time = clip_data['end_time']
            
            # Xử lý định dạng thời gian - nếu là số giây, chuyển sang SRT
            if isinstance(start_time, (int, float)):
                start_time = VideoProcessor.convert_seconds_to_ffmpeg_time(start_time)
            if isinstance(end_time, (int, float)):
                end_time = VideoProcessor.convert_seconds_to_ffmpeg_time(end_time)
            
            # Dùng tiêu đề làm tên file và làm sạch ký tự không hợp lệ
            # Bao gồm clip_id trong tên file để dễ tìm khi ghép bộ sưu tập
            safe_title = VideoProcessor.sanitize_filename(title)
            output_path = self.clips_dir / f"{clip_id}_{safe_title}.mp4"
            
            logger.info(f"Trích xuất đoạn {clip_id}: {start_time} -> {end_time}, đầu ra: {output_path}")
            
            if VideoProcessor.extract_clip(input_video, output_path, start_time, end_time):
                successful_clips.append(output_path)
                logger.info(f"Đoạn {clip_id} trích xuất thành công")
            else:
                logger.error(f"Đoạn {clip_id} trích xuất thất bại")
        
        return successful_clips
    
    def create_collections_from_metadata(self, collections_data: List[Dict]) -> List[Path]:
        """
        Tạo bộ sưu tập từ metadata
        
        Args:
            collections_data: Danh sách dữ liệu bộ sưu tập
            
        Returns:
            Danh sách đường dẫn các bộ sưu tập tạo thành công
        """
        successful_collections = []
        
        for collection_data in collections_data:
            collection_id = collection_data['id']
            collection_title = collection_data.get('collection_title', f'Bộ sưu tập_{collection_id}')
            clip_ids = collection_data['clip_ids']
            
            # Xây dựng danh sách đường dẫn đoạn
            clips_list = []
            for clip_id in clip_ids:
                # Tìm file đoạn tương ứng
                # Định dạng tên file mới: {clip_id}_{title}.mp4
                clip_path = self.clips_dir / f"{clip_id}_*.mp4"
                found_clips = list(self.clips_dir.glob(f"{clip_id}_*.mp4"))
                
                if found_clips:
                    found_clip = found_clips[0]  # Lấy file khớp đầu tiên
                    clips_list.append(found_clip)
                    logger.info(f"Tìm thấy đoạn {clip_id} của bộ sưu tập {collection_id}: {found_clip.name}")
                else:
                    logger.warning(f"Không tìm thấy đoạn {clip_id} của bộ sưu tập {collection_id}")
            
            if clips_list:
                # Dùng collection_title làm tên file và làm sạch ký tự
                safe_title = VideoProcessor.sanitize_filename(collection_title)
                output_path = self.collections_dir / f"{safe_title}.mp4"
                
                if VideoProcessor.create_collection(clips_list, output_path):
                    successful_collections.append(output_path)
                    logger.info(f"Tạo bộ sưu tập {collection_id} thành công: {output_path}")
            else:
                logger.warning(f"Bộ sưu tập {collection_id} không tìm thấy file đoạn hợp lệ")
        
        return successful_collections
