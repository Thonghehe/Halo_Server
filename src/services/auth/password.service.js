import crypto from 'crypto';
import User from '../../models/User.js';
import SessionToken from '../../models/SessionToken.js';
import { sendEmail, sanitizeUser } from '../../helpers/auth.helper.js';
import { buildServiceResponse } from './utils.js';

export const forgotPassword = async (payload = {}) => {
  try {
    const { email } = payload;

    const user = await User.findOne({ email }).select(
      '+resetPasswordOtp +resetPasswordOtpExpires'
    );

    if (!user) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy tài khoản với email này'
      });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    user.resetPasswordOtp = hashedOtp;
    user.resetPasswordOtpExpires = Date.now() + 5 * 60 * 1000;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save({ validateBeforeSave: false });

    const emailBodyLines = [
      'Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản Halo.',
      `Mã OTP đặt lại của bạn là: ${otp}`,
      '',
      'Mã OTP có hiệu lực trong 5 phút. Không chia sẻ mã này với bất kỳ ai.'
    ];

    const emailSent = await sendEmail(
      email,
      'Halo - OTP đặt lại mật khẩu',
      emailBodyLines.join('\n')
    );

    if (!emailSent) {
      return buildServiceResponse(500, {
        success: false,
        message: 'Không thể gửi email đặt lại mật khẩu'
      });
    }

    return buildServiceResponse(200, {
      success: true,
      message: 'Đã gửi OTP đặt lại mật khẩu tới email của bạn'
    });
  } catch (error) {
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const verifyResetOtp = async (payload = {}) => {
  try {
    const { email, otp } = payload;

    if (!email || !otp) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Thiếu email hoặc OTP'
      });
    }

    const user = await User.findOne({ email }).select(
      '+resetPasswordOtp +resetPasswordOtpExpires'
    );

    if (!user || !user.resetPasswordOtp || !user.resetPasswordOtpExpires) {
      return buildServiceResponse(400, {
        success: false,
        message: 'OTP không hợp lệ hoặc đã hết hạn'
      });
    }

    if (user.resetPasswordOtpExpires.getTime() < Date.now()) {
      user.resetPasswordOtp = undefined;
      user.resetPasswordOtpExpires = undefined;
      await user.save({ validateBeforeSave: false });
      return buildServiceResponse(400, {
        success: false,
        message: 'OTP đã hết hạn, vui lòng yêu cầu mã mới'
      });
    }

    const hashedOtp = crypto.createHash('sha256').update(String(otp)).digest('hex');
    if (hashedOtp !== user.resetPasswordOtp) {
      return buildServiceResponse(400, {
        success: false,
        message: 'OTP không chính xác'
      });
    }

    const sessionToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(sessionToken)
      .digest('hex');
    user.resetPasswordExpires = Date.now() + 10 * 60 * 1000;
    user.resetPasswordOtp = undefined;
    user.resetPasswordOtpExpires = undefined;

    await user.save({ validateBeforeSave: false });

    return buildServiceResponse(200, {
      success: true,
      message: 'Xác thực OTP thành công',
      resetToken: sessionToken
    });
  } catch (error) {
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const resetPassword = async (payload = {}) => {
  try {
    const { resetToken, token, newPassword } = payload;

    const tokenToUse = resetToken || token;

    if (!tokenToUse) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Thiếu resetToken'
      });
    }

    if (!newPassword) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Thiếu mật khẩu mới'
      });
    }

    if (newPassword.length < 6) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
      });
    }

    const hashedToken = crypto
      .createHash('sha256')
      .update(tokenToUse)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    }).select('+resetPasswordToken +resetPasswordExpires');

    if (!user) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn'
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    await SessionToken.deleteMany({ user: user._id });

    return buildServiceResponse(200, {
      success: true,
      message: 'Đặt lại mật khẩu thành công'
    });
  } catch (error) {
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const changePassword = async (payload = {}, currentUser, sessionTokenFromReq) => {
  try {
    const { currentPassword, newPassword } = payload;

    if (!currentPassword || !newPassword) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới'
      });
    }

    if (newPassword.length < 6) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Mật khẩu mới phải có ít nhất 6 ký tự'
      });
    }

    const user = await User.findById(currentUser._id).select('+password');

    if (!user) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Mật khẩu hiện tại không chính xác'
      });
    }

    user.password = newPassword;
    user.addHistory({
      action: 'change-password',
      description: 'Người dùng thay đổi mật khẩu',
      changedBy: currentUser._id
    });

    await user.save();

    if (sessionTokenFromReq?._id) {
      await SessionToken.deleteMany({
        user: currentUser._id,
        _id: { $ne: sessionTokenFromReq._id }
      });
    } else {
      await SessionToken.deleteMany({ user: currentUser._id });
    }

    const safeUser = await User.findById(currentUser._id)
      .select('-password')
      .populate('changeHistory.changedBy', 'fullName email');

    return buildServiceResponse(200, {
      success: true,
      message: 'Đổi mật khẩu thành công',
      data: sanitizeUser(safeUser)
    });
  } catch (error) {
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};



