import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  uploadPaintingController,
  uploadDepositController,
  uploadFileController,
  serveUploadedFileController,
  deleteUploadedFileController,
  uploadPaymentBillController
} from '../controllers/upload.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/upload/painting:
 *   post:
 *     summary: Upload ảnh tranh (single)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: File ảnh (jpeg, jpg, png, gif, webp), tối đa 10MB
 *     responses:
 *       200:
 *         description: Upload thành công
 *       400:
 *         description: Không có file hoặc file không hợp lệ
 */
router.post('/painting', authenticate, uploadPaintingController);

/**
 * @swagger
 * /api/upload/deposit:
 *   post:
 *     summary: Upload file cọc (ảnh/tài liệu, multiple, tối đa 10 file)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - images
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: File (ảnh, PDF, Word, Excel, AI, PSD, CDR, EPS, SVG, ZIP, RAR), tối đa 20MB mỗi file
 *     responses:
 *       200:
 *         description: Upload thành công
 *       400:
 *         description: Không có file hoặc file không hợp lệ
 */
router.post('/deposit', authenticate, uploadDepositController);

router.post('/payment-bill', authenticate, uploadPaymentBillController);

/**
 * @swagger
 * /api/upload/file:
 *   post:
 *     summary: Upload file đính kèm (PDF, AI, PSD, CDR, EPS, SVG, ZIP, RAR)
 *     tags: [Upload]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: File đính kèm, tối đa 50MB
 *     responses:
 *       200:
 *         description: Upload thành công
 *       400:
 *         description: Không có file hoặc file không hợp lệ
 */
router.post('/file', authenticate, uploadFileController);

/**
 * @route GET /api/upload/:type/:filename
 * @desc Serve static files (paintings, deposits, files)
 */
router.get('/:type/:filename', serveUploadedFileController);

/**
 * @route DELETE /api/upload/:type/:filename
 * @desc Xóa file đã upload (paintings, deposits, files)
 */
router.delete('/:type/:filename', authenticate, deleteUploadedFileController);

export default router;
