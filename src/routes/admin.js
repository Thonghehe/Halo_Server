import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getPendingUsersController,
  approveUserController,
  rejectUserController,
  getUsersController,
  getUserDetailController,
  updateUserRolesController,
  toggleUserActiveController
} from '../controllers/admin.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/admin/users/pending:
 *   get:
 *     summary: Lấy danh sách user chờ phê duyệt (chỉ admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/users/pending', authenticate, authorize('admin'), getPendingUsersController);

/**
 * @swagger
 * /api/admin/users/{userId}/approve:
 *   patch:
 *     summary: Phê duyệt user (chỉ admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/users/:userId/approve',
  authenticate,
  authorize('admin'),
  approveUserController
);

/**
 * @swagger
 * /api/admin/users/{userId}/reject:
 *   delete:
 *     summary: Từ chối phê duyệt và xóa user (chỉ admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.delete(
  '/users/:userId/reject',
  authenticate,
  authorize('admin'),
  rejectUserController
);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Lấy tất cả users (chỉ admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/users', authenticate, authorize('admin'), getUsersController);

/**
 * @swagger
 * /api/admin/users/{userId}:
 *   get:
 *     summary: Lấy chi tiết user
 */
router.get('/users/:userId', authenticate, authorize('admin'), getUserDetailController);

/**
 * @swagger
 * /api/admin/users/{userId}:
 *   put:
 *     summary: Cập nhật vai trò user
 */
router.put(
  '/users/:userId',
  authenticate,
  authorize('admin'),
  updateUserRolesController
);

/**
 * @swagger
 * /api/admin/users/{userId}/toggle-active:
 *   patch:
 *     summary: Vô hiệu hóa/Kích hoạt user (chỉ admin)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.patch(
  '/users/:userId/toggle-active',
  authenticate,
  authorize('admin'),
  toggleUserActiveController
);

export default router;
