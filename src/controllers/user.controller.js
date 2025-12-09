import {
  getRoles,
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser
} from '../services/user.service.js';

export const getRolesController = async (req, res) => {
  const result = await getRoles();
  return res.status(result.statusCode).json(result.body);
};

export const createUserController = async (req, res) => {
  const result = await createUser(req.body || {});
  return res.status(result.statusCode).json(result.body);
};

export const getUsersController = async (req, res) => {
  const result = await getUsers(req.query || {});
  return res.status(result.statusCode).json(result.body);
};

export const getUserByIdController = async (req, res) => {
  const { id } = req.params;
  const result = await getUserById(id);
  return res.status(result.statusCode).json(result.body);
};

export const updateUserController = async (req, res) => {
  const { id } = req.params;
  const result = await updateUser(id, req.body || {});
  return res.status(result.statusCode).json(result.body);
};

export const deleteUserController = async (req, res) => {
  const { id } = req.params;
  const result = await deleteUser(id);
  return res.status(result.statusCode).json(result.body);
};



