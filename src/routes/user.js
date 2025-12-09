import express from 'express';
import { USER_ROLES, ROLE_LABELS } from '../models/User.js';
import {
  getRolesController,
  createUserController,
  getUsersController,
  getUserByIdController,
  updateUserController,
  deleteUserController
} from '../controllers/user.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/user/roles:
 *   get:
 *     summary: Lấy danh sách tất cả roles có sẵn
 *     tags: [User]
 *     responses:
 *       200:
 *         description: Danh sách roles
 */
router.get('/roles', getRolesController);

/**
 * @swagger
 * /api/user:
 *   post:
 *     summary: Tạo user mới
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - roles
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Nguyễn Văn A"
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [sale, in, catKhung, sanXuat, dongGoi, keToanDieuDon, keToanTaiChinh, thietKe, marketing]
 *                 example: ["sale", "thietKe"]
 *               email:
 *                 type: string
 *                 example: "nguyenvana@example.com"
 *               phone:
 *                 type: string
 *                 example: "0123456789"
 *     responses:
 *       201:
 *         description: User được tạo thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post('/', createUserController);

/**
 * @swagger
 * /api/user:
 *   get:
 *     summary: Lấy danh sách tất cả users
 *     tags: [User]
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [sale, in, catKhung, sanXuat, dongGoi, keToanDieuDon, keToanTaiChinh, thietKe, marketing]
 *         description: Lọc theo role
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Lọc theo trạng thái hoạt động
 *     responses:
 *       200:
 *         description: Danh sách users
 */
router.get('/', getUsersController);

/**
 * @swagger
 * /api/user/{id}:
 *   get:
 *     summary: Lấy thông tin user theo ID
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thông tin user
 *       404:
 *         description: Không tìm thấy user
 */
router.get('/:id', getUserByIdController);

/**
 * @swagger
 * /api/user/{id}:
 *   put:
 *     summary: Cập nhật thông tin user
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               roles:
 *                 type: array
 *                 items:
 *                   type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       404:
 *         description: Không tìm thấy user
 */
router.put('/:id', updateUserController);

/**
 * @swagger
 * /api/user/{id}:
 *   delete:
 *     summary: Xóa user (soft delete)
 *     tags: [User]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy user
 */
router.delete('/:id', deleteUserController);

export default router;
