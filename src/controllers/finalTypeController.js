const prisma = require('../config/prisma');

const getAllFinalTypes = async (req, res) => {
    try {
        const finalTypes = await prisma.finalType.findMany({
            include: {
                subType: {
                    include: { mainType: { select: { name: true } } }
                },
                properties: true,
                _count: {
                    select: {
                        properties: true,
                        realEstates: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
        res.status(200).json(finalTypes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getFinalTypeBySubId = async (req, res) => {
    try {
        const { subId } = req.params;
        const finalTypes = await prisma.finalType.findMany({
            where: { subId: parseInt(subId) },
            include: {
                properties: {
                    orderBy: [
                        { displayOrder: 'asc' },
                        { propertyName: 'asc' }
                    ]
                },
                _count: { select: { realEstates: true } }
            },
            orderBy: { name: 'asc' }
        });
        res.status(200).json(finalTypes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createFinalType = async (req, res) => {
    try {
        const { subId, name } = req.body;
        const finalType = await prisma.finalType.create({
            data: {
                subId: parseInt(subId),
                name
            },
            include: { subType: { select: { name: true } } }
        });
        res.status(201).json(finalType);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateFinalType = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (updates.subId) updates.subId = parseInt(updates.subId);
        
        const finalType = await prisma.finalType.update({
            where: { id: parseInt(id) },
            data: updates
        });
        res.status(200).json({ message: 'finalType updated successfully', finalType });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'finalType not found' });
        }
        res.status(500).json({ error: error.message });
    }
};

const deleteFinalType = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.finalType.delete({
            where: { id: parseInt(id) }
        });
        res.status(200).json({ message: 'finalType deleted successfully' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'finalType not found' });
        }
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createFinalType,
    getAllFinalTypes,
    getFinalTypeBySubId,
    updateFinalType,
    deleteFinalType
};
