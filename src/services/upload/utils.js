import fs from 'fs';
import path from 'path';

export const ensureUploadDirs = () => {
  const baseDir = path.join(process.cwd(), 'uploads');
  const dirs = [
    path.join(baseDir, 'paintings'),
    path.join(baseDir, 'deposits'),
    path.join(baseDir, 'files'),
    path.join(baseDir, 'payment-bills')
  ];

  dirs.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[Upload] Created directory: ${dir}`);
    }
  });
};

export const getBaseUrl = (req) => {
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}`;
};

/**
 * Xóa file từ URL
 * @param {string} url - URL của file (ví dụ: http://localhost:4000/api/upload/paintings/painting-123.jpg hoặc /api/upload/paintings/painting-123.jpg)
 * @returns {boolean} - true nếu xóa thành công hoặc file không tồn tại, false nếu có lỗi
 */
export const deleteFileFromUrl = (urlOrFilename, defaultType = null) => {
  if (!urlOrFilename || typeof urlOrFilename !== 'string' || urlOrFilename.trim() === '') {
    return true; // Không có URL/filename, coi như đã xóa
  }

  try {
    let fileType = null;
    let filename = null;
    
    // Xử lý cả absolute URL và relative path
    if (urlOrFilename.startsWith('http://') || urlOrFilename.startsWith('https://')) {
      // Absolute URL
      const urlObj = new URL(urlOrFilename);
      const pathParts = urlObj.pathname.split('/').filter(p => p !== '');
      
      // Tìm index của 'upload' trong path
      const uploadIndex = pathParts.indexOf('upload');
      if (uploadIndex !== -1 && uploadIndex + 2 < pathParts.length) {
        fileType = pathParts[uploadIndex + 1]; // paintings, deposits, files, payment-bills
        filename = pathParts[uploadIndex + 2]; // tên file
      }
    } else if (urlOrFilename.startsWith('/')) {
      // Relative path: /api/upload/paintings/filename.jpg
      const pathParts = urlOrFilename.split('/').filter(p => p !== '');
      const uploadIndex = pathParts.indexOf('upload');
      if (uploadIndex !== -1 && uploadIndex + 2 < pathParts.length) {
        fileType = pathParts[uploadIndex + 1];
        filename = pathParts[uploadIndex + 2];
      }
    } else {
      // Chỉ có filename (ví dụ: painting-123.jpg hoặc deposit-123.jpg)
      filename = urlOrFilename;
      
      // Xác định loại file từ filename prefix
      if (filename.startsWith('painting-')) {
        fileType = 'paintings';
      } else if (filename.startsWith('deposit-')) {
        fileType = 'deposits';
      } else if (filename.startsWith('file-')) {
        fileType = 'files';
      } else if (filename.startsWith('payment-bill-')) {
        fileType = 'payment-bills';
      } else if (defaultType) {
        // Sử dụng defaultType nếu được cung cấp
        fileType = defaultType;
      } else {
        // Không thể xác định loại file, bỏ qua
        return true;
      }
    }

    if (!fileType || !filename || filename.trim() === '') {
      return true; // Không đủ thông tin, bỏ qua
    }

    if (!['paintings', 'deposits', 'files', 'payment-bills'].includes(fileType)) {
      return true; // Loại file không hợp lệ, bỏ qua
    }

    const filePath = path.join(process.cwd(), 'uploads', fileType, filename);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }

    return true; // File không tồn tại, coi như đã xóa
  } catch (error) {
    console.error(`[deleteFileFromUrl] Error deleting file ${urlOrFilename}:`, error);
    return false; // Có lỗi nhưng không throw để không làm gián đoạn quá trình xóa
  }
};

/**
 * Xóa nhiều file từ danh sách URLs hoặc filenames
 * @param {string[]} urls - Mảng các URL hoặc filename của file
 * @param {string} defaultType - Loại file mặc định nếu chỉ có filename (paintings, deposits, files, payment-bills)
 * @returns {number} - Số file đã xóa thành công
 */
export const deleteFilesFromUrls = (urls, defaultType = null) => {
  if (!Array.isArray(urls) || urls.length === 0) {
    return 0;
  }

  let deletedCount = 0;
  urls.forEach((url) => {
    if (deleteFileFromUrl(url, defaultType)) {
      deletedCount++;
    }
  });

  return deletedCount;
};



