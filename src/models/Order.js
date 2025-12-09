import mongoose from 'mongoose';

const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changedAt: {
    type: Date,
    default: Date.now
  },
  note: {
    type: String,
    trim: true
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  // Mã đơn hàng: D + nhập tay + DDMM
  orderCode: {
    type: String,
    required: true,
    unique: true, // ← Giữ unique ở đây
    trim: true,
    uppercase: true
  },

  // Tham chiếu đến danh sách tranh (sử dụng ref thay vì embedded)
  paintings: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Painting'
  }],

  // Thông tin khách hàng
  customerName: {
    type: String,
    trim: true
  },
  customerAddress: {
    type: String,
    trim: true,
    default: ''
  },
  customerPhone: {
    type: String,
    required: true,
    trim: true
  },

  // Loại đơn
  orderType: {
    type: String,
    enum: ['thuong', 'gap', 'shopee', 'tiktok'],
    default: 'thuong',
    required: true
  },

  // Ghi chú đơn hàng
  note: {
    type: String,
    trim: true
  },

  // Nhắc đến người dùng trong ghi chú
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

  // Trạng thái đơn hàng tổng thể
  status: {
    type: String,
    enum: [
      'moi_tao',              // Mới tạo
      'dang_xu_ly',           // Đang xử lý (in/cắt khung)
      'cho_san_xuat',         // Sản xuất đã nhận để đợi căng tranh vào khung
      'da_vao_khung',         // Đã vào khung
      'cho_dong_goi',         // Đóng gói đã nhận để đợi đóng gói
      'da_dong_goi',          // Đã đóng gói
      'cho_dieu_don',         // Kế toán điều đơn đã nhận để đợi gửi đi
      'da_gui_di',            // Đã gửi đi
      'hoan_thanh',           // Đã hoàn thành
      'khach_tra_hang',       // Khách trả hàng
      'khach_yeu_cau_sua',    // Sửa lại
      'da_nhan_lai_don',      // Đã nhận lại đơn
      'dong_goi_da_nhan_lai', // Đóng gói đã nhận lại
      'gui_lai_san_xuat',     // Gửi lại sản xuất
      'cho_san_xuat_lai',     // Chờ sản xuất lại
      'cat_vao_kho',          // Cất vào kho
      'gui_lai_cho_khach',    // Gửi lại cho khách
      'huy'                   // Hủy
    ],
    default: 'moi_tao'
  },

  // Trạng thái in 
  printingStatus: {
    type: String,
    enum: ['chua_in', 'cho_in', 'dang_in', 'da_in', 'san_xuat_da_nhan_tranh', 'dong_goi_da_nhan_tranh', 'yeu_cau_in_lai', 'cho_in_lai', 'co_san'],
    default: 'chua_in'
  },

  // Trạng thái cắt khung 
  frameCuttingStatus: {
    type: String,
    enum: ['chua_cat', 'cho_cat_khung', 'dang_cat_khung', 'da_cat_khung', 'yeu_cau_cat_lai', 'cho_cat_lai_khung', 'khong_cat_khung', 'co_san'],
    default: 'chua_cat'
  },

  // Ảnh cọc đơn hàng
  depositImages: [{
    type: String
  }],

  // Ảnh bill thanh toán khi khách đến nhận
  paymentBillImages: [{
    type: String,
    trim: true
  }],

  // Số tiền cọc
  depositAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Tổng tiền đơn hàng
  totalAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  //Tiền thực nhận
  actualReceivedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  // COD = Tổng tiền - Tiền cọc
  cod: {
    type: Number,
    default: 0,
    min: 0
  },

  // Tiền tranh
  paintingPrice: {
    type: Number,
    default: 0,
    min: 0
  },

  // Tiền thi công (nếu có)
  constructionPrice: {
    type: Number,
    default: 0,
    min: 0
  },

  // Tiền thiết kế (nếu có)
  designFee: {
    type: Number,
    default: 0,
    min: 0
  },

  // Vận chuyển & lắp đặt (có thể để kế toán điều đơn ghi sau)
  shippingInstallationPrice: {
    type: Number,
    default: 0,
    min: 0
  },

  // Khách trả tiền ship (nếu true: cộng vào tổng đơn, nếu false: trừ vào phí phát sinh)
  customerPaysShipping: {
    type: Boolean,
    default: true
  },

  // Hình thức gửi đơn
  shippingMethod: {
    type: String,
    enum: ['viettel', 'ship_ngoai', 'khach_den_nhan', 'di_treo_cho_khach'],
    default: null
  },

  // Mã đơn vận
  shippingTrackingCode: {
    type: String,
    trim: true,
    default: ''
  },

  // Thông tin ship ngoài
  shippingExternalInfo: {
    type: String,
    trim: true,
    default: ''
  },
  shippingExternalCost: {
    type: Number,
    default: 0,
    min: 0
  },

  // Phí phát sinh khác (nếu có)
  extraFeeName: {
    type: String,
    trim: true,
    default: ''
  },
  extraFeeAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  // VAT = 8% của (tiền tranh + tiền thi công (nếu có) + Vận chuyển & lắp đặt)
  vat: {
    type: Number,
    default: 0,
    min: 0
  },

  // Có tính VAT hay không
  includeVat: {
    type: Boolean,
    default: true
  },

  // Ăn chia (chia tiền tranh)
  profitSharing: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    amount: {
      type: Number,
      default: 0,
      min: 0
    }
  }],

  // Lịch sử thay đổi trạng thái
  statusHistory: [statusHistorySchema],

  // Người tạo đơn
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Người được giao việc hiện tại (Sale, In, Cắt khung, Sản xuất, Đóng gói, KT Điều đơn)
  assignedTo: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['in', 'catKhung', 'sanXuat', 'dongGoi', 'keToanDieuDon']
    },
    assignedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Thời gian hoàn thành dự kiến
  expectedCompletionDate: {
    type: Date
  },

  // Thời gian hoàn thành thực tế
  actualCompletionDate: {
    type: Date
  }

}, {
  timestamps: true
});

