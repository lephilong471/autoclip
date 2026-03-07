import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout, Card, Progress, Steps, Typography, Button, Alert, Space, Spin, message } from 'antd'
import { CheckCircleOutlined, LoadingOutlined, ExclamationCircleOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { projectApi } from '../services/api'
import { useProjectStore } from '../store/useProjectStore'

const { Content } = Layout
const { Title, Text } = Typography
const { Step } = Steps

interface ProcessingStatus {
  status: 'processing' | 'completed' | 'error'
  current_step: number
  total_steps: number
  step_name: string
  progress: number
  error_message?: string
}

const ProcessingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentProject, setCurrentProject } = useProjectStore()
  const [status, setStatus] = useState<ProcessingStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const steps = [
    { title: 'Trích xuất đề cương', description: 'Trích xuất đề cương cấu trúc từ văn bản chuyển ngữ video' },
    { title: 'Định vị thời gian', description: 'Định vị khoảng thời gian chủ đề dựa trên phụ đề SRT' },
    { title: 'Chấm điểm nội dung', description: 'Đánh giá đa chiều chất lượng và tiềm năng lan truyền' },
    { title: 'Tạo tiêu đề', description: 'Tạo tiêu đề hấp dẫn cho các đoạn có điểm cao' },
    { title: 'Phân nhóm chủ đề', description: 'Gom các đoạn liên quan thành hợp tuyển đề xuất' },
    { title: 'Cắt video', description: 'Dùng FFmpeg tạo clip và video hợp tuyển' }
  ]

  useEffect(() => {
    if (!id) return
    
    loadProject()
    const interval = setInterval(checkStatus, 2000) // Kiểm tra trạng thái mỗi 2 giây
    
    return () => clearInterval(interval)
  }, [id])

  const loadProject = async () => {
    if (!id) return
    
    try {
      const project = await projectApi.getProject(id)
      setCurrentProject(project)
      
      // Nếu dự án đã hoàn thành, chuyển thẳng đến trang chi tiết
      if (project.status === 'completed') {
        navigate(`/project/${id}`)
        return
      }
      
      // Nếu dự án đang chờ xử lý, bắt đầu xử lý
      if (project.status === 'pending') {
        await startProcessing()
      }
    } catch (error) {
      message.error('Tải dự án thất bại')
      console.error('Load project error:', error)
    } finally {
      setLoading(false)
    }
  }

  const startProcessing = async () => {
    if (!id) return
    
    try {
      await projectApi.startProcessing(id)
      message.success('Bắt đầu xử lý dự án')
    } catch (error) {
      message.error('Khởi động xử lý thất bại')
      console.error('Start processing error:', error)
    }
  }

  const checkStatus = async () => {
    if (!id) return
    
    try {
      const statusData = await projectApi.getProcessingStatus(id)
      setStatus(statusData)
      
      // Nếu xử lý hoàn tất, chuyển đến trang chi tiết dự án
      if (statusData.status === 'completed') {
        message.success('🎉 Xử lý video hoàn tất! Đang chuyển đến trang kết quả...')
        setTimeout(() => {
          navigate(`/project/${id}`)
        }, 2000)
      }
      
      // Nếu xử lý thất bại, hiển thị chi tiết lỗi
      if (statusData.status === 'error') {
        const errorMsg = statusData.error_message || 'Đã xảy ra lỗi không xác định trong quá trình xử lý'
        message.error(`Xử lý thất bại: ${errorMsg}`)
        
        // Gợi ý thử lại
        message.info('Bạn có thể quay về trang chủ tải lên lại file hoặc liên hệ hỗ trợ kỹ thuật', 5)
      }
      
    } catch (error: any) {
      console.error('Check status error:', error)
      
      // Đưa ra gợi ý xử lý theo từng loại lỗi
      if (error.response?.status === 404) {
        message.error('Dự án không tồn tại hoặc đã bị xóa')
        setTimeout(() => navigate('/'), 2000)
      } else if (error.code === 'ECONNABORTED') {
        message.warning('Hết thời gian kết nối mạng, đang thử lại...')
      } else {
        message.error('Lấy trạng thái xử lý thất bại, vui lòng làm mới trang và thử lại')
      }
    }
  }

  const getStepStatus = (stepIndex: number) => {
    if (!status) return 'wait'
    
    if (status.status === 'error') {
      return stepIndex < status.current_step ? 'finish' : 'error'
    }
    
    if (stepIndex < status.current_step) return 'finish'
    if (stepIndex === status.current_step) return 'process'
    return 'wait'
  }

  const getStepIcon = (stepIndex: number) => {
    const stepStatus = getStepStatus(stepIndex)
    
    if (stepStatus === 'finish') return <CheckCircleOutlined />
    if (stepStatus === 'process') return <LoadingOutlined />
    if (stepStatus === 'error') return <ExclamationCircleOutlined />
    return null
  }

  if (loading) {
    return (
      <Content style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="Đang tải..." />
      </Content>
    )
  }

  return (
    <Content style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Title level={2}>Tiến độ xử lý video</Title>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/')}
          >
            Về trang chủ
          </Button>
        </div>

        {currentProject && (
          <Card>
            <Title level={4}>{currentProject.name}</Title>
            <Text type="secondary">ID dự án: {currentProject.id}</Text>
          </Card>
        )}

        {status?.status === 'error' && (
          <Alert
            message="Xử lý thất bại"
            description={
              <div>
                <p>{status.error_message || 'Đã xảy ra lỗi không xác định trong quá trình xử lý'}</p>
                <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                  Có thể do: định dạng file không hỗ trợ, file bị hỏng, vấn đề mạng hoặc lỗi máy chủ
                </p>
              </div>
            }
            type="error"
            showIcon
            action={
              <Space>
                <Button size="small" onClick={() => window.location.reload()}>
                  Làm mới trang
                </Button>
                <Button size="small" onClick={() => navigate('/')}>
                  Về trang chủ
                </Button>
              </Space>
            }
          />
        )}

        {status && status.status === 'processing' && (
          <Card title="Tiến độ xử lý">
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text strong>Tổng tiến độ</Text>
                  <Text>{Math.round(status.progress)}%</Text>
                </div>
                <Progress 
                  percent={status.progress} 
                  status={status.status === 'completed' ? 'success' : status.status === 'processing' ? 'active' : 'normal'}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
              </div>

              <div>
                <Text strong>Bước hiện tại: </Text>
                <Text>{status.step_name}</Text>
              </div>

              <Steps 
                direction="vertical" 
                current={status.current_step}
                status={status.status === 'error' ? 'error' : status.status === 'processing' ? 'process' : 'wait'}
              >
                {steps.map((step, index) => (
                  <Step
                    key={index}
                    title={step.title}
                    description={step.description}
                    status={getStepStatus(index)}
                    icon={getStepIcon(index)}
                  />
                ))}
              </Steps>
            </Space>
          </Card>
        )}

        {status?.status === 'completed' && (
          <Alert
            message="Xử lý hoàn tất"
            description="Video đã xử lý thành công, đang chuyển đến trang chi tiết dự án..."
            type="success"
            showIcon
          />
        )}
      </Space>
    </Content>
  )
}

export default ProcessingPage