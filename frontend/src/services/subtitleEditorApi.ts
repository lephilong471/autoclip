import { SubtitleSegment } from '../types/subtitle'

export interface SubtitleDataResponse {
  segments: SubtitleSegment[]
  total_duration: number
  word_count: number
  segment_count: number
}

export interface SubtitleEditRequest {
  project_id: string
  clip_id: string
  deleted_segments: string[]
}

export interface SubtitleEditResponse {
  success: boolean
  message: string
  edited_video_path?: string
  deleted_duration?: number
  final_duration?: number
}

export interface EditPreviewRequest {
  project_id: string
  clip_id: string
  deleted_segments: string[]
}

export interface EditPreviewResponse {
  success: boolean
  preview_files: string[]
  count: number
}

class SubtitleEditorApi {
  private baseUrl = '/api/v1/subtitle-editor'

  /**
   * Lấy dữ liệu phụ đề chi tiết theo từ của clip
   */
  async getClipSubtitles(projectId: string, clipId: string): Promise<SubtitleDataResponse> {
    const response = await fetch(`${this.baseUrl}/${projectId}/clips/${clipId}/subtitles`)
    
    if (!response.ok) {
      throw new Error(`Lấy dữ liệu phụ đề thất bại: ${response.statusText}`)
    }
    
    return response.json()
  }

  /**
   * 基于字幕删除编辑视频片段
   */
  async editClipBySubtitles(
    projectId: string, 
    clipId: string, 
    deletedSegments: string[]
  ): Promise<SubtitleEditResponse> {
    const request: SubtitleEditRequest = {
      project_id: projectId,
      clip_id: clipId,
      deleted_segments: deletedSegments
    }

    const response = await fetch(`${this.baseUrl}/${projectId}/clips/${clipId}/edit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Chỉnh sửa video thất bại: ${errorText}`)
    }

    return response.json()
  }

  /**
   * Lấy URL file video đã chỉnh sửa
   */
  getEditedVideoUrl(projectId: string, clipId: string): string {
    return `${this.baseUrl}/${projectId}/clips/${clipId}/edited-video`
  }

  /**
   * Tạo đoạn xem trước chỉnh sửa
   */
  async createEditPreview(
    projectId: string, 
    clipId: string, 
    deletedSegments: string[]
  ): Promise<EditPreviewResponse> {
    const request: EditPreviewRequest = {
      project_id: projectId,
      clip_id: clipId,
      deleted_segments: deletedSegments
    }

    const response = await fetch(`${this.baseUrl}/${projectId}/clips/${clipId}/preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`创建预览失败: ${errorText}`)
    }

    return response.json()
  }

  /**
   * Lấy URL file đoạn xem trước
   */
  getPreviewSegmentUrl(projectId: string, clipId: string, segmentId: string): string {
    return `${this.baseUrl}/${projectId}/clips/${clipId}/preview/${segmentId}`
  }

  /**
   * Tải video đã chỉnh sửa
   */
  async downloadEditedVideo(projectId: string, clipId: string, filename?: string): Promise<void> {
    const url = this.getEditedVideoUrl(projectId, clipId)
    
    try {
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Tải xuống thất bại: ${response.statusText}`)
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = filename || `${clipId}_edited.mp4`
      
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      window.URL.revokeObjectURL(downloadUrl)
    } catch (error) {
      console.error('下载编辑后的视频失败:', error)
      throw error
    }
  }

  /**
   * Xác thực thao tác chỉnh sửa
   */
  async validateEditOperations(
    projectId: string, 
    clipId: string, 
    deletedSegments: string[]
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Lấy dữ liệu phụ đề để xác thực
      const subtitleData = await this.getClipSubtitles(projectId, clipId)
      
      // Kiểm tra các đoạn phụ đề cần xóa có tồn tại
      const existingIds = new Set(subtitleData.segments.map(seg => seg.id))
      const invalidIds = deletedSegments.filter(id => !existingIds.has(id))
      
      if (invalidIds.length > 0) {
        return {
          valid: false,
          error: `ID đoạn phụ đề không hợp lệ: ${invalidIds.join(', ')}`
        }
      }

      // Kiểm tra còn nội dung sau khi xóa
      const remainingSegments = subtitleData.segments.filter(
        seg => !deletedSegments.includes(seg.id)
      )

      if (remainingSegments.length === 0) {
        return {
          valid: false,
          error: 'Không còn nội dung sau khi xóa tất cả đoạn phụ đề'
        }
      }

      return { valid: true }
    } catch (error) {
      return {
        valid: false,
        error: `Xác thực thất bại: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`
      }
    }
  }
}

export const subtitleEditorApi = new SubtitleEditorApi()
