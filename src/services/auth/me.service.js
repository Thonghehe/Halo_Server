import User from '../../models/User.js';
import { sanitizeUser } from '../../helpers/auth.helper.js';
import { buildServiceResponse } from './utils.js';

export const getMe = async (currentUser) => {
  try {
    await currentUser.populate({
      path: 'changeHistory.changedBy',
      select: 'fullName email'
    });

    return buildServiceResponse(200, {
      success: true,
      data: sanitizeUser(currentUser)
    });
  } catch (error) {
    return buildServiceResponse(500, {
      success: false,
      message: error.message
    });
  }
};

export const updateMe = async (payload = {}, currentUser) => {
  try {
    const allowedFields = ['fullName'];
    const updates = {};

    allowedFields.forEach((field) => {
      if (payload[field] !== undefined) {
        updates[field] = payload[field];
      }
    });

    const user = await User.findById(currentUser._id)
      .select('-password')
      .populate('changeHistory.changedBy', 'fullName email');

    if (!user) {
      return buildServiceResponse(404, {
        success: false,
        message: 'Không tìm thấy người dùng'
      });
    }

    const changes = {};

    if (updates.fullName && updates.fullName.trim() !== user.fullName) {
      changes.fullName = {
        from: user.fullName,
        to: updates.fullName.trim()
      };
      user.fullName = updates.fullName.trim();
    }

    if (!Object.keys(changes).length) {
      return buildServiceResponse(200, {
        success: true,
        message: 'Không có thay đổi nào được thực hiện',
        data: sanitizeUser(user)
      });
    }

    user.addHistory({
      action: 'update-profile',
      description: 'Người dùng cập nhật thông tin cá nhân',
      changes,
      changedBy: currentUser._id
    });

    await user.save();
    await user.populate('changeHistory.changedBy', 'fullName email');

    return buildServiceResponse(200, {
      success: true,
      message: 'Cập nhật thông tin cá nhân thành công',
      data: sanitizeUser(user)
    });
  } catch (error) {
    return buildServiceResponse(400, {
      success: false,
      message: error.message
    });
  }
};



