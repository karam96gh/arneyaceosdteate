// src/middleware/preserveUser.js - حفظ بيانات المستخدم عبر multer
const jwt = require('jsonwebtoken');
const { dbManager } = require('../config/database');
const { extractToken } = require('./auth');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const enumToRole = (enumValue) => {
    const mapping = {
        'USER': 'user',
        'USER_VIP': 'user_vip',
        'ADMIN': 'admin', 
        'COMPANY': 'company'
    };
    return mapping[enumValue] || enumValue?.toLowerCase();
};

const preserveUserAfterMulter = async (req, res, next) => {
    console.log('=== PRESERVE USER MIDDLEWARE ===');
    console.log('req.user before multer check:', !!req.user);
    console.log('Request URL:', req.originalUrl);
    
    // إذا كان req.user موجود وصحيح، لا نحتاج لإعادة التحقق
    if (req.user && req.user.id && req.user.role) {
        console.log('✅ req.user already present and valid:', {
            id: req.user.id,
            role: req.user.role,
            username: req.user.username
        });
        return next();
    }
    
    console.log('⚠️ req.user missing or incomplete, attempting to restore from token...');
    
    try {
        // محاولة استخراج التوكن واستعادة بيانات المستخدم
        const token = extractToken(req);
        
        if (!token) {
            console.log('❌ No token found during restore attempt');
            return res.status(401).json({
                success: false,
                error: { 
                    code: 'NO_TOKEN', 
                    message: 'Authentication required. Token not found after file upload.' 
                }
            });
        }
        
        // فك تشفير التوكن
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log('✅ Token decoded during restore:', decoded.id);
        
        // جلب بيانات المستخدم من قاعدة البيانات
        const prisma = dbManager.getPrisma();
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { 
                id: true, 
                username: true, 
                role: true, 
                isActive: true,
                fullName: true,
                email: true,
                companyName: true,
                companyLicense: true
            }
        });
        
        if (!user || !user.isActive) {
            console.log('❌ User not found or inactive during restore');
            return res.status(401).json({
                success: false,
                error: { 
                    code: 'USER_NOT_FOUND', 
                    message: 'User not found or account disabled.' 
                }
            });
        }
        
        // إعادة تعيين req.user
        req.user = {
            id: user.id,
            username: user.username,
            role: enumToRole(user.role),
            fullName: user.fullName,
            email: user.email,
            isActive: user.isActive,
            companyName: user.companyName,
            companyLicense: user.companyLicense,
            isCompany: user.role === 'COMPANY',
            originalRole: user.role
        };
        
        console.log('✅ req.user successfully restored:', {
            id: req.user.id,
            role: req.user.role,
            username: req.user.username
        });
        
        next();
        
    } catch (error) {
        console.error('❌ Error during user restore:', error);
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: { 
                    code: 'TOKEN_EXPIRED', 
                    message: 'Token has expired. Please login again.' 
                }
            });
        }
        
        return res.status(401).json({
            success: false,
            error: { 
                code: 'AUTH_ERROR', 
                message: 'Authentication error during file upload. Please try again.' 
            }
        });
    }
};

module.exports = { preserveUserAfterMulter };