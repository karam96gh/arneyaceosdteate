const prisma = require('../config/prisma');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

// Get all maintypes with subtypes
const getAllMaintypes = async (req, res) => {
    try {
        const maintypes = await prisma.mainType.findMany({
            include: {
                subTypes: {
                    include: {
                        finalTypes: true,
                        _count: {
                            select: { realEstates: true }
                        }
                    },
                    orderBy: { name: 'asc' }
                },
                _count: {
                    select: {
                        subTypes: true,
                        realEstates: true
                    }
                }
            },
            orderBy: { id: 'asc' }
        });

        // تنسيق البيانات لتتوافق مع الـ API القديم
        const maintypesWithSubtypes = maintypes.map(maintype => ({
            id: maintype.id,
            name: maintype.name,
            icon: maintype.icon,
            createdAt: maintype.createdAt,
            updatedAt: maintype.updatedAt,
            subtypes: maintype.subTypes.map(subtype => ({
                ...subtype,
                realEstateCount: subtype._count.realEstates
            })),
            subtypeCount: maintype._count.subTypes,
            realEstateCount: maintype._count.realEstates
        }));

        res.status(200).json(maintypesWithSubtypes);
    } catch (error) {
        console.error('Error getting maintypes:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get a single maintype by ID
const getMaintypeById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const maintype = await prisma.mainType.findUnique({
            where: { id: parseInt(id) },
            include: {
                subTypes: {
                    include: {
                        finalTypes: true,
                        _count: {
                            select: { realEstates: true }
                        }
                    },
                    orderBy: { name: 'asc' }
                },
                _count: {
                    select: {
                        subTypes: true,
                        realEstates: true
                    }
                }
            }
        });

        if (!maintype) {
            return res.status(404).json({ message: 'Maintype not found' });
        }

        // تنسيق البيانات
        const formattedMaintype = {
            id: maintype.id,
            name: maintype.name,
            icon: maintype.icon,
            createdAt: maintype.createdAt,
            updatedAt: maintype.updatedAt,
            subtypes: maintype.subTypes.map(subtype => ({
                ...subtype,
                realEstateCount: subtype._count.realEstates
            })),
            subtypeCount: maintype._count.subTypes,
            realEstateCount: maintype._count.realEstates
        };

        res.status(200).json(formattedMaintype);
    } catch (error) {
        console.error('Error getting maintype by ID:', error);
        res.status(500).json({ error: error.message });
    }
};

// إعداد رفع الملفات
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'src/images/');
        fs.mkdirSync(uploadPath, { recursive: true }); // التأكد من إنشاء المجلد تلقائيًا
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        try {
            const fileExtension = path.extname(file.originalname); 
            // إنشاء اسم فريد مع الاحتفاظ بالامتداد
            const uniqueName = `${Date.now()}${fileExtension}`;
            cb(null, uniqueName);
        } catch (err) {
            console.error('Error saving file:', err);
            cb(err);
        }
    },
});

const upload = multer({ 
    storage,
    fileFilter: (req, file, cb) => {
        // فحص نوع الملف - الصور فقط
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed for icon'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB كحد أقصى
    }
});

// Add a new maintype
const addMaintype = async (req, res) => {
    try {
        const { name } = req.body;
        const icon = req.file?.filename;

        if (!name) {
            return res.status(400).json({ message: 'Name is required' });
        }

        // التحقق من عدم تكرار الاسم
        const existingMaintype = await prisma.mainType.findFirst({
            where: { name }
        });

        if (existingMaintype) {
            // حذف الملف المرفوع إذا كان الاسم مكرر
            if (req.file) {
                const filePath = path.join(__dirname, 'src/images/', req.file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            return res.status(400).json({ message: 'Maintype name already exists' });
        }

        const maintype = await prisma.mainType.create({
            data: {
                name,
                icon: icon || 'icon.png' // قيمة افتراضية
            }
        });

        console.log('Created maintype with icon:', icon);
        res.status(201).json({
            id: maintype.id,
            name: maintype.name,
            icon: maintype.icon,
            createdAt: maintype.createdAt
        });
    } catch (error) {
        console.error('Error adding maintype:', error);
        
        // حذف الملف المرفوع في حالة خطأ
        if (req.file) {
            const filePath = path.join(__dirname, 'src/images/', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        res.status(500).json({ error: error.message });
    }
};

// Update maintype
const updateMaintype = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        if (req.file) {
            updates.icon = req.file.filename; // تعيين اسم الصورة الجديدة
        }

        // إزالة القيم غير المحددة
        Object.keys(updates).forEach(key => {
            if (updates[key] === undefined) {
                delete updates[key];
            }
        });

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: 'No fields provided to update' });
        }

        // التحقق من تكرار الاسم (إذا تم تحديث الاسم)
        if (updates.name) {
            const existingMaintype = await prisma.mainType.findFirst({
                where: {
                    name: updates.name,
                    id: { not: parseInt(id) }
                }
            });

            if (existingMaintype) {
                // حذف الملف المرفوع إذا كان الاسم مكرر
                if (req.file) {
                    const filePath = path.join(__dirname, 'src/images/', req.file.filename);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }
                return res.status(400).json({ message: 'Maintype name already exists' });
            }
        }

        // 🔍 الحصول على معلومات النوع الرئيسي القديم
        const oldMaintype = await prisma.mainType.findUnique({
            where: { id: parseInt(id) }
        });

        if (!oldMaintype) {
            // حذف الملف المرفوع إذا لم يوجد النوع
            if (req.file) {
                const filePath = path.join(__dirname, 'src/images/', req.file.filename);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            }
            return res.status(404).json({ message: 'Maintype not found' });
        }

        const oldIcon = oldMaintype.icon; // اسم الأيقونة القديمة

        // 🔄 تحديث بيانات maintype
        const updatedMaintype = await prisma.mainType.update({
            where: { id: parseInt(id) },
            data: updates,
            include: {
                _count: {
                    select: {
                        subTypes: true,
                        realEstates: true
                    }
                }
            }
        });

        // 🗑️ حذف الصورة القديمة إن وجدت وتم رفع صورة جديدة
        if (req.file && oldIcon && oldIcon !== 'icon.png') {
            const oldIconPath = path.join(__dirname, 'src/images/', oldIcon);
            if (fs.existsSync(oldIconPath)) {
                try {
                    fs.unlinkSync(oldIconPath); // حذف الصورة القديمة
                    console.log('Deleted old icon:', oldIcon);
                } catch (error) {
                    console.warn('Could not delete old icon:', error.message);
                }
            }
        }

        res.status(200).json({
            message: 'Maintype updated successfully',
            maintype: {
                id: updatedMaintype.id,
                name: updatedMaintype.name,
                icon: updatedMaintype.icon,
                updatedAt: updatedMaintype.updatedAt,
                subtypeCount: updatedMaintype._count.subTypes,
                realEstateCount: updatedMaintype._count.realEstates
            }
        });
    } catch (error) {
        console.error('Error updating maintype:', error);
        
        // حذف الملف المرفوع في حالة خطأ
        if (req.file) {
            const filePath = path.join(__dirname, 'src/images/', req.file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
        
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Maintype not found' });
        }
        
        res.status(500).json({ error: error.message });
    }
};

