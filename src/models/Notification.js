import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  // Người nhận thông báo
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Tùy chọn: người tạo thông báo (hệ thống hoặc user)
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },

  // Tiêu đề ngắn gọn
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },

  // Nội dung/miêu tả chi tiết
  message: {
    type: String,
    required: true,
    trim: true
  },

  // Phân loại để client hiển thị icon/màu (info, success, warning, error, order, system, ...)
  type: {
    type: String,
    default: 'info',
    trim: true,
    index: true
  },

  // Đã đọc hay chưa
  read: {
    type: Boolean,
    default: false,
    index: true
  },

  // Liên kết nhanh (ví dụ: /orders/123)
  link: {
    type: String,
    trim: true
  },

  // Tham chiếu đến đơn hàng (nếu có)
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: false,
    index: true
  },

  // Dữ liệu mở rộng (key-value) để client sử dụng tuỳ ý
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  }

}, {
  timestamps: true
});

// Index tổng hợp cho truy vấn phổ biến: người nhận + đã đọc + thời gian
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
