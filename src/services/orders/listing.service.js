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
      createdBy
    } = query;

    const filter = {};
    if (status) filter.status = status;
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
    if (createdBy) filter.createdBy = createdBy;

    if (startDate || endDate) {
      filter.actualCompletionDate = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        filter.actualCompletionDate.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.actualCompletionDate.$lte = end;
      }
      filter.actualCompletionDate.$exists = true;
    }

    if (search) {
      const regex = { $regex: search, $options: 'i' };
      let paintingOrderIds = [];
      
      try {
        // Tìm theo ghi chú tranh
        const paintingsByNote = await Painting.find({ note: regex }).distinct('orderId');
        paintingOrderIds.push(...paintingsByNote);
        
        // Tìm theo loại khung
        const paintingsByFrameType = await Painting.find({ frameType: regex }).distinct('orderId');
        paintingOrderIds.push(...paintingsByFrameType);
        
        // Tìm theo kích thước (hỗ trợ nhiều format: "50x60", "50 60", "50x60cm", "50*60", v.v.)
        const sizePattern = search.match(/(\d+)\s*[xX*×]\s*(\d+)/);
        if (sizePattern) {
          const width = parseInt(sizePattern[1], 10);
          const height = parseInt(sizePattern[2], 10);
          const paintingsBySize = await Painting.find({
            $or: [
              { width: width, height: height },
              { width: height, height: width } // Hỗ trợ tìm cả chiều ngược lại
            ]
          }).distinct('orderId');
          paintingOrderIds.push(...paintingsBySize);
        } else {
          // Nếu không match pattern, thử tìm số đơn lẻ (có thể là width hoặc height)
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

      // Loại bỏ duplicate orderIds
      paintingOrderIds = [...new Set(paintingOrderIds.map(id => id.toString()))];

      filter.$or = [
        { orderCode: regex },
        { customerPhone: regex },
        { customerAddress: regex },
        { note: regex },
        { _id: { $in: paintingOrderIds } }
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const orders = await Order.find(filter)
      .populate('paintings')
      .populate('createdBy', 'fullName email')
      .populate('assignedTo.userId', 'fullName email roles')
      .populate('noteMentions.user', 'fullName email roles')
      .populate('noteMentions.taggedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10))
      .lean();

    let mappedOrders = orders.map((o) => {
      const hasCutting = o.paintings && o.paintings.some((p) => requiresFrameCutting(p));
      return hasCutting ? o : { ...o, frameCuttingStatus: 'khong_cat_khung' };
    });

    if (mappedOrders.length > 0) {
      const orderIdMap = new Map();
      mappedOrders.forEach((orderDoc) => {
        const id = (orderDoc._id || orderDoc.id || '').toString();
        if (id) {
          orderIdMap.set(id, orderDoc);
        }
      });
      const orderIds = Array.from(orderIdMap.keys());
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
        mappedOrders = mappedOrders.map((orderDoc) => {
          const id = (orderDoc._id || orderDoc.id || '').toString();
          return {
            ...orderDoc,
            hasPendingMoneyDraft: id ? pendingSet.has(id) : false
          };
        });
      }
    }

    const orderTypePriority = {
      gap: 0,
      tiktok: 1,
      shopee: 2,
      thuong: 3
    };

    const statusPriority = {
      moi_tao: 0,
      dang_xu_ly: 1,
      cho_san_xuat: 2,
      da_vao_khung: 3,
      cho_dong_goi: 4,
      da_dong_goi: 5,
      cho_dieu_don: 6,
      da_gui_di: 7,
      hoan_thanh: 8,
      khach_tra_hang: 9,
      khach_yeu_cau_sua: 10,
      da_nhan_lai_don: 11,
      dong_goi_da_nhan_lai: 12,
      gui_lai_san_xuat: 13,
      cho_san_xuat_lai: 14,
      huy: 15
    };

    mappedOrders.sort((a, b) => {
      const aIsCancelled = a.status === 'huy';
      const bIsCancelled = b.status === 'huy';
      if (aIsCancelled && !bIsCancelled) return 1;
      if (!aIsCancelled && bIsCancelled) return -1;

      const aIsReturned = a.status === 'khach_tra_hang';
      const bIsReturned = b.status === 'khach_tra_hang';
      if (aIsReturned && !bIsReturned && !bIsCancelled) return 1;
      if (!aIsReturned && !aIsCancelled && bIsReturned) return -1;

      const aIsNewGap = a.status === 'moi_tao' && a.orderType === 'gap';
      const bIsNewGap = b.status === 'moi_tao' && b.orderType === 'gap';
      if (aIsNewGap && !bIsNewGap) return -1;
      if (!aIsNewGap && bIsNewGap) return 1;

      const aIsNew = a.status === 'moi_tao';
      const bIsNew = b.status === 'moi_tao';
      if (aIsNew && !bIsNew && !bIsNewGap) return -1;
      if (!aIsNew && !bIsNewGap && bIsNew) return 1;

      const aHasTranhKhung = a.paintings && a.paintings.some((p) => requiresFrameCutting(p));
      const bHasTranhKhung = b.paintings && b.paintings.some((p) => requiresFrameCutting(p));

      const aPrintingStatus = a.printingStatus || 'chua_in';
      const bPrintingStatus = b.printingStatus || 'chua_in';
      const aIsPrinted = aPrintingStatus === 'da_in';
      const bIsPrinted = bPrintingStatus === 'da_in';

      const aFrameStatus = aHasTranhKhung ? (a.frameCuttingStatus || 'chua_cat') : 'khong_cat_khung';
      const bFrameStatus = bHasTranhKhung ? (b.frameCuttingStatus || 'chua_cat') : 'khong_cat_khung';
      const aIsCut = aHasTranhKhung ? aFrameStatus === 'da_cat_khung' : true;
      const bIsCut = bHasTranhKhung ? bFrameStatus === 'da_cat_khung' : true;

      const aIsCompleted = aIsPrinted && (!aHasTranhKhung || aIsCut);
      const bIsCompleted = bIsPrinted && (!bHasTranhKhung || bIsCut);
      if (!aIsCompleted && bIsCompleted) return -1;
      if (aIsCompleted && !bIsCompleted) return 1;

      const aType = orderTypePriority[a.orderType] ?? 99;
      const bType = orderTypePriority[b.orderType] ?? 99;
      if (aType !== bType) return aType - bType;

      const aCreated = new Date(a.createdAt).getTime();
      const bCreated = new Date(b.createdAt).getTime();
      if (aCreated !== bCreated) return aCreated - bCreated;

      const aStatus = statusPriority[a.status] ?? 99;
      const bStatus = statusPriority[b.status] ?? 99;
      return aStatus - bStatus;
    });

    const total = await Order.countDocuments(filter);

    return buildServiceResponse(200, {
      success: true,
      data: mappedOrders,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        pages: Math.ceil(total / parseInt(limit, 10))
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
