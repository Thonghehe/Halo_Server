import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationDetail,
  deleteNotification
} from '../services/notifications.service.js';
import notificationEmitter from '../utils/notificationEmitter.js';

export const streamNotificationsController = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const userId = req.user._id.toString();

  const sendToClient = (payload) => {
    const items = Array.isArray(payload) ? payload : [payload];
    items.forEach((item) => {
      const recipientId =
        typeof item.recipient === 'object' && item.recipient !== null
          ? item.recipient.toString()
          : String(item.recipient);
      if (recipientId === userId) {
        res.write(`data: ${JSON.stringify(item)}\n\n`);
      }
    });
  };

  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 25000);

  notificationEmitter.on('notification', sendToClient);

  req.on('close', () => {
    notificationEmitter.off('notification', sendToClient);
    clearInterval(keepAlive);
    res.end();
  });
};

export const getNotificationsController = async (req, res) => {
  const result = await getNotifications(req.user, req.query || {});
  return res.status(result.statusCode).json(result.body);
};

export const markNotificationReadController = async (req, res) => {
  const { id } = req.params;
  const result = await markNotificationRead(id, req.user);
  return res.status(result.statusCode).json(result.body);
};

export const markAllNotificationsReadController = async (req, res) => {
  const result = await markAllNotificationsRead(req.user);
  return res.status(result.statusCode).json(result.body);
};

export const getNotificationDetailController = async (req, res) => {
  const { id } = req.params;
  const result = await getNotificationDetail(id, req.user);
  return res.status(result.statusCode).json(result.body);
};

export const deleteNotificationController = async (req, res) => {
  const { id } = req.params;
  const result = await deleteNotification(id, req.user);
  return res.status(result.statusCode).json(result.body);
};



