import Painting from '../../models/Painting.js';
import Order from '../../models/Order.js';
import { buildServiceResponse } from '../orders/utils.js';

/**
 * Migration để cập nhật trạng thái in và nhận cho các painting cũ
 */
export const migratePaintingStatus = async () => {
  try {
    // Đếm số lượng painting cần migrate
    const totalPaintings = await Painting.countDocuments();
    
    // Tìm các painting chưa có field isPrinted hoặc các field mới
    const paintingsToMigrate = await Painting.find({
      $or: [
        { isPrinted: { $exists: false } },
        { receivedByProduction: { $exists: false } },
        { receivedByPacking: { $exists: false } }
      ]
    });

    if (paintingsToMigrate.length === 0) {
      return buildServiceResponse(200, {
        success: true,
        message: 'Không có painting nào cần migrate',
        data: {
          totalPaintings,
          migratedCount: 0
        }
      });
    }

    let updatedCount = 0;
    let printedCount = 0;
    let receivedProductionCount = 0;
    let receivedPackingCount = 0;

    // Migrate từng painting
    for (const painting of paintingsToMigrate) {
      const updateData = {};

      // Set isPrinted nếu chưa có
      if (painting.isPrinted === undefined) {
        updateData.isPrinted = false;
        printedCount++;
      }

      // Set receivedByProduction nếu chưa có
      if (painting.receivedByProduction === undefined) {
        updateData.receivedByProduction = false;
        receivedProductionCount++;
      }

      // Set receivedByPacking nếu chưa có
      if (painting.receivedByPacking === undefined) {
        updateData.receivedByPacking = false;
        receivedPackingCount++;
      }

      // Cập nhật painting
      if (Object.keys(updateData).length > 0) {
        await Painting.updateOne(
          { _id: painting._id },
          { $set: updateData }
        );
        updatedCount++;
      }
    }

    return buildServiceResponse(200, {
      success: true,
      message: `Migration hoàn tất! Đã cập nhật ${updatedCount} painting`,
      data: {
        totalPaintings,
        migratedCount: updatedCount,
        details: {
          isPrinted: printedCount,
          receivedByProduction: receivedProductionCount,
          receivedByPacking: receivedPackingCount
        }
      }
    });
  } catch (error) {
    console.error('[Migrate painting status] Error:', error);
    return buildServiceResponse(500, {
      success: false,
      message: error.message || 'Lỗi khi migrate dữ liệu'
    });
  }
};

