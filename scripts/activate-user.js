import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';

dotenv.config();

const activateUser = async (email) => {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://admin:password@localhost:27017/halo?authSource=admin';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Find and activate user
    const user = await User.findOne({ email });
    
    if (!user) {
      console.log(`❌ User not found: ${email}`);
      process.exit(1);
    }

    if (user.active) {
      console.log(`✅ User already active: ${email}`);
      process.exit(0);
    }

    user.active = true;
    user.approvedAt = new Date();
    await user.save();

    console.log(`✅ User activated successfully: ${email}`);
    console.log(`   Full Name: ${user.fullName}`);
    console.log(`   Roles: ${user.roles.join(', ')}`);
    console.log(`   Approved At: ${user.approvedAt}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

// Get email from command line argument
const email = process.argv[2];

if (!email) {
  console.log('Usage: node scripts/activate-user.js <email>');
  console.log('Example: node scripts/activate-user.js thongnk21@gmail.com');
  process.exit(1);
}

activateUser(email);

