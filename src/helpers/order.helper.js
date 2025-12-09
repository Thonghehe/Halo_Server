import mongoose from 'mongoose';
import User from '../models/User.js';
import Painting from '../models/Painting.js';

export const SHIPPING_METHODS = ['viettel', 'ship_ngoai', 'khach_den_nhan', 'di_treo_cho_khach'];

export const SHIPPING_METHOD_LABELS = {
  viettel: 'Viettel Post',
  ship_ngoai: 'Ship ngoài',
  khach_den_nhan: 'Khách đến nhận',
  di_treo_cho_khach: 'Đi treo cho khách'
};

export const normalizeMentionIds = (mentionIds) => {
  if (!Array.isArray(mentionIds) || mentionIds.length === 0) {
    return [];
  }

  const uniqueIds = new Set();
  mentionIds.forEach((rawId) => {
    if (mongoose.Types.ObjectId.isValid(rawId)) {
      uniqueIds.add(rawId.toString());
    }
  });
  return Array.from(uniqueIds);
};

export const buildMentionEntries = async (mentionIds, taggedBy) => {
  const normalizedIds = normalizeMentionIds(mentionIds);
  if (normalizedIds.length === 0) {
    return [];
  }

  const users = await User.find({
    _id: { $in: normalizedIds },
    active: true
  })
    .select('_id fullName')
    .lean();

  const taggedAt = new Date();

  return users.map((user) => ({
    user: user._id,
    taggedBy,
    taggedAt
  }));
};

export const sanitizeProfitSharing = (profitSharing, paintingPrice = 0) => {
  if (!Array.isArray(profitSharing) || profitSharing.length === 0) {
    return [];
  }
  const baseAmount = Number(paintingPrice) || 0;

  return profitSharing
    .map((item) => {
      if (!item) return null;
      const rawUser = item.user?._id || item.user;
      if (!rawUser || !mongoose.Types.ObjectId.isValid(rawUser)) {
        return null;
      }
      const percentage = Math.max(0, Math.min(100, Number(item.percentage) || 0));
      const sanitizedAmount =
        item.amount !== undefined
          ? Math.max(0, Number(item.amount) || 0)
          : Math.round((baseAmount * percentage) / 100);

      return {
        user: new mongoose.Types.ObjectId(rawUser),
        percentage,
        amount: sanitizedAmount
      };
    })
    .filter(Boolean);
};

export const requiresFrameAssembly = (painting) => {
  if (!painting) return false;
  const type = typeof painting === 'string' ? painting : painting?.type;
  return type === 'tranh_khung' || type === 'tranh_tron';
};

export const requiresFrameCutting = (painting) => {
  if (!painting) return false;
  const type = typeof painting === 'string' ? painting : painting?.type;
  return type === 'tranh_khung';
};

export const clonePlainObject = (value) => JSON.parse(JSON.stringify(value));

export const normalizeShippingMethod = (value, fallback = null) => {
  const safeFallback = fallback && SHIPPING_METHODS.includes(fallback) ? fallback : null;
  if (value === undefined) {
    return safeFallback;
  }
  if (value === null || value === '') {
    return null;
  }
  const cleaned = String(value).trim().toLowerCase().replace(/\s+/g, '_');
  if (SHIPPING_METHODS.includes(cleaned)) {
    return cleaned;
  }
  if (cleaned.includes('viettel')) {
    return 'viettel';
  }
  if (cleaned.includes('ngoai')) {
    return 'ship_ngoai';
  }
  if (cleaned.includes('khach') || cleaned.includes('nhan')) {
    return 'khach_den_nhan';
  }
  if (cleaned.includes('treo') || cleaned.includes('di_treo')) {
    return 'di_treo_cho_khach';
  }
  return safeFallback;
};

export const getShippingMethodLabel = (method) => {
  if (!method) return 'Chưa chọn';
  return SHIPPING_METHOD_LABELS[method] || method;
};

