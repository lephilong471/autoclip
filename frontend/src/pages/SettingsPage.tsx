import React, { useState, useEffect } from 'react'
import { Layout, Card, Form, Input, Button, Typography, Space, Alert, Divider, Row, Col, Tabs, message, Select, Tag } from 'antd'
import { KeyOutlined, SaveOutlined, ApiOutlined, SettingOutlined, InfoCircleOutlined, UserOutlined, RobotOutlined } from '@ant-design/icons'
import { settingsApi } from '../services/api'
import BilibiliManager from '../components/BilibiliManager'
import './SettingsPage.css'

const { Content } = Layout
const { Title, Text, Paragraph } = Typography
const { TabPane } = Tabs

const SettingsPage: React.FC = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [showBilibiliManager, setShowBilibiliManager] = useState(false)
  const [availableModels, setAvailableModels] = useState<any>({})
  const [currentProvider, setCurrentProvider] = useState<any>({})
  const [selectedProvider, setSelectedProvider] = useState('dashscope')

  // 提供商配置
  const providerConfig = {
    dashscope: {
      name: 'Alibaba Thông Nghìn Vấn',
      icon: <RobotOutlined />,
      color: '#1890ff',
      description: 'Dịch vụ mô hình lớn Alibaba Thông Nghìn Vấn',
      apiKeyField: 'dashscope_api_key',
      placeholder: 'Nhập API key Thông Nghìn Vấn'
    },
    openai: {
      name: 'OpenAI',
      icon: <RobotOutlined />,
      color: '#52c41a',
      description: 'Mô hình GPT của OpenAI',
      apiKeyField: 'openai_api_key',
      placeholder: 'Nhập API key OpenAI'
    },
    gemini: {
      name: 'Google Gemini',
      icon: <RobotOutlined />,
      color: '#faad14',
      description: 'Mô hình lớn Google Gemini',
      apiKeyField: 'gemini_api_key',
      placeholder: 'Nhập API key Gemini'
    },
    siliconflow: {
      name: 'SiliconFlow',
      icon: <RobotOutlined />,
      color: '#722ed1',
      description: 'Dịch vụ mô hình SiliconFlow',
      apiKeyField: 'siliconflow_api_key',
      placeholder: 'Nhập API key SiliconFlow'
    }
  }

  // 加载数据
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [settings, models, provider] = await Promise.all([
        settingsApi.getSettings(),
        settingsApi.getAvailableModels(),
        settingsApi.getCurrentProvider()
      ])
      
      setAvailableModels(models)
      setCurrentProvider(provider)
      setSelectedProvider(settings.llm_provider || 'dashscope')
      
      // 设置表单初始值
      form.setFieldsValue(settings)
    } catch (error) {
      console.error('加载数据失败:', error)
    }
  }

  // 保存配置
  const handleSave = async (values: any) => {
    try {
      setLoading(true)
      await settingsApi.updateSettings(values)
      message.success('Lưu cấu hình thành công!')
      await loadData() // 重新加载数据
    } catch (error: any) {
      message.error('Lưu thất bại: ' + (error.message || 'Lỗi không xác định'))
    } finally {
      setLoading(false)
    }
  }

  // 测试API密钥
  const handleTestApiKey = async () => {
    const apiKey = form.getFieldValue(providerConfig[selectedProvider as keyof typeof providerConfig].apiKeyField)
    const modelName = form.getFieldValue('model_name')
    
    if (!apiKey) {
      message.error('Vui lòng nhập API key trước')
      return
    }

    if (!modelName) {
      message.error('Vui lòng chọn mô hình trước')
      return
    }

    try {
      setLoading(true)
      const result = await settingsApi.testApiKey(selectedProvider, apiKey, modelName)
      if (result.success) {
        message.success('Kiểm tra API key thành công!')
      } else {
        message.error('Kiểm tra API key thất bại: ' + (result.error || 'Lỗi không xác định'))
      }
    } catch (error: any) {
      message.error('Kiểm tra thất bại: ' + (error.message || 'Lỗi không xác định'))
    } finally {
      setLoading(false)
    }
  }

  // 提供商切换
  const handleProviderChange = (provider: string) => {
    setSelectedProvider(provider)
    form.setFieldsValue({ llm_provider: provider })
  }

  return (
    <Content className="settings-page">
      <div className="settings-container">
        <Title level={2} className="settings-title">
          <SettingOutlined /> Cài đặt hệ thống
        </Title>
        
        <Tabs defaultActiveKey="api" className="settings-tabs">
          <TabPane tab="Cấu hình mô hình AI" key="api">
            <Card title="Cấu hình mô hình AI" className="settings-card">
              <Alert
                message="Hỗ trợ nhiều nhà cung cấp mô hình"
                description="Hệ thống hỗ trợ nhiều nhà cung cấp mô hình AI, bạn có thể chọn dịch vụ và mô hình phù hợp với nhu cầu."
                type="info"
                showIcon
                className="settings-alert"
              />
              
              <Form
                form={form}
                layout="vertical"
                className="settings-form"
                onFinish={handleSave}
                initialValues={{
                  llm_provider: 'dashscope',
                  model_name: 'qwen-plus',
                  chunk_size: 5000,
                  min_score_threshold: 0.7,
                  max_clips_per_collection: 5
                }}
              >
                {/* 当前提供商状态 */}
                {currentProvider.available && (
                  <Alert
                    message={`Đang sử dụng: ${currentProvider.display_name} - ${currentProvider.model}`}
                    type="success"
                    showIcon
                    style={{ marginBottom: 24 }}
                  />
                )}

                {/* 提供商选择 */}
                <Form.Item
                  label="Chọn nhà cung cấp mô hình AI"
                  name="llm_provider"
                  className="form-item"
                  rules={[{ required: true, message: 'Vui lòng chọn nhà cung cấp mô hình AI' }]}
                >
                  <Select
                    value={selectedProvider}
                    onChange={handleProviderChange}
                    className="settings-input"
                    placeholder="Chọn nhà cung cấp mô hình AI"
                  >
                    {Object.entries(providerConfig).map(([key, config]) => (
                      <Select.Option key={key} value={key}>
                        <Space>
                          <span style={{ color: config.color }}>{config.icon}</span>
                          <span>{config.name}</span>
                          <Tag color={config.color}>{config.description}</Tag>
                        </Space>
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                {/* 动态API密钥输入 */}
                <Form.Item
                  label={`${providerConfig[selectedProvider as keyof typeof providerConfig].name} API Key`}
                  name={providerConfig[selectedProvider as keyof typeof providerConfig].apiKeyField}
                  className="form-item"
                  rules={[
                    { required: true, message: 'Vui lòng nhập API key' },
                    { min: 10, message: 'API key phải có ít nhất 10 ký tự' }
                  ]}
                >
                  <Input.Password
                    placeholder={providerConfig[selectedProvider as keyof typeof providerConfig].placeholder}
                    prefix={<KeyOutlined />}
                    className="settings-input"
                  />
                </Form.Item>

                {/* 模型选择 */}
                <Form.Item
                  label="Chọn mô hình"
                  name="model_name"
                  className="form-item"
                  rules={[{ required: true, message: 'Vui lòng chọn mô hình' }]}
                >
                  <Select
                    className="settings-input"
                    placeholder="Chọn mô hình"
                    showSearch
                    optionFilterProp="label"
                  >
                    {availableModels[selectedProvider]?.map((model: any) => (
                      <Select.Option key={model.name} value={model.name} label={model.display_name}>
                        <Space>
                          <span>{model.display_name}</span>
                          <Tag>Tối đa {model.max_tokens} tokens</Tag>
                        </Space>
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item className="form-item">
                  <Space>
                    <Button
                      type="default"
                      icon={<ApiOutlined />}
                      className="test-button"
                      onClick={handleTestApiKey}
                      loading={loading}
                    >
                      Kiểm tra kết nối
                    </Button>
                  </Space>
                </Form.Item>

                <Divider className="settings-divider" />

                <Title level={4} className="section-title">Cấu hình mô hình</Title>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="Tên mô hình"
                      name="model_name"
                      className="form-item"
                    >
                      <Input placeholder="qwen-plus" className="settings-input" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="Kích thước phân đoạn văn bản"
                      name="chunk_size"
                      className="form-item"
                    >
                      <Input 
                        type="number" 
                        placeholder="5000" 
                        addonAfter="ký tự" 
                        className="settings-input"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="Ngưỡng điểm tối thiểu"
                      name="min_score_threshold"
                      className="form-item"
                    >
                      <Input 
                        type="number" 
                        step="0.1" 
                        min="0" 
                        max="1" 
                        placeholder="0.7" 
                        className="settings-input"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="Số đoạn tối đa mỗi bộ sưu tập"
                      name="max_clips_per_collection"
                      className="form-item"
                    >
                      <Input 
                        type="number" 
                        placeholder="5" 
                        addonAfter="đoạn" 
                        className="settings-input"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item className="form-item">
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SaveOutlined />}
                    size="large"
                    className="save-button"
                    loading={loading}
                  >
                    Lưu cấu hình
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            <Card title="Hướng dẫn sử dụng" className="settings-card">
              <Space direction="vertical" size="large" className="instructions-space">
                <div className="instruction-item">
                  <Title level={5} className="instruction-title">
                    <InfoCircleOutlined /> 1. Chọn nhà cung cấp mô hình AI
                  </Title>
                  <Paragraph className="instruction-text">
                    Hệ thống hỗ trợ nhiều nhà cung cấp mô hình AI:
                    <br />• <Text strong>Alibaba Thông Nghìn Vấn</Text>：Truy cập bảng điều khiển Alibaba Cloud để lấy API key
                    <br />• <Text strong>OpenAI</Text>: Truy cập platform.openai.com để lấy API key
                    <br />• <Text strong>Google Gemini</Text>: Truy cập ai.google.dev để lấy API key
                    <br />• <Text strong>SiliconFlow</Text>: Truy cập docs.siliconflow.cn để lấy API key
                  </Paragraph>
                </div>
                
                <div className="instruction-item">
                  <Title level={5} className="instruction-title">
                    <InfoCircleOutlined /> 2. Giải thích tham số cấu hình
                  </Title>
                  <Paragraph className="instruction-text">
                    • <Text strong>Kích thước phân đoạn</Text>:Ảnh hưởng tốc độ và độ chính xác, khuyến nghị 5000 ký tự<br />
                    • <Text strong>Ngưỡng điểm</Text>:Chỉ giữ các đoạn có điểm cao hơn ngưỡng này<br />
                    • <Text strong>Số đoạn mỗi bộ sưu tập</Text>:Kiểm soát số lượng đoạn trong mỗi bộ sưu tập chủ đề
                  </Paragraph>
                </div>
                
                <div className="instruction-item">
                  <Title level={5} className="instruction-title">
                    <InfoCircleOutlined /> 3. 测试连接
                  </Title>
                  <Paragraph className="instruction-text">
                    Nên kiểm tra API key trước khi lưu để đảm bảo dịch vụ hoạt động bình thường
                  </Paragraph>
                </div>
              </Space>
            </Card>
          </TabPane>

          <TabPane tab="Quản lý B站" key="bilibili">
            <Card title="Quản lý tài khoản B站" className="settings-card">
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{ marginBottom: '24px' }}>
                  <UserOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                  <Title level={3} style={{ color: '#ffffff', margin: '0 0 8px 0' }}>
                    Quản lý tài khoản B站
                  </Title>
                  <Text type="secondary" style={{ color: '#b0b0b0', fontSize: '16px' }}>
                    Quản lý tài khoản B站 của bạn, hỗ trợ chuyển đổi nhiều tài khoản và đăng tải nhanh
                  </Text>
                </div>
                
                <Space size="large">
                  <Button
                    type="primary"
                    size="large"
                    icon={<UserOutlined />}
                    onClick={() => message.info('Đang phát triển, vui lòng chờ!', 3)}
                    style={{
                      borderRadius: '8px',
                      background: 'linear-gradient(45deg, #1890ff, #36cfc9)',
                      border: 'none',
                      fontWeight: 500,
                      height: '48px',
                      padding: '0 32px',
                      fontSize: '16px'
                    }}
                  >
                    Quản lý tài khoản B站
                  </Button>
                </Space>
                
                <div style={{ marginTop: '32px', textAlign: 'left', maxWidth: '600px', margin: '32px auto 0' }}>
                  <Title level={4} style={{ color: '#ffffff', marginBottom: '16px' }}>
                    Tính năng
                  </Title>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
                    <div style={{ 
                      padding: '16px', 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: '8px',
                      border: '1px solid #404040'
                    }}>
                      <Text strong style={{ color: '#1890ff' }}>Hỗ trợ nhiều tài khoản</Text>
                      <br />
                      <Text type="secondary" style={{ color: '#b0b0b0' }}>
                        Thêm nhiều tài khoản B站, dễ quản lý và chuyển đổi
                      </Text>
                    </div>
                    <div style={{ 
                      padding: '16px', 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: '8px',
                      border: '1px solid #404040'
                    }}>
                      <Text strong style={{ color: '#52c41a' }}>Đăng nhập an toàn</Text>
                      <br />
                      <Text type="secondary" style={{ color: '#b0b0b0' }}>
                        Nhập Cookie, tránh kiểm soát rủi ro, an toàn đáng tin cậy
                      </Text>
                    </div>
                    <div style={{ 
                      padding: '16px', 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: '8px',
                      border: '1px solid #404040'
                    }}>
                      <Text strong style={{ color: '#faad14' }}>Đăng tải nhanh</Text>
                      <br />
                      <Text type="secondary" style={{ color: '#b0b0b0' }}>
                        Chọn tài khoản đăng tải trực tiếp tại trang chi tiết đoạn, thao tác đơn giản
                      </Text>
                    </div>
                    <div style={{ 
                      padding: '16px', 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: '8px',
                      border: '1px solid #404040'
                    }}>
                      <Text strong style={{ color: '#722ed1' }}>Quản lý hàng loạt</Text>
                      <br />
                      <Text type="secondary" style={{ color: '#b0b0b0' }}>
                        Hỗ trợ tải lên nhiều đoạn cùng lúc, tăng hiệu quả
                      </Text>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabPane>
        </Tabs>

        {/* B站管理弹窗 */}
        <BilibiliManager
          visible={showBilibiliManager}
          onClose={() => setShowBilibiliManager(false)}
          onUploadSuccess={() => {
            message.success('Thao tác thành công')
          }}
        />
      </div>
    </Content>
  )
}

export default SettingsPage