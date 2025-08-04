// scripts/createInitialAdmin.js
const bcrypt = require('bcryptjs');
const { dbManager } = require('../src/config/database');

const createInitialAdmin = async () => {
  try {
    console.log('🚀 Starting initial admin creation...');

    // تهيئة قاعدة البيانات
    await dbManager.initialize();
    const prisma = dbManager.getPrisma();

    // بيانات المدير الأولي
    const adminData = {
      username: 'admin',
      password: 'admin123!@#', // كلمة مرور قوية
      fullName: 'System Administrator',
      email: 'admin@realestate.com',
      phone: '0000000000',
      role: 'ADMIN', // استخدام enum value مباشرة
      isActive: true,
      companyName: null,
      companyLicense: null
    };

    // التحقق من وجود مدير بالفعل
    const existingAdmin = await prisma.user.findFirst({
      where: {
        OR: [
          { username: adminData.username },
          { email: adminData.email },
          { role: 'ADMIN' }
        ]
      }
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists:');
      console.log(`   Username: ${existingAdmin.username}`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log('   Skipping admin creation...');
      return;
    }

    // تشفير كلمة المرور
    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    // إنشاء المدير
    const admin = await prisma.user.create({
      data: {
        ...adminData,
        password: hashedPassword
      },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    console.log('✅ Initial admin created successfully!');
    console.log('');
    console.log('📋 Admin Details:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Username: ${admin.username}`);
    console.log(`   Full Name: ${admin.fullName}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   Status: ${admin.isActive ? 'Active' : 'Inactive'}`);
    console.log(`   Created: ${admin.createdAt}`);
    console.log('');
    console.log('🔐 Login Credentials:');
    console.log(`   Username: ${adminData.username}`);
    console.log(`   Password: ${adminData.password}`);
    console.log('');
    console.log('⚠️  Important: Please change the default password after first login!');

  } catch (error) {
    console.error('❌ Error creating initial admin:', error);
    
    if (error.code === 'P2002') {
      console.error('   → Unique constraint violation. Admin might already exist.');
    } else if (error.code === 'P2003') {
      console.error('   → Foreign key constraint error.');
    } else {
      console.error('   → Details:', error.message);
    }
  } finally {
    await dbManager.disconnect();
    console.log('🔌 Database connection closed.');
  }
};

// تشغيل الدالة إذا تم استدعاء الملف مباشرة
if (require.main === module) {
  createInitialAdmin()
    .then(() => {
      console.log('🎉 Script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { createInitialAdmin };