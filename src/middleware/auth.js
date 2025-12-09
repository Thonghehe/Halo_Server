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
      console.log('[Auth] Authorization Header: exists');
    } else if (queryToken) {
      token = queryToken;
      console.log('[Auth] Token received via query param');
    } else if (headerToken) {
      token = headerToken;
      console.log('[Auth] Token received via x-access-token header');
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Không có token xác thực'
      });
    }

    console.log('[Auth] Token received:', token.substring(0, 30) + '...');

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('[Auth] Decoded token:', decoded);

    let sessionTokenDoc = null;
    if (decoded?.sessionId) {
      sessionTokenDoc = await SessionToken.findById(decoded.sessionId);
      if (
        !sessionTokenDoc ||
        sessionTokenDoc.revokedAt ||
        sessionTokenDoc.user.toString() !== decoded.userId
      ) {
        console.warn('[Auth] Session token invalid or revoked');
        return res.status(401).json({
          success: false,
          message: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.'
        });
      }

      if (sessionTokenDoc.expiresAt && sessionTokenDoc.expiresAt.getTime() < Date.now()) {
        console.warn('[Auth] Session token expired via TTL');
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
      console.warn('[Auth] User not found with ID:', decoded.userId);
      return res.status(401).json({
        success: false,
        message: 'User không tồn tại'
      });
    }

    console.log('[Auth] User authenticated:', user.email);
    req.user = user;
    req.sessionToken = sessionTokenDoc;
    next();
  } catch (error) {
    console.error('[Auth] Error:', error.message);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token không hợp lệ'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token đã hết hạn'
      });
    }

    res.status(401).json({
      success: false,
      message: 'Lỗi xác thực'
    });
  }
};

// Middleware kiểm tra role
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Chưa xác thực'
      });
    }

    const hasRole = roles.some(role => req.user.roles.includes(role));

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền truy cập. Yêu cầu role: ' + roles.join(', ')
      });
    }

    next();
  };
};