export const recalculateDraftFinancials = (snapshot = {}) => {
  const paintingPrice = Number(snapshot.paintingPrice || 0);
  const constructionPrice = Number(snapshot.constructionPrice || 0);
  const shippingInstallationPrice = Number(snapshot.shippingInstallationPrice || 0);
  const designFee = Number(snapshot.designFee || 0);
  const extraFeeAmount = Number(snapshot.extraFeeAmount || 0);
  const existingTotalAmount = Number(snapshot.totalAmount || 0);
  const includeVat =
    snapshot.includeVat !== undefined && snapshot.includeVat !== null ? !!snapshot.includeVat : true;

  const isShopeeDirectInput =
    snapshot.orderType === 'shopee' &&
    existingTotalAmount > 0 &&
    paintingPrice === 0 &&
    constructionPrice === 0 &&
    shippingInstallationPrice === 0 &&
    designFee === 0 &&
    extraFeeAmount === 0;

  if (isShopeeDirectInput) {
    snapshot.vat = 0;
    snapshot.totalAmount = existingTotalAmount;
  } else {
    const subtotal =
      paintingPrice + constructionPrice + shippingInstallationPrice + designFee + extraFeeAmount;
    const vat = includeVat ? Math.round(subtotal * 0.08) : 0;
    snapshot.vat = vat;
    snapshot.totalAmount = Math.round(subtotal + vat);
  }

  snapshot.profitSharing = sanitizeProfitSharing(snapshot.profitSharing || [], paintingPrice);

  const deposit = Number(snapshot.depositAmount || 0);
  const cod = snapshot.totalAmount - deposit;
  snapshot.cod = cod > 0 ? cod : 0;

  if (!snapshot.extraFeeAmount || snapshot.extraFeeAmount <= 0) {
    snapshot.extraFeeAmount = 0;
    snapshot.extraFeeName = '';
  }

  return snapshot;
};

export const normalizeNumberInput = (value) => {
  if (value === undefined || value === null || value === '') return null;
  let parsedValue = value;
  if (typeof parsedValue === 'string') {
    const trimmed = parsedValue.trim();
    const cleaned = trimmed.replace(/[^\d-]/g, '');
    parsedValue = cleaned === '' ? null : Number(cleaned);
  } else {
    parsedValue = Number(parsedValue);
  }
  if (parsedValue === null) return null;
  const parsed = Number(parsedValue);
  if (Number.isNaN(parsed)) return null;
  return parsed;
};

export const normalizeBooleanInput = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (lowered === 'true' || lowered === '1' || lowered === 'yes') return true;
    if (lowered === 'false' || lowered === '0' || lowered === 'no') return false;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return null;
};