// Delete a maintype
const deleteMaintype = async (req, res) => {
    try {
        const { id } = req.params;

        // التحقق من وجود subtypes أو real estates مرتبطة
        const maintypeWithDeps = await prisma.mainType.findUnique({
            where: { id: parseInt(id) },
            include: {
                _count: {
                    select: {
                        subTypes: true,
                        realEstates: true
                    }
                }
            }
        });

        if (!maintypeWithDeps) {
            return res.status(404).json({ message: 'Maintype not found' });
        }

        // منع الحذف إذا كان هناك عقارات مرتبطة
        if (maintypeWithDeps._count.realEstates > 0) {
            return res.status(400).json({ 
                message: `Cannot delete maintype. It has ${maintypeWithDeps._count.realEstates} associated real estates.`,
                realEstatesCount: maintypeWithDeps._count.realEstates,
                subtypesCount: maintypeWithDeps._count.subTypes
            });
        }

        // منع الحذف إذا كان هناك subtypes مرتبطة
        if (maintypeWithDeps._count.subTypes > 0) {
            return res.status(400).json({ 
                message: `Cannot delete maintype. It has ${maintypeWithDeps._count.subTypes} associated subtypes.`,
                subtypesCount: maintypeWithDeps._count.subTypes
            });
        }

        const oldIcon = maintypeWithDeps.icon;

        // حذف النوع الرئيسي
        await prisma.mainType.delete({
            where: { id: parseInt(id) }
        });

        // 🗑️ حذف أيقونة النوع المحذوف إن وجدت
        if (oldIcon && oldIcon !== 'icon.png') {
            const oldIconPath = path.join(__dirname, 'src/images/', oldIcon);
            if (fs.existsSync(oldIconPath)) {
                try {
                    fs.unlinkSync(oldIconPath);
                    console.log('Deleted icon for deleted maintype:', oldIcon);
                } catch (error) {
                    console.warn('Could not delete icon:', error.message);
                }
            }
        }

        res.status(200).json({ 
            message: 'Maintype deleted successfully',
            deletedIcon: oldIcon !== 'icon.png' ? oldIcon : null
        });
    } catch (error) {
        console.error('Error deleting maintype:', error);
        
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Maintype not found' });
        }
        
        res.status(500).json({ error: error.message });
    }
};

// Get maintype statistics
const getMaintypeStats = async (req, res) => {
    try {
        const stats = await prisma.mainType.findMany({
            select: {
                id: true,
                name: true,
                _count: {
                    select: {
                        subTypes: true,
                        realEstates: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });

        const totalStats = {
            totalMaintypes: stats.length,
            totalSubtypes: stats.reduce((sum, maintype) => sum + maintype._count.subTypes, 0),
            totalRealEstates: stats.reduce((sum, maintype) => sum + maintype._count.realEstates, 0),
            breakdown: stats.map(maintype => ({
                id: maintype.id,
                name: maintype.name,
                subtypesCount: maintype._count.subTypes,
                realEstatesCount: maintype._count.realEstates
            }))
        };

        res.status(200).json(totalStats);
    } catch (error) {
        console.error('Error getting maintype stats:', error);
        res.status(500).json({ error: error.message });
    }
};

// Get maintypes for dropdown/select (lightweight)
const getMaintypesForSelect = async (req, res) => {
    try {
        const maintypes = await prisma.mainType.findMany({
            select: {
                id: true,
                name: true,
                icon: true
            },
            orderBy: { name: 'asc' }
        });

        res.status(200).json(maintypes);
    } catch (error) {
        console.error('Error getting maintypes for select:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllMaintypes,
    getMaintypeById,
    addMaintype,
    updateMaintype,
    deleteMaintype,
    getMaintypeStats,
    getMaintypesForSelect,
    upload
};