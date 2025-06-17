const prisma = require('../config/prisma');
const { buildRealEstateFileUrl } = require('../config/upload');

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

        // ✅ تحويل أسماء الملفات إلى مسارات كاملة
        const formattedFiles = files.map(file => ({
            ...file,
            // تحويل name إلى مسار كامل
            name: buildRealEstateFileUrl(file.name),
            // الاحتفاظ باسم الملف الأصلي في حقل منفصل
            fileName: file.name
        }));

        res.status(200).json(formattedFiles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getFilesByRealEstateId = async (req, res) => {
    try {
        const { realestateId } = req.params;
        const files = await prisma.file.findMany({
            where: { realestateId: parseInt(realestateId) },
            orderBy: { createdAt: 'desc' }
        });

        // ✅ تحويل أسماء الملفات إلى مسارات كاملة
        const formattedFiles = files.map(file => ({
            ...file,
            // تحويل name إلى مسار كامل
            name: buildRealEstateFileUrl(file.name),
            // الاحتفاظ باسم الملف الأصلي في حقل منفصل
            fileName: file.name
        }));

        res.status(200).json(formattedFiles);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const addFile = async (req, res) => {
    try {
        const { name, realestateId } = req.body;
        const file = await prisma.file.create({
            data: {
                name,
                realestateId: parseInt(realestateId)
            }
        });

        // ✅ إرجاع الملف مع مسار كامل
        const formattedFile = {
            ...file,
            // تحويل name إلى مسار كامل
            name: buildRealEstateFileUrl(file.name),
            // الاحتفاظ باسم الملف الأصلي في حقل منفصل
            fileName: file.name
        };

        res.status(201).json(formattedFile);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteFile = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.file.delete({
            where: { id: parseInt(id) }
        });
        res.status(200).json({ message: 'File deleted successfully' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'File not found' });
        }
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllFiles,
    getFilesByRealEstateId,
    addFile,
    deleteFile
};