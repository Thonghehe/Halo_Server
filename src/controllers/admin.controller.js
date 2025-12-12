import {
  getPendingUsers,
  approveUser,
  rejectUser,
  getUsers,
  getUserDetail,
  updateUserRoles,
  toggleUserActive,
  migratePaintingStatus
} from '../services/admin.service.js';

export const getPendingUsersController = async (req, res) => {
  const result = await getPendingUsers();
  return res.status(result.statusCode).json(result.body);
};

export const approveUserController = async (req, res) => {
  const { userId } = req.params;
  const result = await approveUser(userId, req.user);
  return res.status(result.statusCode).json(result.body);
};

export const rejectUserController = async (req, res) => {
  const { userId } = req.params;
  const result = await rejectUser(userId, req.body || {});
  return res.status(result.statusCode).json(result.body);
};

export const getUsersController = async (req, res) => {
  const result = await getUsers(req.query || {});
  return res.status(result.statusCode).json(result.body);
};

export const getUserDetailController = async (req, res) => {
  const { userId } = req.params;
  const result = await getUserDetail(userId);
  return res.status(result.statusCode).json(result.body);
};

export const updateUserRolesController = async (req, res) => {
  const { userId } = req.params;
  const result = await updateUserRoles(userId, req.body || {}, req.user);
  return res.status(result.statusCode).json(result.body);
};

export const toggleUserActiveController = async (req, res) => {
  const { userId } = req.params;
  const result = await toggleUserActive(userId, req.body || {}, req.user);
  return res.status(result.statusCode).json(result.body);
};

export const migratePaintingStatusController = async (req, res) => {
  const result = await migratePaintingStatus();
  return res.status(result.statusCode).json(result.body);
};



