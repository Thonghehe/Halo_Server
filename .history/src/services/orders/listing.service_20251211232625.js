import mongoose from 'mongoose';
import Order from '../../models/Order.js';
import OrderDraft from '../../models/OrderDraft.js';
import Painting from '../../models/Painting.js';
import User from '../../models/User.js';
import { requiresFrameCutting } from '../../helpers/order.helper.js';
import { buildServiceResponse } from './utils.js';

export const getOrders = async (query = {}) => {
  try {
    const {
      status,
      orderType,
      page = 1,
      limit = 20,
      search,
      printingStatus,
      frameCuttingStatus,
      startDate,
      endDate,
      createdBy,
      sortOrder
    } = query;

    const filter = {};
    if (status === 'chua_hoan_thanh') {
      filter.status = { $nin: ['hoan_thanh', 'huy'] };
    } else if (status) {
      filter.status = status;
    }
    if (orderType) filter.orderType = orderType;
    if (printingStatus) {
      if (printingStatus.includes(',')) {
        const statuses = printingStatus.split(',').map((s) => s.trim()).filter(Boolean);
        filter.printingStatus = { $in: statuses };
      } else {
        filter.printingStatus = printingStatus;
      }
    }
    if (frameCuttingStatus) {
      if (frameCuttingStatus.includes(',')) {
        const statuses = frameCuttingStatus.split(',').map((s) => s.trim()).filter(Boolean);
        filter.frameCuttingStatus = { $in: statuses };
      } else {
        filter.frameCuttingStatus = frameCuttingStatus;
      }
    }
    if (createdBy) {
      // Cast string to ObjectId để $match khớp chính xác trong aggregation
      const castedId = mongoose.Types.ObjectId.isValid(createdBy)
        ? new mongoose.Types.ObjectId(createdBy)
        : createdBy;
      filter.createdBy = castedId;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    if (search) {
      const regex = { $regex: search, $options: 'i' };
      let paintingOrderIds = [];
      try {
        const paintingsByNote = await Painting.find({ note: regex }).distinct('orderId');
        paintingOrderIds.push(...paintingsByNote);
        const paintingsByFrameType = await Painting.find({ frameType: regex }).distinct('orderId');
        paintingOrderIds.push(...paintingsByFrameType);
        const sizePattern = search.match(/(\d+)\s*[xX*×]\s*(\d+)/);
        if (sizePattern) {
          const width = parseInt(sizePattern[1], 10);
          const height = parseInt(sizePattern[2], 10);
          const paintingsBySize = await Painting.find({
            $or: [
              { width: width, height: height },
              { width: height, height: width }
            ]
          }).distinct('orderId');
          paintingOrderIds.push(...paintingsBySize);
        } else {
          const numberMatch = search.match(/\d+/);
          if (numberMatch) {
            const number = parseInt(numberMatch[0], 10);
            const paintingsByNumber = await Painting.find({
              $or: [
                { width: number },
                { height: number }
              ]
            }).distinct('orderId');
            paintingOrderIds.push(...paintingsByNumber);
          }
        }
      } catch (error) {
        // ignore
      }

      paintingOrderIds = [...new Set(paintingOrderIds.map((id) => id.toString()))];

      filter.$or = [
        { orderCode: regex },
        { customerPhone: regex },
        { customerAddress: regex },
        { note: regex },
        { shippingTrackingCode: regex },
        { shippingExternalInfo: regex },
        { _id: { $in: paintingOrderIds } }
      ];
    }

    const limitNumber = parseInt(limit, 10);
    const pageNumber = parseInt(page, 10);

    // Aggregation: match -> add priority fields -> sort -> paginate -> lookup createdBy -> pending drafts
    const pipeline = [
      { $match: filter },
      {
        $addFields: {
          hasFrameCutting: {
            $cond: [
              { $and: [{ $ifNull: ['$frameCuttingStatus', false] }, { $ne: ['$frameCuttingStatus', 'khong_cat_khung'] }] },
              true,
              false
            ]
          },
          isPrinted: { $eq: ['$printingStatus', 'da_in'] },
          hasNote: { $gt: [{ $strLenCP: { $ifNull: ['$note', ''] } }, 0] },
          isCancelled: { $eq: ['$status', 'huy'] },
          isReturned: { $eq: ['$status', 'khach_tra_hang'] },
          isNewGap: { $and: [{ $eq: ['$status', 'moi_tao'] }, { $eq: ['$orderType', 'gap'] }] },
          isNew: { $eq: ['$status', 'moi_tao'] }
        }
      },
      {
        $addFields: {
          isCut: {
            $cond: [
              '$hasFrameCutting',
              { $eq: [{ $ifNull: ['$frameCuttingStatus', 'chua_cat'] }, 'da_cat_khung'] },
              true
            ]
          },
          orderTypePriority: {
            $switch: {
              branches: [
                { case: { $eq: ['$orderType', 'gap'] }, then: 0 },
                { case: { $eq: ['$orderType', 'tiktok'] }, then: 1 },
                { case: { $eq: ['$orderType', 'shopee'] }, then: 2 }
              ],
              default: 3
            }
          },
          statusPriority: {
            $switch: {
              branches: [
                { case: { $eq: ['$status', 'moi_tao'] }, then: 0 },
                { case: { $eq: ['$status', 'dang_xu_ly'] }, then: 1 },
                { case: { $eq: ['$status', 'cho_san_xuat'] }, then: 2 },
                { case: { $eq: ['$status', 'da_vao_khung'] }, then: 3 },
                { case: { $eq: ['$status', 'cho_dong_goi'] }, then: 4 },
                { case: { $eq: ['$status', 'da_dong_goi'] }, then: 5 },
                { case: { $eq: ['$status', 'cho_dieu_don'] }, then: 6 },
                { case: { $eq: ['$status', 'da_gui_di'] }, then: 7 },
                { case: { $eq: ['$status', 'hoan_thanh'] }, then: 8 },
                { case: { $eq: ['$status', 'khach_tra_hang'] }, then: 9 },
                { case: { $eq: ['$status', 'khach_yeu_cau_sua'] }, then: 10 },
                { case: { $eq: ['$status', 'da_nhan_lai_don'] }, then: 11 },
                { case: { $eq: ['$status', 'dong_goi_da_nhan_lai'] }, then: 12 },
                { case: { $eq: ['$status', 'gui_lai_san_xuat'] }, then: 13 },
                { case: { $eq: ['$status', 'cho_san_xuat_lai'] }, then: 14 },
                { case: { $eq: ['$status', 'huy'] }, then: 15 }
              ],
              default: 99
            }
          }
        }
      },
      {
        $addFields: {
          isCompleted: {
            $and: [
              '$isPrinted',
              {
                $or: [
                  { $eq: ['$hasFrameCutting', false] },
                  { $eq: ['$isCut', true] }
                ]
              }
            ]
          }
        }
      },
      (() => {
        // Nếu sortOrder được truyền (asc/desc), ưu tiên sắp xếp toàn bộ theo createdAt để đảm bảo phân trang đúng
        if (sortOrder === 'asc' || sortOrder === 'desc') {
          return {
            $sort: {
              createdAt: sortOrder === 'asc' ? 1 : -1,
              _id: -1
            }
          };
        }
        // Mặc định: giữ logic ưu tiên cũ
        return {
          $sort: {
            isCancelled: 1,
            isReturned: 1,
            isNewGap: -1,
            isNew: -1,
            isCompleted: -1,
            orderTypePriority: 1,
            createdAt: 1, // giữ giống comparator cũ (cũ trước)
            statusPriority: 1
          }
        };
      })(),
      {
        $facet: {
          data: [
            { $skip: (pageNumber - 1) * limitNumber },
            { $limit: limitNumber },
            {
              $lookup: {
                from: 'users',
                localField: 'createdBy',
                foreignField: '_id',
                as: 'createdBy',
                pipeline: [{ $project: { fullName: 1, email: 1, roles: 1 } }]
              }
            },
            { $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true } }
          ],
          total: [{ $count: 'count' }]
        }
      }
    ];

    const result = await Order.aggregate(pipeline).allowDiskUse(true);
    const data = (result[0]?.data) || [];
    const total = result[0]?.total?.[0]?.count || 0;

    // Gắn hasPendingMoneyDraft
    if (data.length > 0) {
      const orderIds = data.map((o) => (o._id || o.id || '').toString()).filter(Boolean);
      if (orderIds.length > 0) {
        const pendingDrafts = await OrderDraft.find({
          order: { $in: orderIds },
          status: 'pending'
        })
          .select('order')
          .lean();
        const pendingSet = new Set(
          pendingDrafts.map((draft) => (draft.order ? draft.order.toString() : ''))
        );
        for (const orderDoc of data) {
          const id = (orderDoc._id || orderDoc.id || '').toString();
          orderDoc.hasPendingMoneyDraft = id ? pendingSet.has(id) : false;
        }
      }
    }

    return buildServiceResponse(200, {
      success: true,
      data,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        pages: Math.max(1, Math.ceil(total / limitNumber))
      }
    });
  } catch (error) {
    console.error('[orders.service][getOrders] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const getMentionableUsers = async () => {
  try {
    const users = await User.find({ active: true })
      .select('fullName email roles avatar')
      .sort({ fullName: 1 })
      .lean();

    return buildServiceResponse(200, {
      success: true,
      data: users
    });
  } catch (error) {
    console.error('[orders.service][getMentionableUsers] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const getSalesUsers = async () => {
  try {
    const salesUsers = await User.find({
      active: true,
      roles: { $in: ['sale', 'admin'] }
    })
      .select('_id fullName email roles')
      .sort({ fullName: 1 })
      .lean();

    return buildServiceResponse(200, {
      success: true,
      data: salesUsers
    });
  } catch (error) {
    console.error('[orders.service][getSalesUsers] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const getOrderDetail = async (orderId, currentUser) => {
  try {
    const order = await Order.findById(orderId)
      .populate({
        path: 'paintings',
        populate: {
          path: 'noteMentions.user',
          select: 'fullName email roles'
        }
      })
      .populate({
        path: 'paintings',
        populate: {
          path: 'noteMentions.taggedBy',
          select: 'fullName email'
        }
      })
      .populate('createdBy', 'fullName email roles')
      .populate('assignedTo.userId', 'fullName email roles')
      .populate('statusHistory.changedBy', 'fullName email')
      .populate('noteMentions.user', 'fullName email roles')
      .populate('noteMentions.taggedBy', 'fullName email')
      .populate('profitSharing.user', 'fullName email roles')
      .lean();

    if (!order) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    let draft = null;
    const userRoles = Array.isArray(currentUser?.roles) ? currentUser.roles : [];
    if (userRoles.includes('admin')) {
      draft = await OrderDraft.findOne({ order: orderId, status: 'pending' })
        .populate('createdBy', 'fullName email roles')
        .lean();
    }

    const hasTranhKhungDetail =
      order.paintings && order.paintings.some((p) => requiresFrameCutting(p));
    const responseOrder = {
      ...order,
      frameCuttingStatus: hasTranhKhungDetail ? order.frameCuttingStatus : 'khong_cat_khung',
      pendingMoneyDraft: draft
    };

    return buildServiceResponse(200, {
      success: true,
      data: responseOrder
    });
  } catch (error) {
    console.error('[orders.service][getOrderDetail] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};
