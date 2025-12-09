import Notification from '../../models/Notification.js';

const buildServiceResponse = (statusCode, body) => ({
  statusCode,
  body
});

export const getNotifications = async (currentUser, query = {}) => {
  try {
    const userId = currentUser._id;
    const { page = 1, limit = 20, unreadOnly = false, read, type } = query;

    const filter = { recipient: userId };

    if (read !== undefined && read !== '') {
      filter.read = read === 'true';
    } else if (unreadOnly === 'true') {
      filter.read = false;
    }

    if (type && type !== '') {
      filter.type = type;
    }

    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const skip = (parsedPage - 1) * parsedLimit;

    const notifications = await Notification.find(filter)
      .populate('sender', 'fullName email')
      .populate('orderId', 'orderCode customerName customerPhone')
      .sort({ createdAt: -1 })
      .limit(parsedLimit)
      .skip(skip);

    const total = await Notification.countDocuments(filter);
    const unreadCount = await Notification.countDocuments({ recipient: userId, read: false });

    return buildServiceResponse(200, {
      success: true,
      data: notifications,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit)
      },
      unreadCount
    });
  } catch (error) {
    console.error('[notifications.service][getNotifications] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: 'Lỗi khi tải thông báo'
    });
  }
};

export const markNotificationRead = async (notificationId, currentUser) => {
  try {
    const userId = currentUser._id;
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy thông báo'
      });
    }

    notification.read = true;
    await notification.save();

    return buildServiceResponse(200, {
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('[notifications.service][markNotificationRead] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: 'Lỗi khi cập nhật thông báo'
    });
  }
};

export const markAllNotificationsRead = async (currentUser) => {
  try {
    const userId = currentUser._id;
    const result = await Notification.updateMany(
      { recipient: userId, read: false },
      { read: true }
    );

    return buildServiceResponse(200, {
      success: true,
      message: `Đã đánh dấu ${result.modifiedCount} thông báo là đã đọc`
    });
  } catch (error) {
    console.error('[notifications.service][markAllNotificationsRead] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: 'Lỗi khi cập nhật thông báo'
    });
  }
};

export const getNotificationDetail = async (notificationId, currentUser) => {
  try {
    const userId = currentUser._id;
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId
    })
      .populate('sender', 'fullName email')
      .populate('orderId', 'orderCode customerName customerPhone');

    if (!notification) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy thông báo'
      });
    }

    if (!notification.read) {
      notification.read = true;
      await notification.save();
    }

    return buildServiceResponse(200, {
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('[notifications.service][getNotificationDetail] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: 'Lỗi khi tải thông báo'
    });
  }
};

export const deleteNotification = async (notificationId, currentUser) => {
  try {
    const userId = currentUser._id;
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy thông báo'
      });
    }

    return buildServiceResponse(200, {
      success: true,
      message: 'Đã xóa thông báo'
    });
  } catch (error) {
    console.error('[notifications.service][deleteNotification] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: 'Lỗi khi xóa thông báo'
    });
  }
};



