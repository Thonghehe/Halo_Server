import User, { ROLE_LABELS } from '../../models/User.js';
import { sanitizeUser } from '../../helpers/auth.helper.js';
import { buildServiceResponse } from './utils.js';

export const getRoles = () => {
  const roles = Object.entries(ROLE_LABELS).map(([value, label]) => ({
    value,
    label
  }));

  return buildServiceResponse(200, {
    success: true,
    data: roles
  });
};

export const createUser = async (payload = {}) => {
  try {
    const user = new User(payload);
    await user.save();

    return buildServiceResponse(201, {
      success: true,
      message: 'Tạo user thành công',
      data: user
    });
  } catch (error) {
    return buildServiceResponse(400, {
      success: false,
      message: error.message
    });
  }
};

export const getUsers = async (query = {}) => {
  try {
    const { role, isActive } = query;
    const filter = {};

    if (role) filter.roles = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const users = await User.find(filter).sort({ createdAt: -1 });

    return buildServiceResponse(200, {
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const getUserById = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy user'
      });
    }

    return buildServiceResponse(200, {
      success: true,
      data: user
    });
  } catch (error) {
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const updateUser = async (userId, payload = {}) => {
  try {
    const user = await User.findByIdAndUpdate(userId, payload, {
      new: true,
      runValidators: true
    });

    if (!user) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy user'
      });
    }

    return buildServiceResponse(200, {
      success: true,
      message: 'Cập nhật user thành công',
      data: user
    });
  } catch (error) {
    return buildServiceResponse(400, {
      success: false,
      message: error.message
    });
  }
};

export const deleteUser = async (userId) => {
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy user'
      });
    }

    return buildServiceResponse(200, {
      success: true,
      message: 'Xóa user thành công',
      data: user
    });
  } catch (error) {
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};



