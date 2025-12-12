import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Painting from '../models/Painting.js';
import Order from '../models/Order.js';

dotenv.config();

/**
 * Migration script để cập nhật trạng thái in và nhận cho các painting cũ
 * - Set isPrinted = false (mặc định) cho các painting chưa có field này
 * - Set receivedByProduction = false (mặc định) cho các painting chưa có field này
 * - Set receivedByPacking = false (mặc định) cho các painting chưa có field này
 * - Dựa vào printingStatus của order để set isPrinted cho các painting
 */
const migratePaintingStatus = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ MongoDB Connected');

    // Đếm số lượng painting cần migrate
    const totalPaintings = await Painting.countDocuments();
    console.log(`\n📊 Tổng số painting: ${totalPaintings}`);

    // Tìm các painting chưa có field isPrinted hoặc các field mới
    const paintingsToMigrate = await Painting.find({
      $or: [
        { isPrinted: { $exists: false } },
        { receivedByProduction: { $exists: false } },
        { receivedByPacking: { $exists: false } }
      ]
    });

    console.log(`📝 Số lượng painting cần migrate: ${paintingsToMigrate.length}`);

    if (paintingsToMigrate.length === 0) {
      console.log('✓ Không có painting nào cần migrate');
      await mongoose.connection.close();
      process.exit(0);
    }

    let updatedCount = 0;
    let printedCount = 0;

    // Migrate từng painting
    for (const painting of paintingsToMigrate) {
      const updateData = {};

      // Set isPrinted nếu chưa có
      if (painting.isPrinted === undefined) {
        // Kiểm tra order để xem có thể suy luận trạng thái in không
        const order = await Order.findById(painting.orderId);
        if (order && order.printingStatus === 'da_in') {
          // Nếu order đã in xong, có thể set isPrinted = true
          // Nhưng để an toàn, ta sẽ set false và để user tự đánh dấu
          updateData.isPrinted = false;
        } else {
          updateData.isPrinted = false;
        }
      }

      // Set receivedByProduction nếu chưa có
      if (painting.receivedByProduction === undefined) {
        updateData.receivedByProduction = false;
      }

      // Set receivedByPacking nếu chưa có
      if (painting.receivedByPacking === undefined) {
        updateData.receivedByPacking = false;
      }

      // Cập nhật painting
      if (Object.keys(updateData).length > 0) {
        await Painting.updateOne(
          { _id: painting._id },
          { $set: updateData }
        );
        updatedCount++;
        
        if (updateData.isPrinted !== undefined) {
          printedCount++;
        }
      }
    }

    console.log(`\n✓ Migration hoàn tất!`);
    console.log(`  - Đã cập nhật: ${updatedCount} painting`);
    console.log(`  - Đã set isPrinted: ${printedCount} painting`);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Lỗi khi migrate:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Chạy migration
migratePaintingStatus();

