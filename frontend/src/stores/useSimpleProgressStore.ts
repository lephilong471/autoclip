/**
 * Quản lý trạng thái tiến độ đơn giản - dựa trên giai đoạn cố định và polling
 */

import { create } from 'zustand'

export interface SimpleProgress {
  project_id: string
  stage: string
  percent: number
  message: string
  ts: number
}

interface SimpleProgressState {
  // 状态数据
  byId: Record<string, SimpleProgress>
  
  // 轮询控制
  pollingInterval: number | null
  isPolling: boolean
  
  // 操作方法
  upsert: (progress: SimpleProgress) => void
  startPolling: (projectIds: string[], intervalMs?: number) => void
  stopPolling: () => void
  clearProgress: (projectId: string) => void
  clearAllProgress: () => void
  
  // 获取方法
  getProgress: (projectId: string) => SimpleProgress | null
  getAllProgress: () => Record<string, SimpleProgress>
}

export const useSimpleProgressStore = create<SimpleProgressState>((set, get) => {
  let timer: NodeJS.Timeout | null = null

  return {
    // 初始状态
    byId: {},
    pollingInterval: null,
    isPolling: false,

    // 更新或插入进度数据
    upsert: (progress: SimpleProgress) => {
      set((state) => ({
        byId: {
          ...state.byId,
          [progress.project_id]: progress
        }
      }))
    },

    // 开始轮询
    startPolling: (projectIds: string[], intervalMs: number = 2000) => {
      const { stopPolling, isPolling } = get()
      
      // 如果已经在轮询，先停止
      if (isPolling) {
        stopPolling()
      }

      if (projectIds.length === 0) {
        console.warn('Không có ID dự án, bỏ qua polling')
        return
      }

      console.log(`Bắt đầu polling tiến độ: ${projectIds.join(', ')}`)

      // 立即获取一次
      const fetchSnapshots = async () => {
        try {
          const queryString = projectIds.map(id => `project_ids=${id}`).join('&')
          const response = await fetch(`http://localhost:8000/api/v1/simple-progress/snapshot?${queryString}`)
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          
          const snapshots: SimpleProgress[] = await response.json()
          
          // 更新状态
          snapshots.forEach(snapshot => {
            console.log(`Cập nhật tiến độ: ${snapshot.project_id} - ${snapshot.stage} (${snapshot.percent}%)`)
            get().upsert(snapshot)
          })
          
          console.log(`Cập nhật polling: ${snapshots.length} dự án`)
          
        } catch (error) {
          console.error('Polling tiến độ thất bại:', error)
        }
      }

      // 立即执行一次
      fetchSnapshots()

      // 设置定时器
      timer = setInterval(fetchSnapshots, intervalMs)

      set({
        isPolling: true,
        pollingInterval: intervalMs
      })
    },

    // 停止轮询
    stopPolling: () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
      
      set({
        isPolling: false,
        pollingInterval: null
      })
      
      console.log('Dừng polling tiến độ')
    },

    // 清除单个项目进度
    clearProgress: (projectId: string) => {
      set((state) => {
        const newById = { ...state.byId }
        delete newById[projectId]
        return { byId: newById }
      })
    },

    // 清除所有进度
    clearAllProgress: () => {
      set({ byId: {} })
    },

    // 获取单个项目进度
    getProgress: (projectId: string) => {
      return get().byId[projectId] || null
    },

    // 获取所有进度
    getAllProgress: () => {
      return get().byId
    }
  }
})

// Ánh xạ tên hiển thị giai đoạn
export const STAGE_DISPLAY_NAMES: Record<string, string> = {
  'INGEST': 'Chuẩn bị tài liệu',
  'SUBTITLE': 'Xử lý phụ đề',
  'ANALYZE': 'Phân tích nội dung', 
  'HIGHLIGHT': 'Định vị phân đoạn',
  'EXPORT': 'Xuất video',
  'DONE': 'Xử lý hoàn tất'
}

// Ánh xạ màu giai đoạn
export const STAGE_COLORS: Record<string, string> = {
  'INGEST': '#1890ff',      // Xanh dương
  'SUBTITLE': '#52c41a',    // Xanh lá
  'ANALYZE': '#fa8c16',     // Cam
  'HIGHLIGHT': '#722ed1',   // Tím
  'EXPORT': '#eb2f96',      // Hồng
  'DONE': '#13c2c2'         // Xanh lơ
}

// 获取阶段显示名称
export const getStageDisplayName = (stage: string): string => {
  return STAGE_DISPLAY_NAMES[stage] || stage
}

// 获取阶段颜色
export const getStageColor = (stage: string): string => {
  return STAGE_COLORS[stage] || '#666666'
}

// 判断是否为完成状态
export const isCompleted = (stage: string): boolean => {
  return stage === 'DONE'
}

// Kiểm tra trạng thái thất bại
export const isFailed = (message: string): boolean => {
  return message.includes('失败') || message.includes('错误') || message.includes('thất bại') || message.includes('lỗi')
}
