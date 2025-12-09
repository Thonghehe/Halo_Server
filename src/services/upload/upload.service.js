import multer from 'multer';
import {
  paintingStorage,
  depositStorage,
  paymentBillStorage,
  fileStorage
} from './storage.js';
import { imageFilter, depositFilter, documentFilter } from './filters.js';

export const uploadPainting = multer({
  storage: paintingStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: imageFilter
});

export const uploadDeposit = multer({
  storage: depositStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: depositFilter
});

export const uploadPaymentBill = multer({
  storage: paymentBillStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: depositFilter
});

export const uploadFile = multer({
  storage: fileStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: documentFilter
});



