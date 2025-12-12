import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Lấy đường dẫn thư mục hiện tại của file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env từ thư mục gốc của project (2 cấp lên từ src/scripts)
const projectRoot = join(__dirname, '../..');
dotenv.config({ path: join(projectRoot, '.env') });

// Import models với đường dẫn đúng
import Painting from '../models/Painting.js';
import Order from '../models/Order.js';

/**
 * Migration script để cập nhật trạng thái in và nhận cho các painting cũ
 * - Set isPrinted = false (mặc định) cho các painting chưa có field này
 * - Set receivedByProduction = false (mặc định) cho các painting chưa có field này
 * - Set receivedByPacking = false (mặc định) cho các painting chưa có field này
 * - Dựa vào printingStatus của order để set isPrinted cho các painting
 */
const migratePaintingStatus = async () => {
  try {
    // Lấy MongoDB URI từ env hoặc command line argument
    let mongoUri = process.env.MONGODB_URI;
    
    // Nếu có argument từ command line, ưu tiên dùng nó
    if (process.argv[2]) {
      mongoUri = process.argv[2];
      console.log('📝 Sử dụng MongoDB URI từ command line argument');
    }
    
    // Nếu không có MONGODB_URI, báo lỗi
    if (!mongoUri) {
      console.error('❌ Lỗi: Không tìm thấy MONGODB_URI trong .env hoặc command line argument');
      console.log('💡 Cách sử dụng:');
      console.log('   node src/scripts/migrate-painting-status.js');
      console.log('   hoặc');
      console.log('   node src/scripts/migrate-painting-status.js "mongodb://localhost:27017/halo_db"');
      process.exit(1);
    }
    
    // Nếu URI chứa 'mongo:27017' (Docker hostname), thử thay bằng localhost
    if (mongoUri.includes('mongo:27017')) {
      console.log('⚠️  Phát hiện Docker hostname "mongo:27017", thử thay bằng "localhost:27017"');
      mongoUri = mongoUri.replace('mongo:27017', 'localhost:27017');
      console.log(`📝 MongoDB URI mới: ${mongoUri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    }
    
    console.log(`🔌 Đang kết nối đến MongoDB...`);
    await mongoose.connect(mongoUri);
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

