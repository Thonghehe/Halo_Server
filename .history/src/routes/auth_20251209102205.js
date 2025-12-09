import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  registerController,
  loginController,
  logoutController,
  forgotPasswordController,
  verifyResetOtpController,
  resetPasswordController,
  getMeController,
  updateMeController,
  changePasswordController,
  registerAdminController
} from '../controllers/auth.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Đăng ký tài khoản mới
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Nguyễn Văn A"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "nguyenvana@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "password123"
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["sale"]
 *     responses:
 *       201:
 *         description: Đăng ký thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       409:
 *         description: Email đã được sử dụng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', registerController);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "nguyenvana@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "password123"
 *               deviceName:
 *                 type: string
 *                 description: "Tên thiết bị hiển thị trong danh sách phiên đăng nhập (tùy chọn)"
 *               deviceType:
 *                 type: string
 *                 enum: [web, mobile, desktop, tablet, unknown]
 *                 description: "Loại thiết bị đang đăng nhập (tùy chọn)"
 *     responses:
 *       200:
 *         description: Đăng nhập thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     token:
 *                       type: string
 *       401:
 *         description: Email hoặc mật khẩu không đúng
 *       403:
 *         description: Tài khoản chưa được phê duyệt
 */
// GET endpoint để hiển thị thông tin khi truy cập bằng browser
router.get('/login', (req, res) => {
  res.status(405).json({
    success: false,
    message: 'Method not allowed. This endpoint requires POST request.',
    endpoint: '/api/auth/login',
    method: 'POST',
    example: {
      url: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        email: 'user@example.com',
        password: 'password123'
      }
    }
  });
});

router.post('/login', loginController);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Đăng xuất khỏi phiên hiện tại
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đăng xuất thành công
 *       401:
 *         description: Phiên đăng nhập không hợp lệ
 */
router.post('/logout', authenticate, logoutController);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Gửi email reset mật khẩu
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: "nguyenvana@example.com"
 *     responses:
 *       200:
 *         description: Gửi email thành công
 *       404:
 *         description: Không tìm thấy tài khoản với email này
 */
router.post('/forgot-password', forgotPasswordController);

/**
 * @swagger
 * /api/auth/verify-reset-otp:
 *   post:
 *     summary: Xác thực OTP đặt lại mật khẩu
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "nguyenvana@example.com"
 *               otp:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Xác thực OTP thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 resetToken:
 *                   type: string
 *                   description: Token để đặt lại mật khẩu (có hiệu lực 10 phút)
 *       400:
 *         description: OTP không hợp lệ hoặc đã hết hạn
 */
router.post('/verify-reset-otp', verifyResetOtpController);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Đặt lại mật khẩu với reset token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resetToken
 *               - newPassword
 *             properties:
 *               resetToken:
 *                 type: string
 *                 description: Token từ verify-reset-otp endpoint
 *                 example: "abc123def456..."
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "newpassword123"
 *     responses:
 *       200:
 *         description: Đặt lại mật khẩu thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Token không hợp lệ hoặc đã hết hạn
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/reset-password', resetPasswordController);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Lấy thông tin user hiện tại
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thông tin user
 *       401:
 *         description: Chưa xác thực
 */
router.get('/me', authenticate, getMeController);

/**
 * @swagger
 * /api/auth/me:
 *   put:
 *     summary: Cập nhật thông tin cá nhân
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Nguyễn Văn B"
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       401:
 *         description: Chưa xác thực
 */
router.put('/me', authenticate, updateMeController);

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Đổi mật khẩu
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 example: "oldpassword123"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "newpassword123"
 *     responses:
 *       200:
 *         description: Đổi mật khẩu thành công
 *       400:
 *         description: Mật khẩu hiện tại không chính xác hoặc mật khẩu mới không hợp lệ
 *       401:
 *         description: Chưa xác thực
 */
router.post('/change-password', authenticate, changePasswordController);

/**
 * @swagger
 * /api/auth/register-admin:
 *   post:
 *     summary: Đăng ký tài khoản admin (yêu cầu secret code)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - password
 *               - secretCode
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Admin User"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: "admin123"
 *               secretCode:
 *                 type: string
 *                 description: Admin secret code from environment variable
 *     responses:
 *       201:
 *         description: Đăng ký admin thành công
 *       403:
 *         description: Mã bí mật không chính xác
 *       409:
 *         description: Email đã được sử dụng
 */
router.post('/register-admin', registerAdminController);

export default router;
