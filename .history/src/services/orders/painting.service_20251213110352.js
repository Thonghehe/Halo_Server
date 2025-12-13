import Order from '../../models/Order.js';
import Painting from '../../models/Painting.js';
import User from '../../models/User.js';
import { emitOrderEvent, insertNotificationsAndEmit } from '../../events/order.events.js';
import { buildServiceResponse } from './utils.js';

/**
 * Đánh dấu tranh đã in
 */
export const markPaintingPrinted = async (orderId, paintingId, currentUser) => {
  try {
    const order = await Order.findById(orderId).populate('paintings');
    if (!order) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    const painting = await Painting.findById(paintingId);
    if (!painting) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy tranh'
      });
    }

    // Kiểm tra tranh có thuộc đơn hàng không
    if (!painting.orderId.equals(order._id)) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Tranh không thuộc đơn hàng này'
      });
    }

    // Kiểm tra quyền (chỉ role 'in' hoặc 'admin')
    const userRoles = Array.isArray(currentUser.roles) ? currentUser.roles : [];
    const isAdmin = userRoles.includes('admin');
    const isIn = userRoles.includes('in');

    if (!isAdmin && !isIn) {
      return buildServiceResponse(403, {
        success: false,
        message: 'Bạn không có quyền đánh dấu tranh đã in'
      });
    }

    // Đánh dấu tranh đã in
    painting.isPrinted = true;
    painting.printedBy = currentUser._id;
    painting.printedAt = new Date();
    await painting.save();

    // Cập nhật trạng thái in của đơn hàng dựa trên số tranh đã in
    await order.populate('paintings');
    const totalPaintings = order.paintings.length;
    const printedPaintings = order.paintings.filter(p => p.isPrinted).length;

    // Nếu tất cả tranh đã in, cập nhật printingStatus của đơn
    if (printedPaintings === totalPaintings && order.printingStatus !== 'da_in') {
      const allowedStatuses = ['chua_in', 'cho_in', 'dang_in', 'cho_in_lai'];
      if (allowedStatuses.includes(order.printingStatus)) {
        order.printingStatus = 'da_in';
        const displayName = currentUser?.fullName || currentUser?.email || 'Người dùng';
        await order.addStatusHistory(order.status, currentUser._id, `${displayName} đã in xong tất cả tranh`);
      }
    } else if (printedPaintings > 0 && order.printingStatus === 'chua_in') {
      order.printingStatus = 'dang_in';
    }

    await order.save();

    // Emit event để cập nhật real-time
    emitOrderEvent({
      type: 'order_updated',
      orderId: order._id.toString(),
      data: order
    });

    return buildServiceResponse(200, {
      success: true,
      message: 'Đã đánh dấu tranh đã in',
      data: {
        painting,
        order: {
          printingStatus: order.printingStatus,
          printedCount: printedPaintings,
          totalCount: totalPaintings
        }
      }
    });
  } catch (error) {
    console.error('[Mark painting printed] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: error.message || 'Lỗi khi đánh dấu tranh đã in'
    });
  }
};

/**
 * Sản xuất nhận tranh
 */
