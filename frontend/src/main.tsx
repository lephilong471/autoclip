import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'
import App from './App.tsx'
import './index.css'

// Cấu hình plugin dayjs
dayjs.extend(relativeTime)
dayjs.extend(timezone)
dayjs.extend(utc)

// Đặt ngôn ngữ tiếng Việt và múi giờ
dayjs.locale('vi')
dayjs.tz.setDefault('Asia/Ho_Chi_Minh')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ConfigProvider locale={viVN}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ConfigProvider>,
)