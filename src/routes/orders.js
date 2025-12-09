import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  streamOrders,
  getOrders as getOrdersController,
  getMentionableUsers as getMentionableUsersController,
  getSalesUsers as getSalesUsersController,
  getOrderDetail as getOrderDetailController,
  createOrder as createOrderController,
  updateOrder as updateOrderController,
  updateOrderStatus as updateOrderStatusController,
  getOrderDraft as getOrderDraftController,
  approveOrderDraft as approveOrderDraftController,
  rejectOrderDraft as rejectOrderDraftController,
  acceptOrder as acceptOrderController,
  completeOrder as completeOrderController,
  receiveOrder as receiveOrderController,
  requestRework as requestReworkController,
  productionRequest as productionRequestController,
  deleteOrder as deleteOrderController,
  deleteOldOrders as deleteOldOrdersController
} from '../controllers/orders.controller.js';

const router = express.Router();

/**
 * @swagger
 * /api/orders/stream:
 *   get:
 *     summary: SSE stream cho real-time order updates
 *     tags: [Orders]
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
router.get('/stream', authenticate, streamOrders);






/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Lấy danh sách đơn hàng
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [moi_tao, dang_xu_ly, cho_san_xuat, da_vao_khung, cho_dong_goi, da_dong_goi, cho_dieu_don, da_gui_di, hoan_thanh, khach_tra_hang, khach_yeu_cau_sua, da_nhan_lai_don, dong_goi_da_nhan_lai, gui_lai_san_xuat, cho_san_xuat_lai, huy]
 *         description: Lọc theo trạng thái đơn hàng
 *       - in: query
 *         name: orderType
 *         schema:
 *           type: string
 *           enum: [thuong, gap, tiktok, shopee]
 *         description: Lọc theo loại đơn hàng
 *       - in: query
 *         name: printingStatus
 *         schema:
 *           type: string
 *           enum: [chua_in, dang_in, da_in]
 *         description: Lọc theo trạng thái in
 *       - in: query
 *         name: frameCuttingStatus
 *         schema:
 *           type: string
 *           enum: [chua_cat, dang_cat, da_cat_khung, khong_cat_khung]
 *         description: Lọc theo trạng thái cắt khung
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm kiếm theo mã đơn, số điện thoại, địa chỉ, ghi chú
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày bắt đầu (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Ngày kết thúc (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Số lượng đơn hàng mỗi trang
 *     responses:
 *       200:
 *         description: Danh sách đơn hàng
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
 *                     $ref: '#/components/schemas/Order'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get('/', authenticate, getOrdersController);

/**
 * @swagger
 * /api/orders/mentionable-users:
 *   get:
 *     summary: Lấy danh sách người dùng có thể được nhắc trong ghi chú
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách người dùng
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
 *                     $ref: '#/components/schemas/User'
 */
router.get('/mentionable-users', authenticate, getMentionableUsersController);

/**
 * @swagger
 * /api/orders/sales:
 *   get:
 *     summary: Lấy danh sách người dùng role sale/admin để lọc đơn
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách sale/admin đang hoạt động
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
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       fullName:
 *                         type: string
 *                       email:
 *                         type: string
 */
router.get('/sales', authenticate, getSalesUsersController);

/**
 * @swagger
 * /api/orders/{orderId}:
 *   get:
 *     summary: Lấy chi tiết đơn hàng
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID của đơn hàng
 *     responses:
 *       200:
 *         description: Chi tiết đơn hàng
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *       404:
 *         description: Không tìm thấy đơn hàng
 */
