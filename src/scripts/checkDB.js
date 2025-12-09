import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const checkDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log(' MongoDB Connected');

    // Lấy danh sách collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n Collections:');
    collections.forEach(col => console.log(`  - ${col.name}`));

    // Đếm documents trong mỗi collection
    console.log('\n Document counts:');
    for (const col of collections) {
      const count = await mongoose.connection.db.collection(col.name).countDocuments();
      console.log(`  - ${col.name}: ${count} documents`);
    }

    // Xem sample user (nếu có)
    const usersCollection = collections.find(col => col.name === 'users');
    if (usersCollection) {
      const sampleUser = await mongoose.connection.db.collection('users').findOne();
      console.log('\n Sample User:');
      console.log(sampleUser);
    }

    process.exit(0);
  } catch (error) {
    console.error(' Error:', error.message);
    process.exit(1);
  }
};

checkDatabase();
