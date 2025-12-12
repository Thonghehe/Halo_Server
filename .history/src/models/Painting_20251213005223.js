import mongoose from 'mongoose';

const paintingSchema = new mongoose.Schema({
  // Ảnh tranh (không bắt buộc, nhưng phải có ít nhất image hoặc file)
  image: {
    type: String, // URL ảnh tranh
    required: false, // Không bắt buộc
    trim: true
  },

  images: {
    type: [String],
    default: []
  },
  

  file: {
    type: String, // URL file đính kèm
    required: false, // Không bắt buộc
    trim: true
  },

  files: {
    type: [String],
    default: []
  },

  // Kích thước
  width: {
    type: Number, // Chiều rộng (cm)
    required: true,
    min: [1, 'Chiều rộng phải lớn hơn 0']
  },
  height: {
    type: Number, // Chiều cao (cm)
    required: true,
    min: [1, 'Chiều cao phải lớn hơn 0']
  },

  // Loại tranh
  type: {
    type: String,
    enum: ['tranh_dan', 'tranh_dan_kinh', 'tranh_khung', 'tranh_tron', 'chi_in', 'trang_guong', 'in_noi', 'son_dau'],
    required: true,
    default: 'tranh_khung'
  },

  // Loại khung
  frameType: {
    type: String,
    required: true,
    trim: true
  },

  // Ghi chú của tranh
  note: {
    type: String,
    trim: true
  },

  // Nhắc đến người dùng trong ghi chú tranh
  noteMentions: {
    type: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      taggedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      taggedAt: {
        type: Date,
        default: Date.now
      }
    }],
    default: []
  },

  // Số lượng
  quantity: {
    type: Number,
    default: 1,
    min: [1, 'Số lượng phải ít nhất là 1']
  },

  // Đơn hàng mà tranh này thuộc về
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },

  // Trạng thái in của tranh
  isPrinted: {
    type: Boolean,
    default: false
  },

  // Người đánh dấu đã in
  printedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Thời gian đánh dấu đã in
  printedAt: {
    type: Date
  },

  // Sản xuất đã nhận tranh chưa
  receivedByProduction: {
    type: Boolean,
    default: false
  },

  // Người sản xuất nhận tranh
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Thời gian sản xuất nhận tranh
  receivedAt: {
    type: Date
  }

}, {
  timestamps: true
});

// Validation: Phải có ít nhất image HOẶC file
paintingSchema.pre('validate', function(next) {
  if ((!this.image && !this.file) &&
      (!Array.isArray(this.images) || this.images.length === 0) &&
      (!Array.isArray(this.files) || this.files.length === 0)) {
    this.invalidate('image', 'Phải có ít nhất một ảnh tranh hoặc file đính kèm');
    this.invalidate('file', 'Phải có ít nhất một ảnh tranh hoặc file đính kèm');
  }

  if (!this.image && Array.isArray(this.images) && this.images.length > 0) {
    this.image = this.images[0];
  }

  if (!this.file && Array.isArray(this.files) && this.files.length > 0) {
    this.file = this.files[0];
  }

  if (!Array.isArray(this.images)) {
    this.images = this.image ? [this.image] : [];
  }

  if (!Array.isArray(this.files)) {
    this.files = this.file ? [this.file] : [];
  }

  if (Array.isArray(this.images) && this.images.length > 0 && !this.image) {
    this.image = this.images[0];
  }

  if (Array.isArray(this.files) && this.files.length > 0 && !this.file) {
    this.file = this.files[0];
  }

  next();
});

// Index cho tìm kiếm
paintingSchema.index({ orderId: 1 });

// Virtual để tính diện tích
paintingSchema.virtual('area').get(function() {
  return this.width * this.height;
});

// Middleware để kiểm tra trước khi xóa
paintingSchema.pre('remove', async function(next) {
  // Có thể thêm logic kiểm tra ở đây
  next();
});

const Painting = mongoose.model('Painting', paintingSchema);

export default Painting;
