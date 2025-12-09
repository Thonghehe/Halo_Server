import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  streamNotificationsController,
  getNotificationsController,
  markNotificationReadController,
  markAllNotificationsReadController,
  getNotificationDetailController,
  deleteNotificationController
} from '../controllers/notifications.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/notifications/stream:
 *   get:
 *     summary: SSE stream cho real-time notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: SSE stream connection established
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 */
router.get('/stream', authenticate, streamNotificationsController);

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Lấy danh sách thông báo của user hiện tại
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: read
 *         schema:
 *           type: boolean
 *         description: Lọc theo trạng thái đọc (true/false)
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [order, system]
 *         description: Lọc theo loại thông báo
 *     responses:
 *       200:
 *         description: Danh sách thông báo
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                 pagination:
 *                   type: object
 *                 unreadCount:
 *                   type: integer
 */
router.get('/', authenticate, getNotificationsController);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Đánh dấu thông báo là đã đọc
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Đánh dấu đã đọc thành công
 *       404:
 *         description: Không tìm thấy thông báo
 */
router.patch('/:id/read', authenticate, markNotificationReadController);

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Đánh dấu tất cả thông báo là đã đọc
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Đánh dấu tất cả thành công
 */
router.patch('/read-all', authenticate, markAllNotificationsReadController);

/**
 * @swagger
 * /api/notifications/{id}:
 *   get:
 *     summary: Lấy chi tiết một thông báo
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Chi tiết thông báo
 *       404:
 *         description: Không tìm thấy thông báo
 */
router.get('/:id', authenticate, getNotificationDetailController);

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Xóa thông báo
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thông báo thành công
 *       404:
 *         description: Không tìm thấy thông báo
 */
router.delete('/:id', authenticate, deleteNotificationController);

export default router;