router.get('/:orderId', authenticate, getOrderDetailController);

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Tạo đơn hàng mới
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerName
 *               - customerPhone
 *               - customerAddress
 *               - paintings
 *             properties:
 *               orderCodeCustom:
 *                 type: string
 *                 description: Mã đơn hàng tùy chỉnh (tùy chọn)
 *               customerName:
 *                 type: string
 *                 example: "Nguyễn Văn A"
 *               customerPhone:
 *                 type: string
 *                 example: "0123456789"
 *               customerAddress:
 *                 type: string
 *                 example: "123 Đường ABC, Quận 1, TP.HCM"
 *               orderType:
 *                 type: string
 *                 enum: [thuong, gap, tiktok, shopee]
 *                 default: thuong
 *               note:
 *                 type: string
 *                 description: Ghi chú đơn hàng
 *               noteMentions:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Danh sách user IDs được nhắc trong ghi chú
 *               depositAmount:
 *                 type: number
 *                 example: 500000
 *               totalAmount:
 *                 type: number
 *                 example: 2000000
 *               depositImages:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: URLs của ảnh cọc
 *               shippingMethod:
 *                 type: string
 *                 enum: [viettel, ship_ngoai, khach_den_nhan, di_treo_cho_khach]
 *                 description: "Hình thức gửi đơn (mặc định: viettel)"
 *               shippingTrackingCode:
 *                 type: string
 *                 description: Mã vận đơn (tùy chọn)
 *               paintings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - type
 *                     - quantity
 *                     - dimensions
 *                   properties:
 *                     type:
 *                       type: string
 *                       enum: [tranh_khung, tranh_tron, tranh_dan, chi_in]
 *                     quantity:
 *                       type: number
 *                     dimensions:
 *                       type: string
 *                     frameType:
 *                       type: string
 *                     image:
 *                       type: string
 *                     images:
 *                       type: array
 *                       items:
 *                         type: string
 *                     files:
 *                       type: array
 *                       items:
 *                         type: string
 *                     note:
 *                       type: string
 *                     noteMentions:
 *                       type: array
 *                       items:
 *                         type: string
 *     responses:
 *       201:
 *         description: Tạo đơn hàng thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 */
router.post('/', authenticate, authorize('admin', 'sale'), createOrderController);

/**
 * @swagger
 * /api/orders/{orderId}:
 *   patch:
 *     summary: Cập nhật đơn hàng
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
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
 *               orderCodeCustom:
 *                 type: string
 *               customerName:
 *                 type: string
 *               customerPhone:
 *                 type: string
 *               customerAddress:
 *                 type: string
 *               orderType:
 *                 type: string
 *                 enum: [thuong, gap, tiktok, shopee]
 *               note:
 *                 type: string
 *               depositAmount:
 *                 type: number
 *               totalAmount:
 *                 type: number
 *               depositImages:
 *                 type: array
 *                 items:
 *                   type: string
 *               paintings:
 *                 type: array
 *                 items:
 *                   type: object
 *               shippingMethod:
 *                 type: string
 *                 enum: [viettel, ship_ngoai, khach_den_nhan, di_treo_cho_khach]
 *                 description: Hình thức gửi đơn
 *               shippingTrackingCode:
 *                 type: string
 *                 description: Mã vận đơn (tùy chọn)
 *     responses:
 *       200:
 *         description: Cập nhật đơn hàng thành công
 *       404:
 *         description: Không tìm thấy đơn hàng
 */
router.patch('/:orderId', authenticate, authorize('admin', 'sale'), updateOrderController);


/**
 * @swagger
 * /api/orders/{orderId}/status:
 *   patch:
 *     summary: Cập nhật trạng thái đơn hàng
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [moi_tao, dang_xu_ly, cho_san_xuat, da_vao_khung, cho_dong_goi, da_dong_goi, cho_dieu_don, da_gui_di, hoan_thanh, khach_tra_hang, khach_yeu_cau_sua, da_nhan_lai_don, dong_goi_da_nhan_lai, gui_lai_san_xuat, cho_san_xuat_lai, gui_lai_cho_khach, huy]
 *               note:
 *                 type: string
 *                 description: Ghi chú khi thay đổi trạng thái
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
 *       400:
 *         description: Không thể chuyển sang trạng thái này
 *       404:
 *         description: Không tìm thấy đơn hàng
 */
router.patch('/:orderId/status', authenticate, updateOrderStatusController);

router.get('/:orderId/draft', authenticate, authorize('admin', 'sale'), getOrderDraftController);

router.patch(
  '/:orderId/draft/approve',
  authenticate,
  authorize('admin'),
  approveOrderDraftController
);

router.patch(
  '/:orderId/draft/reject',
  authenticate,
  authorize('admin'),
  rejectOrderDraftController
);

/**
 * @swagger
 * /api/orders/{orderId}/accept:
 *   patch:
 *     summary: Nhận đơn hàng để xử lý (in, cắt khung, đóng gói, điều đơn)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [in, catKhung, dongGoi, keToanDieuDon]
 *                 description: Role của người nhận đơn
 *     responses:
 *       200:
 *         description: Nhận đơn hàng thành công
 *       400:
 *         description: Không thể nhận đơn hàng trong trạng thái hiện tại
 *       403:
 *         description: Không có quyền nhận đơn hàng
 *       404:
 *         description: Không tìm thấy đơn hàng
 */
router.patch('/:orderId/accept', authenticate, acceptOrderController);

