// src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbManager } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// تسجيل الدخول
const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Username and password are required' }
      });
    }

    const prisma = dbManager.getPrisma();
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' }
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: { code: 'ACCOUNT_DISABLED', message: 'Account is disabled' }
      });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        // ✅ تحويل role للعرض (للـ JWT)
        role: user.role.toLowerCase()
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...userResponse } = user;
    
    // ✅ تحويل role في الاستجابة
    userResponse.role = user.role.toLowerCase();

    res.json({
      success: true,
      data: {
        token,
        user: userResponse
      },
      message: 'Login successful'
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// التسجيل
const register = async (req, res) => {
  try {
    const { username, password, fullName, email, phone, companyName, companyLicense } = req.body;
    
    if (!username || !password || !fullName || !email) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'All required fields must be provided' }
      });
    }

    const prisma = dbManager.getPrisma();
    
    // التحقق من عدم تكرار اسم المستخدم أو الإيميل
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { 
          code: 'USER_EXISTS', 
          message: existingUser.username === username ? 'Username already exists' : 'Email already exists'
        }
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // ✅ تحديد النوع واستخدام enum value مباشرة
    const roleEnum = (companyName && companyLicense) ? 'COMPANY' : 'USER';

    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        fullName,
        email,
        phone,
        role: roleEnum, // ✅ استخدام enum value مباشرة
        companyName,
        companyLicense
      }
    });

    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role.toLowerCase() // ✅ تحويل للـ JWT
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...userResponse } = user;
    
    // ✅ تحويل role للعرض
    userResponse.role = user.role.toLowerCase();

    res.status(201).json({
      success: true,
      data: {
        token,
        user: userResponse
      },
      message: 'Registration successful'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// الحصول على بيانات المستخدم الحالي
const getMe = async (req, res) => {
  try {
    const prisma = dbManager.getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        companyName: true,
        companyLicense: true,
        vipExpiryDate: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    // ✅ تحويل role للعرض
    const formattedUser = {
      ...user,
      role: user.role.toLowerCase()
    };

    res.json(formattedUser);
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// الحصول على جميع المستخدمين
const getUsers = async (req, res) => {
  try {
    const prisma = dbManager.getPrisma();
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        companyName: true,
        companyLicense: true,
        vipExpiryDate: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // ✅ تحويل roles للعرض
    const formattedUsers = users.map(user => ({
      ...user,
      role: user.role.toLowerCase()
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// تحديث المستخدم
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    
    // إزالة الحقول الممنوعة
    delete updates.password;
    delete updates.id;

    // ✅ تحويل role إذا تم تمريره
    if (updates.role) {
      const validRoles = ['user', 'user_vip', 'admin', 'company'];
      if (!validRoles.includes(updates.role.toLowerCase())) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_ROLE', message: `Invalid role: ${updates.role}` }
        });
      }
      // تحويل إلى enum value
      const roleMap = {
        'user': 'USER',
        'user_vip': 'USER_VIP',
        'admin': 'ADMIN',
        'company': 'COMPANY'
      };
      updates.role = roleMap[updates.role.toLowerCase()];
    }

    const prisma = dbManager.getPrisma();
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: updates,
      select: {
        id: true,
        username: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        companyName: true,
        companyLicense: true,
        vipExpiryDate: true,
        updatedAt: true
      }
    });

    // ✅ تحويل role للعرض
    const formattedUser = {
      ...user,
      role: user.role.toLowerCase()
    };

    res.json(formattedUser);
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// تغيير كلمة المرور
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Current and new passwords are required' }
      });
    }

    const prisma = dbManager.getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!await bcrypt.compare(currentPassword, user.password)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'Current password is incorrect' }
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// إعادة تعيين كلمة المرور
const resetPassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    
    if (!userId || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'User ID and new password are required' }
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const prisma = dbManager.getPrisma();
    
    await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { password: hashedPassword }
    });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

module.exports = {
  login,
  register,
  getMe,
  getUsers,
  updateUser,
  changePassword,
  resetPassword
};