export const receivePaintingByProduction = async (orderId, paintingId, currentUser) => {
  try {
    const order = await Order.findById(orderId).populate('paintings');
    if (!order) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    const painting = await Painting.findById(paintingId);
    if (!painting) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy tranh'
      });
    }

    // Kiểm tra tranh có thuộc đơn hàng không
    if (!painting.orderId.equals(order._id)) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Tranh không thuộc đơn hàng này'
      });
    }

    // Kiểm tra quyền (chỉ role 'sanXuat' hoặc 'admin')
    const userRoles = Array.isArray(currentUser.roles) ? currentUser.roles : [];
    const isAdmin = userRoles.includes('admin');
    const isSanXuat = userRoles.includes('sanXuat');

    if (!isAdmin && !isSanXuat) {
      return buildServiceResponse(403, {
        success: false,
        message: 'Bạn không có quyền nhận tranh (chỉ role sản xuất)'
      });
    }

    // Kiểm tra tranh đã được in chưa
    if (!painting.isPrinted) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Tranh chưa được in, không thể nhận'
      });
    }

    // Kiểm tra tranh đã được nhận chưa
    if (painting.receivedByProduction) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Tranh đã được nhận rồi'
      });
    }

    // Đánh dấu sản xuất đã nhận tranh
    painting.receivedByProduction = true;
    painting.receivedBy = currentUser._id;
    painting.receivedAt = new Date();
    await painting.save();

    // Kiểm tra xem tất cả tranh đã được nhận chưa
    await order.populate('paintings');
    const totalPaintings = order.paintings.length;
    const receivedPaintings = order.paintings.filter(p => p.receivedByProduction).length;
    const { requiresFrameAssembly } = await import('../../helpers/order.helper.js');
    const paintingsNeedFrame = order.paintings.filter(p => requiresFrameAssembly(p));
    const totalPaintingsNeedFrame = paintingsNeedFrame.length;
    const receivedPaintingsNeedFrame = paintingsNeedFrame.filter(p => p.receivedByProduction).length;

    // Cập nhật printingStatus dựa trên số tranh đã được nhận
    if (order.printingStatus === 'da_in') {
      // Nếu có tranh cần vào khung
      if (totalPaintingsNeedFrame > 0) {
        // Nếu tất cả tranh cần vào khung đã được nhận
        if (receivedPaintingsNeedFrame === totalPaintingsNeedFrame) {
          order.printingStatus = 'san_xuat_da_nhan_tranh';
        }
        // Nếu một số tranh đã được nhận nhưng chưa đủ
        else if (receivedPaintingsNeedFrame > 0) {
          // Giữ nguyên printingStatus = 'da_in', nhưng trạng thái sẽ hiển thị qua số tranh đã nhận
        }
      }
    }

    // Nếu tất cả tranh đã được nhận, cập nhật trạng thái đơn
    if (receivedPaintings === totalPaintings) {
      // Chỉ cập nhật nếu đơn đang ở trạng thái phù hợp
      if (order.printingStatus === 'da_in' || order.printingStatus === 'san_xuat_da_nhan_tranh') {
        const hasTranhKhung = order.paintings.some(p => requiresFrameAssembly(p));
        const hasTranhTron = order.paintings.some(p => p?.type === 'tranh_tron');

        if (!hasTranhKhung && order.canTransitionTo('cho_dong_goi')) {
          order.status = 'cho_dong_goi';
          const displayName = currentUser?.fullName || currentUser?.email || 'Người dùng';
          await order.addStatusHistory('cho_dong_goi', currentUser._id, `${displayName} đã nhận đủ tranh, chờ đóng gói`);
        } else if (hasTranhKhung || hasTranhTron) {
          if (order.canTransitionTo('cho_san_xuat')) {
            order.status = 'cho_san_xuat';
            order.printingStatus = 'san_xuat_da_nhan_tranh';
            const displayName = currentUser?.fullName || currentUser?.email || 'Người dùng';
            await order.addStatusHistory('cho_san_xuat', currentUser._id, `${displayName} đã nhận đủ tranh, chờ sản xuất vào khung`);
          }
        }
      }
    }

    await order.save();

    // Emit event để cập nhật real-time
    emitOrderEvent({
      type: 'order_updated',
      orderId: order._id.toString(),
      data: order
    });

    return buildServiceResponse(200, {
      success: true,
      message: 'Đã nhận tranh',
      data: {
        painting,
        order: {
          status: order.status,
          printingStatus: order.printingStatus,
          receivedCount: receivedPaintings,
          totalCount: totalPaintings
        }
      }
    });
  } catch (error) {
    console.error('[Receive painting by production] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: error.message || 'Lỗi khi nhận tranh'
    });
  }
};

