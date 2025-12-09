import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import SessionToken from '../models/SessionToken.js';

// Email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT || 465),
  secure: process.env.EMAIL_SECURE ? process.env.EMAIL_SECURE === 'true' : true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

export const sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      text
    });
    return true;
  } catch (error) {
    console.error('Send email error:', error);
    return false;
  }
};

// Session & JWT helpers
export const SESSION_TTL_DAYS = Number(process.env.AUTH_SESSION_TTL_DAYS || 30);
export const SESSION_EXPIRES_IN = `${SESSION_TTL_DAYS}d`;
export const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export const generateToken = (userId, sessionId) => {
  const payload = { userId };
  if (sessionId) {
    payload.sessionId = sessionId.toString();
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: SESSION_EXPIRES_IN });
};

// Helper function để kiểm tra IP có phải là IP nội bộ Docker không
const isDockerInternalIP = (ip) => {
  if (!ip) return true;
  
  // Loại bỏ IPv6 prefix (::ffff:)
  const cleanIp = ip.replace(/^::ffff:/, '');
  
  // Kiểm tra các dải IP nội bộ Docker
  // 172.16.0.0 - 172.31.255.255 (Docker default bridge network)
  // 10.0.0.0 - 10.255.255.255 (Docker custom networks)
  // 192.168.0.0 - 192.168.255.255 (Docker custom networks)
  // 127.0.0.1 (localhost)
  // ::1 (IPv6 localhost)
  
  if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp.startsWith('::ffff:127.0.0.1')) {
    return true;
  }
  
  // Kiểm tra 172.16-31.x.x (Docker bridge network)
  const dockerBridgeRegex = /^172\.(1[6-9]|2[0-9]|3[0-1])\./;
  if (dockerBridgeRegex.test(cleanIp)) {
    return true;
  }
  
  // Kiểm tra 10.x.x.x (Docker custom network)
  if (cleanIp.startsWith('10.')) {
    return true;
  }
  
  // Kiểm tra 192.168.x.x (Docker custom network)
  if (cleanIp.startsWith('192.168.')) {
    return true;
  }
  
  return false;
};

// Helper function để chuẩn hóa IP (loại bỏ IPv6 prefix)
const normalizeIP = (ip) => {
  if (!ip) return '';
  // Loại bỏ IPv6 prefix ::ffff: (IPv4-mapped IPv6)
  return ip.replace(/^::ffff:/, '').trim();
};

export const resolveDeviceMetadata = (req, overrides = {}) => {
  const userAgent = req.headers['user-agent'] || 'Unknown device';
  
  // Lấy IP thực của client, ưu tiên theo thứ tự:
  // 1. Override (nếu có)
  // 2. X-Real-IP (từ Nginx reverse proxy)
  // 3. X-Forwarded-For (lấy IP đầu tiên trong chain)
  // 4. req.ip (sau khi trust proxy) - chỉ dùng nếu không phải IP Docker
  // 5. req.connection.remoteAddress (fallback) - chỉ dùng nếu không phải IP Docker
  let ipAddress = overrides.ipAddress;
  
  if (!ipAddress) {
    const realIp = req.headers['x-real-ip'];
    const forwardedFor = req.headers['x-forwarded-for'];
    
    // Debug log (có thể xóa sau)
    if (process.env.NODE_ENV !== 'production') {
      console.log('[IP Debug]', {
        'x-real-ip': realIp,
        'x-forwarded-for': forwardedFor,
        'req.ip': req.ip,
        'req.connection.remoteAddress': req.connection?.remoteAddress,
        'req.socket.remoteAddress': req.socket?.remoteAddress
      });
    }
    
    // Ưu tiên X-Real-IP (từ Nginx)
    if (realIp) {
      const normalized = normalizeIP(realIp);
      if (!isDockerInternalIP(normalized)) {
        ipAddress = normalized;
      }
    }
    
    // Nếu chưa có IP hợp lệ, thử X-Forwarded-For
    if (!ipAddress && forwardedFor) {
      // X-Forwarded-For có thể chứa nhiều IP (client, proxy1, proxy2...)
      // Lấy IP đầu tiên (IP thực của client)
      const firstIp = forwardedFor.split(',')[0].trim();
      const normalized = normalizeIP(firstIp);
      if (!isDockerInternalIP(normalized)) {
        ipAddress = normalized;
      }
    }
    
    // Nếu vẫn chưa có IP hợp lệ, thử req.ip (chỉ dùng nếu không phải IP Docker)
    if (!ipAddress && req.ip) {
      const normalized = normalizeIP(req.ip);
      if (!isDockerInternalIP(normalized)) {
        ipAddress = normalized;
      }
    }
    
    // Fallback cuối cùng (chỉ dùng nếu không phải IP Docker)
    if (!ipAddress) {
      const remoteAddr = req.connection?.remoteAddress || req.socket?.remoteAddress;
      if (remoteAddr) {
        const normalized = normalizeIP(remoteAddr);
        if (!isDockerInternalIP(normalized)) {
          ipAddress = normalized;
        }
      }
    }
    
    // Nếu vẫn không có IP hợp lệ, để trống
    if (!ipAddress) {
      ipAddress = '';
    }
  }

  let inferredType = 'web';
  if (/android|iphone|ipad|ipod|mobile/i.test(userAgent)) {
    inferredType = 'mobile';
  } else if (/tablet/i.test(userAgent)) {
    inferredType = 'tablet';
  } else if (/mac os x|windows|linux/i.test(userAgent)) {
    inferredType = 'desktop';
  }

  return {
    userAgent: overrides.userAgent || userAgent,
    ipAddress,
    deviceName: overrides.deviceName || userAgent?.slice(0, 200) || 'Unknown device',
    deviceType: overrides.deviceType || inferredType
  };
};

export const createSessionForUser = async (userId, req, metadata = {}) => {
  const { userAgent, ipAddress, deviceName, deviceType } = resolveDeviceMetadata(req, metadata);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  return SessionToken.create({
    user: userId,
    userAgent,
    ipAddress,
    deviceName,
    deviceType,
    expiresAt
  });
};

export const sanitizeUser = (user) => {
  if (!user) return null;
  const plain = user.toObject ? user.toObject({ virtuals: true }) : user;
  delete plain.password;
  return plain;
};



