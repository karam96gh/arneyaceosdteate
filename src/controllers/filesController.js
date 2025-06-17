const prisma = require('../config/prisma');
const { getFileUrl } = require('../config/upload');

// الحصول على جميع الملفات
const getAllFiles = async (req, res) => {
    try {
        const files = await prisma.file.findMany({
            include: {
                realEstate: {
                    select: { id: true, title: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // ✅ إضافة الروابط للملفات
        const filesWithUrls = files.map(file => ({
            id: file.id,
            name: file.name,
            realestateId: file.realestateId,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
            // ✅ الرابط الكامل للملف
            url: getFileUrl('REALESTATE', file.name, req),
            // ✅ معلومات العقار المرتبط
            realEstate: file.realEstate
        }));

        res.status(200).json(filesWithUrls);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// الحصول على ملفات عقار معين
const getFilesByRealEstateId = async (req, res) => {
    try {
        const { realestateId } = req.params;
        const files = await prisma.file.findMany({
            where: { realestateId: parseInt(realestateId) },
            orderBy: { createdAt: 'desc' }
        });

        // ✅ إضافة الروابط للملفات
        const filesWithUrls = files.map(file => ({
            id: file.id,
            name: file.name,
            realestateId: file.realestateId,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
            // ✅ الرابط الكامل للملف
            url: getFileUrl('REALESTATE', file.name, req),
            // ✅ المسار النسبي (للتوافق مع النظام القديم)
            relativePath: `/uploads/realestate/${file.name}`
        }));

        res.status(200).json({
            realEstateId: parseInt(realestateId),
            filesCount: filesWithUrls.length,
            files: filesWithUrls
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// إضافة ملف جديد
const addFile = async (req, res) => {
    try {
        const { name, realestateId } = req.body;

        if (!name || !realestateId) {
            return res.status(400).json({ 
                message: 'File name and realestateId are required' 
            });
        }

        // التحقق من وجود العقار
        const realEstate = await prisma.realEstate.findUnique({
            where: { id: parseInt(realestateId) },
            select: { id: true, title: true }
        });

        if (!realEstate) {
            return res.status(404).json({ message: 'Real estate not found' });
        }

        const file = await prisma.file.create({
            data: {
                name,
                realestateId: parseInt(realestateId)
            },
            include: {
                realEstate: {
                    select: { id: true, title: true }
                }
            }
        });

        // ✅ إضافة الرابط في الاستجابة
        const response = {
            id: file.id,
            name: file.name,
            realestateId: file.realestateId,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
            // ✅ الرابط الكامل للملف
            url: getFileUrl('REALESTATE', file.name, req),
            // ✅ معلومات العقار المرتبط
            realEstate: file.realEstate
        };

        res.status(201).json({
            message: 'File added successfully',
            file: response
        });
    } catch (error) {
        if (error.code === 'P2003') {
            return res.status(400).json({ message: 'Invalid realestateId' });
        }
        res.status(500).json({ error: error.message });
    }
};

// حذف ملف
const deleteFile = async (req, res) => {
    try {
        const { id } = req.params;

        // الحصول على معلومات الملف قبل الحذف
        const file = await prisma.file.findUnique({
            where: { id: parseInt(id) },
            select: { id: true, name: true, realestateId: true }
        });

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // حذف الملف من قاعدة البيانات
        await prisma.file.delete({
            where: { id: parseInt(id) }
        });

        res.status(200).json({ 
            message: 'File deleted successfully',
            deletedFile: {
                id: file.id,
                name: file.name,
                realestateId: file.realestateId,
                // ✅ إضافة الرابط للملف المحذوف (للمراجعة)
                url: getFileUrl('REALESTATE', file.name, req)
            }
        });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'File not found' });
        }
        res.status(500).json({ error: error.message });
    }
};

// الحصول على ملف محدد بالمعرف
const getFileById = async (req, res) => {
    try {
        const { id } = req.params;

        const file = await prisma.file.findUnique({
            where: { id: parseInt(id) },
            include: {
                realEstate: {
                    select: { 
                        id: true, 
                        title: true, 
                        price: true,
                        coverImage: true
                    }
                }
            }
        });

        if (!file) {
            return res.status(404).json({ message: 'File not found' });
        }

        // ✅ إضافة الروابط
        const response = {
            id: file.id,
            name: file.name,
            realestateId: file.realestateId,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
            // ✅ الرابط الكامل للملف
            url: getFileUrl('REALESTATE', file.name, req),
            // ✅ معلومات العقار مع رابط صورة الغلاف
            realEstate: {
                ...file.realEstate,
                coverImageUrl: getFileUrl('REALESTATE', file.realEstate.coverImage, req)
            }
        };

        res.status(200).json(response);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// إحصائيات الملفات
const getFilesStats = async (req, res) => {
    try {
        // إحصائيات عامة
        const totalFiles = await prisma.file.count();
        
        // إحصائيات حسب العقار
        const filesByRealEstate = await prisma.realEstate.findMany({
            select: {
                id: true,
                title: true,
                _count: {
                    select: { files: true }
                }
            },
            where: {
                files: {
                    some: {}
                }
            },
            orderBy: {
                files: {
                    _count: 'desc'
                }
            },
            take: 10 // أعلى 10 عقارات من ناحية عدد الملفات
        });

        // الملفات الأحدث
        const recentFiles = await prisma.file.findMany({
            include: {
                realEstate: {
                    select: { id: true, title: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        // ✅ إضافة الروابط للملفات الأحدث
        const recentFilesWithUrls = recentFiles.map(file => ({
            id: file.id,
            name: file.name,
            realestateId: file.realestateId,
            createdAt: file.createdAt,
            url: getFileUrl('REALESTATE', file.name, req),
            realEstate: file.realEstate
        }));

        const stats = {
            totalFiles,
            realEstatesWithFiles: filesByRealEstate.length,
            topRealEstatesByFiles: filesByRealEstate.map(re => ({
                id: re.id,
                title: re.title,
                filesCount: re._count.files
            })),
            recentFiles: recentFilesWithUrls
        };

        res.status(200).json(stats);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// البحث في الملفات
const searchFiles = async (req, res) => {
    try {
        const { query, realestateId } = req.query;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({ 
                message: 'Search query must be at least 2 characters long' 
            });
        }

        const whereClause = {
            name: {
                contains: query.trim()
            }
        };

        if (realestateId) {
            whereClause.realestateId = parseInt(realestateId);
        }

        const files = await prisma.file.findMany({
            where: whereClause,
            include: {
                realEstate: {
                    select: { id: true, title: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 50 // حد أقصى 50 نتيجة
        });

        // ✅ إضافة الروابط لنتائج البحث
        const filesWithUrls = files.map(file => ({
            id: file.id,
            name: file.name,
            realestateId: file.realestateId,
            createdAt: file.createdAt,
            url: getFileUrl('REALESTATE', file.name, req),
            realEstate: file.realEstate
        }));

        res.status(200).json({
            query,
            resultsCount: filesWithUrls.length,
            files: filesWithUrls
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllFiles,
    getFilesByRealEstateId,
    addFile,
    deleteFile,
    getFileById,
    getFilesStats,
    searchFiles
};