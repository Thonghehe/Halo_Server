import orderEmitter from '../utils/orderEmitter.js';
import {
  getOrders as getOrdersService,
  getMentionableUsers as getMentionableUsersService,
  getSalesUsers as getSalesUsersService,
  getOrderDetail as getOrderDetailService,
  createOrder as createOrderService,
  updateOrder as updateOrderService,
  updateOrderStatus as updateOrderStatusService,
  getOrderDraft as getOrderDraftService,
  approveOrderDraft as approveOrderDraftService,
  rejectOrderDraft as rejectOrderDraftService,
  acceptOrder as acceptOrderService,
  completeOrder as completeOrderService,
  receiveOrder as receiveOrderService,
  requestRework as requestReworkService,
  productionRequest as productionRequestService,
  deleteOrder as deleteOrderService,
  deleteOldOrders as deleteOldOrdersService,
  markPaintingPrinted as markPaintingPrintedService,
  receivePaintingByProduction as receivePaintingByProductionService,
  receivePaintingByPacking as receivePaintingByPackingService
} from '../services/orders.service.js';

export const streamOrders = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const userRoles = Array.isArray(req.user?.roles) ? req.user.roles : [];

  const sendToClient = (payload) => {
    if (payload?.targetRoles?.length) {
      const hasRole = payload.targetRoles.some((role) => userRoles.includes(role));
      if (!hasRole) {
        return;
      }
    }
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 25000);

  orderEmitter.on('order_event', sendToClient);

  req.on('close', () => {
    orderEmitter.off('order_event', sendToClient);
    clearInterval(keepAlive);
    res.end();
  });
};

export const getOrders = async (req, res) => {
  const result = await getOrdersService(req.query);
  return res.status(result.statusCode).json(result.body);
};

export const getMentionableUsers = async (req, res) => {
  const result = await getMentionableUsersService();
  return res.status(result.statusCode).json(result.body);
};

export const getSalesUsers = async (req, res) => {
  const result = await getSalesUsersService();
  return res.status(result.statusCode).json(result.body);
};

export const getOrderDetail = async (req, res) => {
  const { orderId } = req.params;
  const result = await getOrderDetailService(orderId, req.user);
  return res.status(result.statusCode).json(result.body);
};

export const createOrder = async (req, res) => {
  const result = await createOrderService(req.body, req.user);
  return res.status(result.statusCode).json(result.body);
};

export const updateOrder = async (req, res) => {
  const { orderId } = req.params;
  const result = await updateOrderService(orderId, req.body, req.user);
  return res.status(result.statusCode).json(result.body);
};

export const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const result = await updateOrderStatusService(orderId, req.body, req.user);
  return res.status(result.statusCode).json(result.body);
};

export const getOrderDraft = async (req, res) => {
  const { orderId } = req.params;
  const result = await getOrderDraftService(orderId);
  return res.status(result.statusCode).json(result.body);
};

export const approveOrderDraft = async (req, res) => {
  const { orderId } = req.params;
  const result = await approveOrderDraftService(orderId, req.user);
  return res.status(result.statusCode).json(result.body);
};

export const rejectOrderDraft = async (req, res) => {
  const { orderId } = req.params;
  const result = await rejectOrderDraftService(orderId, req.body, req.user);
  return res.status(result.statusCode).json(result.body);
};

export const acceptOrder = async (req, res) => {
  const { orderId } = req.params;
  const result = await acceptOrderService(orderId, req.body, req.user);
  return res.status(result.statusCode).json(result.body);
};

export const completeOrder = async (req, res) => {
  const { orderId } = req.params;
  const result = await completeOrderService(orderId, req.body, req.user);
  return res.status(result.statusCode).json(result.body);
};

export const receiveOrder = async (req, res) => {
  const { orderId } = req.params;
  const result = await receiveOrderService(orderId, req.body, req.user);
  return res.status(result.statusCode).json(result.body);
};

export const requestRework = async (req, res) => {
  const { orderId } = req.params;
  const result = await requestReworkService(orderId, req.body, req.user);
  return res.status(result.statusCode).json(result.body);
};

export const productionRequest = async (req, res) => {
  const { orderId } = req.params;
  const result = await productionRequestService(orderId, req.body, req.user);
  return res.status(result.statusCode).json(result.body);
};

export const deleteOrder = async (req, res) => {
  const { orderId } = req.params;
  const { secretCode } = req.body || {};

  if (!secretCode || secretCode !== process.env.ADMIN_SECRET_CODE) {
    return res.status(403).json({
      success: false,
      message: 'Mã bí mật không chính xác'
    });
  }

  const result = await deleteOrderService(orderId, req.user);
  return res.status(result.statusCode).json(result.body);
};

export const deleteOldOrders = async (req, res) => {
  const { months, secretCode } = req.body || {};

  if (!secretCode || secretCode !== process.env.ADMIN_SECRET_CODE) {
    return res.status(403).json({
      success: false,
      message: 'Mã bí mật không chính xác'
    });
  }

  const result = await deleteOldOrdersService(months);
  return res.status(result.statusCode).json(result.body);
};

export const markPaintingPrinted = async (req, res) => {
  const { orderId, paintingId } = req.params;
  const result = await markPaintingPrintedService(orderId, paintingId, req.user);
  return res.status(result.statusCode).json(result.body);
};

export const receivePaintingByProduction = async (req, res) => {
  const { orderId, paintingId } = req.params;
  const result = await receivePaintingByProductionService(orderId, paintingId, req.user);
  return res.status(result.statusCode).json(result.body);
};

export const receivePaintingByPacking = async (req, res) => {
  const { orderId, paintingId } = req.params;
  const result = await receivePaintingByPackingService(orderId, paintingId, req.user);
  return res.status(result.statusCode).json(result.body);
};

