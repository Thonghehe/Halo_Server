import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import SessionToken from '../models/SessionToken.js';

// Middleware xác thực JWT
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const queryToken = req.query?.token;
    const headerToken = req.headers['x-access-token'];

    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (queryToken) {
      token = queryToken;
    } else if (headerToken) {
      token = headerToken;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    let sessionTokenDoc = null;
    if (decoded?.sessionId) {
      sessionTokenDoc = await SessionToken.findById(decoded.sessionId);
      if (
        !sessionTokenDoc ||
        sessionTokenDoc.revokedAt ||
        sessionTokenDoc.user.toString() !== decoded.userId
      ) {
        return res.status(401).json({
          success: false,
          message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.'
        });
      }

      if (sessionTokenDoc.expiresAt && sessionTokenDoc.expiresAt.getTime() < Date.now()) {
        return res.status(401).json({
          success: false,
          message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        });
      }
    }

    // FIX: Tìm user bằng decoded.userId
    const user = await User.findById(decoded.userId)
      .select('-password')
      .populate({
        path: 'changeHistory.changedBy',
        select: 'fullName email'
      });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại hoặc đã bị xóa.'
      });
    }

    req.user = user;
    req.sessionToken = sessionTokenDoc;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token xác thực không hợp lệ. Vui lòng đăng nhập lại.'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
      });
    }

    res.status(401).json({
      success: false,
      message: 'Lỗi xác thực. Vui lòng đăng nhập lại.'
    });
  }
};

// Middleware kiểm tra role
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Bạn chưa đăng nhập. Vui lòng đăng nhập để tiếp tục.'
      });
    }

    const hasRole = roles.some(role => req.user.roles.includes(role));

    if (!hasRole) {
      const roleNames = roles.map(role => {
        const roleMap = {
          'admin': 'Quản trị viên',
          'sale': 'Nhân viên bán hàng',
          'manager': 'Quản lý'
        };
        return roleMap[role] || role;
      });
      
      return res.status(403).json({
        success: false,
        message: `Bạn không có quyền truy cập chức năng này. Yêu cầu quyền: ${roleNames.join(', ')}.`
      });
    }

    next();
  };
};
