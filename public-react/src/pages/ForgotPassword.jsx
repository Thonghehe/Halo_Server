import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import '../styles/Login.css';
import logoHalo from '../assets/images/logohalo.png';

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('email');
  const [loading, setLoading] = useState(false);

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!email.trim()) {
      setError('Vui lòng nhập email hợp lệ');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/api/auth/forgot-password', { email: email.trim() });
      if (response.data?.success) {
        setMessage('Chúng tôi đã gửi mã OTP 6 số tới email của bạn. Vui lòng kiểm tra hộp thư hoặc thư rác.');
        setStep('otp');
      } else {
        setError(response.data?.message || 'Không thể gửi yêu cầu, vui lòng thử lại.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể gửi yêu cầu, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (otp.trim().length !== 6) {
      setError('Vui lòng nhập đủ 6 số OTP.');
      return;
    }
    setLoading(true);
    try {
      const response = await api.post('/api/auth/verify-reset-otp', {
        email: email.trim(),
        otp: otp.trim()
      });
      if (response.data?.success && response.data?.resetToken) {
        setMessage('Xác thực OTP thành công. Đang chuyển tới bước đặt lại mật khẩu...');
        setTimeout(() => {
          navigate('/reset-password', {
            state: {
              resetToken: response.data.resetToken,
              email: email.trim()
            }
          });
        }, 800);
      } else {
        setError(response.data?.message || 'OTP không hợp lệ.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'OTP không hợp lệ hoặc đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setStep('email');
    setOtp('');
    setMessage('');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <img src={logoHalo} alt="Halo Logo" style={{ maxWidth: '200px', height: 'auto', marginBottom: '0.25rem' }} />
          <p className="mb-0" style={{ fontSize: '22px', marginTop: '4px', fontWeight: 'bold' }}>Quên mật khẩu</p>
          <small className="text-muted">Nhập email đăng ký để nhận hướng dẫn đặt lại mật khẩu.</small>
        </div>
        <div className="login-body">
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          {message && (
            <div className="alert alert-success" role="alert">
              {message}
            </div>
          )}
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit}>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-login w-100" disabled={loading}>
                {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
              </button>
            </form>
          )}
          {step === 'otp' && (
            <form onSubmit={handleOtpSubmit}>
              <div className="mb-3">
                <label className="form-label">Nhập mã OTP 6 số</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  className="form-control text-center fw-bold"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                />
                <small className="text-muted">Mã OTP có hiệu lực trong 5 phút.</small>
              </div>
              <button type="submit" className="btn btn-primary btn-login w-100 mb-2" disabled={loading}>
                {loading ? 'Đang xác thực...' : 'Xác thực OTP'}
              </button>
              <button type="button" className="btn btn-outline-secondary w-100" onClick={handleBackToEmail} disabled={loading}>
                Nhập email khác
              </button>
            </form>
          )}
          <div className="text-center mt-3 d-flex flex-column gap-2">
            <Link to="/login" className="text-decoration-none">
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;


