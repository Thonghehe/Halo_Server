import Order from '../../models/Order.js';
import OrderDraft from '../../models/OrderDraft.js';
import Painting from '../../models/Painting.js';
import User from '../../models/User.js';
import { deleteFileFromUrl, deleteFilesFromUrls } from '../upload/utils.js';
import {
  buildMentionEntries,
  sanitizeProfitSharing,
  requiresFrameCutting,
  normalizeShippingMethod,
  getShippingMethodLabel,
  normalizeNumberInput,
  normalizeBooleanInput,
  isProfitSharingDifferent,
  updateOrderPaintings
} from '../../helpers/order.helper.js';
import {
  emitOrderEvent,
  insertNotificationsAndEmit,
  sendNotificationToStatusRoles,
  sendNotificationToPrintingAndCuttingRoles
} from '../../events/order.events.js';
import { buildServiceResponse } from './utils.js';

export const createOrder = async (payload = {}, currentUser) => {
  try {
    const {
      orderCodeCustom,
      paintings = [],
      customerName,
      customerAddress,
      customerPhone,
      orderType,
      note,
      depositImages,
      depositAmount,
      totalAmount,
      noteMentions,
      paintingPrice,
      constructionPrice,
      designFee,
      shippingInstallationPrice,
      customerPaysShipping,
      vat,
      includeVat,
      profitSharing,
      shippingMethod,
      shippingTrackingCode,
      shippingExternalInfo,
      shippingExternalCost,
      extraFeeName,
      extraFeeAmount,
      printingStatus,
      frameCuttingStatus,
      paymentBillImages
    } = payload;

    const orderCode = Order.generateOrderCode(orderCodeCustom);
    const mentionEntries = await buildMentionEntries(noteMentions, currentUser._id);

    const normalizedPaintingPrice = Number(paintingPrice) || 0;
    const normalizedConstructionPrice = Number(constructionPrice) || 0;
    const normalizedDesignFee = Number(designFee) || 0;
    const normalizedShippingInstallationPrice = Number(shippingInstallationPrice) || 0;
    const normalizedCustomerPaysShipping = customerPaysShipping !== undefined ? Boolean(customerPaysShipping) : true;
    const normalizedIncludeVat = includeVat === undefined ? true : !!includeVat;
    const normalizedVat = Number(vat) || 0;
    const shippingMethodProvided = shippingMethod !== undefined;
    const normalizedShippingMethod = shippingMethodProvided
      ? normalizeShippingMethod(shippingMethod, null)
      : null;
    const sanitizedTrackingCode =
      normalizedShippingMethod === 'viettel'
        ? (shippingTrackingCode !== undefined && shippingTrackingCode !== null
            ? String(shippingTrackingCode).trim()
            : '')
        : '';
    const sanitizedExternalInfo =
      normalizedShippingMethod === 'ship_ngoai'
        ? String(shippingExternalInfo || '').trim()
        : '';
    const normalizedExternalCost =
      normalizedShippingMethod === 'ship_ngoai'
        ? Number(shippingExternalCost) || 0
        : 0;
    const sanitizedExtraFeeNameRaw = String(extraFeeName || '').trim();
    const normalizedExtraFeeAmount = Number(extraFeeAmount) || 0;
    if (normalizedExtraFeeAmount > 0 && !sanitizedExtraFeeNameRaw) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Vui lòng nhập tên phí phát sinh'
      });
    }
    const sanitizedExtraFeeName =
      normalizedExtraFeeAmount > 0 ? sanitizedExtraFeeNameRaw : '';
    const normalizedExtraFeeAmountValue =
      normalizedExtraFeeAmount > 0 ? normalizedExtraFeeAmount : 0;

    const sanitizedPaymentBillImages = Array.isArray(paymentBillImages)
      ? paymentBillImages.map((img) => String(img || '').trim()).filter(Boolean)
      : [];

    const validPrintingStatuses = [
      'chua_in',
      'cho_in',
      'dang_in',
      'da_in',
      'san_xuat_da_nhan_tranh',
      'yeu_cau_in_lai',
      'cho_in_lai',
      'co_san'
    ];
    const validFrameCuttingStatuses = [
      'chua_cat',
      'cho_cat_khung',
      'dang_cat_khung',
      'da_cat_khung',
      'yeu_cau_cat_lai',
      'cho_cat_lai_khung',
      'khong_cat_khung',
      'co_san'
    ];
    const normalizedPrintingStatus =
      printingStatus && validPrintingStatuses.includes(printingStatus)
        ? printingStatus
        : undefined;
    const normalizedFrameCuttingStatus =
      frameCuttingStatus && validFrameCuttingStatuses.includes(frameCuttingStatus)
        ? frameCuttingStatus
        : undefined;

    // Tính lại VAT và tổng tiền dựa trên customerPaysShipping
    // Kiểm tra trường hợp Shopee nhập trực tiếp tổng tiền
    const isShopeeDirectInput =
      orderType === 'shopee' &&
      Number(totalAmount) > 0 &&
      normalizedPaintingPrice === 0 &&
      normalizedConstructionPrice === 0 &&
      normalizedDesignFee === 0 &&
      normalizedExtraFeeAmountValue === 0;

    let calculatedVat = normalizedVat;
    let calculatedTotalAmount = Number(totalAmount) || 0;

    if (!isShopeeDirectInput) {
      if (normalizedCustomerPaysShipping) {
        // Nếu khách chịu: cộng vào tổng đơn hàng
        const subtotal =
          normalizedPaintingPrice +
          normalizedConstructionPrice +
          normalizedDesignFee +
          normalizedExtraFeeAmountValue +
          normalizedShippingInstallationPrice;
        calculatedVat = normalizedIncludeVat ? Math.round(subtotal * 0.08) : 0;
        calculatedTotalAmount = Math.round(subtotal + calculatedVat);
      } else {
        // Nếu không phải khách chịu: vận chuyển & lắp đặt là tiền riêng, không ảnh hưởng tổng tiền
        const subtotal =
          normalizedPaintingPrice +
          normalizedConstructionPrice +
          normalizedDesignFee +
          normalizedExtraFeeAmountValue;
        calculatedVat = normalizedIncludeVat ? Math.round(subtotal * 0.08) : 0;
        calculatedTotalAmount = Math.round(subtotal + calculatedVat);
      }
    }

    const order = new Order({
      orderCode,
      customerName,
      customerAddress,
      customerPhone,
      orderType,
      note,
      depositImages,
      depositAmount: Number(depositAmount) || 0,
      totalAmount: calculatedTotalAmount,
      createdBy: currentUser._id,
      noteMentions: mentionEntries,
      paintingPrice: normalizedPaintingPrice,
      constructionPrice: normalizedConstructionPrice,
      designFee: normalizedDesignFee,
      shippingInstallationPrice: normalizedShippingInstallationPrice,
      customerPaysShipping: normalizedCustomerPaysShipping,
      includeVat: normalizedIncludeVat,
      vat: calculatedVat,
      shippingMethod: normalizedShippingMethod,
      shippingTrackingCode: sanitizedTrackingCode,
      shippingExternalInfo: sanitizedExternalInfo,
      shippingExternalCost: normalizedExternalCost,
      extraFeeName: sanitizedExtraFeeName,
      extraFeeAmount: normalizedExtraFeeAmountValue,
      profitSharing: sanitizeProfitSharing(profitSharing, normalizedPaintingPrice),
      ...(normalizedPrintingStatus && { printingStatus: normalizedPrintingStatus }),
      ...(normalizedFrameCuttingStatus && { frameCuttingStatus: normalizedFrameCuttingStatus }),
      ...(sanitizedPaymentBillImages.length > 0 && { paymentBillImages: sanitizedPaymentBillImages })
    });

    await order.save();

    const paintingPromises = paintings.map(async (painting, index) => {
      let paintingNoteMentions = [];
      if (painting.noteMentions && Array.isArray(painting.noteMentions) && painting.noteMentions.length > 0) {
        paintingNoteMentions = await buildMentionEntries(painting.noteMentions, currentUser._id);
      }

      const paintingData = {
        ...painting,
        orderId: order._id
      };

      delete paintingData._id;

      if (paintingNoteMentions.length > 0) {
        paintingData.noteMentions = paintingNoteMentions;
      }

      return new Painting(paintingData).save();
    });

    const savedPaintings = await Promise.all(paintingPromises);
    order.paintings = savedPaintings.map((p) => p._id);

    if (!normalizedFrameCuttingStatus) {
      const hasTranhKhungOnCreate = savedPaintings.some((p) => requiresFrameCutting(p));
      if (!hasTranhKhungOnCreate) {
        order.frameCuttingStatus = 'khong_cat_khung';
      } else if (order.frameCuttingStatus === 'khong_cat_khung') {
        order.frameCuttingStatus = 'chua_cat';
      }
    }
    await order.save();

    await order.addStatusHistory('moi_tao', currentUser._id, 'Đơn hàng được tạo');

    if (mentionEntries.length > 0) {
      const senderName = currentUser.fullName || currentUser.email || 'Người dùng';
      const notificationsMap = new Map();

      mentionEntries.forEach((entry) => {
        const recipientId = entry.user.toString();
        if (recipientId === currentUser._id.toString()) {
          return;
        }
        if (!notificationsMap.has(recipientId)) {
          notificationsMap.set(recipientId, {
            recipient: entry.user,
            sender: currentUser._id,
            title: 'Bạn được nhắc đến trong đơn hàng',
            message: `${senderName} đã nhắc bạn trong ghi chú của đơn ${order.orderCode}.`,
            type: 'order',
            link: `/orders/${order._id}`,
            orderId: order._id,
            metadata: {
              notePreview: note ? note.slice(0, 200) : ''
            }
          });
        }
      });

      if (notificationsMap.size > 0) {
        await insertNotificationsAndEmit(Array.from(notificationsMap.values()));
      }
    }

    emitOrderEvent(order._id, 'created');

    return buildServiceResponse(201, {
      success: true,
      message: 'Tạo đơn hàng thành công',
      data: order
    });
  } catch (error) {
    console.error('[orders.service][createOrder] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const updateOrder = async (orderId, payload = {}, currentUser) => {
  try {
    const {
      orderCodeCustom,
      paintings,
      customerName,
      customerAddress,
      customerPhone,
      orderType,
      note,
      depositImages,
      depositAmount,
      totalAmount,
      paintingPrice,
      constructionPrice,
      designFee,
      shippingInstallationPrice,
      customerPaysShipping,
      includeVat,
      vat,
      profitSharing,
      shippingMethod,
      shippingTrackingCode,
      shippingExternalInfo,
      shippingExternalCost,
      extraFeeName,
      extraFeeAmount,
      paymentBillImages
    } = payload;

    const order = await Order.findById(orderId)
      .populate('paintings')
      .populate('createdBy', '_id fullName email');

    if (!order) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    const oldData = {
      orderCode: order.orderCode,
      customerName: order.customerName,
      customerAddress: order.customerAddress,
      customerPhone: order.customerPhone,
      orderType: order.orderType,
      note: order.note,
      depositAmount: order.depositAmount,
      totalAmount: order.totalAmount,
      paintingPrice: order.paintingPrice || 0,
      constructionPrice: order.constructionPrice || 0,
      designFee: order.designFee || 0,
      shippingInstallationPrice: order.shippingInstallationPrice || 0,
      vat: order.vat || 0,
      includeVat: order.includeVat,
      shippingMethod: order.shippingMethod || null,
      shippingTrackingCode: order.shippingTrackingCode || '',
      shippingExternalInfo: order.shippingExternalInfo || '',
      shippingExternalCost: order.shippingExternalCost || 0,
      extraFeeName: order.extraFeeName || '',
      extraFeeAmount: order.extraFeeAmount || 0,
      paintingsCount: order.paintings ? order.paintings.length : 0,
      depositImagesCount: order.depositImages ? order.depositImages.length : 0,
      paymentBillImagesCount: order.paymentBillImages ? order.paymentBillImages.length : 0
    };

    const changes = [];

    const normalizedPaintingPriceInput = normalizeNumberInput(paintingPrice);
    const normalizedConstructionPriceInput = normalizeNumberInput(constructionPrice);
    const normalizedDesignFeeInput = normalizeNumberInput(designFee);
    const normalizedShippingInstallationInput = normalizeNumberInput(shippingInstallationPrice);
    const normalizedDepositAmountInput = normalizeNumberInput(depositAmount);
    const normalizedTotalAmountInput = normalizeNumberInput(totalAmount);
    const normalizedVatInput = normalizeNumberInput(vat);
    const normalizedIncludeVatInput = normalizeBooleanInput(includeVat);
    const customerPaysShippingProvided = Object.prototype.hasOwnProperty.call(payload, 'customerPaysShipping');
    const normalizedCustomerPaysShippingInput = customerPaysShippingProvided
      ? Boolean(customerPaysShipping)
      : undefined;

    const shippingMethodProvided = Object.prototype.hasOwnProperty.call(payload, 'shippingMethod');
    const normalizedShippingMethodInput = shippingMethodProvided
      ? normalizeShippingMethod(shippingMethod, null)
      : undefined;
    const trackingProvided = Object.prototype.hasOwnProperty.call(payload, 'shippingTrackingCode');
    const sanitizedTrackingCodeInput = trackingProvided
      ? String(shippingTrackingCode || '').trim()
      : undefined;
    const externalInfoProvided = Object.prototype.hasOwnProperty.call(
      payload,
      'shippingExternalInfo'
    );
    const sanitizedExternalInfoInput = externalInfoProvided
      ? String(shippingExternalInfo || '').trim()
      : undefined;
    const externalCostProvided = Object.prototype.hasOwnProperty.call(
      payload,
      'shippingExternalCost'
    );
    const normalizedExternalCostInput = externalCostProvided
      ? normalizeNumberInput(shippingExternalCost)
      : undefined;
    const normalizedExternalCostValue =
      externalCostProvided && normalizedExternalCostInput === null ? 0 : normalizedExternalCostInput;
    const extraFeeNameProvided = Object.prototype.hasOwnProperty.call(payload, 'extraFeeName');
    const sanitizedExtraFeeNameInput = extraFeeNameProvided
      ? String(extraFeeName || '').trim()
      : undefined;
    const extraFeeAmountProvided = Object.prototype.hasOwnProperty.call(
      payload,
      'extraFeeAmount'
    );
    const normalizedExtraFeeAmountInput = extraFeeAmountProvided
      ? normalizeNumberInput(extraFeeAmount)
      : undefined;
    const normalizedExtraFeeAmountValue =
      extraFeeAmountProvided && normalizedExtraFeeAmountInput === null
        ? 0
        : normalizedExtraFeeAmountInput;

    const hasProfitSharingChange =
      Array.isArray(profitSharing) && isProfitSharingDifferent(profitSharing, order.profitSharing || []);

    const hasPaintingPriceChange =
      normalizedPaintingPriceInput !== null &&
      normalizedPaintingPriceInput !== Number(order.paintingPrice || 0);
    const hasConstructionPriceChange =
      normalizedConstructionPriceInput !== null &&
      normalizedConstructionPriceInput !== Number(order.constructionPrice || 0);
    const hasShippingInstallationPriceChange =
      normalizedShippingInstallationInput !== null &&
      normalizedShippingInstallationInput !== Number(order.shippingInstallationPrice || 0);
    const hasDepositAmountChange =
      normalizedDepositAmountInput !== null &&
      normalizedDepositAmountInput !== Number(order.depositAmount || 0);
    const hasTotalAmountChange =
      normalizedTotalAmountInput !== null &&
      normalizedTotalAmountInput !== Number(order.totalAmount || 0);
    const hasVatChange =
      normalizedVatInput !== null && normalizedVatInput !== Number(order.vat || 0);
    const hasIncludeVatChange =
      normalizedIncludeVatInput !== null && normalizedIncludeVatInput !== Boolean(order.includeVat);
    const hasCustomerPaysShippingChange =
      customerPaysShippingProvided &&
      normalizedCustomerPaysShippingInput !== undefined &&
      normalizedCustomerPaysShippingInput !== Boolean(order.customerPaysShipping !== undefined ? order.customerPaysShipping : true);
    const hasShippingMethodChange =
      shippingMethodProvided &&
      (normalizedShippingMethodInput || null) !== (order.shippingMethod || null);
    const hasShippingTrackingCodeChange =
      trackingProvided &&
      (sanitizedTrackingCodeInput || '') !== (order.shippingTrackingCode || '');
    const hasShippingExternalInfoChange =
      externalInfoProvided &&
      (sanitizedExternalInfoInput || '') !== (order.shippingExternalInfo || '');
    const hasShippingExternalCostChange =
      externalCostProvided &&
      normalizedExternalCostValue !== undefined &&
      normalizedExternalCostValue !== Number(order.shippingExternalCost || 0);

    const currentExtraFeeAmount = Number(order.extraFeeAmount || 0);
    let nextExtraFeeAmount = currentExtraFeeAmount;
    if (
      extraFeeAmountProvided &&
      normalizedExtraFeeAmountValue !== undefined &&
      normalizedExtraFeeAmountValue !== null
    ) {
      nextExtraFeeAmount = normalizedExtraFeeAmountValue;
    }

    let nextExtraFeeName = order.extraFeeName || '';
    if (extraFeeAmountProvided) {
      nextExtraFeeName =
        nextExtraFeeAmount > 0
          ? (extraFeeNameProvided
              ? sanitizedExtraFeeNameInput || nextExtraFeeName
              : nextExtraFeeName)
          : '';
    } else if (extraFeeNameProvided) {
      nextExtraFeeName = sanitizedExtraFeeNameInput || '';
    }

    if (nextExtraFeeAmount > 0 && !nextExtraFeeName) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Vui lòng nhập tên phí phát sinh'
      });
    }

    const hasDesignFeeChange =
      normalizedDesignFeeInput !== null &&
      normalizedDesignFeeInput !== Number(order.designFee || 0);
    const hasExtraFeeAmountChange = nextExtraFeeAmount !== currentExtraFeeAmount;
    const hasExtraFeeNameChange = nextExtraFeeName !== (order.extraFeeName || '');

    if (orderCodeCustom) {
      const newOrderCode = Order.generateOrderCode(orderCodeCustom);
      if (newOrderCode !== oldData.orderCode) {
        const existingOrder = await Order.findOne({
          orderCode: newOrderCode,
          _id: { $ne: orderId }
        });
        if (existingOrder) {
          return buildServiceResponse(400, {
            success: false,
            message: 'Mã đơn hàng đã tồn tại'
          });
        }
        changes.push(`Mã đơn hàng: "${oldData.orderCode}" → "${newOrderCode}"`);
        order.orderCode = newOrderCode;
      }
    }

    const isMoneyChange =
      hasPaintingPriceChange ||
      hasConstructionPriceChange ||
      hasDesignFeeChange ||
      hasShippingInstallationPriceChange ||
      hasIncludeVatChange ||
      hasCustomerPaysShippingChange ||
      hasDepositAmountChange ||
      hasTotalAmountChange ||
      hasVatChange ||
      hasProfitSharingChange ||
      hasShippingExternalCostChange ||
      hasExtraFeeAmountChange;

    const user = currentUser;
    const isSale = Array.isArray(user?.roles) && user.roles.includes('sale') && !user.roles.includes('admin');

    // Nếu có thay đổi tiền và là sale, KHÔNG sửa trực tiếp các trường khác
    // Tất cả thay đổi sẽ được lưu vào draft và cần phê duyệt
    if (isMoneyChange && isSale) {
      const originalData = {
        customerName: order.customerName,
        customerAddress: order.customerAddress,
        customerPhone: order.customerPhone,
        orderType: order.orderType,
        note: order.note,
        depositAmount: order.depositAmount,
        totalAmount: order.totalAmount,
        paintingPrice: order.paintingPrice || 0,
        constructionPrice: order.constructionPrice || 0,
        shippingInstallationPrice: order.shippingInstallationPrice || 0,
        vat: order.vat || 0,
        includeVat: order.includeVat,
        shippingMethod: order.shippingMethod || null,
        shippingTrackingCode: order.shippingTrackingCode || '',
        shippingExternalInfo: order.shippingExternalInfo || '',
        shippingExternalCost: order.shippingExternalCost || 0,
        depositImages: order.depositImages || [],
        profitSharing: order.profitSharing || [],
        paintings: order.paintings ? order.paintings.map(p => p.toObject ? p.toObject() : p) : []
      };

      const proposedData = {
        customerName: customerName !== undefined ? customerName : order.customerName,
        customerAddress: customerAddress !== undefined ? customerAddress : order.customerAddress,
        customerPhone: customerPhone !== undefined ? customerPhone : order.customerPhone,
        orderType: orderType !== undefined ? orderType : order.orderType,
        note: note !== undefined ? note : order.note,
        depositAmount: normalizedDepositAmountInput !== null ? normalizedDepositAmountInput : order.depositAmount,
        totalAmount: normalizedTotalAmountInput !== null ? normalizedTotalAmountInput : order.totalAmount,
        paintingPrice: normalizedPaintingPriceInput !== null ? normalizedPaintingPriceInput : (order.paintingPrice || 0),
        constructionPrice: normalizedConstructionPriceInput !== null ? normalizedConstructionPriceInput : (order.constructionPrice || 0),
        designFee: normalizedDesignFeeInput !== null ? normalizedDesignFeeInput : (order.designFee || 0),
        shippingInstallationPrice:
          normalizedShippingInstallationInput !== null
            ? normalizedShippingInstallationInput
            : (order.shippingInstallationPrice || 0),
        includeVat: normalizedIncludeVatInput !== null ? normalizedIncludeVatInput : order.includeVat,
        shippingMethod:
          shippingMethodProvided
            ? (normalizedShippingMethodInput || null)
            : (order.shippingMethod || null),
        shippingTrackingCode:
          trackingProvided
            ? (sanitizedTrackingCodeInput || '')
            : (order.shippingTrackingCode || ''),
        shippingExternalInfo:
          externalInfoProvided
            ? (sanitizedExternalInfoInput || '')
            : (order.shippingExternalInfo || ''),
        shippingExternalCost:
          externalCostProvided
            ? (normalizedExternalCostValue !== undefined
                ? normalizedExternalCostValue
                : (order.shippingExternalCost || 0))
            : (order.shippingExternalCost || 0),
        extraFeeName:
          extraFeeNameProvided || extraFeeAmountProvided
            ? nextExtraFeeName
            : (order.extraFeeName || ''),
        extraFeeAmount:
          extraFeeAmountProvided
            ? nextExtraFeeAmount
            : (order.extraFeeAmount || 0),
        customerPaysShipping:
          customerPaysShippingProvided && normalizedCustomerPaysShippingInput !== undefined
            ? normalizedCustomerPaysShippingInput
            : (order.customerPaysShipping !== undefined ? order.customerPaysShipping : true),
        depositImages: depositImages !== undefined ? depositImages : (order.depositImages || []),
        profitSharing: Array.isArray(profitSharing) ? profitSharing : (order.profitSharing || [])
      };
      if (proposedData.shippingMethod !== 'viettel') {
        proposedData.shippingTrackingCode = '';
      }
      if (proposedData.shippingMethod !== 'ship_ngoai') {
        proposedData.shippingExternalInfo = '';
        proposedData.shippingExternalCost = 0;
      }

      const sanitizedPayloadPaintings = Array.isArray(paintings)
        ? paintings.filter(
            (p) =>
              p &&
              (p._id ||
                p.paintingCode ||
                p.image ||
                p.imageUrl ||
                (p.painting && p.painting._id))
          )
        : null;

      if (sanitizedPayloadPaintings && sanitizedPayloadPaintings.length > 0) {
        proposedData.paintings = sanitizedPayloadPaintings.map((p) =>
          p && typeof p.toObject === 'function' ? p.toObject() : p
        );
      } else {
        proposedData.paintings = originalData.paintings;
      }

      // Tính lại VAT và totalAmount dựa trên customerPaysShipping
      if (proposedData.customerPaysShipping) {
        // Nếu khách chịu: cộng vào tổng đơn hàng
        const subtotal =
          (proposedData.paintingPrice || 0) +
          (proposedData.constructionPrice || 0) +
          (proposedData.designFee || 0) +
          (proposedData.extraFeeAmount || 0) +
          (proposedData.shippingInstallationPrice || 0);
        if (proposedData.includeVat) {
          proposedData.vat = Math.round(subtotal * 0.08);
          proposedData.totalAmount = Math.round(subtotal + proposedData.vat);
        } else {
          proposedData.vat = 0;
          proposedData.totalAmount = subtotal;
        }
      } else {
        // Nếu không phải khách chịu: vận chuyển & lắp đặt là tiền riêng, không ảnh hưởng tổng tiền
        const subtotal =
          (proposedData.paintingPrice || 0) +
          (proposedData.constructionPrice || 0) +
          (proposedData.designFee || 0) +
          (proposedData.extraFeeAmount || 0);
        if (proposedData.includeVat) {
          proposedData.vat = Math.round(subtotal * 0.08);
          proposedData.totalAmount = Math.round(subtotal + proposedData.vat);
        } else {
          proposedData.vat = 0;
          proposedData.totalAmount = subtotal;
        }
      }

      if (Array.isArray(proposedData.profitSharing) && proposedData.profitSharing.length > 0) {
        proposedData.profitSharing = proposedData.profitSharing.map(entry => ({
          ...entry,
          amount: Math.round(((proposedData.paintingPrice || 0) * (entry.percentage || 0)) / 100)
        }));
      }

      const draftPayload = {
        order: order._id,
        createdBy: user._id,
        originalData: originalData,
        data: proposedData
      };

      await OrderDraft.deleteMany({ order: order._id, status: 'pending' });
      await OrderDraft.create(draftPayload);

      const adminUsers = await User.find({
        active: true,
        roles: { $in: ['admin'] }
      })
        .select('_id')
        .lean();

      if (adminUsers && adminUsers.length > 0) {
        const senderDisplayName = user.fullName || user.email || 'Sale';
        const notifications = adminUsers
          .map((admin) => ({
            recipient: admin._id,
            sender: user._id,
            title: 'Đơn hàng cần duyệt thay đổi',
            message: `${senderDisplayName} đề xuất thay đổi tiền cho đơn ${order.orderCode || order._id}`,
            type: 'order',
            link: `/orders/${order._id}`,
            orderId: order._id,
            metadata: {
              actionType: 'money_draft',
              orderCode: order.orderCode,
              pendingDraft: true
            }
          }));
        if (notifications.length > 0) {
          await insertNotificationsAndEmit(notifications);
        }
      }

      emitOrderEvent(order._id, 'draft_pending', { pendingMoneyDraft: true });

      return buildServiceResponse(200, {
        success: true,
        message: 'Đã tạo bản nháp thay đổi, chờ admin phê duyệt',
        data: order
      });
    }

    // Nếu không có thay đổi tiền hoặc không phải sale, mới được sửa trực tiếp các trường khác
    if (customerName !== undefined && customerName !== oldData.customerName) {
      changes.push(`Tên khách hàng: "${oldData.customerName || ''}" → "${customerName}"`);
      order.customerName = customerName;
    }
    if (customerAddress !== undefined && customerAddress !== oldData.customerAddress) {
      changes.push(`Địa chỉ: "${oldData.customerAddress || ''}" → "${customerAddress}"`);
      order.customerAddress = customerAddress;
    }
    if (customerPhone !== undefined && customerPhone !== oldData.customerPhone) {
      changes.push(`Số điện thoại: "${oldData.customerPhone || ''}" → "${customerPhone}"`);
      order.customerPhone = customerPhone;
    }

    if (orderType !== undefined && orderType !== oldData.orderType) {
      const typeLabels = { thuong: 'Thường', gap: 'Gấp', shopee: 'Shopee', tiktok: 'TikTok' };
      changes.push(`Loại đơn: "${typeLabels[oldData.orderType] || oldData.orderType}" → "${typeLabels[orderType] || orderType}"`);
      order.orderType = orderType;
    }
    if (note !== undefined && note !== oldData.note) {
      changes.push(`Ghi chú: đã cập nhật`);
      order.note = note;
    }
    if (depositImages !== undefined) {
      const newDepositImagesCount = Array.isArray(depositImages) ? depositImages.length : 0;
      if (newDepositImagesCount !== oldData.depositImagesCount) {
        if (newDepositImagesCount > oldData.depositImagesCount) {
          changes.push(`Ảnh cọc: thêm ${newDepositImagesCount - oldData.depositImagesCount} ảnh`);
        } else {
          changes.push(`Ảnh cọc: xóa ${oldData.depositImagesCount - newDepositImagesCount} ảnh`);
        }
      }
    }

    if (paymentBillImages !== undefined) {
      const newPaymentBillImagesCount = Array.isArray(paymentBillImages)
        ? paymentBillImages.length
        : 0;
      if (newPaymentBillImagesCount !== oldData.paymentBillImagesCount) {
        if (newPaymentBillImagesCount > oldData.paymentBillImagesCount) {
          changes.push(
            `Ảnh bill thanh toán: thêm ${
              newPaymentBillImagesCount - oldData.paymentBillImagesCount
            } ảnh`
          );
        } else {
          changes.push(
            `Ảnh bill thanh toán: xóa ${
              oldData.paymentBillImagesCount - newPaymentBillImagesCount
            } ảnh`
          );
        }
      }
    }

    if (hasDepositAmountChange && normalizedDepositAmountInput !== null) {
      changes.push(
        `Tiền cọc: ${oldData.depositAmount?.toLocaleString('vi-VN') || 0}đ → ${normalizedDepositAmountInput.toLocaleString('vi-VN')}đ`
      );
      order.depositAmount = normalizedDepositAmountInput;
    }
    if (hasTotalAmountChange && normalizedTotalAmountInput !== null) {
      changes.push(
        `Tổng tiền: ${oldData.totalAmount?.toLocaleString('vi-VN') || 0}đ → ${normalizedTotalAmountInput.toLocaleString('vi-VN')}đ`
      );
      order.totalAmount = normalizedTotalAmountInput;
    }

    if (depositImages !== undefined) {
      order.depositImages = depositImages;
    }
    if (paymentBillImages !== undefined) {
      order.paymentBillImages = paymentBillImages;
    }

    if (!isSale || !isMoneyChange) {
      if (hasPaintingPriceChange && normalizedPaintingPriceInput !== null) {
        changes.push(
          `Tiền tranh: ${Number(order.paintingPrice || 0).toLocaleString('vi-VN')}đ → ${normalizedPaintingPriceInput.toLocaleString('vi-VN')}đ`
        );
        order.paintingPrice = normalizedPaintingPriceInput;
      }

      if (hasConstructionPriceChange && normalizedConstructionPriceInput !== null) {
        changes.push(
          `Tiền thi công: ${Number(order.constructionPrice || 0).toLocaleString('vi-VN')}đ → ${normalizedConstructionPriceInput.toLocaleString('vi-VN')}đ`
        );
        order.constructionPrice = normalizedConstructionPriceInput;
      }

      if (hasDesignFeeChange && normalizedDesignFeeInput !== null) {
        changes.push(
          `Tiền thiết kế: ${Number(order.designFee || 0).toLocaleString('vi-VN')}đ → ${normalizedDesignFeeInput.toLocaleString('vi-VN')}đ`
        );
        order.designFee = normalizedDesignFeeInput;
      }

      if (hasShippingInstallationPriceChange && normalizedShippingInstallationInput !== null) {
        changes.push(
          `Vận chuyển & lắp đặt: ${Number(order.shippingInstallationPrice || 0).toLocaleString('vi-VN')}đ → ${normalizedShippingInstallationInput.toLocaleString('vi-VN')}đ`
        );
        order.shippingInstallationPrice = normalizedShippingInstallationInput;
      }

      if (hasCustomerPaysShippingChange && normalizedCustomerPaysShippingInput !== undefined) {
        changes.push(
          `Khách chịu vận chuyển: ${order.customerPaysShipping !== undefined && order.customerPaysShipping ? 'Có' : 'Không'} → ${normalizedCustomerPaysShippingInput ? 'Có' : 'Không'}`
        );
        order.customerPaysShipping = normalizedCustomerPaysShippingInput;
      }

      if (extraFeeAmountProvided || extraFeeNameProvided) {
        if (hasExtraFeeAmountChange) {
          changes.push(
            `Phí phát sinh: ${Number(order.extraFeeAmount || 0).toLocaleString('vi-VN')}đ → ${nextExtraFeeAmount.toLocaleString('vi-VN')}đ`
          );
        }
        if (hasExtraFeeNameChange) {
          changes.push(
            `Tên phí phát sinh: "${order.extraFeeName || 'Chưa có'}" → "${nextExtraFeeName || 'Chưa có'}"`
          );
        }
        order.extraFeeAmount = nextExtraFeeAmount;
        order.extraFeeName = nextExtraFeeName;
      }

      if (hasIncludeVatChange && normalizedIncludeVatInput !== null) {
        changes.push(
          `Bao gồm VAT: ${order.includeVat ? 'Có' : 'Không'} → ${normalizedIncludeVatInput ? 'Có' : 'Không'}`
        );
        order.includeVat = normalizedIncludeVatInput;
      }

      // Tính lại VAT và totalAmount nếu có thay đổi về giá hoặc customerPaysShipping
      const needsRecalculation =
        hasPaintingPriceChange ||
        hasConstructionPriceChange ||
        hasDesignFeeChange ||
        hasShippingInstallationPriceChange ||
        hasIncludeVatChange ||
        hasCustomerPaysShippingChange ||
        hasExtraFeeAmountChange;

      if (needsRecalculation) {
        const currentCustomerPaysShipping =
          normalizedCustomerPaysShippingInput !== undefined
            ? normalizedCustomerPaysShippingInput
            : (order.customerPaysShipping !== undefined ? order.customerPaysShipping : true);
        const currentPaintingPrice =
          normalizedPaintingPriceInput !== null ? normalizedPaintingPriceInput : (order.paintingPrice || 0);
        const currentConstructionPrice =
          normalizedConstructionPriceInput !== null ? normalizedConstructionPriceInput : (order.constructionPrice || 0);
        const currentDesignFee =
          normalizedDesignFeeInput !== null ? normalizedDesignFeeInput : (order.designFee || 0);
        const currentShippingInstallationPrice =
          normalizedShippingInstallationInput !== null ? normalizedShippingInstallationInput : (order.shippingInstallationPrice || 0);
        const currentExtraFeeAmount =
          normalizedExtraFeeAmountValue !== undefined ? normalizedExtraFeeAmountValue : (order.extraFeeAmount || 0);
        const currentIncludeVat =
          normalizedIncludeVatInput !== null ? normalizedIncludeVatInput : order.includeVat;

        if (currentCustomerPaysShipping) {
          // Nếu khách chịu: cộng vào tổng đơn hàng
          const subtotal =
            currentPaintingPrice +
            currentConstructionPrice +
            currentDesignFee +
            currentExtraFeeAmount +
            currentShippingInstallationPrice;
          const newVat = currentIncludeVat ? Math.round(subtotal * 0.08) : 0;
          const newTotalAmount = Math.round(subtotal + newVat);
          if (newVat !== Number(order.vat || 0)) {
            changes.push(
              `VAT: ${Number(order.vat || 0).toLocaleString('vi-VN')}đ → ${newVat.toLocaleString('vi-VN')}đ`
            );
            order.vat = newVat;
          }
          if (newTotalAmount !== Number(order.totalAmount || 0)) {
            changes.push(
              `Tổng tiền: ${Number(order.totalAmount || 0).toLocaleString('vi-VN')}đ → ${newTotalAmount.toLocaleString('vi-VN')}đ`
            );
            order.totalAmount = newTotalAmount;
          }
        } else {
          // Nếu không phải khách chịu: vận chuyển & lắp đặt là tiền riêng, không ảnh hưởng tổng tiền
          const subtotal =
            currentPaintingPrice +
            currentConstructionPrice +
            currentDesignFee +
            currentExtraFeeAmount;
        const newVat = currentIncludeVat ? Math.round(subtotal * 0.08) : 0;
        const newTotalAmount = Math.round(subtotal + newVat);
          if (newVat !== Number(order.vat || 0)) {
            changes.push(
              `VAT: ${Number(order.vat || 0).toLocaleString('vi-VN')}đ → ${newVat.toLocaleString('vi-VN')}đ`
            );
            order.vat = newVat;
          }
          if (newTotalAmount !== Number(order.totalAmount || 0)) {
            changes.push(
              `Tổng tiền: ${Number(order.totalAmount || 0).toLocaleString('vi-VN')}đ → ${newTotalAmount.toLocaleString('vi-VN')}đ`
            );
            order.totalAmount = newTotalAmount;
          }
        }
      } else if (hasVatChange && normalizedVatInput !== null) {
        changes.push(
          `VAT: ${Number(order.vat || 0).toLocaleString('vi-VN')}đ → ${normalizedVatInput.toLocaleString('vi-VN')}đ`
        );
        order.vat = normalizedVatInput;
      }

      if (hasProfitSharingChange && Array.isArray(profitSharing)) {
        const basePaintingPrice =
          normalizedPaintingPriceInput !== null
            ? normalizedPaintingPriceInput
            : Number(order.paintingPrice || 0);
        order.profitSharing = sanitizeProfitSharing(profitSharing, basePaintingPrice);
        changes.push('Tỷ lệ ăn chia: đã cập nhật');
      }
    }

    if (shippingMethodProvided) {
      const previousLabel = getShippingMethodLabel(order.shippingMethod || null);
      const nextMethod = normalizedShippingMethodInput || null;
      if ((order.shippingMethod || null) !== nextMethod) {
        const newLabel = getShippingMethodLabel(nextMethod);
        changes.push(`Hình thức gửi: ${previousLabel} → ${newLabel}`);
        order.shippingMethod = nextMethod;
      }
      if (order.shippingMethod !== 'viettel') {
        order.shippingTrackingCode = '';
      }
      if (order.shippingMethod !== 'ship_ngoai') {
        order.shippingExternalInfo = '';
        order.shippingExternalCost = 0;
      }
    }

    if (trackingProvided) {
      const prevLabel = order.shippingTrackingCode ? order.shippingTrackingCode : 'Chưa có';
      const nextValue = sanitizedTrackingCodeInput || '';
      if (nextValue !== (order.shippingTrackingCode || '')) {
        const nextLabel = nextValue ? nextValue : 'Chưa có';
        changes.push(`Mã đơn vận: ${prevLabel} → ${nextLabel}`);
        order.shippingTrackingCode = nextValue;
      }
    }

    if (externalInfoProvided) {
      const prevInfo = order.shippingExternalInfo ? order.shippingExternalInfo : 'Chưa có';
      const nextInfo = sanitizedExternalInfoInput || '';
      if (nextInfo !== (order.shippingExternalInfo || '')) {
        const nextLabel = nextInfo ? nextInfo : 'Chưa có';
        changes.push(`Thông tin ship ngoài: ${prevInfo} → ${nextLabel}`);
        order.shippingExternalInfo = nextInfo;
      }
    }

    if (externalCostProvided && normalizedExternalCostValue !== undefined) {
      const nextCost =
        normalizedExternalCostValue !== undefined
          ? normalizedExternalCostValue
          : Number(order.shippingExternalCost || 0);
      if (nextCost !== Number(order.shippingExternalCost || 0)) {
        changes.push(
          `Phí ship ngoài: ${Number(order.shippingExternalCost || 0).toLocaleString('vi-VN')}đ → ${nextCost.toLocaleString('vi-VN')}đ`
        );
        order.shippingExternalCost = nextCost;
      }
    }

    await order.save();

    // Chỉ update paintings trực tiếp nếu không có draft (không phải sale hoặc không có thay đổi tiền)
    // Nếu có draft, paintings sẽ được lưu vào draft và chỉ apply khi approve
    if (!isSale || !isMoneyChange) {
    await updateOrderPaintings({
      order,
      newPaintings: paintings,
      taggedByUserId: currentUser?._id,
      changes
    });
    }

    {
      const displayName = currentUser?.fullName || currentUser?.email || 'Người dùng';
      const changeDetails = changes.length > 0 ? ` - ${changes.join(', ')}` : '';
      const noteParts = [`Đơn hàng được sửa bởi ${displayName}${changeDetails}`];
      await order.addStatusHistory(order.status, currentUser._id, noteParts.join(' '));
    }

    if (changes.length > 0) {
      try {
        const displayName = currentUser?.fullName || currentUser?.email || 'Người dùng';
        const title = 'Đơn hàng đã được sửa';
        const message = `${displayName} đã sửa đơn hàng ${order.orderCode || order._id}. Chi tiết: ${changes.join(', ')}`;

        const metadata = {
          changes: changes,
          changedFields: changes.map(change => {
            const match = change.match(/^([^:]+):/);
            return match ? match[1].trim() : change;
          })
        };

        await sendNotificationToStatusRoles(order, currentUser, title, message, 'edit', metadata);

        await sendNotificationToPrintingAndCuttingRoles(order, currentUser, title, message, 'edit', metadata);

        const senderRoles = Array.isArray(currentUser.roles) ? currentUser.roles : [];
        const isAdmin = senderRoles.includes('admin');
        const isSaleRole = senderRoles.includes('sale');
        const orderCreatorId = order.createdBy?._id || order.createdBy;
        const senderId = currentUser._id;

        if ((isAdmin || isSaleRole) && orderCreatorId && senderId && orderCreatorId.toString() !== senderId.toString()) {
          try {
            const creatorNotification = {
              recipient: orderCreatorId,
              sender: senderId,
              title: 'Đơn hàng của bạn đã được sửa',
              message: `${displayName} đã sửa đơn hàng ${order.orderCode || order._id} của bạn. Chi tiết: ${changes.join(', ')}`,
              type: 'order',
              link: `/orders/${order._id}`,
              orderId: order._id,
              metadata: {
                orderCode: order.orderCode,
                status: order.status,
                actionType: 'edit',
                editedByOther: true,
                ...metadata
              }
            };
            await insertNotificationsAndEmit([creatorNotification]);
          } catch (creatorNotifyError) {
            console.error('[PATCH /orders/:orderId] Notify creator error:', creatorNotifyError);
          }
        }
      } catch (notifyError) {
        console.error('[PATCH /orders/:orderId] Notify error:', notifyError);
      }
    }

    emitOrderEvent(order._id, 'updated');

    return buildServiceResponse(200, {
      success: true,
      message: 'Cập nhật đơn hàng thành công',
      data: order
    });
  } catch (error) {
    console.error('[PATCH /orders/:orderId] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const deleteOrder = async (orderId) => {
  try {
    const order = await Order.findById(orderId).populate('paintings');

    if (!order) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    // Thu thập tất cả URLs/filenames cần xóa với type tương ứng
    const filesToDelete = [];

    // Xóa ảnh cọc từ order (deposits)
    if (Array.isArray(order.depositImages) && order.depositImages.length > 0) {
      order.depositImages.forEach((img) => {
        if (img) filesToDelete.push({ url: img, type: 'deposits' });
      });
    }

    // Xóa ảnh hóa đơn thanh toán từ order (payment-bills)
    if (Array.isArray(order.paymentBillImages) && order.paymentBillImages.length > 0) {
      order.paymentBillImages.forEach((img) => {
        if (img) filesToDelete.push({ url: img, type: 'payment-bills' });
      });
    }

    // Xóa ảnh và file từ paintings
    if (order.paintings && Array.isArray(order.paintings)) {
      order.paintings.forEach((painting) => {
        if (painting.image) filesToDelete.push({ url: painting.image, type: 'paintings' });
        if (Array.isArray(painting.images) && painting.images.length > 0) {
          painting.images.forEach((img) => {
            if (img) filesToDelete.push({ url: img, type: 'paintings' });
          });
        }
        if (painting.file) filesToDelete.push({ url: painting.file, type: 'files' });
        if (Array.isArray(painting.files) && painting.files.length > 0) {
          painting.files.forEach((file) => {
            if (file) filesToDelete.push({ url: file, type: 'files' });
          });
        }
      });
    }

    // Xóa các file từ filesystem
    if (filesToDelete.length > 0) {
      let deletedCount = 0;
      filesToDelete.forEach(({ url, type }) => {
        if (deleteFileFromUrl(url, type)) {
          deletedCount++;
        }
      });
      console.log(`[deleteOrder] Đã xóa ${deletedCount}/${filesToDelete.length} file từ filesystem`);
    }

    // Xóa paintings từ database
    await Painting.deleteMany({ orderId: order._id });
    
    // Xóa order từ database
    await Order.findByIdAndDelete(orderId);

    emitOrderEvent(orderId, 'deleted');

    return buildServiceResponse(200, {
      success: true,
      message: 'Xóa đơn hàng thành công'
    });
  } catch (error) {
    console.error('[orders.service][deleteOrder] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const deleteOldOrders = async (months) => {
  try {
    if (!months || months <= 0) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Số tháng phải lớn hơn 0'
      });
    }

    // Tính ngày cutoff: trước X tháng
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    cutoffDate.setHours(0, 0, 0, 0);

    // Tìm các đơn hàng cũ hơn cutoffDate và populate paintings để lấy URLs
    const oldOrders = await Order.find({
      createdAt: { $lt: cutoffDate }
    }).populate('paintings').lean();

    if (oldOrders.length === 0) {
      return buildServiceResponse(200, {
        success: true,
        message: 'Không có đơn hàng nào cần xóa',
        deletedCount: 0
      });
    }

    const orderIds = oldOrders.map(o => o._id);

    // Thu thập tất cả URLs/filenames cần xóa
    const filesToDelete = [];

    oldOrders.forEach((order) => {
      // Xóa ảnh cọc từ order (deposits)
      if (Array.isArray(order.depositImages) && order.depositImages.length > 0) {
        order.depositImages.forEach((img) => {
          if (img) filesToDelete.push({ url: img, type: 'deposits' });
        });
      }

      // Xóa ảnh hóa đơn thanh toán từ order (payment-bills)
      if (Array.isArray(order.paymentBillImages) && order.paymentBillImages.length > 0) {
        order.paymentBillImages.forEach((img) => {
          if (img) filesToDelete.push({ url: img, type: 'payment-bills' });
        });
      }

      // Xóa ảnh và file từ paintings
      if (order.paintings && Array.isArray(order.paintings)) {
        order.paintings.forEach((painting) => {
          if (painting.image) filesToDelete.push({ url: painting.image, type: 'paintings' });
          if (Array.isArray(painting.images) && painting.images.length > 0) {
            painting.images.forEach((img) => {
              if (img) filesToDelete.push({ url: img, type: 'paintings' });
            });
          }
          if (painting.file) filesToDelete.push({ url: painting.file, type: 'files' });
          if (Array.isArray(painting.files) && painting.files.length > 0) {
            painting.files.forEach((file) => {
              if (file) filesToDelete.push({ url: file, type: 'files' });
            });
          }
        });
      }
    });

    // Xóa các file từ filesystem
    if (filesToDelete.length > 0) {
      let deletedFilesCount = 0;
      filesToDelete.forEach(({ url, type }) => {
        if (deleteFileFromUrl(url, type)) {
          deletedFilesCount++;
        }
      });
      console.log(`[deleteOldOrders] Đã xóa ${deletedFilesCount}/${filesToDelete.length} file từ filesystem`);
    }

    // Xóa tất cả paintings liên quan
    await Painting.deleteMany({ orderId: { $in: orderIds } });

    // Xóa tất cả order drafts liên quan
    await OrderDraft.deleteMany({ order: { $in: orderIds } });

    // Xóa các đơn hàng
    const deleteResult = await Order.deleteMany({ _id: { $in: orderIds } });

    // Emit events cho từng đơn hàng đã xóa
    orderIds.forEach(orderId => {
      emitOrderEvent(orderId, 'deleted');
    });

    return buildServiceResponse(200, {
      success: true,
      message: `Đã xóa ${deleteResult.deletedCount} đơn hàng cũ hơn ${months} tháng`,
      deletedCount: deleteResult.deletedCount
    });
  } catch (error) {
    console.error('[orders.service][deleteOldOrders] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};