/**
 * Đóng gói nhận tranh (chỉ cho tranh dán và chỉ in)
 */
export const receivePaintingByPacking = async (orderId, paintingId, currentUser) => {
  try {
    const order = await Order.findById(orderId).populate('paintings');
    if (!order) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    const painting = await Painting.findById(paintingId);
    if (!painting) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy tranh'
      });
    }

    // Kiểm tra tranh có thuộc đơn hàng không
    if (!painting.orderId.equals(order._id)) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Tranh không thuộc đơn hàng này'
      });
    }

    // Kiểm tra quyền (chỉ role 'dongGoi' hoặc 'admin')
    const userRoles = Array.isArray(currentUser.roles) ? currentUser.roles : [];
    const isAdmin = userRoles.includes('admin');
    const isDongGoi = userRoles.includes('dongGoi');

    if (!isAdmin && !isDongGoi) {
      return buildServiceResponse(403, {
        success: false,
        message: 'Bạn không có quyền nhận tranh (chỉ role đóng gói)'
      });
    }

    // Kiểm tra tranh đã được in chưa
    if (!painting.isPrinted) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Tranh chưa được in, không thể nhận'
      });
    }

    // Kiểm tra loại tranh - chỉ cho phép tranh dán và chỉ in
    const { requiresFrameAssembly } = await import('../../helpers/order.helper.js');
    if (requiresFrameAssembly(painting)) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Chỉ có thể nhận tranh dán và tranh chỉ in. Tranh này cần vào khung, vui lòng để sản xuất nhận.'
      });
    }

    // Kiểm tra tranh đã được nhận chưa
    if (painting.receivedByPacking) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Tranh đã được nhận rồi'
      });
    }

    // Đánh dấu đóng gói đã nhận tranh
    painting.receivedByPacking = true;
    painting.receivedByPackingBy = currentUser._id;
    painting.receivedByPackingAt = new Date();
    await painting.save();

    // Kiểm tra xem tất cả tranh dán/chỉ in đã được nhận chưa
    await order.populate('paintings');
    const tranhDanVaChiIn = order.paintings.filter(p => !requiresFrameAssembly(p));
    const totalTranhDanVaChiIn = tranhDanVaChiIn.length;
    const receivedTranhDanVaChiIn = tranhDanVaChiIn.filter(p => p.receivedByPacking).length;

    // Nếu tất cả tranh dán/chỉ in đã được nhận, cập nhật trạng thái đơn
    if (totalTranhDanVaChiIn > 0 && receivedTranhDanVaChiIn === totalTranhDanVaChiIn) {
      // Kiểm tra xem có tranh cần vào khung không
      const hasTranhKhung = order.paintings.some(p => requiresFrameAssembly(p));
      
      // Nếu không có tranh khung, chuyển sang chờ đóng gói
      if (!hasTranhKhung && order.printingStatus === 'da_in' && order.status === 'dang_xu_ly') {
        if (order.canTransitionTo('cho_dong_goi')) {
          order.status = 'cho_dong_goi';
          const displayName = currentUser?.fullName || currentUser?.email || 'Người dùng';
          await order.addStatusHistory('cho_dong_goi', currentUser._id, `${displayName} đã nhận đủ tranh, chờ đóng gói`);
        }
      }
    }

    await order.save();

    // Emit event để cập nhật real-time
    emitOrderEvent({
      type: 'order_updated',
      orderId: order._id.toString(),
      data: order
    });

    return buildServiceResponse(200, {
      success: true,
      message: 'Đã nhận tranh',
      data: {
        painting,
        order: {
          status: order.status,
          printingStatus: order.printingStatus,
          receivedCount: receivedTranhDanVaChiIn,
          totalCount: totalTranhDanVaChiIn
        }
      }
    });
  } catch (error) {
    console.error('[Receive painting by packing] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: error.message || 'Lỗi khi nhận tranh'
    });
  }
};

