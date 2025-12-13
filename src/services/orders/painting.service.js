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

    // Lấy printingStatus hiện tại, mặc định là 'chua_in' nếu null/undefined
    const currentPrintingStatus = order.printingStatus || 'chua_in';
    const currentStatus = order.status || 'moi_tao';

    // Nếu có ít nhất 1 tranh đã in, cập nhật status từ 'moi_tao' sang 'dang_xu_ly'
    if (printedPaintings > 0 && currentStatus === 'moi_tao') {
      if (order.canTransitionTo('dang_xu_ly')) {
        order.status = 'dang_xu_ly';
        const displayName = currentUser?.fullName || currentUser?.email || 'Người dùng';
        await order.addStatusHistory('dang_xu_ly', currentUser._id, `${displayName} bắt đầu in tranh`);
      }
    }

    // Nếu tất cả tranh đã in, cập nhật printingStatus của đơn
    if (printedPaintings === totalPaintings) {
      const allowedStatuses = ['chua_in', 'cho_in', 'dang_in', 'cho_in_lai'];
      if (allowedStatuses.includes(currentPrintingStatus) && currentPrintingStatus !== 'da_in') {
        order.printingStatus = 'da_in';
        const displayName = currentUser?.fullName || currentUser?.email || 'Người dùng';
        await order.addStatusHistory(order.status, currentUser._id, `${displayName} đã in xong tất cả tranh`);
      }
    } 
    // Nếu có ít nhất 1 tranh đã in nhưng chưa đủ, cập nhật thành 'dang_in'
    else if (printedPaintings > 0) {
      // Chỉ cập nhật nếu printingStatus chưa phải là 'dang_in' hoặc 'da_in'
      if (currentPrintingStatus === 'chua_in' || currentPrintingStatus === 'cho_in' || !currentPrintingStatus) {
        order.printingStatus = 'dang_in';
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
    const hasTranhKhung = order.paintings.some(p => requiresFrameAssembly(p));
    const hasTranhTron = order.paintings.some(p => p?.type === 'tranh_tron');

    // Nếu có tranh cần vào khung và tất cả tranh cần vào khung đã được nhận
    if (totalPaintingsNeedFrame > 0 && receivedPaintingsNeedFrame === totalPaintingsNeedFrame) {
      // Luôn cập nhật printingStatus thành san_xuat_da_nhan_tranh khi tất cả tranh cần vào khung đã được nhận
      if (order.printingStatus === 'da_in') {
        order.printingStatus = 'san_xuat_da_nhan_tranh';
      }
      
      // Luôn cập nhật status thành cho_san_xuat khi printingStatus là san_xuat_da_nhan_tranh
      // (nếu có tranh cần vào khung và tất cả đã được nhận)
      // Mở rộng điều kiện: không chỉ kiểm tra canTransitionTo, mà còn kiểm tra các trạng thái hợp lệ
      const validStatusesForTransition = ['moi_tao', 'dang_xu_ly', 'cho_san_xuat'];
      if (order.printingStatus === 'san_xuat_da_nhan_tranh' && (hasTranhKhung || hasTranhTron)) {
        if (order.status !== 'cho_san_xuat') {
          // Kiểm tra nếu có thể chuyển, hoặc nếu đang ở trạng thái hợp lệ
          if (order.canTransitionTo('cho_san_xuat') || validStatusesForTransition.includes(order.status)) {
            order.status = 'cho_san_xuat';
            const displayName = currentUser?.fullName || currentUser?.email || 'Người dùng';
            await order.addStatusHistory('cho_san_xuat', currentUser._id, `${displayName} đã nhận đủ tranh cần vào khung, chờ sản xuất vào khung`);
          }
        }
      }
    }

    // Nếu tất cả tranh (bao gồm cả tranh không cần vào khung) đã được nhận
    if (receivedPaintings === totalPaintings) {
      // Chỉ cập nhật nếu đơn đang ở trạng thái phù hợp
      if (order.printingStatus === 'da_in' || order.printingStatus === 'san_xuat_da_nhan_tranh') {
        // Nếu không có tranh khung, chuyển sang chờ đóng gói
        if (!hasTranhKhung && order.canTransitionTo('cho_dong_goi')) {
          order.status = 'cho_dong_goi';
          const displayName = currentUser?.fullName || currentUser?.email || 'Người dùng';
          await order.addStatusHistory('cho_dong_goi', currentUser._id, `${displayName} đã nhận đủ tranh, chờ đóng gói`);
        }
        // Nếu có tranh khung nhưng chưa chuyển sang cho_san_xuat (trường hợp đặc biệt)
        else if ((hasTranhKhung || hasTranhTron) && order.status === 'dang_xu_ly' && order.printingStatus === 'da_in') {
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

