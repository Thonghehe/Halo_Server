import Order from '../../models/Order.js';
import User from '../../models/User.js';
import { emitOrderEvent, insertNotificationsAndEmit } from '../../events/order.events.js';
import { buildServiceResponse } from './utils.js';

export const requestRework = async (orderId, payload = {}, currentUser) => {
  try {
    const { type, reason } = payload;
    const user = currentUser;

    const order = await Order.findById(orderId);

    if (!order) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    const userRoles = Array.isArray(user.roles) ? user.roles : [];
    const isAdmin = userRoles.includes('admin');
    const isSale = userRoles.includes('sale');

    if (!isAdmin && !isSale) {
      return buildServiceResponse(403, {
        success: false,
        message: 'Bạn không có quyền yêu cầu sản xuất lại'
      });
    }

    if (type !== 'yeu_cau_in_lai' && type !== 'yeu_cau_cat_lai') {
      return buildServiceResponse(400, {
        success: false,
        message: 'Type không hợp lệ. Chỉ chấp nhận "yeu_cau_in_lai" hoặc "yeu_cau_cat_lai"'
      });
    }

    const displayName = user?.fullName || user?.email || 'Người dùng';
    const currentStatus = order.status || 'moi_tao';
    const canMoveToFixStatus =
      currentStatus === 'khach_yeu_cau_sua' || order.canTransitionTo('khach_yeu_cau_sua');

    if (!canMoveToFixStatus) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Không thể chuyển đơn hàng sang trạng thái "Sửa lại" từ trạng thái hiện tại'
      });
    }

    let statusNote = '';
    let successMessage = 'Yêu cầu sản xuất lại đã được ghi nhận';

    if (type === 'yeu_cau_in_lai') {
      if (order.printingStatus === 'cho_in_lai') {
        return buildServiceResponse(400, {
          success: false,
          message: 'Đơn hàng đã ở trạng thái chờ in lại'
        });
      }
      order.printingStatus = 'cho_in_lai';
      const reasonText = reason && String(reason).trim() ? ` - Lý do: ${reason.trim()}` : '';
      statusNote = `${displayName} yêu cầu in lại cho đơn hàng ${order.orderCode || order._id}${reasonText}`;
      successMessage = 'Đã chuyển trạng thái in sang "Chờ in lại"';
    } else if (type === 'yeu_cau_cat_lai') {
      if (order.frameCuttingStatus === 'cho_cat_lai_khung') {
        return buildServiceResponse(400, {
          success: false,
          message: 'Đơn hàng đã ở trạng thái chờ cắt lại khung'
        });
      }
      order.frameCuttingStatus = 'cho_cat_lai_khung';
      const reasonText = reason && String(reason).trim() ? ` - Lý do: ${reason.trim()}` : '';
      statusNote = `${displayName} yêu cầu cắt lại khung cho đơn hàng ${order.orderCode || order._id}${reasonText}`;
      successMessage = 'Đã chuyển trạng thái khung sang "Chờ cắt lại khung"';
    }

    // Luôn chuyển trạng thái tổng về "Sửa lại" khi chuyển sang chờ in lại hoặc chờ cắt lại
    if (order.status !== 'khach_yeu_cau_sua' && order.canTransitionTo('khach_yeu_cau_sua')) {
      order.status = 'khach_yeu_cau_sua';
      await order.addStatusHistory('khach_yeu_cau_sua', user._id, 'Chuyển về trạng thái sửa lại do yêu cầu sản xuất lại');
    }

    await order.addStatusHistory(order.status, user._id, statusNote);
    await order.save();

    try {
      const targetRole = type === 'yeu_cau_in_lai' ? 'in' : 'catKhung';
      const roleLabel = type === 'yeu_cau_in_lai' ? 'In' : 'Cắt khung';
      const title =
        type === 'yeu_cau_in_lai'
          ? 'Yêu cầu in lại đơn hàng'
          : 'Yêu cầu cắt lại khung';
      const message =
        type === 'yeu_cau_in_lai'
          ? `${displayName} yêu cầu in lại cho đơn hàng ${order.orderCode || order._id}`
          : `${displayName} yêu cầu cắt lại khung cho đơn hàng ${order.orderCode || order._id}`;

      const recipients = await User.find({ roles: targetRole, active: true }).select('_id');

      if (recipients.length > 0) {
        const notifications = recipients.map((recipient) => ({
          recipient: recipient._id,
          sender: user._id,
          title,
          message,
          type: 'order',
          link: `/orders/${order._id}`,
          orderId: order._id,
          metadata: {
            orderCode: order.orderCode,
            requestType: type,
            targetRole: roleLabel
          }
        }));
        await insertNotificationsAndEmit(notifications);
      }
    } catch (notifyError) {
      console.error('[orders.service][requestRework] Notify error:', notifyError);
    }

    emitOrderEvent(order._id, 'rework_requested', { type });

    return buildServiceResponse(200, {
      success: true,
      message: successMessage,
      data: order
    });
  } catch (error) {
    console.error('[orders.service][requestRework] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const productionRequest = async (orderId, payload = {}, currentUser) => {
  try {
    const { type, reason } = payload;
    const user = currentUser;

    const order = await Order.findById(orderId);

    if (!order) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    const userRoles = Array.isArray(user.roles) ? user.roles : [];
    const isAdmin = userRoles.includes('admin');
    const isSanXuat = userRoles.includes('sanXuat');
    const isDongGoi = userRoles.includes('dongGoi');

    if (!isSanXuat && !isAdmin && !isDongGoi) {
      return buildServiceResponse(403, {
        success: false,
        message: 'Bạn không có quyền yêu cầu. Chỉ role sản xuất hoặc đóng gói mới được phép.'
      });
    }

    if (!type || (type !== 'yeu_cau_in_lai' && type !== 'yeu_cau_cat_lai_khung')) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Type không hợp lệ. Chỉ chấp nhận "yeu_cau_in_lai" hoặc "yeu_cau_cat_lai_khung"'
      });
    }

    if (!reason || !String(reason).trim()) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Vui lòng nhập lý do yêu cầu'
      });
    }

    const displayName = user?.fullName || user?.email || 'Người dùng';
    const printingStatus = order.printingStatus || 'chua_in';
    const frameCuttingStatus = order.frameCuttingStatus || 'chua_cat';
    const currentStatus = order.status || 'moi_tao';

    let statusNote = '';
    let successMessage = '';

    if (type === 'yeu_cau_in_lai') {
      // Đóng gói chỉ có thể yêu cầu in lại khi đơn ở trạng thái chờ đóng gói
      if (isDongGoi) {
        if (currentStatus !== 'cho_dong_goi') {
          return buildServiceResponse(400, {
            success: false,
            message: 'Chỉ có thể yêu cầu in lại khi đơn hàng ở trạng thái "Chờ đóng gói"'
          });
        }
        if (printingStatus !== 'da_in' && printingStatus !== 'dong_goi_da_nhan_tranh') {
          return buildServiceResponse(400, {
            success: false,
            message: 'Chỉ có thể yêu cầu in lại khi trạng thái in là "Đã in" hoặc "Đóng gói đã nhận tranh"'
          });
        }
      } else if (isSanXuat) {
        // Sản xuất chỉ có thể yêu cầu in lại khi trạng thái in là "Đã in"
        if (printingStatus !== 'da_in') {
          return buildServiceResponse(400, {
            success: false,
            message: 'Chỉ có thể yêu cầu in lại khi trạng thái in là "Đã in"'
          });
        }
      }

      order.printingStatus = 'cho_in_lai';
      const roleLabel = isDongGoi ? 'Đóng gói' : 'Sản xuất';
      statusNote = `${displayName} (${roleLabel}) yêu cầu in lại cho đơn hàng ${order.orderCode || order._id} - Lý do: ${reason.trim()}`;
      successMessage = 'Đã yêu cầu in lại thành công. Trạng thái in đã chuyển sang "Chờ in lại"';
    } else if (type === 'yeu_cau_cat_lai_khung') {
      if (frameCuttingStatus !== 'da_cat_khung') {
        return buildServiceResponse(400, {
          success: false,
          message: 'Chỉ có thể yêu cầu cắt lại khung khi trạng thái cắt khung là "Đã cắt"'
        });
      }

      order.frameCuttingStatus = 'cho_cat_lai_khung';
      statusNote = `${displayName} (Sản xuất) yêu cầu cắt lại khung cho đơn hàng ${order.orderCode || order._id} - Lý do: ${reason.trim()}`;
      successMessage = 'Đã yêu cầu cắt lại khung thành công. Trạng thái cắt khung đã chuyển sang "Chờ cắt lại khung"';
    }

    // Luôn chuyển trạng thái tổng về "Sửa lại" khi chuyển sang chờ in lại hoặc chờ cắt lại
    if (order.status !== 'khach_yeu_cau_sua' && order.canTransitionTo('khach_yeu_cau_sua')) {
      order.status = 'khach_yeu_cau_sua';
      await order.addStatusHistory('khach_yeu_cau_sua', user._id, 'Chuyển về trạng thái sửa lại do yêu cầu sản xuất lại');
    }

    await order.addStatusHistory(order.status, user._id, statusNote);
    await order.save();

    try {
      const targetRole = type === 'yeu_cau_in_lai' ? 'in' : 'catKhung';
      const roleLabel = type === 'yeu_cau_in_lai' ? 'In' : 'Cắt khung';
      const title =
        type === 'yeu_cau_in_lai'
          ? 'Sản xuất yêu cầu in lại đơn hàng'
          : 'Sản xuất yêu cầu cắt lại khung';
      const message =
        type === 'yeu_cau_in_lai'
          ? `${displayName} (Sản xuất) yêu cầu in lại cho đơn hàng ${order.orderCode || order._id}. Lý do: ${reason.trim()}`
          : `${displayName} (Sản xuất) yêu cầu cắt lại khung cho đơn hàng ${order.orderCode || order._id}. Lý do: ${reason.trim()}`;

      const recipients = await User.find({ roles: targetRole, active: true }).select('_id');

      if (recipients.length > 0) {
        const notifications = recipients.map((recipient) => ({
          recipient: recipient._id,
          sender: user._id,
          title,
          message,
          type: 'order',
          link: `/orders/${order._id}`,
          orderId: order._id,
          metadata: {
            orderCode: order.orderCode,
            requestType: type,
            targetRole: roleLabel,
            reason: reason.trim()
          }
        }));
        await insertNotificationsAndEmit(notifications);
      }
    } catch (notifyError) {
      console.error('[orders.service][productionRequest] Notify error:', notifyError);
    }

    emitOrderEvent(order._id, 'production_request', { type, reason });

    return buildServiceResponse(200, {
      success: true,
      message: successMessage,
      data: order
    });
  } catch (error) {
    console.error('[orders.service][productionRequest] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

