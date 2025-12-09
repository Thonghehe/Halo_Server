import Order from '../../models/Order.js';
import Painting from '../../models/Painting.js';
import {
  requiresFrameAssembly,
  normalizeShippingMethod,
  getShippingMethodLabel,
  normalizeNumberInput
} from '../../helpers/order.helper.js';
import {
  emitOrderEvent,
  sendNotificationToStatusRoles,
  sendNotificationToPrintingAndCuttingRoles
} from '../../events/order.events.js';
import { buildServiceResponse } from './utils.js';

// Helper function để lấy tên tiếng Việt của trạng thái
const getVnStatusName = (status) => {
  const statusNames = {
    moi_tao: 'Mới tạo',
    dang_xu_ly: 'Đang xử lý',
    cho_san_xuat: 'Chờ sản xuất',
    da_vao_khung: 'Đã vào khung',
    cho_dong_goi: 'Chờ đóng gói',
    da_dong_goi: 'Đã đóng gói',
    cho_dieu_don: 'Chờ điều đơn',
    da_gui_di: 'Đã gửi đi',
    hoan_thanh: 'Hoàn thành',
    khach_tra_hang: 'Khách trả hàng',
    khach_yeu_cau_sua: 'Sửa lại',
    da_nhan_lai_don: 'Đã nhận lại đơn',
    dong_goi_da_nhan_lai: 'Đóng gói đã nhận lại',
    gui_lai_san_xuat: 'Gửi lại sản xuất',
    cho_san_xuat_lai: 'Chờ sản xuất lại',
    huy: 'Đã hủy',
    cat_vao_kho: 'Trong kho'
  };
  return statusNames[status] || status;
};

// Helper function để lấy động từ tương ứng với trạng thái
const getStatusAction = (status) => {
  const statusActions = {
    moi_tao: 'đã tạo',
    dang_xu_ly: 'đã chuyển sang đang xử lý',
    cho_san_xuat: 'đã chuyển sang chờ sản xuất',
    da_vao_khung: 'đã vào khung',
    cho_dong_goi: 'đã chuyển sang chờ đóng gói',
    da_dong_goi: 'đã đóng gói',
    cho_dieu_don: 'đã chuyển sang chờ điều đơn',
    da_gui_di: 'đã gửi đi',
    hoan_thanh: 'đã hoàn thành',
    khach_tra_hang: 'đã chuyển sang khách trả hàng',
    khach_yeu_cau_sua: 'đã yêu cầu sửa',
    da_nhan_lai_don: 'đã nhận lại đơn',
    dong_goi_da_nhan_lai: 'đã chuyển sang đóng gói đã nhận lại',
    gui_lai_san_xuat: 'đã chuyển sang gửi lại sản xuất',
    cho_san_xuat_lai: 'đã chuyển sang chờ sản xuất lại',
    huy: 'đã hủy',
    cat_vao_kho: 'đã cất vào kho'
  };
  return statusActions[status] || 'đã thay đổi trạng thái';
};

