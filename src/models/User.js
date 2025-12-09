import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Định nghĩa enum roles chuẩn hóa
export const USER_ROLES = {
  ADMIN: 'admin',
  SALE: 'sale',
  CAT_KHUNG: 'catKhung',
  SAN_XUAT: 'sanXuat',
  DONG_GOI: 'dongGoi',
  KE_TOAN_DIEU_DON: 'keToanDieuDon',
  KE_TOAN_TAI_CHINH: 'keToanTaiChinh',
  IN: 'in',
  THIET_KE: 'thietKe',
  MARKETING: 'marketing'
};

// Label hiển thị cho từng role
export const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Quản trị viên',
  [USER_ROLES.SALE]: 'Sale',
  [USER_ROLES.CAT_KHUNG]: 'Cắt khung',
  [USER_ROLES.SAN_XUAT]: 'Sản xuất',
  [USER_ROLES.DONG_GOI]: 'Đóng gói',
  [USER_ROLES.KE_TOAN_DIEU_DON]: 'Kế toán điều đơn',
  [USER_ROLES.KE_TOAN_TAI_CHINH]: 'Kế toán tài chính',
  [USER_ROLES.IN]: 'In',
  [USER_ROLES.THIET_KE]: 'Thiết kế',
  [USER_ROLES.MARKETING]: 'Marketing'
};

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Họ và tên là bắt buộc'],
      trim: true,
      minlength: [2, 'Họ và tên phải có ít nhất 2 ký tự'],
      maxlength: [100, 'Họ và tên không được vượt quá 100 ký tự']
    },
    email: {
      type: String,
      required: [true, 'Email là bắt buộc'],
      unique: true, 
      trim: true,
      lowercase: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Email không hợp lệ']
    },
    password: {
      type: String,
      required: [true, 'Mật khẩu là bắt buộc'],
      minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'],
      select: false 
    },
    roles: {
      type: [String],
    default: [],
      enum: {
        values: Object.values(USER_ROLES),
        message: 'Role không hợp lệ. Các role hợp lệ: admin, sale, catKhung, sanXuat, dongGoi, keToanDieuDon, keToanTaiChinh, in, thietKe, marketing'
      },
      required: [true, 'Ít nhất một role là bắt buộc'],
      validate: {
        validator: function(roles) {
          return roles && roles.length > 0;
        },
        message: 'Người dùng phải có ít nhất một role'
      }
    },
    active: {
      type: Boolean,
      default: false // Mặc định là false, chờ admin duyệt
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    approvedAt: {
      type: Date,
      default: null
    },
    avatar: {
      type: String,
      default: null
    },
    // Thêm fields cho reset password
    resetPasswordToken: {
      type: String,
      select: false
    },
    resetPasswordExpires: {
      type: Date,
      select: false
    },
    resetPasswordOtp: {
      type: String,
      select: false
    },
    resetPasswordOtpExpires: {
      type: Date,
      select: false
    },
  changeHistory: {
    type: [{
      action: {
        type: String,
        required: true,
        trim: true
      },
      description: {
        type: String,
        trim: true
      },
      changes: {
        type: mongoose.Schema.Types.Mixed
      },
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
      },
      changedAt: {
        type: Date,
        default: Date.now
      }
    }],
    default: []
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

// Index để tối ưu tìm kiếm
userSchema.index({ fullName: 'text' });
userSchema.index({ roles: 1 });
userSchema.index({ active: 1 });

// Virtual để lấy ID dưới dạng string
userSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Virtual để lấy role labels
userSchema.virtual('roleLabels').get(function() {
  const roles = Array.isArray(this.roles) ? this.roles : [];
  return roles.map(role => ROLE_LABELS[role] || role);
});

// Đảm bảo virtuals được bao gồm khi convert sang JSON
userSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    return ret;
  }
});

// Method: Kiểm tra user có role cụ thể không
userSchema.methods.hasRole = function(role) {
  return this.roles.includes(role);
};

// Method: Kiểm tra user có bất kỳ role nào trong danh sách
userSchema.methods.hasAnyRole = function(rolesList) {
  return rolesList.some(role => this.roles.includes(role));
};

// Method: Thêm role mới (không trùng lặp)
userSchema.methods.addRole = function(role) {
  if (!this.roles.includes(role)) {
    this.roles.push(role);
  }
  return this;
};

// Method: Xóa role
userSchema.methods.removeRole = function(role) {
  this.roles = this.roles.filter(r => r !== role);
  return this;
};

// Static method: Tìm user theo role
userSchema.statics.findByRole = function(role) {
  return this.find({ roles: role, isActive: true });
};

// Static method: Tìm user có nhiều role
userSchema.statics.findByRoles = function(rolesList) {
  return this.find({ 
    roles: { $in: rolesList },
    isActive: true 
  });
};

// Hash password trước khi lưu
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method: So sánh password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

userSchema.methods.addHistory = function({ action, description, changes = {}, changedBy = null }) {
  if (!action) return;
  const entry = {
    action,
    description,
    changes,
    changedBy,
    changedAt: new Date()
  };

  this.changeHistory = this.changeHistory || [];
  this.changeHistory.unshift(entry);

  // Giới hạn lịch sử tối đa 100 dòng để tránh phình to
  if (this.changeHistory.length > 100) {
    this.changeHistory = this.changeHistory.slice(0, 100);
  }

  this.markModified('changeHistory');
};

const User = mongoose.model('User', userSchema);

export default User;
