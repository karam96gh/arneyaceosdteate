// src/controllers/authController.js - COMPLETE FIXED VERSION
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbManager } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// ✅ دوال مساعدة لتحويل الـ roles
const roleToEnum = (role) => {
  const mapping = {
    'user': 'USER',
    'user_vip': 'USER_VIP', 
    'admin': 'ADMIN',
    'company': 'COMPANY'
  };
  return mapping[role?.toLowerCase()] || role;
};

const enumToRole = (enumValue) => {
  const mapping = {
    'USER': 'user',
    'USER_VIP': 'user_vip',
    'ADMIN': 'admin', 
    'COMPANY': 'company'
  };
  return mapping[enumValue] || enumValue?.toLowerCase();
};

// تسجيل الدخول - FIXED
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
      where: { username },
      select: {
        id: true,
        username: true,
        password: true,
        fullName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        companyName: true,
        companyLicense: true,
        vipExpiryDate: true,
        // ✅ إضافة إحصائيات للشركات
        _count: {
          select: {
            companyRealEstates: true,
            companyBuildings: true,
            companyReservations: true,
            reservations: true
          }
        }
      }
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
        role: enumToRole(user.role)
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...userResponse } = user;
    
    // ✅ تحويل role في الاستجابة وإضافة معلومات الشركة
    const formattedUser = {
      ...userResponse,
      role: enumToRole(user.role),
      // ✅ إضافة معلومات إضافية للشركات
      ...(user.role === 'COMPANY' && {
        isCompany: true,
        stats: {
          realEstatesCount: user._count.companyRealEstates || 0,
          buildingsCount: user._count.companyBuildings || 0,
          reservationsCount: user._count.companyReservations || 0
        }
      }),
      // ✅ إضافة معلومات للمستخدمين العاديين
      ...(user.role !== 'COMPANY' && {
        isCompany: false,
        stats: {
          reservationsCount: user._count.reservations || 0
        }
      })
    };

    res.json({
      success: true,
      data: {
        token,
        user: formattedUser
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

// التسجيل - FIXED
const register = async (req, res) => {
  try {
    const { username, password, fullName, email, phone, companyName, companyLicense } = req.body;
    
    if (!username || !password || !fullName || !email) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'All required fields must be provided' }
      });
    }

    // التحقق من قوة كلمة المرور
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: { code: 'WEAK_PASSWORD', message: 'Password must be at least 6 characters long' }
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
        role: roleEnum,
        companyName,
        companyLicense
      }
    });

    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: enumToRole(user.role)
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const { password: _, ...userResponse } = user;
    
    // ✅ تحويل role للعرض
    const formattedUser = {
      ...userResponse,
      role: enumToRole(user.role),
      // ✅ إضافة معلومات إضافية للشركات
      ...(user.role === 'COMPANY' && {
        isCompany: true,
        stats: {
          realEstatesCount: 0,
          buildingsCount: 0,
          reservationsCount: 0
        }
      }),
      // ✅ إضافة معلومات للمستخدمين العاديين
      ...(user.role !== 'COMPANY' && {
        isCompany: false,
        stats: {
          reservationsCount: 0
        }
      })
    };

    res.status(201).json({
      success: true,
      data: {
        token,
        user: formattedUser
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

// الحصول على بيانات المستخدم الحالي - FIXED
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
        updatedAt: true,
        // ✅ إضافة إحصائيات لجميع المستخدمين
        _count: {
          select: {
            companyRealEstates: true,
            companyBuildings: true,
            companyReservations: true,
            reservations: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    // ✅ تحويل role للعرض وإضافة معلومات الشركة
    const formattedUser = {
      ...user,
      role: enumToRole(user.role),
      // ✅ إضافة معلومات إضافية للشركات
      ...(user.role === 'COMPANY' && {
        isCompany: true,
        stats: {
          realEstatesCount: user._count.companyRealEstates || 0,
          buildingsCount: user._count.companyBuildings || 0,
          reservationsCount: user._count.companyReservations || 0
        }
      }),
      // ✅ إضافة معلومات للمستخدمين العاديين
      ...(user.role !== 'COMPANY' && {
        isCompany: false,
        stats: {
          reservationsCount: user._count.reservations || 0
        }
      })
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

// الحصول على جميع المستخدمين - FIXED
const getUsers = async (req, res) => {
  try {
    const { role, isActive, page = 1, limit = 100000 } = req.query;
    const prisma = dbManager.getPrisma();
    
    // بناء شروط البحث
    const whereClause = {};
    if (role) {
      whereClause.role = roleToEnum(role);
    }
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
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
          updatedAt: true,
          // ✅ إضافة إحصائيات لجميع المستخدمين
          _count: {
            select: {
              companyRealEstates: true,
              companyBuildings: true,
              companyReservations: true,
              reservations: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.user.count({ where: whereClause })
    ]);

    // ✅ تحويل roles للعرض وإضافة الإحصائيات
    const formattedUsers = users.map(user => ({
      ...user,
      role: enumToRole(user.role),
      // ✅ إضافة إحصائيات حسب نوع المستخدم
      ...(user.role === 'COMPANY' && {
        isCompany: true,
        stats: {
          realEstatesCount: user._count.companyRealEstates || 0,
          buildingsCount: user._count.companyBuildings || 0,
          reservationsCount: user._count.companyReservations || 0
        }
      }),
      ...(user.role !== 'COMPANY' && {
        isCompany: false,
        stats: {
          reservationsCount: user._count.reservations || 0
        }
      })
    }));

    res.json({
      users: formattedUsers,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// تحديث المستخدم - FIXED
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
      // ✅ تحويل إلى enum value
      updates.role = roleToEnum(updates.role);
    }

    // معالجة تاريخ انتهاء VIP
    if (updates.vipExpiryDate) {
      updates.vipExpiryDate = new Date(updates.vipExpiryDate);
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
        updatedAt: true,
        // ✅ إضافة إحصائيات للشركات
        _count: {
          select: {
            companyRealEstates: true,
            companyBuildings: true,
            companyReservations: true,
            reservations: true
          }
        }
      }
    });

    // ✅ تحويل role للعرض وإضافة معلومات الشركة
    const formattedUser = {
      ...user,
      role: enumToRole(user.role),
      // ✅ إضافة معلومات إضافية للشركات
      ...(user.role === 'COMPANY' && {
        isCompany: true,
        stats: {
          realEstatesCount: user._count.companyRealEstates || 0,
          buildingsCount: user._count.companyBuildings || 0,
          reservationsCount: user._count.companyReservations || 0
        }
      }),
      ...(user.role !== 'COMPANY' && {
        isCompany: false,
        stats: {
          reservationsCount: user._count.reservations || 0
        }
      })
    };

    res.json({
      success: true,
      data: formattedUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Update user error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: { code: 'DUPLICATE_VALUE', message: 'Username or email already exists' }
      });
    }
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// تغيير كلمة المرور - FIXED
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Current and new passwords are required' }
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: { code: 'WEAK_PASSWORD', message: 'New password must be at least 6 characters long' }
      });
    }

    const prisma = dbManager.getPrisma();
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, password: true }
    });

    if (!user || !await bcrypt.compare(currentPassword, user.password)) {
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

// إعادة تعيين كلمة المرور - FIXED
const resetPassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body;
    
    if (!userId || !newPassword) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'User ID and new password are required' }
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: { code: 'WEAK_PASSWORD', message: 'New password must be at least 6 characters long' }
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const prisma = dbManager.getPrisma();
    
    const updatedUser = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: { password: hashedPassword },
      select: { id: true, username: true, fullName: true }
    });

    res.json({
      success: true,
      message: 'Password reset successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        fullName: updatedUser.fullName
      }
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

// إزالة مستخدم (إضافة جديدة) - FIXED
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const prisma = dbManager.getPrisma();
    
    // التحقق من وجود المستخدم وإحصائياته
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      select: {
        id: true,
        username: true,
        role: true,
        _count: {
          select: {
            companyRealEstates: true,
            companyBuildings: true,
            reservations: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { code: 'USER_NOT_FOUND', message: 'User not found' }
      });
    }

    // منع حذف المستخدم إذا كان لديه بيانات مرتبطة
    const hasData = user._count.companyRealEstates > 0 || 
                   user._count.companyBuildings > 0 || 
                   user._count.reservations > 0;

    if (hasData) {
      return res.status(400).json({
        success: false,
        error: { 
          code: 'USER_HAS_DATA', 
          message: 'Cannot delete user with existing data. Please remove all associated records first.' 
        },
        data: {
          realEstatesCount: user._count.companyRealEstates,
          buildingsCount: user._count.companyBuildings,
          reservationsCount: user._count.reservations
        }
      });
    }

    await prisma.user.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
      deletedUser: {
        id: user.id,
        username: user.username,
        role: enumToRole(user.role)
      }
    });
  } catch (error) {
    console.error('Delete user error:', error);
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

// تفعيل/إلغاء تفعيل المستخدم (إضافة جديدة) - FIXED
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'isActive must be a boolean value' }
      });
    }

    const prisma = dbManager.getPrisma();
    
    const user = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { isActive },
      select: {
        id: true,
        username: true,
        fullName: true,
        role: true,
        isActive: true,
        companyName: true
      }
    });

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        ...user,
        role: enumToRole(user.role)
      }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
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
  resetPassword,
  deleteUser,
  toggleUserStatus
};