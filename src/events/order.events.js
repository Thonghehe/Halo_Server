import Notification from '../models/Notification.js';
import User from '../models/User.js';
import notificationEmitter from '../utils/notificationEmitter.js';
import orderEmitter from '../utils/orderEmitter.js';

const emitRealtimeNotifications = async (notificationsDocs = []) => {
  if (!notificationsDocs || notificationsDocs.length === 0) return;

  await Notification.populate(notificationsDocs, [
    { path: 'sender', select: 'fullName email' },
    { path: 'orderId', select: 'orderCode customerName customerPhone' }
  ]);

  const payload = notificationsDocs.map((doc) => {
    const plain = doc.toObject({ getters: true, virtuals: false });
    if (plain.recipient && plain.recipient.toString) {
      plain.recipient = plain.recipient.toString();
    }
    return plain;
  });

  notificationEmitter.emit('notification', payload);
};

export const insertNotificationsAndEmit = async (notifications = []) => {
  if (!notifications || notifications.length === 0) return [];
  const inserted = await Notification.insertMany(notifications);
  await emitRealtimeNotifications(inserted);
  return inserted;
};

export const emitOrderEvent = (orderId, action = 'updated', metadata = {}) => {
  if (!orderId) return;
  const payload = {
    orderId: orderId.toString(),
    action,
    timestamp: Date.now(),
    ...metadata
  };
  orderEmitter.emit('order_event', payload);
};

const getRolesByStatus = (status) => {
  const statusRoleMap = {
    moi_tao: ['sale', 'admin'],
    dang_xu_ly: ['in', 'catKhung'],
    cho_san_xuat: ['sanXuat'],
    da_vao_khung: ['sanXuat'],
    cho_dong_goi: ['dongGoi'],
    da_dong_goi: ['dongGoi'],
    cho_dieu_don: ['keToanDieuDon'],
    da_gui_di: ['keToanTaiChinh'],
    hoan_thanh: ['keToanTaiChinh', 'sale', 'admin'],
    khach_tra_hang: ['sale', 'admin'],
    khach_yeu_cau_sua: ['in', 'catKhung', 'sanXuat'],
    da_nhan_lai_don: ['sale', 'admin'],
    dong_goi_da_nhan_lai: ['dongGoi'],
    gui_lai_san_xuat: ['sanXuat'],
    cho_san_xuat_lai: ['sanXuat'],
    cat_vao_kho: ['sale', 'admin'],
    gui_lai_cho_khach: ['keToanDieuDon'],
    huy: [
      'sale',
      'admin',
      'in',
      'catKhung',
      'sanXuat',
      'dongGoi',
      'keToanDieuDon',
      'keToanTaiChinh'
    ]
  };

  return statusRoleMap[status] || [];
};

export const sendNotificationToStatusRoles = async (
  order,
  sender,
  title,
  message,
  actionType = 'edit',
  additionalMetadata = {}
) => {
  try {
    let roles = getRolesByStatus(order.status);

    const senderRoles = Array.isArray(sender.roles) ? sender.roles : [];
    const isAdmin = senderRoles.includes('admin');
    const isSale = senderRoles.includes('sale');
    const senderId = sender?._id;

    if (actionType === 'edit') {
      if (isAdmin) {
        roles = roles.filter((role) => role !== 'sale');
      }
      if (isSale) {
        roles = roles.filter((role) => role !== 'admin');
      }
    }

    if (roles.length === 0) {
      return;
    }

    const recipients = await User.find({
      roles: { $in: roles },
      active: true
    }).select('_id');

    if (recipients.length > 0) {
      const filteredRecipients = recipients.filter(
        (recipient) => senderId && recipient._id.toString() !== senderId.toString()
      );

      if (filteredRecipients.length > 0) {
        const notifications = filteredRecipients.map((recipient) => ({
          recipient: recipient._id,
          sender: sender._id,
          title,
          message,
          type: 'order',
          link: `/orders/${order._id}`,
          orderId: order._id,
          metadata: {
            orderCode: order.orderCode,
            status: order.status,
            actionType,
            ...additionalMetadata
          }
        }));

        await insertNotificationsAndEmit(notifications);
      }
    }
  } catch (error) {
    console.error('[sendNotificationToStatusRoles] Error:', error);
  }
};

export const sendNotificationToPrintingAndCuttingRoles = async (
  order,
  sender,
  title,
  message,
  actionType = 'edit',
  additionalMetadata = {}
) => {
  try {
    const rolesToNotify = [];

    if (order.printingStatus === 'da_in') {
      rolesToNotify.push('in');
    }

    if (order.frameCuttingStatus === 'da_cat_khung') {
      rolesToNotify.push('catKhung');
    }

    if (rolesToNotify.length === 0) {
      return;
    }

    const recipients = await User.find({
      roles: { $in: rolesToNotify },
      active: true
    }).select('_id');

    if (recipients.length > 0) {
      const senderId = sender?._id;
      const filteredRecipients = recipients.filter(
        (recipient) => senderId && recipient._id.toString() !== senderId.toString()
      );

      if (filteredRecipients.length > 0) {
        const notifications = filteredRecipients.map((recipient) => ({
          recipient: recipient._id,
          sender: sender._id,
          title,
          message,
          type: 'order',
          link: `/orders/${order._id}`,
          orderId: order._id,
          metadata: {
            orderCode: order.orderCode,
            actionType,
            ...additionalMetadata
          }
        }));

        await insertNotificationsAndEmit(notifications);
      }
    }
  } catch (error) {
    console.error('[sendNotificationToPrintingAndCuttingRoles] Error:', error);
  }
};