export const updateOrderStatus = async (orderId, body = {}, currentUser) => {
  try {
    const { status, note } = body;

    const order = await Order.findById(orderId);

    if (!order) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    if (!order.canTransitionTo(status)) {
      return buildServiceResponse(400, {
        success: false,
        message: `Không thể chuyển từ trạng thái "${order.status}" sang "${status}"`
      });
    }

    if (status === 'da_vao_khung') {
      const printingStatus = order.printingStatus || 'chua_in';
      // Tạm thời bỏ kiểm tra cắt khung - chỉ cần sản xuất đã nhận tranh
      if (printingStatus !== 'san_xuat_da_nhan_tranh') {
        return buildServiceResponse(400, {
          success: false,
          message: 'Chỉ có thể đánh dấu "Đã vào khung" khi sản xuất đã nhận tranh'
        });
      }
    }

    const displayName = currentUser?.fullName || currentUser?.email || 'Người dùng';
    const statusNote = note
      ? `${displayName} - ${note}`
      : `${displayName} ${getStatusAction(status)}`;
    const oldStatus = order.status;
    order.status = status;
    if (status === 'hoan_thanh' && !order.actualCompletionDate) {
      order.actualCompletionDate = new Date();
    }
    await order.addStatusHistory(status, currentUser._id, statusNote);
    await order.save();

    if (status !== 'cho_dieu_don' && status !== 'cat_vao_kho') {
      try {
        const actionType = status === 'huy' ? 'cancel' : 'status_change';
        let title;
        let message;

        const statusName = getVnStatusName(status);
        
        if (status === 'huy') {
          title = 'Đơn hàng đã bị hủy';
          message = `${displayName} đã hủy đơn hàng ${order.orderCode || order._id}${
            note ? ` - ${note}` : ''
          }`;
        } else if (status === 'khach_yeu_cau_sua') {
          // Format đặc biệt cho trạng thái "Sửa lại"
          let reason = '';
          if (note) {
            // Parse lý do từ note (có thể là "Khách yêu cầu sửa tranh: Tranh hỏng" hoặc chỉ "Tranh hỏng")
            const match = note.match(/Khách yêu cầu sửa tranh:\s*(.+)/i);
            reason = match ? match[1].trim() : note.trim();
          }
          title = 'Yêu cầu sửa đơn hàng';
          message = `${displayName} đã yêu cầu sửa đơn hàng ${order.orderCode || order._id}${reason ? ` Lý do: ${reason}` : ''}`;
        } else {
          title = 'Trạng thái đơn hàng đã thay đổi';
          message = `${displayName} đã chuyển đơn hàng ${order.orderCode || order._id} sang "${statusName}"${note ? ` - ${note}` : ''}`;
        }

        await sendNotificationToStatusRoles(order, currentUser, title, message, actionType);
      } catch (notifyError) {
        console.error('[orders.service][updateOrderStatus] Notify error:', notifyError);
      }
    }

    emitOrderEvent(order._id, 'status_changed', { status });

    return buildServiceResponse(200, {
      success: true,
      message: 'Cập nhật trạng thái thành công',
      data: order
    });
  } catch (error) {
    console.error('[orders.service][updateOrderStatus] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const acceptOrder = async (orderId, payload = {}, currentUser) => {
  try {
    const { role } = payload;
    const user = currentUser;

    const order = await Order.findById(orderId);

    if (!order) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    if (role !== 'in' && role !== 'catKhung' && role !== 'dongGoi' && role !== 'keToanDieuDon') {
      return buildServiceResponse(400, {
        success: false,
        message:
          'Role không hợp lệ. Chỉ chấp nhận "in", "catKhung", "dongGoi", hoặc "keToanDieuDon"'
      });
    }

    if (!user.roles || !user.roles.includes(role)) {
      return buildServiceResponse(403, {
        success: false,
        message: 'Bạn không có quyền nhận đơn hàng này'
      });
    }

    let statusChanged = false;
    let statusNote = '';
    const displayName = user?.fullName || user?.email || 'Người dùng';

    if (role === 'in') {
      if (order.printingStatus === 'chua_in' || order.printingStatus === 'cho_in') {
        order.printingStatus = 'dang_in';
        statusChanged = true;
        statusNote = `${displayName} đã nhận đơn để in`;
        await order.addStatusHistory(order.status, user._id, statusNote);
      } else if (order.printingStatus === 'yeu_cau_in_lai') {
        order.printingStatus = 'cho_in_lai';
        statusChanged = true;
        statusNote = `${displayName} đã nhận yêu cầu in lại`;
        await order.addStatusHistory(order.status, user._id, statusNote);
        // Chuyển trạng thái tổng về "Sửa lại" nếu có thể
        if (order.status !== 'khach_yeu_cau_sua' && order.canTransitionTo('khach_yeu_cau_sua')) {
          order.status = 'khach_yeu_cau_sua';
          await order.addStatusHistory('khach_yeu_cau_sua', user._id, 'Chuyển về trạng thái sửa lại do yêu cầu in lại');
        }
      } else if (order.printingStatus === 'cho_in_lai') {
        order.printingStatus = 'da_in';
        statusChanged = true;
        statusNote = `${displayName} đã in lại`;
        await order.addStatusHistory(order.status, user._id, statusNote);
      } else {
        return buildServiceResponse(400, {
          success: false,
          message: 'Đơn hàng này đã được xử lý in'
        });
      }
    } else if (role === 'catKhung') {
      if (order.frameCuttingStatus === 'chua_cat' || order.frameCuttingStatus === 'cho_cat_khung') {
        order.frameCuttingStatus = 'dang_cat_khung';
        statusChanged = true;
        statusNote = `${displayName} đã nhận đơn để cắt khung`;
        await order.addStatusHistory(order.status, user._id, statusNote);
      } else if (order.frameCuttingStatus === 'yeu_cau_cat_lai') {
        order.frameCuttingStatus = 'cho_cat_lai_khung';
        statusChanged = true;
        statusNote = `${displayName} đã nhận yêu cầu cắt lại khung`;
        await order.addStatusHistory(order.status, user._id, statusNote);
        // Chuyển trạng thái tổng về "Sửa lại" nếu có thể
        if (order.status !== 'khach_yeu_cau_sua' && order.canTransitionTo('khach_yeu_cau_sua')) {
          order.status = 'khach_yeu_cau_sua';
          await order.addStatusHistory('khach_yeu_cau_sua', user._id, 'Chuyển về trạng thái sửa lại do yêu cầu cắt lại khung');
        }
      } else if (order.frameCuttingStatus === 'cho_cat_lai_khung') {
        order.frameCuttingStatus = 'da_cat_khung';
        statusChanged = true;
        statusNote = `${displayName} đã cắt lại khung`;
        await order.addStatusHistory(order.status, user._id, statusNote);
      } else {
        return buildServiceResponse(400, {
          success: false,
          message: 'Đơn hàng này đã được xử lý cắt khung'
        });
      }
    } else if (role === 'dongGoi') {
      await order.populate('paintings');
      const hasTranhKhung =
        order.paintings && order.paintings.some((p) => requiresFrameAssembly(p));

      if (hasTranhKhung) {
        if (order.status === 'da_vao_khung') {
          if (!order.canTransitionTo('cho_dong_goi')) {
            return buildServiceResponse(400, {
              success: false,
              message: `Không thể chuyển từ trạng thái "${order.status}" sang "cho_dong_goi"`
            });
          }

          order.status = 'cho_dong_goi';
          statusChanged = true;
          statusNote = `${displayName} đã nhận đơn để đóng gói`;
          await order.addStatusHistory('cho_dong_goi', user._id, statusNote);
        } else {
          return buildServiceResponse(400, {
            success: false,
            message: 'Chỉ có thể nhận đơn đóng gói khi đơn hàng đã vào khung'
          });
        }
      } else {
        if (order.status === 'dang_xu_ly' && order.printingStatus === 'da_in') {
          order.status = 'cho_dong_goi';
          statusChanged = true;
          statusNote = `${displayName} đã nhận đơn để đóng gói`;
          await order.addStatusHistory('cho_dong_goi', user._id, statusNote);
        } else {
          return buildServiceResponse(400, {
            success: false,
            message: 'Chỉ có thể nhận đơn đóng gói khi đã in xong và đang xử lý'
          });
        }
      }
    } else if (role === 'keToanDieuDon') {
      if (order.status === 'da_dong_goi' || order.status === 'gui_lai_cho_khach') {
        if (!order.canTransitionTo('cho_dieu_don')) {
          return buildServiceResponse(400, {
            success: false,
            message: `Không thể chuyển từ trạng thái "${order.status}" sang "cho_dieu_don"`
          });
        }
        const oldStatus = order.status;
        order.status = 'cho_dieu_don';
        statusChanged = true;
        statusNote = `${displayName} đã nhận đơn để điều đơn${
          oldStatus === 'gui_lai_cho_khach' ? ' (gửi lại cho khách)' : ''
        }`;
        await order.addStatusHistory('cho_dieu_don', user._id, statusNote);
      } else {
        return buildServiceResponse(400, {
          success: false,
          message: 'Chỉ có thể nhận đơn điều đơn khi đơn hàng đã đóng gói hoặc đang gửi lại cho khách'
        });
      }
    }

    if (statusChanged && (role === 'in' || role === 'catKhung') && order.status !== 'dang_xu_ly') {
      order.status = 'dang_xu_ly';
      await order.addStatusHistory(
        'dang_xu_ly',
        user._id,
        `${displayName} - Đơn hàng đang được xử lý (in/cắt khung)`
      );
    }

    await order.assignUser(user._id, role);
    await order.save();

    emitOrderEvent(order._id, 'accepted', { role });

    return buildServiceResponse(200, {
      success: true,
      message: 'Nhận đơn hàng thành công',
      data: order
    });
  } catch (error) {
    console.error('[orders.service][acceptOrder] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const completeOrder = async (orderId, payload = {}, currentUser) => {
  try {
    const { role, shippingMethod, shippingTrackingCode, paymentBillImages } = payload;
    const user = currentUser;

    const order = await Order.findById(orderId);

    if (!order) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    if (
      role !== 'in' &&
      role !== 'catKhung' &&
      role !== 'dongGoi' &&
      role !== 'keToanDieuDon' &&
      role !== 'keToanTaiChinh' &&
      role !== 'sale'
    ) {
      return buildServiceResponse(400, {
        success: false,
        message:
          'Role không hợp lệ. Chỉ chấp nhận "in", "catKhung", "dongGoi", "keToanDieuDon", "keToanTaiChinh" hoặc "sale"'
      });
    }

    if (!user.roles || !user.roles.includes(role)) {
      return buildServiceResponse(403, {
        success: false,
        message: 'Bạn không có quyền đánh dấu hoàn thành đơn hàng này'
      });
    }

    let statusNote = '';
    const displayName = user?.fullName || user?.email || 'Người dùng';

    if (role === 'in') {
      const allowedStatuses = ['chua_in', 'cho_in', 'dang_in', 'cho_in_lai'];
      if (allowedStatuses.includes(order.printingStatus)) {
        order.printingStatus = 'da_in';
        statusNote = `${displayName} đã in`;
        await order.addStatusHistory(order.status, user._id, statusNote);

        // Nếu trạng thái tổng không phải 'dang_xu_ly' và có thể chuyển, thì chuyển sang 'dang_xu_ly'
        if (order.status !== 'dang_xu_ly' && order.canTransitionTo('dang_xu_ly')) {
          order.status = 'dang_xu_ly';
          await order.addStatusHistory('dang_xu_ly', user._id, 'Đã in xong, đơn hàng đang được xử lý');
        }

        await order.populate('paintings');
        const hasTranhKhung =
          order.paintings && order.paintings.some((p) => requiresFrameAssembly(p));
        const hasTranhTron =
          order.paintings && order.paintings.some((p) => p?.type === 'tranh_tron');

        // Nếu không có tranh khung (tranh dán hoặc chỉ in), chuyển trực tiếp sang chờ đóng gói
        if (!hasTranhKhung && order.status === 'dang_xu_ly' && order.canTransitionTo('cho_dong_goi')) {
          order.status = 'cho_dong_goi';
          await order.addStatusHistory('cho_dong_goi', user._id, 'Đã in xong, chờ đóng gói');
        } else if (
          hasTranhKhung &&
          order.frameCuttingStatus === 'khong_cat_khung' &&
          order.status === 'dang_xu_ly'
        ) {
          // Nếu có tranh tròn (không cắt khung nhưng vẫn cần vào khung), chuyển sang chờ sản xuất
          if (hasTranhTron && order.canTransitionTo('cho_san_xuat')) {
            order.status = 'cho_san_xuat';
            await order.addStatusHistory('cho_san_xuat', user._id, 'Đã in xong, tranh tròn chờ sản xuất vào khung');
          } else if (!hasTranhTron && order.canTransitionTo('cho_dong_goi')) {
            // Nếu là tranh khung nhưng không cắt khung (không phải tranh tròn), chuyển trực tiếp sang chờ đóng gói
            order.status = 'cho_dong_goi';
            await order.addStatusHistory('cho_dong_goi', user._id, 'Đã in xong, không cần cắt khung, chờ đóng gói');
          }
        } else if (
          hasTranhKhung &&
          order.status === 'dang_xu_ly' &&
          order.canTransitionTo('cho_san_xuat')
        ) {
          // Tạm thời bỏ kiểm tra "đã cắt khung" - chuyển trực tiếp sang chờ sản xuất khi đã in xong
          order.status = 'cho_san_xuat';
          await order.addStatusHistory('cho_san_xuat', user._id, 'Đã in xong, chờ sản xuất');
        }
      } else {
        return buildServiceResponse(400, {
          success: false,
          message: `Không thể đánh dấu đã in khi trạng thái in là "${order.printingStatus}"`
        });
      }
    } else if (role === 'catKhung') {
      const allowedStatuses = ['chua_cat', 'cho_cat_khung', 'dang_cat_khung', 'cho_cat_lai_khung'];
      if (allowedStatuses.includes(order.frameCuttingStatus)) {
        order.frameCuttingStatus = 'da_cat_khung';
        statusNote = `${displayName} đã cắt khung`;
        await order.addStatusHistory(order.status, user._id, statusNote);

        // Nếu trạng thái tổng không phải 'dang_xu_ly' và có thể chuyển, thì chuyển sang 'dang_xu_ly'
        if (order.status !== 'dang_xu_ly' && order.canTransitionTo('dang_xu_ly')) {
          order.status = 'dang_xu_ly';
          await order.addStatusHistory('dang_xu_ly', user._id, 'Đã cắt khung xong, đơn hàng đang được xử lý');
        }

        // Nếu đã in xong và đang ở trạng thái 'dang_xu_ly', chuyển sang chờ sản xuất
        if (
          order.printingStatus === 'da_in' &&
          order.status === 'dang_xu_ly' &&
          order.canTransitionTo('cho_san_xuat')
        ) {
          order.status = 'cho_san_xuat';
          await order.addStatusHistory(
            'cho_san_xuat',
            user._id,
            'Đã in và cắt khung xong, chờ sản xuất'
          );
        }
      } else {
        return buildServiceResponse(400, {
          success: false,
          message: `Không thể đánh dấu đã cắt khung khi trạng thái cắt khung là "${order.frameCuttingStatus}"`
        });
      }
    } else if (role === 'dongGoi') {
      if (order.status === 'cho_dong_goi') {
        if (!order.canTransitionTo('da_dong_goi')) {
          return buildServiceResponse(400, {
            success: false,
            message: `Không thể chuyển từ trạng thái "${order.status}" sang "da_dong_goi"`
          });
        }
        order.status = 'da_dong_goi';
        statusNote = `${displayName} đã hoàn thành đóng gói`;
        await order.addStatusHistory('da_dong_goi', user._id, statusNote);
      } else {
        return buildServiceResponse(400, {
          success: false,
          message: 'Chỉ có thể đánh dấu hoàn thành khi đơn hàng đang chờ đóng gói'
        });
      }
    } else if (role === 'keToanDieuDon') {
      if (order.status === 'cho_dieu_don') {
        if (!order.canTransitionTo('da_gui_di')) {
          return buildServiceResponse(400, {
            success: false,
            message: `Không thể chuyển từ trạng thái "${order.status}" sang "da_gui_di"`
          });
        }
        if (!shippingMethod || String(shippingMethod).trim().length === 0) {
          return buildServiceResponse(400, {
            success: false,
            message: 'Vui lòng nhập hình thức gửi đi'
          });
        }
        const normalizedShippingMethod = normalizeShippingMethod(shippingMethod, null);
        if (!normalizedShippingMethod) {
          return buildServiceResponse(400, {
            success: false,
            message: 'Hình thức gửi đi không hợp lệ'
          });
        }
        const sanitizedTrackingCode =
          normalizedShippingMethod === 'viettel'
            ? shippingTrackingCode !== undefined && shippingTrackingCode !== null
              ? String(shippingTrackingCode).trim()
              : ''
            : '';
        const sanitizedExternalInfo =
          normalizedShippingMethod === 'ship_ngoai'
            ? String(payload.shippingExternalInfo || '').trim()
            : '';
        const normalizedExternalCostValue =
          normalizedShippingMethod === 'ship_ngoai'
            ? (() => {
                const parsed = normalizeNumberInput(payload.shippingExternalCost);
                return parsed === null ? 0 : parsed;
              })()
            : 0;
        
        // Cập nhật Vận chuyển & lắp đặt từ payload
        const normalizedShippingInstallationPrice = (() => {
          const parsed = normalizeNumberInput(payload.shippingInstallationPrice);
          return parsed === null ? 0 : parsed;
        })();
        
        // Cập nhật checkbox "Khách trả tiền ship"
        const customerPaysShipping = payload.customerPaysShipping !== undefined 
          ? Boolean(payload.customerPaysShipping) 
          : true;
        
        order.status = 'da_gui_di';
        order.shippingMethod = normalizedShippingMethod;
        order.shippingInstallationPrice = normalizedShippingInstallationPrice;
        order.customerPaysShipping = customerPaysShipping;
        
        // Tính lại VAT và tổng tiền khi cập nhật Vận chuyển & lắp đặt
        // Kiểm tra trường hợp Shopee nhập trực tiếp tổng tiền
        const isShopeeDirectInput =
          order.orderType === 'shopee' &&
          order.totalAmount > 0 &&
          (order.paintingPrice || 0) === 0 &&
          (order.constructionPrice || 0) === 0 &&
          (order.designFee || 0) === 0 &&
          (order.extraFeeAmount || 0) === 0;
        
        if (!isShopeeDirectInput) {
          if (customerPaysShipping) {
            // Nếu khách chịu: cộng vào tổng đơn hàng
            const subtotal =
              (order.paintingPrice || 0) +
              (order.constructionPrice || 0) +
              (order.designFee || 0) +
              (order.extraFeeAmount || 0) +
              normalizedShippingInstallationPrice;
            const vat = order.includeVat ? Math.round(subtotal * 0.08) : 0;
            order.vat = vat;
            order.totalAmount = Math.round(subtotal + vat);
          } else {
            // Nếu không phải khách chịu: vận chuyển & lắp đặt là tiền riêng, không ảnh hưởng tổng tiền
            const subtotal =
              (order.paintingPrice || 0) +
              (order.constructionPrice || 0) +
              (order.designFee || 0) +
              (order.extraFeeAmount || 0);
            const vat = order.includeVat ? Math.round(subtotal * 0.08) : 0;
            order.vat = vat;
            order.totalAmount = Math.round(subtotal + vat);
          }
        }
        
        if (normalizedShippingMethod === 'viettel') {
          order.shippingTrackingCode = sanitizedTrackingCode;
          order.shippingExternalInfo = '';
          order.shippingExternalCost = 0;
        } else if (normalizedShippingMethod === 'ship_ngoai') {
          order.shippingTrackingCode = '';
          order.shippingExternalInfo = sanitizedExternalInfo;
          order.shippingExternalCost = normalizedExternalCostValue;
        } else {
          order.shippingTrackingCode = '';
          order.shippingExternalInfo = '';
          order.shippingExternalCost = 0;
        }
        const methodLabel = getShippingMethodLabel(normalizedShippingMethod);
        let details = '';
        if (normalizedShippingMethod === 'viettel' && sanitizedTrackingCode) {
          details = ` - Mã vận đơn: ${sanitizedTrackingCode}`;
        }
        if (normalizedShippingMethod === 'ship_ngoai') {
          if (sanitizedExternalInfo) {
            details += ` - Ghi chú ship: ${sanitizedExternalInfo}`;
          }
          if (order.shippingExternalCost > 0) {
            details += ` - Phí ship: ${order.shippingExternalCost.toLocaleString('vi-VN')}đ`;
          }
        }
        if (normalizedShippingInstallationPrice > 0) {
          details += ` - Vận chuyển & lắp đặt: ${normalizedShippingInstallationPrice.toLocaleString('vi-VN')}đ`;
        }
        statusNote = `${displayName} đã gửi đơn - Hình thức: ${methodLabel}${details}`;
        await order.addStatusHistory('da_gui_di', user._id, statusNote);
      } else {
        return buildServiceResponse(400, {
          success: false,
          message: 'Chỉ có thể đánh dấu hoàn thành khi đơn hàng đang chờ điều đơn'
        });
      }
    } else if (role === 'keToanTaiChinh') {
      if (order.status === 'da_gui_di') {
        if (!order.canTransitionTo('hoan_thanh')) {
          return buildServiceResponse(400, {
            success: false,
            message: `Không thể chuyển từ trạng thái "${order.status}" sang "hoan_thanh"`
          });
        }
        order.status = 'hoan_thanh';
        if (!order.actualCompletionDate) {
          order.actualCompletionDate = new Date();
        }
        statusNote = `${displayName} đã hoàn thành đơn hàng`;
        await order.addStatusHistory('hoan_thanh', user._id, statusNote);
      } else {
        return buildServiceResponse(400, {
          success: false,
          message: 'Chỉ có thể đánh dấu hoàn thành khi đơn hàng đã gửi đi'
        });
      }
    } else if (role === 'sale') {
      const printingStatus = order.printingStatus || 'chua_in';
      const frameStatus = order.frameCuttingStatus || 'chua_cat';
      const shippingMethodValue = order.shippingMethod || '';

      if (
        printingStatus !== 'co_san' ||
        frameStatus !== 'co_san' ||
        shippingMethodValue !== 'khach_den_nhan'
      ) {
        return buildServiceResponse(400, {
          success: false,
          message:
            'Chỉ có thể xác nhận hoàn thành khi trạng thái in & khung là "Có sẵn" và hình thức gửi đơn là "Khách đến nhận"'
        });
      }

      const sanitizedPaymentBillImages = Array.isArray(paymentBillImages)
        ? paymentBillImages.map((img) => String(img || '').trim()).filter(Boolean)
        : [];

      if (sanitizedPaymentBillImages.length === 0) {
        return buildServiceResponse(400, {
          success: false,
          message: 'Vui lòng tải lên ít nhất một ảnh bill thanh toán'
        });
      }

      order.paymentBillImages = sanitizedPaymentBillImages;
      order.status = 'hoan_thanh';
      order.actualCompletionDate = new Date();
      statusNote = `${displayName} đã xác nhận khách đến nhận và thanh toán tại cửa hàng`;
      await order.addStatusHistory('hoan_thanh', user._id, statusNote);
    }

    await order.save();

    emitOrderEvent(order._id, 'status_changed', { role });

    return buildServiceResponse(200, {
      success: true,
      message: 'Đánh dấu hoàn thành thành công',
      data: order
    });
  } catch (error) {
    console.error('[orders.service][completeOrder] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const receiveOrder = async (orderId, payload = {}, currentUser) => {
  try {
    const { type } = payload;
    const user = currentUser;

    const order = await Order.findById(orderId);

    if (!order) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    if (type !== 'tranh') {
      return buildServiceResponse(400, {
        success: false,
        message: 'Type không hợp lệ. Chỉ chấp nhận "tranh"'
      });
    }

    const userRoles = user.roles || [];
    const isSanXuat = userRoles.includes('sanXuat');
    const isDongGoi = userRoles.includes('dongGoi');
    const currentStatus = order.status || 'moi_tao';

    if (!isSanXuat && !isDongGoi) {
      return buildServiceResponse(403, {
        success: false,
        message: 'Bạn không có quyền nhận tranh/khung'
      });
    }

    let statusNote = '';
    const displayName = user?.fullName || user?.email || 'Người dùng';

    if (type === 'tranh') {
      if (order.printingStatus !== 'da_in') {
        return buildServiceResponse(400, {
          success: false,
          message: 'Chỉ có thể nhận tranh khi đã in xong'
        });
      }

      // Nếu là đóng gói và đơn hàng đang ở trạng thái chờ đóng gói
      if (isDongGoi && currentStatus === 'cho_dong_goi') {
        order.printingStatus = 'dong_goi_da_nhan_tranh';
        statusNote = `${displayName} (Đóng gói) đã nhận tranh`;
        await order.addStatusHistory(order.status, user._id, statusNote);
      } else if (isSanXuat && currentStatus !== 'cho_dong_goi') {
        // Sản xuất chỉ có thể nhận tranh khi không ở trạng thái chờ đóng gói
        order.printingStatus = 'san_xuat_da_nhan_tranh';
        statusNote = `${displayName} (Sản xuất) đã nhận tranh`;
        await order.addStatusHistory(order.status, user._id, statusNote);
      } else {
        return buildServiceResponse(400, {
          success: false,
          message: 'Không thể nhận tranh trong trạng thái hiện tại'
        });
      }
    } else if (type === 'khung') {
      // Chỉ sản xuất mới có thể nhận khung
      if (!isSanXuat) {
        return buildServiceResponse(403, {
          success: false,
          message: 'Chỉ sản xuất mới có thể nhận khung'
        });
      }

      // Tạm thời bỏ kiểm tra "đã cắt khung" - cho phép nhận khung trực tiếp
      order.frameCuttingStatus = 'san_xuat_da_nhan_khung';
      statusNote = `${displayName} đã nhận khung`;
      await order.addStatusHistory(order.status, user._id, statusNote);
    }

    await order.save();

    emitOrderEvent(order._id, 'received', { type });

    return buildServiceResponse(200, {
      success: true,
      message: `Nhận ${type === 'tranh' ? 'tranh' : 'khung'} thành công`,
      data: order
    });
  } catch (error) {
    console.error('[orders.service][receiveOrder] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