export const buildDraftData = (order, payload = {}) => {
  const base =
    order?.toObject && typeof order.toObject === 'function'
      ? order.toObject({ depopulate: false })
      : { ...order };
  const snapshot = clonePlainObject(base);
  const has = (field) => Object.prototype.hasOwnProperty.call(payload, field);
  const assign = (field, value) => {
    snapshot[field] = value;
  };

  const pickOrExisting = (field, defaultValue) => (has(field) ? payload[field] : defaultValue);

  assign('customerName', pickOrExisting('customerName', snapshot.customerName));
  assign('customerAddress', pickOrExisting('customerAddress', snapshot.customerAddress));
  assign('customerPhone', pickOrExisting('customerPhone', snapshot.customerPhone));
  assign('orderType', pickOrExisting('orderType', snapshot.orderType));
  assign('note', pickOrExisting('note', snapshot.note));
  assign('noteMentions', pickOrExisting('noteMentions', snapshot.noteMentions || []));
  assign('status', pickOrExisting('status', snapshot.status));
  assign('printingStatus', pickOrExisting('printingStatus', snapshot.printingStatus));
  assign('frameCuttingStatus', pickOrExisting('frameCuttingStatus', snapshot.frameCuttingStatus));
  assign('assignedTo', pickOrExisting('assignedTo', snapshot.assignedTo || []));
  assign(
    'expectedCompletionDate',
    pickOrExisting('expectedCompletionDate', snapshot.expectedCompletionDate)
  );
  assign(
    'actualCompletionDate',
    pickOrExisting('actualCompletionDate', snapshot.actualCompletionDate)
  );
  assign('orderCode', pickOrExisting('orderCode', snapshot.orderCode));

  assign(
    'depositAmount',
    Number(
      pickOrExisting(
        'depositAmount',
        snapshot.depositAmount !== undefined ? snapshot.depositAmount : 0
      )
    ) || 0
  );
  assign(
    'totalAmount',
    Number(
      pickOrExisting('totalAmount', snapshot.totalAmount !== undefined ? snapshot.totalAmount : 0)
    ) || 0
  );
  assign(
    'depositImages',
    has('depositImages') ? (Array.isArray(payload.depositImages) ? payload.depositImages : []) : snapshot.depositImages || []
  );
  assign(
    'paymentBillImages',
    has('paymentBillImages')
      ? (Array.isArray(payload.paymentBillImages) ? payload.paymentBillImages : [])
      : snapshot.paymentBillImages || []
  );
  assign('paintings', has('paintings') ? payload.paintings || [] : snapshot.paintings || []);

  assign(
    'paintingPrice',
    Number(pickOrExisting('paintingPrice', snapshot.paintingPrice || 0)) || 0
  );
  assign(
    'constructionPrice',
    Number(pickOrExisting('constructionPrice', snapshot.constructionPrice || 0)) || 0
  );
  assign('designFee', Number(pickOrExisting('designFee', snapshot.designFee || 0)) || 0);
  assign(
    'shippingInstallationPrice',
    Number(pickOrExisting('shippingInstallationPrice', snapshot.shippingInstallationPrice || 0)) || 0
  );
  assign(
    'extraFeeName',
    has('extraFeeName')
      ? String(payload.extraFeeName || '').trim()
      : snapshot.extraFeeName || ''
  );
  assign(
    'extraFeeAmount',
    Number(pickOrExisting('extraFeeAmount', snapshot.extraFeeAmount || 0)) || 0
  );
  assign(
    'includeVat',
    has('includeVat')
      ? !!payload.includeVat
      : snapshot.includeVat !== undefined
      ? snapshot.includeVat
      : true
  );
  assign(
    'shippingMethod',
    has('shippingMethod')
      ? normalizeShippingMethod(payload.shippingMethod, snapshot.shippingMethod || null)
      : snapshot.shippingMethod || null
  );
  assign(
    'shippingTrackingCode',
    has('shippingTrackingCode')
      ? String(payload.shippingTrackingCode || '').trim()
      : snapshot.shippingTrackingCode || ''
  );
  assign(
    'shippingExternalInfo',
    has('shippingExternalInfo')
      ? String(payload.shippingExternalInfo || '').trim()
      : snapshot.shippingExternalInfo || ''
  );
  assign(
    'shippingExternalCost',
    Number(
      has('shippingExternalCost')
        ? (payload.shippingExternalCost ?? (snapshot.shippingExternalCost || 0))
        : (snapshot.shippingExternalCost || 0)
    ) || 0
  );

  if (!snapshot.extraFeeAmount || snapshot.extraFeeAmount <= 0) {
    snapshot.extraFeeName = '';
    snapshot.extraFeeAmount = 0;
  }

  assign('profitSharing', pickOrExisting('profitSharing', snapshot.profitSharing || []));

  return recalculateDraftFinancials(snapshot);
};

const normalizeObjectId = (value) => {
  if (!value) return null;
  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }
  if (typeof value === 'string' && mongoose.Types.ObjectId.isValid(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return null;
};

export const extractPaintingId = (painting) => {
  if (!painting) return null;
  const candidates = [
    painting._id,
    painting.id,
    painting.paintingId,
    painting.painting?._id,
    painting.painting?.id
  ];
  for (const candidate of candidates) {
    if (candidate) {
      const normalized = normalizeObjectId(candidate);
      if (normalized) {
        return normalized.toString();
      }
      if (typeof candidate === 'string') {
        return candidate;
      }
    }
  }
  return null;
};

const parsePositiveNumber = (value) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return null;
};

const sanitizeMediaArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => (item ? String(item).trim() : '')).filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
};

