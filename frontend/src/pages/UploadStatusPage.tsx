import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Table, 
  Tag, 
  Button, 
  Space, 
  message, 
  Progress, 
  Tooltip, 
  Modal, 
  Descriptions,
  Typography,
  Row,
  Col,
  Statistic,
  Alert,
  Popconfirm
} from 'antd';
import { 
  ReloadOutlined, 
  EyeOutlined, 
  RedoOutlined, 
  StopOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import { uploadApi, UploadRecord } from '../services/uploadApi';
import { BILIBILI_PARTITIONS } from '../services/uploadApi';

const { Title, Text } = Typography;

interface UploadStatusPageProps {}

const UploadStatusPage: React.FC<UploadStatusPageProps> = () => {
  const [records, setRecords] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<UploadRecord | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Lấy bản ghi đăng tải
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const data = await uploadApi.getUploadRecords();
      setRecords(data);
    } catch (error) {
      message.error('Lấy bản ghi đăng tải thất bại');
      console.error('Lấy bản ghi đăng tải thất bại:', error);
    } finally {
      setLoading(false);
    }
  };

  // Thử lại đăng tải
  const handleRetry = async (recordId: string | number) => {
    message.info('Tính năng tải lên B站 đang được phát triển, vui lòng chờ!', 3);
    return;
    
    try {
      await uploadApi.retryUpload(recordId);
      message.success('Đã gửi tác vụ thử lại');
      fetchRecords();
    } catch (error) {
      message.error('Thử lại thất bại');
      console.error('Thử lại thất bại:', error);
    }
  };

  // Hủy đăng tải
  const handleCancel = async (recordId: string | number) => {
    message.info('Tính năng tải lên B站 đang được phát triển, vui lòng chờ!', 3);
    return;
    
    try {
      await uploadApi.cancelUpload(recordId);
      message.success('Đã hủy tác vụ');
      fetchRecords();
    } catch (error) {
      message.error('Hủy thất bại');
      console.error('Hủy thất bại:', error);
    }
  };

  // Xóa đăng tải
  const handleDelete = async (recordId: string | number) => {
    message.info('Tính năng tải lên B站 đang được phát triển, vui lòng chờ!', 3);
    return;
    
    try {
      await uploadApi.deleteUpload(recordId);
      message.success('Đã xóa tác vụ');
      fetchRecords();
    } catch (error) {
      message.error('Xóa thất bại');
      console.error('Xóa thất bại:', error);
    }
  };

  // 查看详情
  const handleViewDetail = (record: UploadRecord) => {
    setSelectedRecord(record);
    setDetailModalVisible(true);
  };

  // Lấy nhãn trạng thái
  const getStatusTag = (status: string) => {
    const statusConfig = {
      pending: { color: 'default', icon: <ClockCircleOutlined />, text: 'Đang chờ' },
      processing: { color: 'processing', icon: <PlayCircleOutlined />, text: 'Đang xử lý' },
      success: { color: 'success', icon: <CheckCircleOutlined />, text: 'Thành công' },
      completed: { color: 'success', icon: <CheckCircleOutlined />, text: 'Hoàn thành' },
      failed: { color: 'error', icon: <ExclamationCircleOutlined />, text: 'Thất bại' },
      cancelled: { color: 'default', icon: <StopOutlined />, text: 'Đã hủy' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <Tag color={config.color} icon={config.icon}>
        {config.text}
      </Tag>
    );
  };

  // Lấy tên phân khu
  const getPartitionName = (partitionId: number) => {
    const partition = BILIBILI_PARTITIONS.find(p => p.id === partitionId);
    return partition ? partition.name : `Phân khu ${partitionId}`;
  };

  // Định dạng kích thước file
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Định dạng thời lượng
  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours} giờ ${minutes} phút`;
    } else if (minutes > 0) {
      return `${minutes} phút ${secs} giây`;
    } else {
      return `${secs} giây`;
    }
  };

  // Định nghĩa cột bảng
  const columns = [
    {
      title: 'ID tác vụ',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: string | number) => <Text code style={{ color: '#ffffff' }}>{id}</Text>
    },
    {
      title: 'Tiêu đề',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (title: string, record: UploadRecord) => (
        <Tooltip title={title}>
          <Text style={{ color: '#ffffff' }}>{title}</Text>
        </Tooltip>
      )
    },
    {
      title: 'Tài khoản đăng',
      dataIndex: 'account_nickname',
      key: 'account_nickname',
      width: 120,
      render: (nickname: string, record: UploadRecord) => (
        <div>
          <div style={{ color: '#ffffff' }}>{nickname || record.account_username}</div>
          <Text type="secondary" style={{ fontSize: '12px', color: '#cccccc' }}>
            {record.account_username}
          </Text>
        </div>
      )
    },
    {
      title: 'Phân khu',
      dataIndex: 'partition_id',
      key: 'partition_id',
      width: 100,
      render: (partitionId: number) => (
        <Tag style={{ color: '#ffffff' }}>{getPartitionName(partitionId)}</Tag>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status)
    },
    {
      title: 'Tiến độ',
      dataIndex: 'progress',
      key: 'progress',
      width: 120,
      render: (progress: number, record: UploadRecord) => {
        if (record.status === 'success' || record.status === 'completed') {
          return <Progress percent={100} size="small" status="success" />;
        } else if (record.status === 'failed') {
          return <Progress percent={progress} size="small" status="exception" />;
        } else if (record.status === 'processing') {
          return <Progress percent={progress} size="small" status="active" />;
        } else {
          return <Progress percent={progress} size="small" />;
        }
      }
    },
    {
      title: 'Kích thước',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 100,
      render: (fileSize: number) => <span style={{ color: '#ffffff' }}>{formatFileSize(fileSize)}</span>
    },
    {
      title: 'Thời gian tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (date: string) => <span style={{ color: '#ffffff' }}>{new Date(date).toLocaleString()}</span>
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 200,
      render: (_, record: UploadRecord) => (
        <Space size="small">
          <Button 
            type="link" 
            icon={<EyeOutlined style={{ color: '#4facfe' }} />} 
            onClick={() => handleViewDetail(record)}
            size="small"
            style={{ color: '#4facfe' }}
          >
            Chi tiết
          </Button>
          {record.status === 'failed' && (
            <Popconfirm
              title="Bạn có chắc muốn thử lại tác vụ đăng tải này?"
              onConfirm={() => handleRetry(record.id)}
              okText="Đồng ý"
              cancelText="Hủy"
            >
              <Button 
                type="link" 
                icon={<RedoOutlined style={{ color: '#4facfe' }} />} 
                size="small"
                style={{ color: '#4facfe' }}
              >
                Thử lại
              </Button>
            </Popconfirm>
          )}
          {(record.status === 'pending' || record.status === 'processing') && (
            <Popconfirm
              title="Bạn có chắc muốn hủy tác vụ đăng tải này?"
              onConfirm={() => handleCancel(record.id)}
              okText="Đồng ý"
              cancelText="Hủy"
            >
              <Button 
                type="link" 
                icon={<StopOutlined style={{ color: '#ff4d4f' }} />} 
                danger
                size="small"
                style={{ color: '#ff4d4f' }}
              >
                Hủy
              </Button>
            </Popconfirm>
          )}
          {(record.status === 'success' || record.status === 'completed' || record.status === 'failed' || record.status === 'cancelled') && (
            <Popconfirm
              title="Bạn có chắc muốn xóa tác vụ đăng tải này? Không thể khôi phục sau khi xóa."
              onConfirm={() => handleDelete(record.id)}
              okText="Đồng ý"
              cancelText="Hủy"
            >
              <Button 
                type="link" 
                icon={<DeleteOutlined style={{ color: '#ff4d4f' }} />} 
                danger
                size="small"
                style={{ color: '#ff4d4f' }}
              >
                Xóa
              </Button>
            </Popconfirm>
          )}
        </Space>
      )
    }
  ];

  // Thống kê
  const getStatistics = () => {
    const total = records.length;
    const success = records.filter(r => r.status === 'success' || r.status === 'completed').length;
    const failed = records.filter(r => r.status === 'failed').length;
    const processing = records.filter(r => r.status === 'processing').length;
    const pending = records.filter(r => r.status === 'pending').length;
    
    return { total, success, failed, processing, pending };
  };

  const stats = getStatistics();

  useEffect(() => {
    fetchRecords();
    // 每30秒自动刷新
    const interval = setInterval(fetchRecords, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ padding: '24px', background: '#141414', minHeight: '100vh' }}>
      <style>
        {`
          .dark-table .ant-table-thead > tr > th {
            background: #262626 !important;
            color: #ffffff !important;
            border-bottom: 1px solid #404040 !important;
            font-weight: 600 !important;
          }
          .dark-table .ant-table-tbody > tr > td {
            background: #1f1f1f !important;
            color: #ffffff !important;
            border-bottom: 1px solid #303030 !important;
          }
          .dark-table .ant-table-tbody > tr:hover > td {
            background: #262626 !important;
          }
          .dark-table .ant-pagination .ant-pagination-item {
            background: #262626 !important;
            border-color: #404040 !important;
          }
          .dark-table .ant-pagination .ant-pagination-item a {
            color: #ffffff !important;
          }
          .dark-table .ant-pagination .ant-pagination-item-active {
            background: #1890ff !important;
          }
          .dark-table .ant-pagination .ant-pagination-item-active a {
            color: #ffffff !important;
          }
          /* 确保所有文字都是白色 */
          .dark-table .ant-typography,
          .dark-table .ant-typography-caption,
          .dark-table .ant-typography-text,
          .dark-table .ant-typography-paragraph {
            color: #ffffff !important;
          }
          /* 确保链接按钮文字可见 */
          .dark-table .ant-btn-link {
            color: #4facfe !important;
          }
          .dark-table .ant-btn-link:hover {
            color: #00a8ff !important;
          }
          .dark-table .ant-btn-link.ant-btn-dangerous {
            color: #ff4d4f !important;
          }
          .dark-table .ant-btn-link.ant-btn-dangerous:hover {
            color: #ff7875 !important;
          }
          /* 确保图标颜色正确 */
          .dark-table .anticon {
            color: inherit !important;
          }
          /* 确保标签文字可见 */
          .dark-table .ant-tag {
            color: #ffffff !important;
          }
          .dark-table .ant-tag-blue {
            color: #4facfe !important;
          }
          .dark-table .ant-tag-green {
            color: #52c41a !important;
          }
          .dark-table .ant-tag-red {
            color: #ff4d4f !important;
          }
          .dark-table .ant-tag-orange {
            color: #faad14 !important;
          }
          /* 确保进度条文字可见 */
          .dark-table .ant-progress-text {
            color: #ffffff !important;
          }
          /* 确保分页器所有元素可见 */
          .dark-table .ant-pagination-prev,
          .dark-table .ant-pagination-next {
            color: #ffffff !important;
          }
          .dark-table .ant-pagination-prev:hover,
          .dark-table .ant-pagination-next:hover {
            color: #4facfe !important;
          }
          .dark-table .ant-pagination-options .ant-select-selector {
            color: #ffffff !important;
          }
          .dark-table .ant-pagination-options .ant-select-selection-item {
            color: #ffffff !important;
          }
          /* 模态框样式 */
          .dark-modal .ant-modal-content {
            background: #1f1f1f !important;
            border: 1px solid #303030 !important;
          }
          .dark-modal .ant-modal-header {
            background: #1f1f1f !important;
            border-bottom: 1px solid #303030 !important;
          }
          .dark-modal .ant-modal-title {
            color: #ffffff !important;
          }
          .dark-modal .ant-modal-body {
            background: #1f1f1f !important;
            color: #ffffff !important;
          }
          .dark-modal .ant-modal-close {
            color: #ffffff !important;
          }
          .dark-modal .ant-modal-close:hover {
            color: #4facfe !important;
          }
        `}
      </style>
      <Card style={{ background: '#1f1f1f', border: '1px solid #303030' }}>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0, color: '#ffffff' }}>Trạng thái tác vụ đăng tải</Title>
          <Button 
            type="primary" 
            icon={<ReloadOutlined />} 
            onClick={fetchRecords}
            loading={loading}
          >
            Làm mới
          </Button>
        </div>

        {/* 统计信息 */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={6}>
            <Card style={{ background: '#262626', border: '1px solid #404040' }}>
              <Statistic 
                title={<span style={{ color: '#ffffff' }}>Tổng tác vụ</span>} 
                value={stats.total} 
                valueStyle={{ color: '#ffffff' }} 
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ background: '#262626', border: '1px solid #404040' }}>
              <Statistic 
                title={<span style={{ color: '#ffffff' }}>Thành công</span>} 
                value={stats.success} 
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ background: '#262626', border: '1px solid #404040' }}>
              <Statistic 
                title={<span style={{ color: '#ffffff' }}>Thất bại</span>} 
                value={stats.failed} 
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card style={{ background: '#262626', border: '1px solid #404040' }}>
              <Statistic 
                title={<span style={{ color: '#ffffff' }}>Đang xử lý</span>} 
                value={stats.processing + stats.pending} 
                valueStyle={{ color: '#1890ff' }}
                prefix={<PlayCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 任务列表 */}
        <Table
          columns={columns}
          dataSource={records}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} / ${total} mục`
          }}
          scroll={{ x: 1200 }}
          style={{ background: '#1f1f1f' }}
          className="dark-table"
        />
      </Card>

      {/* 详情模态框 */}
      <Modal
        title="Chi tiết tác vụ đăng tải"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={800}
        style={{ background: '#1f1f1f' }}
        styles={{
          body: { background: '#1f1f1f', color: '#ffffff' },
          header: { background: '#1f1f1f', color: '#ffffff', borderBottom: '1px solid #303030' }
        }}
        className="dark-modal"
      >
        {selectedRecord && (
          <div>
            <Descriptions 
              column={2} 
              bordered
              labelStyle={{ 
                background: '#1f1f1f', 
                color: '#ffffff',
                fontWeight: 'bold',
                borderRight: '1px solid #303030'
              }}
              contentStyle={{ 
                background: '#262626', 
                color: '#ffffff',
                borderLeft: '1px solid #303030'
              }}
              style={{ 
                background: '#262626',
                border: '1px solid #303030'
              }}
            >
              <Descriptions.Item label="ID tác vụ" span={1}>
                <Text code style={{ color: '#ffffff' }}>{selectedRecord.id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái" span={1}>
                {getStatusTag(selectedRecord.status)}
              </Descriptions.Item>
              <Descriptions.Item label="Tiêu đề" span={2}>
                <Text style={{ color: '#ffffff' }}>{selectedRecord.title}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Tài khoản đăng" span={1}>
                <Text style={{ color: '#ffffff' }}>{selectedRecord.account_nickname || selectedRecord.account_username}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Phân khu" span={1}>
                <Tag>{getPartitionName(selectedRecord.partition_id)}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Tên dự án" span={1}>
                <Text style={{ color: '#ffffff' }}>{selectedRecord.project_name || '-'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="ID clip" span={1}>
                <Text code style={{ color: '#ffffff' }}>{selectedRecord.clip_id}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Tiến độ" span={2}>
                <Progress 
                  percent={selectedRecord.progress} 
                  status={
                    selectedRecord.status === 'failed' ? 'exception' :
                    selectedRecord.status === 'success' || selectedRecord.status === 'completed' ? 'success' :
                    selectedRecord.status === 'processing' ? 'active' : 'normal'
                  }
                />
              </Descriptions.Item>
              <Descriptions.Item label="Kích thước" span={1}>
                <Text style={{ color: '#ffffff' }}>{formatFileSize(selectedRecord.file_size)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian tải" span={1}>
                <Text style={{ color: '#ffffff' }}>{formatDuration(selectedRecord.upload_duration)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Mã BV" span={1}>
                {selectedRecord.bv_id ? <Text code style={{ color: '#ffffff' }}>{selectedRecord.bv_id}</Text> : <Text style={{ color: '#ffffff' }}>-</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Mã AV" span={1}>
                {selectedRecord.av_id ? <Text code style={{ color: '#ffffff' }}>{selectedRecord.av_id}</Text> : <Text style={{ color: '#ffffff' }}>-</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian tạo" span={1}>
                <Text style={{ color: '#ffffff' }}>{new Date(selectedRecord.created_at).toLocaleString()}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Thời gian cập nhật" span={1}>
                <Text style={{ color: '#ffffff' }}>{new Date(selectedRecord.updated_at).toLocaleString()}</Text>
              </Descriptions.Item>
            </Descriptions>

            {selectedRecord.description && (
              <div style={{ marginTop: '16px' }}>
                <Title level={5} style={{ color: '#ffffff' }}>Mô tả</Title>
                <Text style={{ color: '#ffffff' }}>{selectedRecord.description}</Text>
              </div>
            )}

            {selectedRecord.tags && (
              <div style={{ marginTop: '16px' }}>
                <Title level={5} style={{ color: '#ffffff' }}>Thẻ</Title>
                <Text style={{ color: '#ffffff' }}>{selectedRecord.tags}</Text>
              </div>
            )}

            {selectedRecord.error_message && (
              <div style={{ marginTop: '16px' }}>
                <Title level={5} style={{ color: '#ffffff' }}>Thông báo lỗi</Title>
                <Alert
                  message="Đăng tải thất bại"
                  description={selectedRecord.error_message}
                  type="error"
                  showIcon
                />
              </div>
            )}

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <Space>
                {selectedRecord.status === 'failed' && (
                  <Popconfirm
                    title="Bạn có chắc muốn thử lại tác vụ đăng tải này?"
                    onConfirm={() => {
                      handleRetry(selectedRecord.id);
                      setDetailModalVisible(false);
                    }}
                    okText="Đồng ý"
                    cancelText="Hủy"
                  >
                    <Button type="primary" icon={<RedoOutlined />}>
                      Thử lại
                    </Button>
                  </Popconfirm>
                )}
                <Button onClick={() => setDetailModalVisible(false)}>
                  Đóng
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UploadStatusPage;