// Tính VAT, totalAmount và COD trước khi lưu
orderSchema.pre('save', function(next) {
  const paintingPrice = Number(this.paintingPrice || 0);
  const constructionPrice = Number(this.constructionPrice || 0);
  const designFee = Number(this.designFee || 0);
  const extraFeeAmount = Number(this.extraFeeAmount || 0);
  const shippingInstallationPrice = Number(this.shippingInstallationPrice || 0);
  const existingTotalAmount = Number(this.totalAmount || 0);
  const existingVat = Number(this.vat || 0);
  const customerPaysShipping = this.customerPaysShipping !== undefined ? this.customerPaysShipping : true;
  
  // Với đơn shopee: nếu totalAmount đã được set trực tiếp và các trường giá = 0, giữ nguyên
  const isShopeeDirectInput = this.orderType === 'shopee' && 
                               existingTotalAmount > 0 && 
                               paintingPrice === 0 && 
                               constructionPrice === 0 && 
                               designFee === 0 &&
                               extraFeeAmount === 0 &&
                               shippingInstallationPrice === 0;
  
  if (isShopeeDirectInput) {
    // Giữ nguyên totalAmount đã nhập, không tính VAT
    this.vat = 0;
    // totalAmount đã được set, không cần tính lại
  } else {
    // Chỉ tính lại nếu totalAmount = 0 (fallback cho trường hợp không qua service layer)
    // Nếu totalAmount đã được tính ở service layer (> 0), giữ nguyên
    if (existingTotalAmount === 0) {
      // Tính VAT = 8% của (tiền tranh + tiền thi công + tiền thiết kế + phí phát sinh + [Vận chuyển & lắp đặt nếu khách chịu]) nếu includeVat = true
      const subtotal = paintingPrice + 
                       constructionPrice + 
                       designFee + 
                       extraFeeAmount + 
                       (customerPaysShipping ? shippingInstallationPrice : 0);
      const includeVat = this.includeVat !== undefined ? this.includeVat : true;
      const vat = includeVat ? subtotal * 0.08 : 0;
      this.vat = Math.round(vat);
      
      // Tính tổng tiền = tiền tranh + tiền thi công + tiền thiết kế + phí phát sinh + [Vận chuyển & lắp đặt nếu khách chịu] + VAT
      this.totalAmount = Math.round(subtotal + vat);
    }
  }
  
  // Tính số tiền ăn chia cho mỗi người dựa trên % và tiền tranh
  if (this.profitSharing && Array.isArray(this.profitSharing)) {
    this.profitSharing.forEach(item => {
      if (item.user && item.percentage) {
        const percentage = Number(item.percentage) || 0;
        const amount = Math.round((paintingPrice * percentage) / 100);
        item.amount = amount;
      }
    });
  }
  
  // Tính COD = Tổng tiền - Tiền cọc
  const deposit = Number(this.depositAmount || 0);
  const cod = this.totalAmount - deposit;
  this.cod = cod > 0 ? cod : 0;
  
  next();
});



