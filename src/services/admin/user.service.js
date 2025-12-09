import User from '../../models/User.js';
import { sanitizeUser } from '../../helpers/auth.helper.js';
import { buildServiceResponse } from './utils.js';

export const getPendingUsers = async () => {
  try {
    const pendingUsers = await User.find({
      active: false
    })
      .select('-password')
      .sort({ createdAt: -1 })
      .lean();

    const usersWithStringId = pendingUsers.map((user) => ({
      ...user,
      _id: user._id.toString()
    }));

    return buildServiceResponse(200, {
      success: true,
      count: usersWithStringId.length,
      data: usersWithStringId
    });
  } catch (error) {
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const approveUser = async (userId, currentUser) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy user'
      });
    }

    if (user.active) {
      return buildServiceResponse(400, {
        success: false,
        message: 'User đã được phê duyệt trước đó'
      });
    }

    user.active = true;
    user.approvedBy = currentUser._id;
    user.approvedAt = new Date();
    user.addHistory({
      action: 'approve',
      description: `Admin ${currentUser.fullName} phê duyệt tài khoản`,
      changes: {
        active: { from: false, to: true },
        approvedBy: {
          to: {
            id: currentUser._id,
            fullName: currentUser.fullName,
            email: currentUser.email
          }
        },
        approvedAt: { to: user.approvedAt }
      },
      changedBy: currentUser._id
    });

    await user.save();
    await user.populate('changeHistory.changedBy', 'fullName email');

    return buildServiceResponse(200, {
      success: true,
      message: 'Phê duyệt user thành công',
      data: sanitizeUser(user)
    });
  } catch (error) {
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const rejectUser = async (userId, payload = {}) => {
  try {
    const { reason } = payload;

    const user = await User.findById(userId);

    if (!user) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy user'
      });
    }

    if (user.active) {
      return buildServiceResponse(400, {
        success: false,
        message: 'Không thể từ chối user đã được phê duyệt'
      });
    }

    await User.findByIdAndDelete(userId);

    return buildServiceResponse(200, {
      success: true,
      message: 'Đã từ chối và xóa user',
      data: {
        email: user.email,
        reason: reason || 'Không đủ điều kiện'
      }
    });
  } catch (error) {
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const getUsers = async (query = {}) => {
  try {
    const { active, role } = query;
    const filter = {};

    if (active !== undefined) filter.active = active === 'true';
    if (role) filter.roles = role;

    const users = await User.find(filter)
      .select('-password')
      .populate('approvedBy', 'fullName email')
      .sort({ createdAt: -1 })
      .lean();

    const usersWithStringId = users.map((user) => ({
      ...user,
      _id: user._id.toString(),
      approvedBy: user.approvedBy
        ? {
            ...user.approvedBy,
            _id: user.approvedBy._id.toString()
          }
        : null
    }));

    return buildServiceResponse(200, {
      success: true,
      count: usersWithStringId.length,
      data: usersWithStringId
    });
  } catch (error) {
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const getUserDetail = async (userId) => {
  try {
    const user = await User.findById(userId)
      .select('-password')
      .populate('approvedBy', 'fullName email')
      .populate('changeHistory.changedBy', 'fullName email')
      .lean();

    if (!user) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy user'
      });
    }

    const userWithStringId = {
      ...user,
      _id: user._id.toString(),
      approvedBy: user.approvedBy
        ? {
            ...user.approvedBy,
            _id: user.approvedBy._id.toString()
          }
        : null
    };

    return buildServiceResponse(200, {
      success: true,
      data: userWithStringId
    });
  } catch (error) {
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const updateUserRoles = async (userId, payload = {}, currentUser) => {
  try {
    const { roles } = payload;

    const user = await User.findById(userId);

    if (!user) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy user'
      });
    }

    if (user.roles.includes('admin')) {
      return buildServiceResponse(403, {
        success: false,
        message: 'Không thể thay đổi vai trò của Admin'
      });
    }

    const previousRoles = [...user.roles];
    user.roles = roles;

    const rolesChanged =
      JSON.stringify([...previousRoles].sort()) !== JSON.stringify([...roles].sort());

    if (rolesChanged) {
      user.addHistory({
        action: 'update-roles',
        description: `Admin ${currentUser.fullName} cập nhật vai trò`,
        changes: {
          roles: {
            from: previousRoles,
            to: roles
          }
        },
        changedBy: currentUser._id
      });
    }

    await user.save();
    await user.populate('changeHistory.changedBy', 'fullName email');

    return buildServiceResponse(200, {
      success: true,
      message: 'Cập nhật vai trò thành công',
      data: sanitizeUser(user)
    });
  } catch (error) {
    return buildServiceResponse(400, {
      success: false,
      message: error.message
    });
  }
};

export const toggleUserActive = async (userId, payload = {}, currentUser) => {
  try {
    const { secretCode } = payload;

    const user = await User.findById(userId);

    if (!user) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy user'
      });
    }

    if (user.roles.includes('admin')) {
      if (!secretCode || secretCode !== process.env.ADMIN_SECRET_CODE) {
        return buildServiceResponse(403, {
          success: false,
          message: 'Mã bí mật không chính xác. Không thể khóa tài khoản Admin.'
        });
      }
    }

    const previousState = user.active;
    user.active = !user.active;
    user.addHistory({
      action: 'toggle-active',
      description: `Admin ${currentUser.fullName} ${
        user.active ? 'mở khóa' : 'khóa'
      } tài khoản`,
      changes: {
        active: {
          from: previousState,
          to: user.active
        }
      },
      changedBy: currentUser._id
    });

    await user.save();
    await user.populate('changeHistory.changedBy', 'fullName email');

    const message = user.active
      ? 'Đã mở khóa tài khoản thành công'
      : 'Đã khóa tài khoản thành công';

    return buildServiceResponse(200, {
      success: true,
      message,
      data: sanitizeUser(user)
    });
  } catch (error) {
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};



