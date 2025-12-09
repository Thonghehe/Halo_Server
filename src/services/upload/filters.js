import path from 'path';

export const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận file ảnh (jpeg, jpg, png, gif, webp)'));
  }
};

export const depositFilter = (req, file, cb) => {
  const allowedTypes =
    /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx|ai|psd|cdr|eps|svg|zip|rar|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

  if (extname) {
    cb(null, true);
  } else {
    cb(
      new Error(
        'Loại file không được hỗ trợ. Vui lòng chọn file: ảnh, PDF, Word, Excel, AI, PSD, CDR, EPS, SVG, ZIP, RAR'
      )
    );
  }
};

export const documentFilter = (req, file, cb) => {
  try {
    const allowedTypes = /pdf|ai|psd|cdr|eps|svg|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (extname) {
      cb(null, true);
    } else {
      cb(new Error('Chỉ chấp nhận file: PDF, AI, PSD, CDR, EPS, SVG, ZIP, RAR'));
    }
  } catch (error) {
    cb(error);
  }
};