const buildPaintingDocumentData = async (paintingPayload = {}, taggedByUserId) => {
  const type = paintingPayload.type || 'tranh_khung';
  const isCircle = type === 'tranh_tron';
  const diameter = parsePositiveNumber(
    paintingPayload.diameter ?? paintingPayload.d ?? paintingPayload.width ?? paintingPayload.height
  );

  const width = isCircle ? diameter : parsePositiveNumber(paintingPayload.width);
  const height = isCircle ? diameter : parsePositiveNumber(paintingPayload.height);

  if (!width || !height) {
    return null;
  }

  const frameTypeValue = paintingPayload.frameType || paintingPayload.frame || '';
  const frameType = String(frameTypeValue).trim();
  if (!frameType) {
    return null;
  }

  const images = sanitizeMediaArray(paintingPayload.images);
  const files = sanitizeMediaArray(paintingPayload.files);
  const image = paintingPayload.image || images[0] || '';
  const file = paintingPayload.file || files[0] || '';

  let noteMentionsEntries = [];
  if (Array.isArray(paintingPayload.noteMentions) && paintingPayload.noteMentions.length > 0) {
    if (taggedByUserId) {
      noteMentionsEntries = await buildMentionEntries(paintingPayload.noteMentions, taggedByUserId);
    } else {
      noteMentionsEntries = paintingPayload.noteMentions;
    }
  }

  const quantity = Math.max(1, Number(paintingPayload.quantity) || 1);

  return {
    image,
    images,
    file,
    files,
    width,
    height,
    type,
    frameType,
    note: paintingPayload.note ? String(paintingPayload.note).trim() : '',
    noteMentions: noteMentionsEntries,
    quantity
  };
};

export const updateOrderPaintings = async ({
  order,
  newPaintings,
  taggedByUserId,
  changes = []
} = {}) => {
  if (!order || !Array.isArray(newPaintings)) {
    return;
  }

  const existingPaintings = Array.isArray(order.paintings) ? order.paintings : [];
  const existingMap = new Map();
  existingPaintings.forEach((paintingDoc) => {
    const id =
      paintingDoc && paintingDoc._id ? paintingDoc._id.toString() : paintingDoc?.toString?.();
    if (id) {
      existingMap.set(id, paintingDoc);
    }
  });

  const updatedIds = [];
  let hasMutations = false;

  for (const paintingPayload of newPaintings) {
    if (!paintingPayload) continue;
    const normalizedData = await buildPaintingDocumentData(paintingPayload, taggedByUserId);
    if (!normalizedData) continue;

    const paintingId = extractPaintingId(paintingPayload);
    if (paintingId && existingMap.has(paintingId)) {
      const doc = existingMap.get(paintingId);
      Object.assign(doc, normalizedData);
      await doc.save();
      updatedIds.push(doc._id);
      existingMap.delete(paintingId);
      hasMutations = true;
    } else {
      const created = await new Painting({
        ...normalizedData,
        orderId: order._id
      }).save();
      updatedIds.push(created._id);
      hasMutations = true;
    }
  }

  const removedIds = Array.from(existingMap.keys());
  if (removedIds.length > 0) {
    await Painting.deleteMany({ _id: { $in: removedIds } });
    hasMutations = true;
  }

  if (updatedIds.length > 0) {
    order.paintings = updatedIds;
  } else if (order.paintings && order.paintings.length > 0) {
    order.paintings = order.paintings.map((p) => p._id || p);
  }

  if (hasMutations && Array.isArray(changes)) {
    changes.push('Danh sách tranh: đã cập nhật');
  }
};

export const isProfitSharingDifferent = (nextList = [], currentList = []) => {
  if (!Array.isArray(nextList)) return false;
  const normalize = (list) =>
    list
      .filter(Boolean)
      .map((entry) => {
        const userId =
          entry?.user?._id ||
          entry?.user?.id ||
          entry?.user ||
          entry?.userId ||
          entry?.id ||
          '';
        return {
          user: userId ? userId.toString() : '',
          percentage: Number(entry?.percentage) || 0,
          amount: Number(entry?.amount) || 0
        };
      })
      .sort((a, b) => {
        if (a.user !== b.user) return a.user.localeCompare(b.user);
        if (a.percentage !== b.percentage) return a.percentage - b.percentage;
        return a.amount - b.amount;
      });

  const normalizedNext = normalize(nextList);
  const normalizedCurrent = normalize(currentList);

  if (normalizedNext.length !== normalizedCurrent.length) {
    return true;
  }

  for (let i = 0; i < normalizedNext.length; i += 1) {
    const nextEntry = normalizedNext[i];
    const currentEntry = normalizedCurrent[i];
    if (
      nextEntry.user !== currentEntry.user ||
      nextEntry.percentage !== currentEntry.percentage ||
      nextEntry.amount !== currentEntry.amount
    ) {
      return true;
    }
  }

  return false;
};