/**
 * @swagger
 * /api/orders/{orderId}/complete:
 *   patch:
 *     summary: Đánh dấu hoàn thành công việc (in, cắt khung, đóng gói, gửi đi, hoàn thành)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [in, catKhung, dongGoi, keToanDieuDon, keToanTaiChinh]
 *               shippingMethod:
 *                 type: string
 *                 description: Hình thức gửi đi (bắt buộc khi role = keToanDieuDon)
 *               shippingTrackingCode:
 *                 type: string
 *                 description: Mã vận đơn (tùy chọn, khi role = keToanDieuDon)
 *     responses:
 *       200:
 *         description: Đánh dấu hoàn thành thành công
 *       400:
 *         description: Không thể đánh dấu hoàn thành trong trạng thái hiện tại
 *       403:
 *         description: Không có quyền đánh dấu hoàn thành
 *       404:
 *         description: Không tìm thấy đơn hàng
 */
router.patch('/:orderId/complete', authenticate, completeOrderController);

/**
 * @swagger
 * /api/orders/{orderId}/receive:
 *   patch:
 *     summary: Sản xuất nhận tranh hoặc khung
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [tranh, khung]
 *     responses:
 *       200:
 *         description: Nhận tranh/khung thành công
 *       400:
 *         description: Không thể nhận trong trạng thái hiện tại
 *       403:
 *         description: Không có quyền nhận (chỉ role sanXuat)
 *       404:
 *         description: Không tìm thấy đơn hàng
 */
router.patch('/:orderId/receive', authenticate, receiveOrderController);

/**
 * @swagger
 * /api/orders/{orderId}/rework:
 *   patch:
 *     summary: Yêu cầu sản xuất lại (in lại hoặc cắt lại khung)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [yeu_cau_in_lai, yeu_cau_cat_lai]
 *                 description: Loại yêu cầu sản xuất lại
 *               reason:
 *                 type: string
 *                 description: Lý do yêu cầu sản xuất lại
 *     responses:
 *       200:
 *         description: Yêu cầu sản xuất lại thành công
 *       400:
 *         description: Không thể yêu cầu sản xuất lại trong trạng thái hiện tại
 *       403:
 *         description: Không có quyền yêu cầu (chỉ admin và sale)
 *       404:
 *         description: Không tìm thấy đơn hàng
 */
router.patch('/:orderId/rework', authenticate, requestReworkController);

/**
 * @swagger
 * /api/orders/{orderId}/production-request:
 *   patch:
 *     summary: Sản xuất yêu cầu in lại hoặc cắt lại khung
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - reason
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [yeu_cau_in_lai, yeu_cau_cat_lai_khung]
 *                 description: Loại yêu cầu
 *               reason:
 *                 type: string
 *                 description: Lý do yêu cầu
 *     responses:
 *       200:
 *         description: Yêu cầu thành công
 *       400:
 *         description: Không thể yêu cầu trong trạng thái hiện tại
 *       403:
 *         description: Không có quyền (chỉ role sản xuất)
 *       404:
 *         description: Không tìm thấy đơn hàng
 */
router.patch('/:orderId/production-request', authenticate, productionRequestController);

/**
 * @swagger
 * /api/orders/{orderId}:
 *   delete:
 *     summary: Xóa đơn hàng
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - secretCode
 *             properties:
 *               secretCode:
 *                 type: string
 *                 description: Admin secret code
 *     responses:
 *       200:
 *         description: Xóa đơn hàng thành công
 *       403:
 *         description: Không có quyền xóa (chỉ admin và sale)
 *       404:
 *         description: Không tìm thấy đơn hàng
 */
router.delete(
  '/:orderId',
  authenticate,
  authorize('admin', 'sale'),
  deleteOrderController
);

/**
 * @swagger
 * /api/orders/delete-old:
 *   post:
 *     summary: Xóa đơn hàng cũ theo thời gian (chỉ admin)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - months
 *               - secretCode
 *             properties:
 *               months:
 *                 type: integer
 *                 description: "Số tháng (ví dụ: 24 = 2 năm, 12 = 1 năm, 6 = 6 tháng)"
 *                 minimum: 1
 *               secretCode:
 *                 type: string
 *                 description: Admin secret code
 *     responses:
 *       200:
 *         description: Xóa đơn hàng cũ thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Không có quyền (chỉ admin)
 */
router.post(
  '/delete-old',
  authenticate,
  authorize('admin'),
  deleteOldOrdersController
);

export default router;
