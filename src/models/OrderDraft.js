import mongoose from 'mongoose';

const profitSharingEntrySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    amount: {
      type: Number,
      min: 0,
      default: 0
    }
  },
  { _id: false }
);

const orderDraftSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    // Người tạo bản nháp (thường là sale)
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    // Trạng thái duyệt
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true
    },
    // Người duyệt (admin)
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    },
    reviewNote: {
      type: String,
      trim: true
    },
    // Các trường tiền được đề xuất
    paintingPrice: {
      type: Number,
      min: 0,
      default: 0
    },
    constructionPrice: {
      type: Number,
      min: 0,
      default: 0
    },
    shippingInstallationPrice: {
      type: Number,
      min: 0,
      default: 0
    },
    includeVat: {
      type: Boolean,
      default: true
    },
    depositAmount: {
      type: Number,
      min: 0,
      default: 0
    },
    profitSharing: {
      type: [profitSharingEntrySchema],
      default: []
    },
    // Bản sao của order TRƯỚC KHI sale thay đổi (để so sánh)
    originalData: {
      type: Object,
      default: {}
    },
    // Toàn bộ dữ liệu đề xuất (sau khi sale thay đổi)
    data: {
      type: Object,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Một order chỉ nên có tối đa một bản nháp pending
orderDraftSchema.index({ order: 1, status: 1 });

const OrderDraft = mongoose.model('OrderDraft', orderDraftSchema);

export default OrderDraft;


