require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const keys = require('../config/keys');

const args = process.argv.slice(2);
const username = args[0] || 'admin';
const password = args[1] || 'admin123';

async function createAdmin() {
  try {
    await mongoose.connect(keys.mongoURI);
    console.log('✅ Connected to MongoDB');

    const existing = await Admin.findOne({ username: username.toLowerCase() });
    if (existing) {
      console.log(`⚠️  Admin "${username}" already exists. Updating password...`);
      existing.password = password;
      await existing.save();
      console.log(`✅ Password updated for admin "${username}".`);
    } else {
      await Admin.create({ username: username.toLowerCase(), password });
      console.log(`✅ Admin user "${username}" created successfully.`);
    }

    console.log(`\n   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log('\n   Use these credentials at /vote_admin/login\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createAdmin();
