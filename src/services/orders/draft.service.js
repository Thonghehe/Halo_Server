import Order from '../../models/Order.js';
import OrderDraft from '../../models/OrderDraft.js';
import { applyDraftToOrder } from '../../helpers/order.helper.js';
import { emitOrderEvent, insertNotificationsAndEmit } from '../../events/order.events.js';
import { buildServiceResponse } from './utils.js';

export const getOrderDraft = async (orderId) => {
  try {
    const draft = await OrderDraft.findOne({ order: orderId, status: 'pending' })
      .populate('createdBy', 'fullName email roles')
      .lean();

    return buildServiceResponse(200, {
      success: true,
      data: draft
    });
  } catch (error) {
    console.error('[orders.service][getOrderDraft] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const approveOrderDraft = async (orderId, currentUser) => {
  try {
    const draft = await OrderDraft.findOne({ order: orderId, status: 'pending' })
      .populate('createdBy', 'fullName email');
    if (!draft) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy bản nháp đang chờ duyệt'
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    await applyDraftToOrder(order, draft);
    await order.save();

    await OrderDraft.deleteMany({ order: orderId });

    const displayName = currentUser?.fullName || currentUser?.email || 'Admin';
    const draftCreatorName = draft.createdBy?.fullName || draft.createdBy?.email || 'Sale';
    await order.addStatusHistory(
      order.status,
      currentUser._id,
      `${displayName} đã phê duyệt thay đổi của ${draftCreatorName} cho đơn hàng`
    );

    emitOrderEvent(order._id, 'updated', { moneyDraftApproved: true });

    if (draft.createdBy) {
      const recipientId =
        typeof draft.createdBy === 'object' && draft.createdBy._id
          ? draft.createdBy._id
          : draft.createdBy;
      const senderId = currentUser?._id || currentUser;
      if (recipientId && senderId) {
        const approverName = currentUser?.fullName || currentUser?.email || 'Admin';
        const notifications = [
          {
            recipient: recipientId,
            sender: senderId,
            title: 'Bản nháp thay đổi đã được duyệt',
            message: `${approverName} đã phê duyệt thay đổi của đơn ${
              order.orderCode || order._id
            }`,
            type: 'order',
            link: `/orders/${order._id}`,
            orderId: order._id,
            metadata: {
              actionType: 'money_draft_approved',
              orderCode: order.orderCode,
              pendingDraft: false
            }
          }
        ];
        await insertNotificationsAndEmit(notifications);
      }
    }

    return buildServiceResponse(200, {
      success: true,
      message: 'Đã phê duyệt bản nháp thay đổi',
      data: order
    });
  } catch (error) {
    console.error('[orders.service][approveOrderDraft] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const rejectOrderDraft = async (orderId, payload = {}, currentUser) => {
  try {
    const { reason } = payload;

    const draft = await OrderDraft.findOne({ order: orderId, status: 'pending' });
    if (!draft) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy bản nháp đang chờ duyệt'
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    draft.status = 'rejected';
    draft.reviewedBy = currentUser._id;
    draft.reviewedAt = new Date();
    draft.reviewNote = reason || '';
    await draft.save();

    await OrderDraft.deleteMany({ order: orderId, status: 'pending' });

    const displayName = currentUser?.fullName || currentUser?.email || 'Admin';
    const note =
      'Admin không phê duyệt thay đổi' + (reason ? `: ${reason}` : '');
    await order.addStatusHistory(order.status, currentUser._id, `${displayName} - ${note}`);

    emitOrderEvent(order._id, 'updated', { moneyDraftRejected: true });

    const recipientId =
      typeof draft.createdBy === 'object' && draft.createdBy._id
        ? draft.createdBy._id
        : draft.createdBy;
    const senderId = currentUser?._id || currentUser;
    const rejectorName = currentUser?.fullName || currentUser?.email || 'Admin';

    if (recipientId && senderId) {
      const notifications = [
        {
          recipient: recipientId,
          sender: senderId,
          title: 'Bản nháp thay đổi bị từ chối',
          message: `${rejectorName} đã từ chối thay đổi của đơn ${
            order.orderCode || order._id
          }${reason ? `: ${reason}` : ''}`,
          type: 'order',
          link: `/orders/${order._id}`,
          orderId: order._id,
          metadata: {
            actionType: 'money_draft_rejected',
            orderCode: order.orderCode,
            pendingDraft: false,
            reason: reason || ''
          }
        }
      ];
      await insertNotificationsAndEmit(notifications);
    }

    return buildServiceResponse(200, {
      success: true,
      message: 'Đã từ chối bản thay đổi',
      data: order
    });
  } catch (error) {
    console.error('[orders.service][rejectOrderDraft] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};


