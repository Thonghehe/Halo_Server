import User from '../../models/User.js';
import SessionToken from '../../models/SessionToken.js';
import {
  createSessionForUser,
  generateToken,
  sanitizeUser
} from '../../helpers/auth.helper.js';
import { buildServiceResponse } from './utils.js';

export const registerUser = async (payload = {}) => {
  try {
    const { fullName, email, password, roles } = payload;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return buildServiceResponse(409, {
        success: false,
        message: 'Email đã được sử dụng'
      });
    }

    const user = new User({
      fullName,
      email,
      password,
      roles: roles || ['sale'],
      active: false
    });

    await user.save();

    return buildServiceResponse(201, {
      success: true,
      message: 'Đăng ký thành công. Vui lòng chờ admin phê duyệt tài khoản của bạn.',
      data: {
        email: user.email,
        fullName: user.fullName,
        active: user.active
      }
    });
  } catch (error) {
    return buildServiceResponse(400, {
      success: false,
      message: error.message
    });
  }
};

export const loginUser = async (payload = {}, req) => {
  try {
    const { email, password, deviceName, deviceType } = payload;

    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return buildServiceResponse(401, {
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    if (!user.active) {
      return buildServiceResponse(403, {
        success: false,
        message: 'Tài khoản của bạn chưa được kích hoạt. Vui lòng liên hệ admin để được phê duyệt.'
      });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return buildServiceResponse(401, {
        success: false,
        message: 'Email hoặc mật khẩu không đúng'
      });
    }

    const session = await createSessionForUser(user._id, req, { deviceName, deviceType });
    const token = generateToken(user._id, session._id);

    const userResponse = await User.findById(user._id).select('-password');

    return buildServiceResponse(200, {
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        user: sanitizeUser(userResponse),
        token
      }
    });
  } catch (error) {
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const logoutUser = async (req) => {
  try {
    if (req.sessionToken?._id) {
      await SessionToken.findByIdAndUpdate(req.sessionToken._id, {
        revokedAt: new Date()
      });
    }

    return buildServiceResponse(200, {
      success: true,
      message: 'Đăng xuất thành công'
    });
  } catch (error) {
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const registerAdmin = async (payload = {}, req) => {
  try {
    const { fullName, email, password, secretCode } = payload;

    if (!secretCode || secretCode !== process.env.ADMIN_SECRET_CODE) {
      return buildServiceResponse(403, {
        success: false,
        message: 'Mã bí mật không chính xác'
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return buildServiceResponse(409, {
        success: false,
        message: 'Email đã được sử dụng'
      });
    }

    const user = new User({
      fullName,
      email,
      password,
      roles: ['admin'],
      active: true,
      approvedAt: new Date()
    });

    await user.save();

    const session = await createSessionForUser(user._id, req, {
      deviceName: req.body?.deviceName,
      deviceType: req.body?.deviceType || 'web'
    });
    const token = generateToken(user._id, session._id);

    const userResponse = await User.findById(user._id).select('-password');

    return buildServiceResponse(201, {
      success: true,
      message: 'Đăng ký admin thành công',
      data: {
        user: userResponse,
        token
      }
    });
  } catch (error) {
    return buildServiceResponse(400, {
      success: false,
      message: error.message
    });
  }
};



