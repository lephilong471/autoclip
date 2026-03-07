import { useState } from 'react'
import { message } from 'antd'
import { projectApi } from '../services/api'

export const useCollectionVideoDownload = () => {
  const [isGenerating, setIsGenerating] = useState(false)

  const generateAndDownloadCollectionVideo = async (
    projectId: string, 
    collectionId: string,
    collectionTitle: string
  ) => {
    if (isGenerating) return

    setIsGenerating(true)
    
    try {
      // Tạo video hợp tuyển theo thứ tự người dùng đã chỉnh
      message.info('Đang tạo video hợp tuyển theo thứ tự của bạn...')
      
      // Tạo video hợp tuyển
      await projectApi.generateCollectionVideo(projectId, collectionId)
      
      // Chờ 1 giây để backend hoàn thành, rồi tải xuống
      message.success('Tạo video thành công, đang tải xuống...')
      
      setTimeout(async () => {
        try {
          await projectApi.downloadVideo(projectId, undefined, collectionId)
          message.success('Tải video hợp tuyển hoàn tất')
        } catch (downloadError) {
          console.error('Tải xuống thất bại:', downloadError)
          message.error('Tải xuống thất bại, vui lòng thử lại sau')
        }
      }, 1000)
      
    } catch (error) {
      console.error('Tạo video hợp tuyển thất bại:', error)
      message.error('Tạo video hợp tuyển thất bại')
    } finally {
      setIsGenerating(false)
    }
  }

  return {
    isGenerating,
    generateAndDownloadCollectionVideo
  }
} 