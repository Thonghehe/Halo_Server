import {
  registerUser,
  loginUser,
  logoutUser,
  forgotPassword,
  verifyResetOtp,
  resetPassword,
  getMe,
  updateMe,
  changePassword,
  registerAdmin
} from '../services/auth.service.js';

export const registerController = async (req, res) => {
  const result = await registerUser(req.body || {});
  return res.status(result.statusCode).json(result.body);
};

export const loginController = async (req, res) => {
  const result = await loginUser(req.body || {}, req);
  return res.status(result.statusCode).json(result.body);
};

export const logoutController = async (req, res) => {
  const result = await logoutUser(req);
  return res.status(result.statusCode).json(result.body);
};

export const forgotPasswordController = async (req, res) => {
  const result = await forgotPassword(req.body || {});
  return res.status(result.statusCode).json(result.body);
};

export const verifyResetOtpController = async (req, res) => {
  const result = await verifyResetOtp(req.body || {});
  return res.status(result.statusCode).json(result.body);
};

export const resetPasswordController = async (req, res) => {
  const result = await resetPassword(req.body || {});
  return res.status(result.statusCode).json(result.body);
};

export const getMeController = async (req, res) => {
  const result = await getMe(req.user);
  return res.status(result.statusCode).json(result.body);
};

export const updateMeController = async (req, res) => {
  const result = await updateMe(req.body || {}, req.user);
  return res.status(result.statusCode).json(result.body);
};

export const changePasswordController = async (req, res) => {
  const result = await changePassword(req.body || {}, req.user, req.sessionToken);
  return res.status(result.statusCode).json(result.body);
};

export const registerAdminController = async (req, res) => {
  const result = await registerAdmin(req.body || {}, req);
  return res.status(result.statusCode).json(result.body);
};



