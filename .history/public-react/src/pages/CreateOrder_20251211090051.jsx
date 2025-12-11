import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useMentionableUsers } from '../hooks/useMentionableUsers';
import { useCreateOrder } from '../hooks/useOrders';
import '../styles/CreateOrder.css';
import UserProfileModal from '../components/UserProfileModal';

function CreateOrder() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    orderCodeCustom: '',
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    orderType: 'thuong',
    note: '',
    noteMentions: [],
    hasDeposit: false,
    depositAmount: 0,
    totalAmount: 0,
    paintingPrice: 0,
    constructionPrice: 0,
    designFee: 0,
    shippingInstallationPrice: 0,
    customerPaysShipping: true,
    vat: 0,
    includeVat: true,
    profitSharing: [],
    shippingMethod: '',
    shippingTrackingCode: '',
    shippingExternalInfo: '',
    shippingExternalCost: 0,
    extraFeeName: '',
    extraFeeAmount: 0,
    isReadyMade: false,
    paintings: [{
      image: '',
      file: '',
      images: [],
      files: [],
      width: 0,
      height: 0,
      type: 'tranh_khung',
      frameType: '',
      quantity: 1,
      note: '',
      noteMentions: []
    }],
    depositImages: []
  });

  const [uploadingPainting, setUploadingPainting] = useState({});
  const [uploadingDeposit, setUploadingDeposit] = useState(false);
  const [dragOver, setDragOver] = useState({});
  const [shippingInfoEnabled, setShippingInfoEnabled] = useState(false);
  const [mentionError, setMentionError] = useState('');
  
  // Sử dụng React Query hooks
  const { data: mentionableUsers = [], error: mentionableUsersError } = useMentionableUsers();
  const createOrder = useCreateOrder();
  const [showProfitSharingDropdown, setShowProfitSharingDropdown] = useState(false);
  const [profitSharingSearch, setProfitSharingSearch] = useState('');
  const [mentionState, setMentionState] = useState({
    active: false,
    query: '',
    startIndex: null,
    cursor: null,
    target: null, // 'order' | 'painting'
    paintingIndex: null
  });
  const [mentionHighlightIndex, setMentionHighlightIndex] = useState(0);
  const noteTextareaRef = useRef(null);
  const paintingTextareaRefs = useRef({});
  const [paintingMentionStates, setPaintingMentionStates] = useState({});
  const [paintingMentionHighlightIndex, setPaintingMentionHighlightIndex] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
const [mentionUserModal, setMentionUserModal] = useState({ show: false, user: null });

  const ROLE_LABELS = {
    admin: 'Quản trị viên',
    sale: 'Sale',
    in: 'In',
    thietKe: 'Thiết kế',
    marketing: 'Marketing',
    catKhung: 'Cắt khung',
    sanXuat: 'Sản xuất',
    dongGoi: 'Đóng gói',
    keToanDieuDon: 'Kế toán điều đơn',
    keToanTaiChinh: 'Kế toán tài chính'
  };

  useEffect(() => {
    if (mentionableUsersError) {
      setMentionError(mentionableUsersError.message || 'Không thể tải danh sách người được nhắc');
    }
  }, [mentionableUsersError]);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showProfitSharingDropdown && !event.target.closest('.dropdown')) {
        setShowProfitSharingDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfitSharingDropdown]);

  useEffect(() => {
    if (!showProfitSharingDropdown) {
      setProfitSharingSearch('');
    }
  }, [showProfitSharingDropdown]);

const mentionableUserMap = useMemo(() => {
  const map = new Map();
  (mentionableUsers || []).forEach((user) => {
    if (user?._id) {
      map.set(user._id.toString(), user);
    }
  });
  return map;
}, [mentionableUsers]);

const orderMentionUsers = useMemo(() => {
  if (!Array.isArray(formData.noteMentions)) return [];
  return formData.noteMentions
    .map((userId) => {
      if (!userId) return null;
      return mentionableUserMap.get(userId.toString());
    })
    .filter(Boolean);
}, [formData.noteMentions, mentionableUserMap]);

const availableProfitSharingUsers = useMemo(() => {
  if (!Array.isArray(mentionableUsers) || mentionableUsers.length === 0) {
    return [];
  }
  const normalizedSearch = profitSharingSearch.trim().toLowerCase();

  return mentionableUsers.filter((user) => {
    if (!user || !user._id) return false;
    const alreadySelected = (formData.profitSharing || []).some((item) => {
      const itemUserId = item.user?._id || item.user;
      return itemUserId && itemUserId.toString() === user._id.toString();
    });
    if (alreadySelected) return false;

    if (!normalizedSearch) return true;
    const fullName = user.fullName?.toLowerCase() || '';
    const email = user.email?.toLowerCase() || '';
    return fullName.includes(normalizedSearch) || email.includes(normalizedSearch);
  });
}, [mentionableUsers, formData.profitSharing, profitSharingSearch]);

