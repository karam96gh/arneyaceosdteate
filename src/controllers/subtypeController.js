const prisma = require('../config/prisma');

const getAllSubtypes = async (req, res) => {
    try {
        const subtypes = await prisma.subType.findMany({
            include: {
                mainType: { select: { id: true, name: true } },
                finalTypes: true,
                _count: {
                    select: {
                        finalTypes: true,
                        realEstates: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
        res.status(200).json(subtypes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getSubtypesByMainId = async (req, res) => {
    try {
        const { mainId } = req.params;
        const subtypes = await prisma.subType.findMany({
            where: { mainId: parseInt(mainId) },
            include: {
                finalTypes: true,
                _count: { select: { realEstates: true } }
            },
            orderBy: { name: 'asc' }
        });
        res.status(200).json(subtypes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const addSubtype = async (req, res) => {
    try {
        const { mainId, name } = req.body;
        const subtype = await prisma.subType.create({
            data: {
                mainId: parseInt(mainId),
                name
            },
            include: { mainType: { select: { name: true } } }
        });
        res.status(201).json(subtype);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateSubtype = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (updates.mainId) updates.mainId = parseInt(updates.mainId);
        
        const subtype = await prisma.subType.update({
            where: { id: parseInt(id) },
            data: updates
        });
        res.status(200).json({ message: 'Subtype updated successfully', subtype });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Subtype not found' });
        }
        res.status(500).json({ error: error.message });
    }
};

const deleteSubtype = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.subType.delete({
            where: { id: parseInt(id) }
        });
        res.status(200).json({ message: 'Subtype deleted successfully' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Subtype not found' });
        }
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllSubtypes,
    getSubtypesByMainId,
    addSubtype,
    updateSubtype,
    deleteSubtype
};