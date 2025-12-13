import { useState } from 'react';
import * as orderUtils from '../../utils/orderUtils';
import api from '../../utils/api';

/**
 * Component hiển thị danh sách tranh
 */
export default function OrderPaintingsList({ paintings, getPaintingMentions, onMentionClick, orderId, user, onPaintingUpdated }) {
  const { getVnPaintingTypeName, getImageUrl } = orderUtils;
  const [markingPrinted, setMarkingPrinted] = useState({});
  const [receiving, setReceiving] = useState({});
  const [receivingPacking, setReceivingPacking] = useState({});

  const userRoles = Array.isArray(user?.roles) ? user.roles : [];
  const isIn = userRoles.includes('in');
  const isSanXuat = userRoles.includes('sanXuat');
  const isDongGoi = userRoles.includes('dongGoi');

  // Chỉ hiển thị nút cho role tương ứng (không bao gồm admin)
  const canMarkPrinted = isIn;
  const canReceive = isSanXuat;
  const canReceivePacking = isDongGoi;

  // Kiểm tra tranh có cần vào khung không (tranh dán và chỉ in không cần)
  const requiresFrameAssembly = (painting) => {
    if (!painting) return false;
    const type = painting.type;
    return ['tranh_khung', 'tranh_tron', 'trang_guong', 'in_noi', 'son_dau'].includes(type);
  };

  const handleMarkPrinted = async (paintingId) => {
    if (!orderId || !paintingId) return;
    
    setMarkingPrinted(prev => ({ ...prev, [paintingId]: true }));
    try {
      const response = await api.patch(`/api/orders/${orderId}/paintings/${paintingId}/mark-printed`);
      if (response.data.success) {
        if (onPaintingUpdated) onPaintingUpdated();
      } else {
        alert(response.data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert(error.message || 'Có lỗi xảy ra khi đánh dấu tranh đã in');
    } finally {
      setMarkingPrinted(prev => ({ ...prev, [paintingId]: false }));
    }
  };

  const handleReceive = async (paintingId) => {
    if (!orderId || !paintingId) return;
    
    setReceiving(prev => ({ ...prev, [paintingId]: true }));
    try {
      const response = await api.patch(`/api/orders/${orderId}/paintings/${paintingId}/receive`);
      if (response.data.success) {
        if (onPaintingUpdated) onPaintingUpdated();
      } else {
        alert(response.data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert(error.message || 'Có lỗi xảy ra khi nhận tranh');
    } finally {
      setReceiving(prev => ({ ...prev, [paintingId]: false }));
    }
  };

  const handleReceivePacking = async (paintingId) => {
    if (!orderId || !paintingId) return;
    
    setReceivingPacking(prev => ({ ...prev, [paintingId]: true }));
    try {
      const response = await api.patch(`/api/orders/${orderId}/paintings/${paintingId}/receive-packing`);
      if (response.data.success) {
        if (onPaintingUpdated) onPaintingUpdated();
      } else {
        alert(response.data.message || 'Có lỗi xảy ra');
      }
    } catch (error) {
      alert(error.message || 'Có lỗi xảy ra khi nhận tranh');
    } finally {
      setReceivingPacking(prev => ({ ...prev, [paintingId]: false }));
    }
  };

  if (!paintings || paintings.length === 0) return null;

  return (
    <div className="mb-4">
      <h6 className="border-bottom pb-2">
        <i className="bi bi-images"></i> Danh sách tranh ({paintings.length})
      </h6>
      <div className="row g-3">
        {paintings.map((painting, idx) => (
          <div key={painting._id || idx} className="col-md-6 col-lg-4">
            <div className="card h-100">
              <div className="card-body">
                <h6 className="card-title">
                  <i className="bi bi-image"></i> Tranh {idx + 1}
                </h6>
                
                {/* Kích thước */}
                {(painting.width || painting.height) && (
                  <p className="mb-1">
                    <strong>Kích thước:</strong>{' '}
                    {painting.type === 'tranh_tron'
                      ? `${painting.width || painting.height} cm (Đường kính)`
                      : painting.width && painting.height
                      ? `Ngang: ${painting.width} cm, Cao: ${painting.height} cm`
                      : painting.width
                      ? `Ngang: ${painting.width} cm`
                      : painting.height
                      ? `Cao: ${painting.height} cm`
                      : '-'}
                  </p>
                )}
                
                {/* Loại tranh */}
                {painting.type && (
                  <p className="mb-1">
                    <strong>Loại tranh:</strong> {getVnPaintingTypeName(painting.type)}
                  </p>
                )}
                
                {/* Loại khung / viền */}
                {painting.frameType && (
                  <p className="mb-1">
                    <strong>{painting.type === 'tranh_tron' ? 'Loại viền' : 'Loại khung'}:</strong> {painting.frameType}
                  </p>
                )}
                
                {/* Số lượng */}
                <p className="mb-1">
                  <strong>Số lượng:</strong> {painting.quantity || 1}
                </p>
                
                {/* Trạng thái in */}
                <div className="mb-2">
                  <strong>Trạng thái in:</strong>{' '}
                  {painting.isPrinted ? (
                    <span className="badge bg-success">
                      <i className="bi bi-check-circle me-1"></i>Đã in
                    </span>
                  ) : (
                    <span className="badge bg-secondary">
                      <i className="bi bi-x-circle me-1"></i>Chưa in
                    </span>
                  )}
                  {painting.printedAt && (
                    <small className="text-muted d-block mt-1">
                      {new Date(painting.printedAt).toLocaleString('vi-VN')}
                    </small>
                  )}
                  {/* Nút đánh dấu đã in cho role in */}
                  {canMarkPrinted && !painting.isPrinted && (
                    <div className="mt-2">
                      <button
                        className="btn btn-sm btn-success"
                        onClick={() => handleMarkPrinted(painting._id)}
                        disabled={markingPrinted[painting._id]}
                      >
                        {markingPrinted[painting._id] ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                            Đang xử lý...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check-circle me-1"></i>Đánh dấu đã in
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Trạng thái nhận sản xuất (cho tranh cần vào khung) */}
                {painting.isPrinted && requiresFrameAssembly(painting) && (
                  <div className="mb-2">
                    <strong>Sản xuất:</strong>{' '}
                    {painting.receivedByProduction ? (
                      <span className="badge bg-info">
                        <i className="bi bi-check-circle me-1"></i>Đã nhận
                      </span>
                    ) : (
                      <span className="badge bg-warning">
                        <i className="bi bi-clock me-1"></i>Chưa nhận
                      </span>
                    )}
                    {painting.receivedAt && (
                      <small className="text-muted d-block mt-1">
                        {new Date(painting.receivedAt).toLocaleString('vi-VN')}
                      </small>
                    )}
                  </div>
                )}

                {/* Trạng thái nhận đóng gói (cho tranh dán và chỉ in) */}
                {painting.isPrinted && !requiresFrameAssembly(painting) && (
                  <div className="mb-2">
                    <strong>Đóng gói:</strong>{' '}
                    {painting.receivedByPacking ? (
                      <span className="badge bg-info">
                        <i className="bi bi-check-circle me-1"></i>Đã nhận
                      </span>
                    ) : (
                      <span className="badge bg-warning">
                        <i className="bi bi-clock me-1"></i>Chưa nhận
                      </span>
                    )}
                    {painting.receivedByPackingAt && (
                      <small className="text-muted d-block mt-1">
                        {new Date(painting.receivedByPackingAt).toLocaleString('vi-VN')}
                      </small>
                    )}
                  </div>
                )}

                
                {/* Ghi chú */}
                {painting.note && (() => {
                  const paintingMentions = getPaintingMentions(painting);
                  return (
                    <div className="mb-2">
                      <p className="mb-1" style={{ whiteSpace: 'pre-wrap' }}>
                        <strong>Ghi chú:</strong> {painting.note}
                      </p>
                      {paintingMentions.length > 0 && (
                        <div className="d-flex flex-wrap gap-2 mt-1">
                          {paintingMentions.map((mention, mentionIndex) => (
                            <span
                              key={`${mention.user?._id || mention.user || mentionIndex}-${mention.taggedAt || mentionIndex}`}
                              className="mention-tag-badge"
                              title={
                                mention.taggedAt
                                  ? `Nhắc bởi ${mention.taggedBy?.fullName || 'Người dùng'} vào ${new Date(mention.taggedAt).toLocaleString('vi-VN')}`
                                  : `Nhắc bởi ${mention.taggedBy?.fullName || 'Người dùng'}`
                              }
                              onClick={() => onMentionClick(mention)}
                            >
                              <i className="bi bi-at me-1"></i>
                              {mention.user?.fullName || 'Người dùng'}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
                
                {/* Ảnh tranh */}
                {(() => {
                  const paintingImages = Array.isArray(painting.images) && painting.images.length > 0
                    ? painting.images
                    : painting.image
                    ? [painting.image]
                    : [];
                  if (paintingImages.length === 0) return null;
                  return (
                    <div className="mb-2">
                      <div className="d-flex flex-wrap gap-2">
                        {paintingImages.map((img, imageIndex) => (
                          <img
                            key={`${img}-${imageIndex}`}
                            src={getImageUrl(img, 'paintings')}
                            alt={`Tranh ${idx + 1} - Ảnh ${imageIndex + 1}`}
                            className="img-thumbnail"
                            style={{
                              maxWidth: '140px',
                              maxHeight: '140px',
                              objectFit: 'cover',
                              cursor: 'pointer'
                            }}
                            onClick={() => {
                              const imgUrl = getImageUrl(img, 'paintings');
                              if (imgUrl) window.open(imgUrl, '_blank');
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })()}
                
                {/* File đính kèm */}
                {(() => {
                  const paintingFiles = Array.isArray(painting.files) && painting.files.length > 0
                    ? painting.files
                    : painting.file
                    ? [painting.file]
                    : [];
                  if (paintingFiles.length === 0) return null;
                  return (
                    <div className="mt-2 d-flex flex-column gap-1">
                      {paintingFiles.map((fileName, fileIndex) => (
                        <a
                          key={`${fileName}-${fileIndex}`}
                          href={getImageUrl(fileName, 'files')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm btn-outline-primary d-flex align-items-center gap-2"
                        >
                          <i className="bi bi-file-earmark"></i>
                          <span>File {fileIndex + 1}</span>
                        </a>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

