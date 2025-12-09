import fs from 'fs';
import path from 'path';
import {
  uploadPainting,
  uploadDeposit,
  uploadPaymentBill,
  uploadFile,
  ensureUploadDirs,
  getBaseUrl
} from '../services/upload/index.js';

ensureUploadDirs();

const buildErrorResponse = (res, message = 'Lỗi khi upload file', status = 500) =>
  res.status(status).json({
    success: false,
    message
  });

export const uploadPaintingController = [
  uploadPainting.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn file ảnh'
        });
      }

      const baseUrl = getBaseUrl(req);
      const imageUrl = `${baseUrl}/api/upload/paintings/${req.file.filename}`;

      return res.json({
        success: true,
        message: 'Upload ảnh tranh thành công',
        data: {
          url: imageUrl,
          filename: req.file.filename,
          size: req.file.size
        }
      });
    } catch (error) {
      console.error('[Upload painting] Error:', error);
      return buildErrorResponse(res, error.message || 'Lỗi khi upload ảnh');
    }
  }
];

export const uploadDepositController = [
  uploadDeposit.array('images', 10),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn ít nhất một file'
        });
      }

      const baseUrl = getBaseUrl(req);
      const uploadedFiles = req.files.map((file) => ({
        url: `${baseUrl}/api/upload/deposits/${file.filename}`,
        filename: file.filename,
        size: file.size
      }));

      return res.json({
        success: true,
        message: `Upload thành công ${req.files.length} file`,
        data: uploadedFiles
      });
    } catch (error) {
      console.error('[Upload deposit] Error:', error);
      return buildErrorResponse(res, error.message || 'Lỗi khi upload file');
    }
  }
];

export const uploadPaymentBillController = [
  uploadPaymentBill.array('images', 10),
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn ít nhất một file'
        });
      }

      const baseUrl = getBaseUrl(req);
      const uploadedFiles = req.files.map((file) => ({
        url: `${baseUrl}/api/upload/payment-bills/${file.filename}`,
        filename: file.filename,
        size: file.size
      }));

      return res.json({
        success: true,
        message: `Upload thành công ${req.files.length} file`,
        data: uploadedFiles
      });
    } catch (error) {
      console.error('[Upload payment bill] Error:', error);
      return buildErrorResponse(res, error.message || 'Lỗi khi upload file');
    }
  }
];

export const uploadFileController = [
  (req, res, next) => {
    uploadFile.single('file')(req, res, (err) => {
      if (err) {
        console.error('[Upload file] Multer error:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({
            success: false,
            message: 'File quá lớn. Tối đa 50MB'
          });
        }
        return res.status(400).json({
          success: false,
          message: err.message || 'Lỗi khi upload file'
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng chọn file'
        });
      }

      const baseUrl = getBaseUrl(req);
      const fileUrl = `${baseUrl}/api/upload/files/${req.file.filename}`;

      return res.json({
        success: true,
        message: 'Upload file thành công',
        data: {
          url: fileUrl,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype
        }
      });
    } catch (error) {
      console.error('[Upload file] Error:', error);
      return buildErrorResponse(res, error.message || 'Lỗi khi upload file');
    }
  }
];

export const serveUploadedFileController = async (req, res) => {
  try {
    const { type, filename } = req.params;

    if (!['paintings', 'deposits', 'files'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Loại file không hợp lệ'
      });
    }

    const filePath = path.join(process.cwd(), 'uploads', type, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File không tồn tại'
      });
    }

    return res.sendFile(filePath);
  } catch (error) {
    console.error('[Get upload file] Error:', error);
    return buildErrorResponse(res, error.message || 'Lỗi khi lấy file');
  }
};

export const deleteUploadedFileController = async (req, res) => {
  try {
    const { type, filename } = req.params;
    if (!['paintings', 'deposits', 'files'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Loại file không hợp lệ. Chỉ chấp nhận: paintings, deposits, files'
      });
    }

    const filePath = path.join(process.cwd(), 'uploads', type, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return res.json({
        success: true,
        message: 'Xóa file thành công'
      });
    }

    return res.status(404).json({
      success: false,
      message: 'Không tìm thấy file'
    });
  } catch (error) {
    console.error('[Delete upload] Error:', error);
    return buildErrorResponse(res, error.message || 'Lỗi khi xóa file');
  }
};