const getPaintingMentionUsers = (painting) => {
  if (!painting || !Array.isArray(painting.noteMentions)) return [];
  return painting.noteMentions
    .map((userId) => {
      if (!userId) return null;
      return mentionableUserMap.get(userId.toString());
    })
    .filter(Boolean);
};

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleToggleShippingInfo = (enabled) => {
    setShippingInfoEnabled(enabled);
    if (!enabled) {
      setFormData((prev) => ({
        ...prev,
        shippingMethod: '',
        shippingTrackingCode: '',
        shippingExternalInfo: '',
        shippingExternalCost: 0
      }));
    }
  };

  const handleShippingMethodChange = (value) => {
    setFormData((prev) => {
      const updated = {
        ...prev,
        shippingMethod: value,
        shippingTrackingCode: value === 'viettel' ? prev.shippingTrackingCode : '',
        shippingExternalInfo: value === 'ship_ngoai' ? prev.shippingExternalInfo : '',
        shippingExternalCost: value === 'ship_ngoai' ? prev.shippingExternalCost : 0
      };
      
      // Reset "Vận chuyển & lắp đặt" về 0 khi chọn "Khách đến nhận"
      if (value === 'khach_den_nhan') {
        updated.shippingInstallationPrice = 0;
        // Tính lại VAT và totalAmount (không tính shippingInstallationPrice vì đã reset về 0)
        const subtotal =
          (updated.paintingPrice || 0) +
          (updated.constructionPrice || 0) +
          (updated.designFee || 0) +
          (updated.extraFeeAmount || 0) +
          (updated.customerPaysShipping ? (updated.shippingInstallationPrice || 0) : 0);
        const vat = updated.includeVat ? Math.round(subtotal * 0.08) : 0;
        updated.vat = vat;
        updated.totalAmount = Math.round(subtotal + vat);
      }
      
      return updated;
    });
  };

  const recomputeNoteMentions = (noteText, paintingsArray) => {
    const texts = [];
    if (noteText) {
      texts.push(noteText);
    }
    if (Array.isArray(paintingsArray)) {
      paintingsArray.forEach((p) => {
        if (p?.note) {
          texts.push(p.note);
        }
      });
    }

    const nextIds = [];
    mentionableUsers.forEach((user) => {
      const pattern = `@${user.fullName}`;
      if (texts.some((t) => t && t.includes(pattern))) {
        nextIds.push(user._id);
      }
    });
    return nextIds;
  };

  const resetMentionState = () => {
    setMentionState({
      active: false,
      query: '',
      startIndex: null,
      cursor: null,
      target: null,
      paintingIndex: null
    });
    setMentionHighlightIndex(0);
  };

  const handleNoteInput = (e) => {
    const { value, selectionStart } = e.target;
    setFormData(prev => {
      const nextPaintings = prev.paintings || [];
      const nextMentions = recomputeNoteMentions(value, nextPaintings);
      return {
        ...prev,
        note: value,
        noteMentions: nextMentions
      };
    });

    const textBeforeCursor = value.slice(0, selectionStart);
    const mentionMatch = textBeforeCursor.match(/@([^\s@]*)$/);

    if (mentionMatch) {
      setMentionState({
        active: true,
        query: mentionMatch[1] || '',
        startIndex: selectionStart - mentionMatch[0].length,
        cursor: selectionStart,
        target: 'order',
        paintingIndex: null
      });
      setMentionHighlightIndex(0);
    } else if (mentionState.active) {
      resetMentionState();
    }
  };

  const handleNoteCursorChange = (e) => {
    if (!mentionState.active) return;
    // Bỏ qua các phím điều hướng / chọn để không reset highlight
    if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
      return;
    }
    const { selectionStart, value } = e.target;
    const textBeforeCursor = value.slice(0, selectionStart);
    const mentionMatch = textBeforeCursor.match(/@([^\s@]*)$/);
    if (!mentionMatch) {
      resetMentionState();
    } else {
      setMentionState(prev => ({
        ...prev,
        query: mentionMatch[1] || '',
        startIndex: selectionStart - mentionMatch[0].length,
        cursor: selectionStart
      }));
      // Không reset highlight index ở đây để tránh giật về item đầu
    }
  };

  const filteredMentionUsers = mentionState.active
    ? mentionableUsers.filter(user =>
        user.fullName.toLowerCase().includes(mentionState.query.toLowerCase())
      )
    : [];

  const mentionSuggestions = filteredMentionUsers.slice(0, 8);

  const addMentionId = (userId) => {
    setFormData(prev => ({
      ...prev,
      noteMentions: prev.noteMentions.includes(userId)
        ? prev.noteMentions
        : [...prev.noteMentions, userId]
    }));
  };

  const normalizeFilesInput = (input) => {
    if (!input) return [];
    if (input instanceof FileList) return Array.from(input);
    if (Array.isArray(input)) return input.filter(Boolean);
    return input ? [input] : [];
  };

  const insertMention = (user) => {
    if (mentionState.startIndex === null || mentionState.cursor === null) {
      return;
    }

    if (mentionState.target === 'order') {
      if (!noteTextareaRef.current) return;
      const textarea = noteTextareaRef.current;
      const value = formData.note || '';
      const before = value.slice(0, mentionState.startIndex);
      const after = value.slice(mentionState.cursor);
      const mentionText = `@${user.fullName}`;
      const nextValue = `${before}${mentionText} ${after}`;
      const newCursorPos = before.length + mentionText.length + 1;

      setFormData(prev => {
        const paintingsArr = prev.paintings || [];
        const noteMentions = recomputeNoteMentions(nextValue, paintingsArr);
        return {
          ...prev,
          note: nextValue,
          noteMentions
        };
      });
      addMentionId(user._id);
      resetMentionState();

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      });
    } else if (mentionState.target === 'painting' && mentionState.paintingIndex != null) {
      const idx = mentionState.paintingIndex;
      if (!paintingTextareaRefs.current) {
        paintingTextareaRefs.current = {};
      }
      const textarea = paintingTextareaRefs.current[idx];
      if (!textarea) return;
      const currentPainting = formData.paintings?.[idx];
      const value = currentPainting?.note || '';
      const before = value.slice(0, mentionState.startIndex);
      const after = value.slice(mentionState.cursor);
      const mentionText = `@${user.fullName}`;
      const nextValue = `${before}${mentionText} ${after}`;
      const newCursorPos = before.length + mentionText.length + 1;

      setFormData(prev => {
        const nextPaintings = (prev.paintings || []).map((p, i) => {
          if (i === idx) {
            // Tính noteMentions cho painting này
            const paintingNoteMentions = recomputeNoteMentions(nextValue, []);
            return {
              ...p,
              note: nextValue,
              noteMentions: paintingNoteMentions
            };
          }
          return p;
        });
        const noteMentions = recomputeNoteMentions(prev.note, nextPaintings);
        return {
          ...prev,
          paintings: nextPaintings,
          noteMentions
        };
      });
      addMentionId(user._id);
      resetMentionState();

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      });
    }
  };

  const handleMentionKeyDown = (e) => {
    if (!mentionState.active || mentionSuggestions.length === 0) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionHighlightIndex(prev => {
        if (e.key === 'ArrowDown') {
          return (prev + 1) % mentionSuggestions.length;
        }
        return (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length;
      });
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const selectedUser = mentionSuggestions[mentionHighlightIndex];
      if (selectedUser) {
        insertMention(selectedUser);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      resetMentionState();
    }
  };

  const handlePaintingNoteInput = (index, e) => {
    const { value, selectionStart } = e.target;

    setFormData(prev => {
      const nextPaintings = (prev.paintings || []).map((p, i) => {
        if (i === index) {
          // Tính noteMentions cho painting này
          const paintingNoteMentions = recomputeNoteMentions(value, []);
          return {
            ...p,
            note: value,
            noteMentions: paintingNoteMentions
          };
        }
        return p;
      });
      const noteMentions = recomputeNoteMentions(prev.note, nextPaintings);
      return {
        ...prev,
        paintings: nextPaintings,
        noteMentions
      };
    });

    const textBeforeCursor = value.slice(0, selectionStart);
    const mentionMatch = textBeforeCursor.match(/@([^\s@]*)$/);

    if (mentionMatch) {
      // Reset state trước khi set state mới để đảm bảo chỉ một dropdown hiển thị
      if (mentionState.active && mentionState.target !== 'painting') {
        resetMentionState();
      }
      setMentionState({
        active: true,
        query: mentionMatch[1] || '',
        startIndex: selectionStart - mentionMatch[0].length,
        cursor: selectionStart,
        target: 'painting',
        paintingIndex: index
      });
      setMentionHighlightIndex(0);
    } else if (mentionState.active && mentionState.target === 'painting' && mentionState.paintingIndex === index) {
      resetMentionState();
    } else if (mentionState.active && mentionState.target !== 'painting') {
      // Reset nếu đang active ở order note nhưng đang nhập ở painting note
      resetMentionState();
    }
  };

  const handlePaintingNoteCursorChange = (index, e) => {
    if (!mentionState.active || mentionState.target !== 'painting' || mentionState.paintingIndex !== index) return;
    if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(e.key)) {
      return;
    }
    const { selectionStart, value } = e.target;
    const textBeforeCursor = value.slice(0, selectionStart);
    const mentionMatch = textBeforeCursor.match(/@([^\s@]*)$/);
    if (!mentionMatch) {
      resetMentionState();
    } else {
      setMentionState(prev => ({
        ...prev,
        query: mentionMatch[1] || '',
        startIndex: selectionStart - mentionMatch[0].length,
        cursor: selectionStart
      }));
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '';
    const numeric = Number(value);
    if (Number.isNaN(numeric)) return '';
    return numeric.toLocaleString('vi-VN');
  };

  const parseCurrencyInput = (value) => {
    if (value === undefined || value === null) return 0;
    const digits = value.toString().replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : 0;
  };

  const handleCurrencyChange = (field, rawValue) => {
    const numericValue = parseCurrencyInput(rawValue);
    setFormData((prev) => ({
      ...prev,
      [field]: numericValue
    }));
  };

  // Xử lý thay đổi các trường giá và tự động tính VAT, totalAmount
  const handlePriceChange = (field, rawValue) => {
    const numericValue = parseCurrencyInput(rawValue);
    setFormData((prev) => {
      const updated = {
        ...prev,
        [field]: numericValue
      };
      
      // Đồng bộ "Vận chuyển & lắp đặt" với shippingExternalCost khi chọn "Ship ngoài"
      if (field === 'shippingInstallationPrice' && prev.shippingMethod === 'ship_ngoai') {
        updated.shippingExternalCost = numericValue;
      }
      if (field === 'extraFeeAmount' && numericValue === 0) {
        updated.extraFeeName = '';
      }
      
      // Tính VAT = 8% của (tiền tranh + tiền thi công + tiền thiết kế + phí phát sinh + [Vận chuyển & lắp đặt nếu khách chịu]) nếu includeVat = true
      const subtotal =
        (updated.paintingPrice || 0) +
        (updated.constructionPrice || 0) +
        (updated.designFee || 0) +
        (updated.extraFeeAmount || 0) +
        (updated.customerPaysShipping ? (updated.shippingInstallationPrice || 0) : 0);
      const vat = updated.includeVat ? Math.round(subtotal * 0.08) : 0;
      
      // Tính tổng tiền = tiền tranh + tiền thi công + tiền thiết kế + phí phát sinh + [Vận chuyển & lắp đặt nếu khách chịu] + VAT
      const totalAmount = Math.round(subtotal + vat);
      
      return {
        ...updated,
        vat,
        totalAmount
      };
    });
  };

  // Xử lý ăn chia
  const handleAddProfitSharing = (user) => {
    // Kiểm tra xem user đã có trong danh sách chưa
    const exists = formData.profitSharing.some(item => item.user === user._id || item.user?._id === user._id);
    if (exists) {
      alert('Người này đã được thêm vào danh sách ăn chia');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      profitSharing: [
        ...prev.profitSharing,
        {
          user: user._id,
          percentage: 0,
          amount: 0
        }
      ]
    }));
  };

  const handleRemoveProfitSharing = (index) => {
    setFormData(prev => ({
      ...prev,
      profitSharing: prev.profitSharing.filter((_, i) => i !== index)
    }));
  };

  const handleUpdateProfitSharingPercentage = (index, percentage) => {
    const numericValue = parseCurrencyInput(percentage);
    const clampedValue = Math.min(Math.max(numericValue, 0), 100);
    
    setFormData(prev => {
      const updated = [...prev.profitSharing];
      updated[index] = {
        ...updated[index],
        percentage: clampedValue
      };
      
      // Tính số tiền ăn chia dựa trên % và tiền tranh
      const paintingPrice = prev.paintingPrice || 0;
      updated[index].amount = Math.round((paintingPrice * clampedValue) / 100);
      
      return {
        ...prev,
        profitSharing: updated
      };
    });
  };

  // Khi tiền tranh thay đổi, cập nhật lại số tiền ăn chia
  useEffect(() => {
    if (formData.profitSharing && formData.profitSharing.length > 0) {
      setFormData(prev => {
        const updated = prev.profitSharing.map(item => ({
          ...item,
          amount: Math.round(((prev.paintingPrice || 0) * (item.percentage || 0)) / 100)
        }));
        return {
          ...prev,
          profitSharing: updated
        };
      });
    }
  }, [formData.paintingPrice]);

  // Upload ảnh tranh
  const handleUploadPaintingImage = async (paintingIndex, files) => {
    const fileList = normalizeFilesInput(files).filter(file => file && file.type?.startsWith('image/'));
    if (fileList.length === 0) return;
    
    setUploadingPainting(prev => ({ ...prev, [`image_${paintingIndex}`]: true }));
    
    try {
      for (const file of fileList) {
        const uploadFormData = new FormData();
        uploadFormData.append('image', file);
        
        const response = await api.post('/api/upload/painting', uploadFormData);
        
        if (response.data.success) {
          const filename = response.data.data.filename;
          setFormData(prev => {
            const updatedPaintings = [...prev.paintings];
            const current = { ...(updatedPaintings[paintingIndex] || {}) };
            const images = Array.isArray(current.images)
              ? [...current.images, filename]
              : (current.image ? [current.image, filename] : [filename]);
            current.images = Array.from(new Set(images));
            current.image = current.images[0] || filename;
            updatedPaintings[paintingIndex] = current;
            return { ...prev, paintings: updatedPaintings };
          });
        } else {
          throw new Error(response.data.message || 'Upload ảnh tranh thất bại');
        }
      }
    } catch (err) {
      console.error('Upload painting image error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Upload ảnh tranh thất bại';
      alert(errorMessage);
    } finally {
      setUploadingPainting(prev => ({ ...prev, [`image_${paintingIndex}`]: false }));
    }
  };

  // Upload file tranh
  const handleUploadPaintingFile = async (paintingIndex, files) => {
    const fileList = normalizeFilesInput(files);
    if (fileList.length === 0) return;
    
    setUploadingPainting(prev => ({ ...prev, [`file_${paintingIndex}`]: true }));
    
    try {
      for (const file of fileList) {
        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        
        const response = await api.post('/api/upload/file', uploadFormData);
        
        if (response.data.success) {
          const filename = response.data.data.filename;
          setFormData(prev => {
            const updatedPaintings = [...prev.paintings];
            const current = { ...(updatedPaintings[paintingIndex] || {}) };
            const filesArr = Array.isArray(current.files)
              ? [...current.files, filename]
              : (current.file ? [current.file, filename] : [filename]);
            current.files = Array.from(new Set(filesArr));
            current.file = current.files[0] || filename;
            updatedPaintings[paintingIndex] = current;
            return { ...prev, paintings: updatedPaintings };
          });
        } else {
          throw new Error(response.data.message || 'Upload file tranh thất bại');
        }
      }
    } catch (err) {
      console.error('Upload painting file error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Upload file tranh thất bại';
      alert(errorMessage);
    } finally {
      setUploadingPainting(prev => ({ ...prev, [`file_${paintingIndex}`]: false }));
    }
  };

  // Kiểm tra xem file có phải là ảnh không dựa vào extension
  const isImageFile = (filename) => {
    if (!filename) return false;
    const ext = filename.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext);
  };

  // Lấy icon phù hợp cho từng loại file
  const getFileIcon = (filename) => {
    if (!filename) return 'bi-file-earmark';
    const ext = filename.toLowerCase().split('.').pop();
    
    const iconMap = {
      pdf: 'bi-file-earmark-pdf-fill',
      doc: 'bi-file-earmark-word-fill',
      docx: 'bi-file-earmark-word-fill',
      xls: 'bi-file-earmark-excel-fill',
      xlsx: 'bi-file-earmark-excel-fill',
      zip: 'bi-file-earmark-zip-fill',
      rar: 'bi-file-earmark-zip-fill',
      txt: 'bi-file-earmark-text-fill',
      ai: 'bi-file-earmark-image-fill',
      psd: 'bi-file-earmark-image-fill',
      cdr: 'bi-file-earmark-image-fill',
      eps: 'bi-file-earmark-image-fill',
      svg: 'bi-file-earmark-image-fill'
    };
    
    return iconMap[ext] || 'bi-file-earmark';
  };

  // Lấy màu sắc phù hợp cho từng loại file
  const getFileColor = (filename) => {
    if (!filename) return 'text-secondary';
    const ext = filename.toLowerCase().split('.').pop();
    
    const colorMap = {
      pdf: 'text-danger',
      doc: 'text-primary',
      docx: 'text-primary',
      xls: 'text-success',
      xlsx: 'text-success',
      zip: 'text-warning',
      rar: 'text-warning',
      txt: 'text-secondary',
      ai: 'text-warning',
      psd: 'text-info',
      cdr: 'text-success',
      eps: 'text-dark',
      svg: 'text-info'
    };
    
    return colorMap[ext] || 'text-secondary';
  };

  // Upload ảnh/file cọc
  const handleUploadDepositImage = async (files) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    
    setUploadingDeposit(true);
    
    try {
      // Upload từng file một
      const uploadedFilenames = [];
      for (const file of fileArray) {
        const uploadFormData = new FormData();
        uploadFormData.append('images', file);
        
        const response = await api.post('/api/upload/deposit', uploadFormData);
        
        if (response.data.success) {
          const filename = response.data.data[0]?.filename;
          if (filename) {
            uploadedFilenames.push(filename);
          }
        } else {
          throw new Error(response.data.message || 'Upload file thất bại');
        }
      }
      
      if (uploadedFilenames.length > 0) {
        setFormData(prev => ({
          ...prev,
          depositImages: [...prev.depositImages, ...uploadedFilenames]
        }));
      }
    } catch (err) {
      console.error('Upload deposit file error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Upload file thất bại';
      alert(errorMessage);
    } finally {
      setUploadingDeposit(false);
    }
  };

  // Thêm tranh mới
  const handleAddPainting = () => {
    setFormData({
      ...formData,
      paintings: [
        ...formData.paintings,
        {
          image: '',
          file: '',
          images: [],
          files: [],
          width: 0,
          height: 0,
          type: 'tranh_khung',
          frameType: '',
          quantity: 1,
          note: '',
          noteMentions: []
        }
      ]
    });
  };

  // Xóa tranh
  const handleRemovePainting = (index) => {
    const updatedPaintings = formData.paintings.filter((_, i) => i !== index);
    setFormData({ ...formData, paintings: updatedPaintings });
  };

  // Cập nhật thông tin tranh
  const handlePaintingChange = (index, field, value) => {
    setFormData(prev => {
      const updatedPaintings = [...prev.paintings];
      if (field === 'type') {
        updatedPaintings[index].type = value;
        if (value === 'chi_in') {
          updatedPaintings[index].frameType = 'Chỉ in';
        } else if (value === 'tranh_dan') {
          updatedPaintings[index].frameType = 'Tranh dán';
        } else if (value === 'tranh_tron') {
          const diameter = updatedPaintings[index].width || updatedPaintings[index].height || 0;
          updatedPaintings[index].width = diameter;
          updatedPaintings[index].height = diameter;
        } else {
          if (updatedPaintings[index].frameType === 'Chỉ in' || updatedPaintings[index].frameType === 'Tranh dán') {
            updatedPaintings[index].frameType = '';
          }
        }
      } else if (
        (field === 'width' || field === 'height') &&
        updatedPaintings[index].type === 'tranh_tron'
      ) {
        updatedPaintings[index].width = value;
        updatedPaintings[index].height = value;
      } else {
        updatedPaintings[index][field] = value;
      }
      return { ...prev, paintings: updatedPaintings };
    });
  };

  // Xóa ảnh cọc
  const handleRemoveDepositImage = (index) => {
    setFormData(prev => ({
      ...prev,
      depositImages: prev.depositImages.filter((_, i) => i !== index)
    }));
  };

  // Xử lý input ảnh tranh
  const handlePaintingImagesInput = async (paintingIndex, event) => {
    const { files } = event.target;
    await handleUploadPaintingImage(paintingIndex, files);
    event.target.value = '';
  };

  // Xử lý input file tranh
  const handlePaintingFilesInput = async (paintingIndex, event) => {
    const { files } = event.target;
    await handleUploadPaintingFile(paintingIndex, files);
    event.target.value = '';
  };

  // Xóa ảnh tranh
  const handleRemovePaintingImage = (paintingIndex, imageIndex) => {
    setFormData(prev => {
      const updatedPaintings = [...prev.paintings];
      const current = { ...(updatedPaintings[paintingIndex] || {}) };
      const images = Array.isArray(current.images) ? current.images.filter((_, idx) => idx !== imageIndex) : [];
      current.images = images;
      current.image = images[0] || '';
      updatedPaintings[paintingIndex] = current;
      return { ...prev, paintings: updatedPaintings };
    });
  };

  // Xóa file tranh
  const handleRemovePaintingFile = (paintingIndex, fileIndex) => {
    setFormData(prev => {
      const updatedPaintings = [...prev.paintings];
      const current = { ...(updatedPaintings[paintingIndex] || {}) };
      const files = Array.isArray(current.files) ? current.files.filter((_, idx) => idx !== fileIndex) : [];
      current.files = files;
      current.file = files[0] || '';
      updatedPaintings[paintingIndex] = current;
      return { ...prev, paintings: updatedPaintings };
    });
  };

  const applyShippingPayload = (payload) => {
    if (!shippingInfoEnabled || !formData.shippingMethod) {
      payload.shippingMethod = null;
      payload.shippingTrackingCode = '';
      payload.shippingExternalInfo = '';
      payload.shippingExternalCost = 0;
      return payload;
    }
    payload.shippingMethod = formData.shippingMethod;
    if (formData.shippingMethod === 'viettel') {
      payload.shippingTrackingCode = formData.shippingTrackingCode?.trim() || '';
      payload.shippingExternalInfo = '';
      payload.shippingExternalCost = 0;
    } else if (formData.shippingMethod === 'ship_ngoai') {
      payload.shippingTrackingCode = '';
      payload.shippingExternalInfo = formData.shippingExternalInfo?.trim() || '';
      payload.shippingExternalCost = Number(formData.shippingInstallationPrice) || 0;
    } else {
      payload.shippingTrackingCode = '';
      payload.shippingExternalInfo = '';
      payload.shippingExternalCost = 0;
    }
    return payload;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (formData.paintings.length === 0) {
      alert('Vui lòng thêm ít nhất một tranh');
      return;
    }

    // Validate paintings
    for (let i = 0; i < formData.paintings.length; i++) {
      const painting = formData.paintings[i];
      if (!painting.image && !painting.file) {
        alert(`Tranh ${i + 1}: Vui lòng upload ảnh hoặc file`);
        return;
      }
      if (!painting.width || painting.width <= 0) {
        alert(`Tranh ${i + 1}: Vui lòng nhập chiều rộng hợp lệ`);
        return;
      }
      if (!painting.height || painting.height <= 0) {
        alert(`Tranh ${i + 1}: Vui lòng nhập chiều cao hợp lệ`);
        return;
      }
      if (!painting.frameType) {
        alert(`Tranh ${i + 1}: Vui lòng nhập loại khung`);
        return;
      }
    }

    // Validation for shopee orders
    if (formData.orderType === 'shopee') {
      if (!formData.orderCodeCustom || formData.orderCodeCustom.trim() === '') {
        alert('Vui lòng nhập số đơn hàng Shopee');
        return;
      }
    } else if (!formData.customerPhone || formData.customerPhone.trim() === '') {
      alert('Vui lòng nhập SĐT/Zalo');
      return;
    }

    if (shippingInfoEnabled && !formData.shippingMethod) {
      alert('Vui lòng chọn hình thức gửi đơn');
      return;
    }

    if ((formData.extraFeeAmount || 0) > 0 && !formData.extraFeeName.trim()) {
      alert('Vui lòng nhập tên phí phát sinh');
      return;
    }

    // Validation cho cọc: nếu có cọc thì phải có ảnh/file và số tiền cọc
    if (formData.hasDeposit) {
      if (!formData.depositImages || formData.depositImages.length === 0) {
        alert('Vui lòng upload ít nhất một ảnh hoặc file cọc');
        return;
      }
      if (!formData.depositAmount || formData.depositAmount <= 0) {
        alert('Vui lòng nhập số tiền cọc');
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        ...formData,
        paintings: formData.paintings,
        depositImages: formData.depositImages || []
      };
      applyShippingPayload(payload);
      payload.designFee = Number(formData.designFee) || 0;
      payload.extraFeeAmount = Number(formData.extraFeeAmount) || 0;
      payload.extraFeeName =
        payload.extraFeeAmount > 0 ? (formData.extraFeeName || '').trim() : '';
      
      // Với đơn hàng Shopee, đặt thông tin khách hàng dựa trên số đơn hàng Shopee
      if (formData.orderType === 'shopee') {
        payload.customerName = `Shopee - ${formData.orderCodeCustom}`;
        payload.customerPhone = formData.orderCodeCustom;
        payload.customerAddress = 'Shopee';
      }
      
      payload.depositAmount = Number(payload.depositAmount) || 0;
      
      // Nếu checkbox "Có sẵn" được check, set trạng thái in và khung thành "co_san"
      if (formData.isReadyMade) {
        payload.printingStatus = 'co_san';
        payload.frameCuttingStatus = 'co_san';
      }
      
      // Với shopee, giữ nguyên cách nhập cũ (chỉ nhập totalAmount trực tiếp)
      if (formData.orderType === 'shopee') {
        payload.totalAmount = Number(payload.totalAmount) || 0;
        // Với shopee, set các trường giá = 0 để backend không tính lại
        payload.paintingPrice = 0;
        payload.constructionPrice = 0;
        payload.designFee = 0;
        payload.shippingInstallationPrice = 0;
        payload.vat = 0;
        payload.extraFeeAmount = 0;
        payload.extraFeeName = '';
      } else {
        // Với các loại đơn khác, sử dụng các trường chi tiết
        payload.paintingPrice = Number(payload.paintingPrice) || 0;
        payload.constructionPrice = Number(payload.constructionPrice) || 0;
        payload.designFee = Number(payload.designFee) || 0;
        payload.shippingInstallationPrice = Number(payload.shippingInstallationPrice) || 0;
        payload.customerPaysShipping = formData.customerPaysShipping !== undefined ? formData.customerPaysShipping : true;
        // VAT và totalAmount sẽ được tính tự động ở backend
        payload.vat = Number(payload.vat) || 0;
        payload.totalAmount = Number(payload.totalAmount) || 0;
        payload.includeVat = payload.includeVat !== undefined ? payload.includeVat : true;
        payload.extraFeeAmount = Number(payload.extraFeeAmount) || 0;
        payload.extraFeeName =
          payload.extraFeeAmount > 0 ? payload.extraFeeName : '';
      }
      
      await createOrder.mutateAsync(payload);
      alert('Tạo đơn hàng thành công!');
      navigate('/orders');
    } catch (err) {
      alert(err.message || 'Tạo đơn hàng thất bại');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (filename, type = 'paintings') => {
    if (!filename) return null;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
    return `${baseUrl}/api/upload/${type}/${filename}`;
  };

  // Tạo preview mã đơn hàng
  const getOrderCodePreview = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const customPart = formData.orderCodeCustom || '';
    return `D${customPart}-${day}${month}`;
  };

  // Drag & Drop handlers cho ảnh tranh
  const handleDragOverPaintingImage = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver({ ...dragOver, [`image_${index}`]: true });
  };

  const handleDragLeavePaintingImage = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver({ ...dragOver, [`image_${index}`]: false });
  };

  const handleDropPaintingImage = async (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver({ ...dragOver, [`image_${index}`]: false });
    
    const files = Array.from(e.dataTransfer.files || []).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      await handleUploadPaintingImage(index, files);
    }
  };

  // Drag & Drop handlers cho file tranh
  const handleDragOverPaintingFile = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver({ ...dragOver, [`file_${index}`]: true });
  };

  const handleDragLeavePaintingFile = (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver({ ...dragOver, [`file_${index}`]: false });
  };

  const handleDropPaintingFile = async (e, index) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver({ ...dragOver, [`file_${index}`]: false });
    
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length > 0) {
      await handleUploadPaintingFile(index, files);
    }
  };

  // Drag & Drop handlers cho ảnh cọc
  const handleDragOverDeposit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver({ ...dragOver, deposit: true });
  };

  const handleDragLeaveDeposit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver({ ...dragOver, deposit: false });
  };

  const handleDropDeposit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver({ ...dragOver, deposit: false });
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleUploadDepositImage(files);
    }
  };

  // Paste handler
  const handlePaste = async (e, type, index = null) => {
    e.preventDefault();
    const items = e.clipboardData.items;
    const files = [];
    
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (type === 'image' && file.type.startsWith('image/')) {
          files.push(file);
        } else if (type === 'file' && !file.type.startsWith('image/')) {
          files.push(file);
        } else if (type === 'deposit' && file.type.startsWith('image/')) {
          files.push(file);
        }
      }
    }

    if (files.length > 0) {
        if (type === 'image' && index !== null) {
          await handleUploadPaintingImage(index, files);
        } else if (type === 'file' && index !== null) {
          await handleUploadPaintingFile(index, files);
      } else if (type === 'deposit') {
        if (files.length > 0) {
          await handleUploadDepositImage(files);
        }
      }
    }
  };

  return (
    <div className="create-order-form">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Tạo đơn hàng mới</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/orders')}>
          Quay lại
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Thông tin đơn hàng */}
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="form-section-title">Thông tin đơn hàng</h5>
            <div className="row mb-3">
              <div className="col-md-6">
                <label className="form-label">
                  {formData.orderType === 'shopee' ? 'Số đơn hàng Shopee *' : 'Mã đơn hàng'}
                </label>
                {formData.orderType === 'shopee' ? (
                  <input
                    type="text"
                    className="form-control"
                    name="orderCodeCustom"
                    value={formData.orderCodeCustom}
                    onChange={handleChange}
                    placeholder="Nhập số đơn hàng Shopee"
                    required
                  />
                ) : (
                  <>
                    <div className="input-group">
                      <span className="input-group-text bg-light">D</span>
                      <input
                        type="text"
                        className="form-control"
                        name="orderCodeCustom"
                        value={formData.orderCodeCustom}
                        onChange={handleChange}
                        placeholder="Nhập mã đơn hàng"
                      />
                      <span className="input-group-text bg-light" id="orderCodeSuffix">
                        {(() => {
                          const now = new Date();
                          const day = String(now.getDate()).padStart(2, '0');
                          const month = String(now.getMonth() + 1).padStart(2, '0');
                          return `${day}${month}`;
                        })()}
                      </span>
                    </div>
                    <small className="text-muted">
                      Mã đơn hàng: <strong>{getOrderCodePreview()}</strong>
                    </small>
                  </>
                )}
              </div>
              <div className="col-md-6">
                <label className="form-label">Loại đơn</label>
                <select
                  className="form-select"
                  name="orderType"
                  value={formData.orderType}
                  onChange={handleChange}
                >
                  <option value="thuong">Thường</option>
                  <option value="gap">Gấp</option>
                  <option value="shopee">Shopee</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </div>
            </div>

            <div className="row mb-3">
              <div className="col-12">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="isReadyMade"
                    checked={formData.isReadyMade}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        isReadyMade: e.target.checked
                      }))
                    }
                  />
                  <label className="form-check-label" htmlFor="isReadyMade">
                    Có sẵn tại cửa hàng
                  </label>
                </div>
              </div>
            </div>

            {formData.orderType === 'shopee' ? (
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Tổng giá trị đơn hàng *</label>
                  <div className="input-group">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-control"
                      name="totalAmount"
                      value={formatCurrency(formData.totalAmount)}
                      onChange={(e) => handleCurrencyChange('totalAmount', e.target.value)}
                      placeholder="0"
                      required
                    />
                    <span className="input-group-text">VNĐ</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Tên khách hàng</label>
                    <input
                      type="text"
                      className="form-control"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">SĐT/Zalo *</label>
                    <input
                      type="text"
                      className="form-control"
                      name="customerPhone"
                      value={formData.customerPhone}
                      onChange={handleChange}
                      placeholder="Số điện thoại hoặc tên Zalo"
                      required
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Địa chỉ</label>
                  <textarea
                    className="form-control"
                    name="customerAddress"
                    value={formData.customerAddress}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Nhập địa chỉ khách hàng "
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Danh sách tranh */}
        <div className="card mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="form-section-title mb-0">Danh sách tranh</h5>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={handleAddPainting}
              >
                <i className="bi bi-plus-circle"></i> Thêm tranh
              </button>
            </div>

            {formData.paintings.length === 0 ? (
              <div className="alert alert-info">
                Chưa có tranh nào. Vui lòng thêm ít nhất một tranh.
              </div>
            ) : (
              formData.paintings.map((painting, index) => (
                <div key={index} className="painting-item mb-4 p-3 border">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0">Tranh {index + 1}</h6>
                    {formData.paintings.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-sm btn-danger"
                        onClick={() => handleRemovePainting(index)}
                      >
                        <i className="bi bi-trash"></i> Xóa
                      </button>
                    )}
                  </div>

                  <div className="row g-3">
                    {/* Upload ảnh tranh */}
                    <div className="col-md-6">
                      <label className="form-label">Ảnh tranh</label>
                      <div
                        className={`drop-zone ${dragOver[`image_${index}`] ? 'drag-over' : ''}`}
                        onDragOver={(e) => handleDragOverPaintingImage(e, index)}
                        onDragLeave={(e) => handleDragLeavePaintingImage(e, index)}
                        onDrop={(e) => handleDropPaintingImage(e, index)}
                        onPaste={(e) => handlePaste(e, 'image', index)}
                        tabIndex={0}
                      >
                        <input
                          type="file"
                          className="form-control"
                          accept="image/*"
                            multiple
                            onChange={(e) => handlePaintingImagesInput(index, e)}
                          disabled={uploadingPainting[`image_${index}`]}
                        />
                        <small className="text-muted d-block mt-1">
                            Kéo thả nhiều ảnh, chọn nhiều file hoặc paste từ clipboard
                        </small>
                      </div>
                        {Array.isArray(painting.images) && painting.images.length > 0 && (
                          <div className="mt-2 d-flex flex-wrap gap-2">
                            {painting.images.map((img, imgIndex) => (
                              <div key={imgIndex} className="position-relative" style={{ cursor: 'pointer' }}>
                                <img
                                  src={getImageUrl(img, 'paintings')}
                                  alt={`Tranh ${index + 1} - Ảnh ${imgIndex + 1}`}
                                  className="img-thumbnail"
                                  style={{ maxWidth: '160px', maxHeight: '160px', objectFit: 'cover' }}
                                  onClick={() => setPreviewImage(getImageUrl(img, 'paintings'))}
                                />
                                <button
                                  type="button"
                                  className="btn btn-sm btn-link text-danger position-absolute top-0 end-0"
                                  style={{ 
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                    padding: '2px 4px',
                                    zIndex: 10
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemovePaintingImage(index, imgIndex);
                                  }}
                                  title="Xóa ảnh"
                                >
                                  <i className="bi bi-x-circle"></i>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      {uploadingPainting[`image_${index}`] && (
                        <small className="text-muted">Đang upload...</small>
                      )}
                    </div>

                    {/* Upload file tranh */}
                    <div className="col-md-6">
                      <label className="form-label">File đính kèm (PDF, AI, PSD...)</label>
                      <div
                        className={`drop-zone ${dragOver[`file_${index}`] ? 'drag-over' : ''}`}
                        onDragOver={(e) => handleDragOverPaintingFile(e, index)}
                        onDragLeave={(e) => handleDragLeavePaintingFile(e, index)}
                        onDrop={(e) => handleDropPaintingFile(e, index)}
                        onPaste={(e) => handlePaste(e, 'file', index)}
                        tabIndex={0}
                      >
                        <input
                          type="file"
                          className="form-control"
                          accept=".pdf,.ai,.psd,.cdr,.eps,.svg,.zip,.rar"
                            multiple
                            onChange={(e) => handlePaintingFilesInput(index, e)}
                          disabled={uploadingPainting[`file_${index}`]}
                        />
                        <small className="text-muted d-block mt-1">
                            Kéo thả nhiều file, chọn nhiều file hoặc paste từ clipboard
                        </small>
                      </div>
                        {Array.isArray(painting.files) && painting.files.length > 0 && (
                          <div className="mt-2 d-flex flex-column gap-1">
                            {painting.files.map((fileName, fileIndex) => (
                              <div key={fileIndex} className="d-flex align-items-center gap-2">
                                <a
                                  href={getImageUrl(fileName, 'files')}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-sm btn-link p-0"
                                  style={{ textDecoration: 'none' }}
                                >
                                  <i className="bi bi-file-earmark"></i> File {fileIndex + 1}
                                </a>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-link text-danger p-0"
                                  onClick={() => handleRemovePaintingFile(index, fileIndex)}
                                  title="Xóa file"
                                >
                                  <i className="bi bi-x-circle"></i>
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      {uploadingPainting[`file_${index}`] && (
                        <small className="text-muted">Đang upload...</small>
                      )}
                    </div>

                    {/* Kích thước */}
                    {painting.type === 'tranh_tron' ? (
                      <div className="col-md-3">
                        <label className="form-label">Đường kính (cm) *</label>
                        <input
                          type="number"
                          className="form-control"
                          value={painting.width || painting.height || ''}
                          onChange={(e) =>
                            handlePaintingChange(index, 'width', parseFloat(e.target.value) || 0)
                          }
                          step="0.1"
                          required
                        />
                      </div>
                    ) : (
                      <>
                        <div className="col-md-3">
                          <label className="form-label">Chiều Ngang (cm) *</label>
                          <input
                            type="number"
                            className="form-control"
                            value={painting.width || ''}
                            onChange={(e) =>
                              handlePaintingChange(index, 'width', parseFloat(e.target.value) || 0)
                            }
                            step="0.1"
                            required
                          />
                        </div>

                        <div className="col-md-3">
                          <label className="form-label">Chiều cao (cm) *</label>
                          <input
                            type="number"
                            className="form-control"
                            value={painting.height || ''}
                            onChange={(e) =>
                              handlePaintingChange(index, 'height', parseFloat(e.target.value) || 0)
                            }
                            step="0.1"
                            required
                          />
                        </div>
                      </>
                    )}

                    {/* Loại tranh */}
                    <div className="col-md-3">
                      <label className="form-label">Loại tranh *</label>
                      <select
                        className="form-select"
                        value={painting.type || 'tranh_khung'}
                        onChange={(e) => handlePaintingChange(index, 'type', e.target.value)}
                        required
                      >
                        <option value="tranh_dan">Tranh dán</option>
                        <option value="tranh_khung">Tranh khung</option>
                        <option value="tranh_tron">Tranh tròn</option>
                        <option value="chi_in">Chỉ in</option>
                      </select>
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">
                        {painting.type === 'tranh_tron' ? 'Loại viền *' : 'Loại khung *'}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={painting.frameType || ''}
                        onChange={(e) => handlePaintingChange(index, 'frameType', e.target.value)}
                        disabled={painting.type === 'tranh_dan' || painting.type === 'chi_in'}
                        required
                      />
                    </div>

                    <div className="col-md-3">
                      <label className="form-label">Số lượng</label>
                      <input
                        type="number"
                        className="form-control"
                        value={painting.quantity || 1}
                        onChange={(e) => handlePaintingChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        min="1"
                      />
                    </div>

                    {/* Ghi chú */}
                    <div className="col-md-12">
                      <label className="form-label">Ghi chú</label>
                      <div className="mention-input-wrapper">
                        <textarea
                          className="form-control"
                          rows="2"
                          value={painting.note || ''}
                          onChange={(e) => handlePaintingNoteInput(index, e)}
                          onKeyDown={handleMentionKeyDown}
                          onClick={(e) => handlePaintingNoteCursorChange(index, e)}
                          onKeyUp={(e) => handlePaintingNoteCursorChange(index, e)}
                          onBlur={resetMentionState}
                          ref={(el) => {
                            if (el) {
                              if (!paintingTextareaRefs.current) {
                                paintingTextareaRefs.current = {};
                              }
                              paintingTextareaRefs.current[index] = el;
                            } else if (paintingTextareaRefs.current) {
                              delete paintingTextareaRefs.current[index];
                            }
                          }}
                          placeholder="Ghi chú tranh"
                        />
                        {mentionState.active && mentionState.target === 'painting' && mentionState.paintingIndex === index && mentionSuggestions.length > 0 && (
                          <div className="mention-suggestions-dropdown">
                            {mentionSuggestions.map((user, idx) => (
                              <button
                                type="button"
                                key={user._id}
                                className={`mention-suggestion-item ${idx === mentionHighlightIndex ? 'active' : ''}`}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  insertMention(user);
                                }}
                              >
                                <i className="bi bi-at me-2"></i>
                                <div>
                                  <div className="fw-semibold">{user.fullName}</div>
                                  {user.roles && user.roles.length > 0 && (
                                    <div className="text-muted small">
                                      {user.roles
                                        .map((role) => ROLE_LABELS[role] || role)
                                        .join(', ')}
                                    </div>
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {(() => {
                        const paintingMentionUsers = getPaintingMentionUsers(painting);
                        if (!paintingMentionUsers.length) return null;
                        return (
                          <div className="d-flex flex-wrap gap-2 mt-2">
                            {paintingMentionUsers.map((user) => (
                              <span
                                key={`${user._id || user.email}-${index}`}
                                className="mention-tag-badge"
                                style={{ cursor: 'pointer' }}
                                onClick={() => setMentionUserModal({ show: true, user })}
                              >
                                <i className="bi bi-at me-1"></i>
                                {user.fullName || user.email || 'Người dùng'}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Thông tin giá - chỉ hiển thị với đơn hàng không phải Shopee */}
        {formData.orderType !== 'shopee' && (
          <div className="card mb-4">
            <div className="card-body">
              <h5 className="form-section-title">Thông tin giá</h5>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Tiền tranh *</label>
                  <div className="input-group">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-control"
                      name="paintingPrice"
                      value={formatCurrency(formData.paintingPrice)}
                      onChange={(e) => handlePriceChange('paintingPrice', e.target.value)}
                      placeholder="0"
                      required
                    />
                    <span className="input-group-text">VNĐ</span>
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Tiền thi công (nếu có)</label>
                  <div className="input-group">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-control"
                      name="constructionPrice"
                      value={formatCurrency(formData.constructionPrice)}
                      onChange={(e) => handlePriceChange('constructionPrice', e.target.value)}
                      placeholder="0"
                    />
                    <span className="input-group-text">VNĐ</span>
                  </div>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Tiền thiết kế (nếu có)</label>
                  <div className="input-group">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-control"
                      name="designFee"
                      value={formatCurrency(formData.designFee)}
                      onChange={(e) => handlePriceChange('designFee', e.target.value)}
                      placeholder="0"
                    />
                    <span className="input-group-text">VNĐ</span>
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label">Phí phát sinh (nếu có)</label>
                  <input
                    type="text"
                    className="form-control mb-2"
                    placeholder="Tên phí phát sinh"
                    value={formData.extraFeeName}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        extraFeeName: e.target.value
                      }))
                    }
                    disabled={(formData.extraFeeAmount || 0) <= 0}
                  />
                  <div className="input-group">
                    <input
                      type="text"
                      inputMode="numeric"
                      className="form-control"
                      name="extraFeeAmount"
                      value={formatCurrency(formData.extraFeeAmount)}
                      onChange={(e) => handlePriceChange('extraFeeAmount', e.target.value)}
                      placeholder="0"
                    />
                    <span className="input-group-text">VNĐ</span>
                  </div>
                  <small className="text-muted">Bắt buộc nhập tên khi có phí phát sinh</small>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">VAT (8%)</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      value={formatCurrency(formData.vat)}
                      disabled
                      readOnly
                    />
                    <span className="input-group-text">VNĐ</span>
                  </div>
                  <div className="form-check mt-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={formData.includeVat}
                      onChange={(e) => {
                        setFormData(prev => {
                          const updated = { ...prev, includeVat: e.target.checked };
                          const subtotal =
                            (updated.paintingPrice || 0) +
                            (updated.constructionPrice || 0) +
                            (updated.designFee || 0) +
                            (updated.extraFeeAmount || 0) +
                            (updated.customerPaysShipping ? (updated.shippingInstallationPrice || 0) : 0);
                          const vat = updated.includeVat ? Math.round(subtotal * 0.08) : 0;
                          const totalAmount = Math.round(subtotal + vat);
                          return { ...updated, vat, totalAmount };
                        });
                      }}
                      id="includeVat"
                    />
                    <label className="form-check-label" htmlFor="includeVat">
                      Tính VAT
                    </label>
                  </div>
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Tổng giá trị đơn hàng *</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      value={formatCurrency(formData.totalAmount)}
                      disabled
                      readOnly
                    />
                    <span className="input-group-text">VNĐ</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ăn chia */}
        {formData.orderType !== 'shopee' && (
          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="form-section-title mb-0">Ăn chia (Nếu có)</h5>
                <div className="dropdown" style={{ position: 'relative' }}>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    type="button"
                    onClick={() => setShowProfitSharingDropdown(!showProfitSharingDropdown)}
                  >
                    <i className="bi bi-plus"></i>
                  </button>
                  {showProfitSharingDropdown && (
                    <div
                      className="dropdown-menu show"
                      style={{ display: 'block', position: 'absolute', right: 0, zIndex: 1000, minWidth: '260px' }}
                    >
                      <div className="px-3 py-2">
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Tìm theo tên hoặc email"
                          value={profitSharingSearch}
                          onChange={(e) => setProfitSharingSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div className="dropdown-divider my-0"></div>
                      <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                        {availableProfitSharingUsers.length > 0 ? (
                          availableProfitSharingUsers.map((user) => (
                            <button
                              key={user._id}
                              className="dropdown-item"
                              type="button"
                              onClick={() => {
                                handleAddProfitSharing(user);
                                setShowProfitSharingDropdown(false);
                              }}
                            >
                              {user.fullName || user.email}
                            </button>
                          ))
                        ) : (
                          <span className="dropdown-item-text text-muted">
                            {mentionableUsers && mentionableUsers.length > 0
                              ? 'Không tìm thấy người phù hợp'
                              : 'Đang tải danh sách...'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {formData.profitSharing.length === 0 ? (
                <p className="text-muted mb-0">Chưa có người nào được thêm vào danh sách ăn chia</p>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Người</th>
                        <th>% Ăn chia</th>
                        <th>Số tiền</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.profitSharing.map((item, index) => {
                        const user = mentionableUsers.find(u => u._id === item.user || u._id === item.user?._id);
                        return (
                          <tr key={index}>
                            <td>
                              {user ? (user.fullName || user.email) : 'Người dùng'}
                            </td>
                            <td>
                              <div className="input-group input-group-sm" style={{ maxWidth: '150px' }}>
                                <input
                                  type="text"
                                  className="form-control"
                                  value={item.percentage || 0}
                                  onChange={(e) => handleUpdateProfitSharingPercentage(index, e.target.value)}
                                  placeholder="0"
                                />
                                <span className="input-group-text">%</span>
                              </div>
                            </td>
                            <td>
                              <strong>{formatCurrency(item.amount || 0)} VNĐ</strong>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => handleRemoveProfitSharing(index)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Thông tin cọc */}
        <div className="card mb-4">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="form-section-title mb-0">Thông tin cọc</h5>
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="hasDeposit"
                  checked={formData.hasDeposit}
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      hasDeposit: e.target.checked,
                      // Reset về 0 nếu bỏ check
                      depositAmount: e.target.checked ? prev.depositAmount : 0,
                      depositImages: e.target.checked ? prev.depositImages : []
                    }));
                  }}
                />
                <label className="form-check-label" htmlFor="hasDeposit">
                  Có cọc
                </label>
              </div>
            </div>
            {formData.hasDeposit ? (
              <>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Tiền cọc *</label>
                <div className="input-group">
                  <input
                    type="text"
                    inputMode="numeric"
                    className="form-control"
                    name="depositAmount"
                    value={formatCurrency(formData.depositAmount)}
                    onChange={(e) => handleCurrencyChange('depositAmount', e.target.value)}
                    placeholder="0"
                  />
                  <span className="input-group-text">VNĐ</span>
                </div>
              </div>
              <div className="col-md-6 d-flex align-items-end">
                <div className="w-100">
                  <label className="form-label">COD</label>
                  <input
                    type="text"
                    className="form-control"
                    value={`${Math.max(Number(formData.totalAmount || 0) - Number(formData.depositAmount || 0), 0).toLocaleString('vi-VN')} VNĐ`}
                    disabled
                    readOnly
                  />
                </div>
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label">Upload file cọc (ảnh/tài liệu) *</label>
              <div
                className={`drop-zone ${dragOver.deposit ? 'drag-over' : ''}`}
                onDragOver={handleDragOverDeposit}
                onDragLeave={handleDragLeaveDeposit}
                onDrop={handleDropDeposit}
                onPaste={(e) => handlePaste(e, 'deposit')}
                onClick={(e) => {
                  // Focus vào drop-zone để có thể nhận paste event
                  if (e.target.tagName !== 'INPUT') {
                    e.currentTarget.focus();
                  }
                }}
                tabIndex={0}
              >
                <input
                  type="file"
                  className="form-control"
                  multiple
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      handleUploadDepositImage(e.target.files);
                    }
                  }}
                  disabled={uploadingDeposit}
                />
                <small className="text-muted d-block mt-1">
                  Kéo thả file vào đây hoặc paste ảnh từ clipboard (có thể chọn nhiều file)
                </small>
              </div>
              {uploadingDeposit && (
                <small className="text-muted">Đang upload...</small>
              )}
            </div>

            {formData.depositImages && formData.depositImages.length > 0 && (
              <div className="mb-3">
                <h6>File đã upload ({formData.depositImages.length}):</h6>
                <div className="d-flex flex-wrap gap-2">
                  {formData.depositImages.map((file, index) => (
                    <div key={index} className="position-relative d-inline-block">
                      {isImageFile(file) ? (
                        <img
                          src={getImageUrl(file, 'deposits')}
                          alt={`Cọc ${index + 1}`}
                          className="img-thumbnail"
                          style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div 
                          className="d-flex flex-column align-items-center justify-content-center border rounded p-3"
                          style={{ width: '200px', height: '200px', backgroundColor: '#f8f9fa' }}
                        >
                          <i className={`${getFileIcon(file)} ${getFileColor(file)}`} style={{ fontSize: '3rem' }}></i>
                          <small className="mt-2 text-center text-truncate" style={{ maxWidth: '180px' }} title={file}>
                            {file}
                          </small>
                          <a 
                            href={getImageUrl(file, 'deposits')} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-link mt-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Xem file
                          </a>
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-danger position-absolute top-0 end-0 m-1"
                        onClick={() => handleRemoveDepositImage(index)}
                      >
                        <i className="bi bi-x"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
              </>
            ) : (
              <p className="text-muted mb-0">Bỏ trống nếu đơn hàng không có cọc.</p>
            )}
          </div>
        </div>

        {/* Thông tin khác */}
        <div className="card mb-4">
          <div className="card-body">
            <h5 className="form-section-title">Thông tin khác</h5>
            

            <div className="mb-3">
              <label className="form-label">Ghi chú</label>
              <div className="mention-input-wrapper">
                <textarea
                  className="form-control"
                  name="note"
                  value={formData.note}
                  onChange={handleNoteInput}
                  onKeyDown={handleMentionKeyDown}
                  onClick={handleNoteCursorChange}
                  onKeyUp={handleNoteCursorChange}
                  onBlur={resetMentionState}
                  rows="3"
                  ref={noteTextareaRef}
                  placeholder="Nhập ghi chú đơn hàng"
                />
                {mentionState.active && mentionState.target === 'order' && mentionSuggestions.length > 0 && (
                  <div className="mention-suggestions-dropdown">
                    {mentionSuggestions.map((user, index) => (
                      <button
                        type="button"
                        key={user._id}
                        className={`mention-suggestion-item ${index === mentionHighlightIndex ? 'active' : ''}`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          insertMention(user);
                        }}
                      >
                        <i className="bi bi-at me-2"></i>
                        <div>
                          <div className="fw-semibold">{user.fullName}</div>
                          {user.roles && user.roles.length > 0 && (
                            <div className="text-muted small">
                              {user.roles
                                .map((role) => ROLE_LABELS[role] || role)
                                .join(', ')}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {mentionError && (
                <div className="text-danger small mt-1">
                  {mentionError}
                </div>
              )}
              {orderMentionUsers.length > 0 && (
                <div className="d-flex flex-wrap gap-2 mt-2">
                  {orderMentionUsers.map((user) => (
                    <span
                      key={user._id || user.email}
                      className="mention-tag-badge"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setMentionUserModal({ show: true, user })}
                    >
                      <i className="bi bi-at me-1"></i>
                      {user.fullName || user.email || 'Người dùng'}
                    </span>
                  ))}
                </div>
              )}
              
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Đang tạo...' : 'Tạo đơn hàng'}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/orders')}>
            Hủy
          </button>
        </div>
      </form>

      {/* Modal xem trước ảnh */}
      {previewImage && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            cursor: 'pointer'
          }}
          onClick={() => setPreviewImage(null)}
        >
          <div
            style={{
              maxWidth: '90%',
              maxHeight: '90%',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="btn btn-link text-white position-absolute top-0 end-0"
              style={{
                fontSize: '2rem',
                zIndex: 10000,
                textDecoration: 'none'
              }}
              onClick={() => setPreviewImage(null)}
            >
              <i className="bi bi-x-lg"></i>
            </button>
            <img
              src={previewImage}
              alt="Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '90vh',
                objectFit: 'contain'
              }}
            />
          </div>
        </div>
      )}

      <UserProfileModal
        show={mentionUserModal.show}
        user={mentionUserModal.user}
        onClose={() => setMentionUserModal({ show: false, user: null })}
      />
    </div>
  );
}

export default CreateOrder;