// Index cho tìm kiếm
orderSchema.index({ status: 1 });
orderSchema.index({ orderType: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ customerPhone: 1 });
orderSchema.index({ 'assignedTo.userId': 1 });

// Virtual để lấy ngày tạo định dạng VN
orderSchema.virtual('createdAtVN').get(function() {
  return this.createdAt.toLocaleDateString('vi-VN');
});

// Method để thêm lịch sử trạng thái
orderSchema.methods.addStatusHistory = function(status, changedBy, note = '') {
  this.statusHistory.push({
    status,
    changedBy,
    changedAt: new Date(),
    note
  });
  return this.save();
};

// Static method để generate mã đơn hàng
orderSchema.statics.generateOrderCode = function(customPart) {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0'); // Lấy ngày hiện tại (20)
  const month = String(now.getMonth() + 1).padStart(2, '0'); // Lấy tháng hiện tại (10)
  return `D${customPart}-${day}${month}`; // D + custom + 20 + 10 = D...-2010
};

// Method để kiểm tra xem có thể chuyển sang trạng thái mới không
orderSchema.methods.canTransitionTo = function(newStatus) {
  const validTransitions = {
    'moi_tao': ['dang_xu_ly', 'huy'],
    'dang_xu_ly': ['cho_san_xuat', 'da_vao_khung', 'cho_dong_goi', 'huy'], 
    'cho_san_xuat': ['da_vao_khung', 'cho_san_xuat_lai'],
    'da_vao_khung': ['cho_dong_goi', 'khach_yeu_cau_sua'],
    'cho_dong_goi': ['da_dong_goi', 'khach_yeu_cau_sua'],
    'da_dong_goi': ['cho_dieu_don', 'dong_goi_da_nhan_lai', 'gui_lai_cho_khach', 'khach_yeu_cau_sua'],
    'cho_dieu_don': ['da_gui_di','khach_yeu_cau_sua'],
    'da_gui_di': ['hoan_thanh', 'khach_tra_hang', 'khach_yeu_cau_sua', 'gui_lai_cho_khach'],
    'hoan_thanh': ['khach_yeu_cau_sua'],
    'khach_tra_hang': ['dang_xu_ly', 'khach_yeu_cau_sua', 'da_nhan_lai_don'],
    'khach_yeu_cau_sua': ['da_nhan_lai_don'],
    'da_nhan_lai_don': ['dong_goi_da_nhan_lai', 'gui_lai_san_xuat'],
    'dong_goi_da_nhan_lai': ['gui_lai_san_xuat', 'cat_vao_kho', 'gui_lai_cho_khach'],
    'gui_lai_san_xuat': ['cho_san_xuat_lai', 'da_vao_khung'],
    'cho_san_xuat_lai': ['da_vao_khung', 'dang_xu_ly'],
    'gui_lai_cho_khach': ['cho_dieu_don'],
    'huy': []
  };

  return validTransitions[this.status]?.includes(newStatus) || false;
};

// Method để gán người phụ trách
orderSchema.methods.assignUser = function(userId, role) {
  const existing = this.assignedTo.find(a => a.userId.equals(userId) && a.role === role);
  if (!existing) {
    this.assignedTo.push({
      userId,
      role,
      assignedAt: new Date()
    });
  }
  return this.save();
};

// Middleware để populate paintings khi query
orderSchema.pre(/^find/, function(next) {
  this.populate('paintings');
  next();
});

// Method để kiểm tra trạng thái chi tiết
orderSchema.methods.getDetailedStatus = function() {
  if (this.status !== 'dang_xu_ly') {
    return this.status;
  }

  // Kiểm tra trạng thái in và cắt khung của các tranh
  const hasUnprinted = this.paintings.some(p => 
    p.printingStatus === 'chua_in' || p.printingStatus === 'dang_in'
  );
  const hasUncut = this.paintings.some(p => 
    p.frameCuttingStatus === 'chua_cat' || p.frameCuttingStatus === 'dang_cat'
  );

  if (hasUnprinted && hasUncut) {
    return 'dang_xu_ly_cho_in_cat';
  } else if (hasUnprinted) {
    return 'dang_xu_ly_cho_in';
  } else if (hasUncut) {
    return 'dang_xu_ly_cho_cat';
  } else {
    return 'dang_xu_ly_san_xuat';
  }
};

const Order = mongoose.model('Order', orderSchema);

export default Order;