export const applyDraftToOrder = async (order, draft) => {
  if (!order || !draft) return;
  const data = draft.data || {};

  // Apply TẤT CẢ các trường từ draft.data vì khi có thay đổi tiền,
  // tất cả các thay đổi (cả tiền và các trường khác) đều được lưu vào draft và cần phê duyệt
  const assignIfDefined = (field, transformer) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      order[field] = transformer ? transformer(data[field]) : data[field];
    }
  };

  // Apply các trường thông tin khách hàng và đơn hàng
  assignIfDefined('customerName', (value) => value || '');
  assignIfDefined('customerAddress', (value) => value || '');
  assignIfDefined('customerPhone', (value) => value || '');
  assignIfDefined('orderType', (value) => value || order.orderType);
  assignIfDefined('note', (value) => value || '');
  assignIfDefined('noteMentions', (value) => (Array.isArray(value) ? value : []));
  assignIfDefined('status');
  assignIfDefined('printingStatus');
  assignIfDefined('frameCuttingStatus');
  assignIfDefined('assignedTo', (value) => (Array.isArray(value) ? value : []));
  assignIfDefined('expectedCompletionDate', (value) => (value ? new Date(value) : null));
  assignIfDefined('actualCompletionDate', (value) => (value ? new Date(value) : null));
  assignIfDefined('orderCode', (value) => value || order.orderCode);

  const numericFields = [
    'depositAmount',
    'totalAmount',
    'paintingPrice',
    'constructionPrice',
    'designFee',
    'shippingInstallationPrice',
    'extraFeeAmount',
    'shippingExternalCost',
    'vat'
  ];
  numericFields.forEach((field) => {
    assignIfDefined(field, (value) => Number(value) || 0);
  });

  // Chỉ apply depositImages và paymentBillImages nếu có trong draft.data
  // Nhưng không ghi đè nếu chúng đã được cập nhật trực tiếp
  assignIfDefined('depositImages', (value) =>
    Array.isArray(value) ? value : order.depositImages || []
  );
  assignIfDefined('paymentBillImages', (value) =>
    Array.isArray(value) ? value : order.paymentBillImages || []
  );

  assignIfDefined('includeVat', (value) => !!value);

  assignIfDefined('shippingMethod', (value) => normalizeShippingMethod(value, order.shippingMethod || null));
  assignIfDefined('shippingTrackingCode', (value) => (value ? String(value).trim() : ''));
  assignIfDefined('shippingExternalInfo', (value) => (value ? String(value).trim() : ''));

  if (order.shippingMethod !== 'viettel' && order.shippingTrackingCode) {
    order.shippingTrackingCode = '';
  }
  if (order.shippingMethod !== 'ship_ngoai') {
    order.shippingExternalInfo = '';
    order.shippingExternalCost = 0;
  }

  assignIfDefined('extraFeeName', (value) => (value ? String(value).trim() : ''));

  // Chỉ apply profitSharing nếu có trong draft.data
  if (Array.isArray(data.profitSharing)) {
    const basePaintingPrice =
      data.paintingPrice !== undefined
        ? Number(data.paintingPrice) || 0
        : Number(order.paintingPrice || 0);
    order.profitSharing = sanitizeProfitSharing(data.profitSharing, basePaintingPrice);
  }

  // Apply paintings từ draft vì chúng cũng cần được phê duyệt cùng với tiền
  if (Array.isArray(data.paintings) && data.paintings.length > 0) {
    await updateOrderPaintings({
      order,
      newPaintings: data.paintings,
      taggedByUserId: draft.createdBy?._id || draft.createdBy || null
    });
  }
};

