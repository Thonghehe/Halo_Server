import multer from 'multer';
import path from 'path';
import fs from 'fs';

const createDiskStorage = (folder, prefix) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads', folder);
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `${prefix}-${uniqueSuffix}${ext}`);
    }
  });

export const paintingStorage = createDiskStorage('paintings', 'painting');
export const depositStorage = createDiskStorage('deposits', 'deposit');
export const paymentBillStorage = createDiskStorage('payment-bills', 'payment-bill');
export const fileStorage = createDiskStorage('files', 'file');



