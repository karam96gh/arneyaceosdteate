const prisma = require('../config/prisma');

const getAllNeighborhoods = async (req, res) => {
    try {
        const neighborhoods = await prisma.neighborhood.findMany({
            include: {
                city: { select: { id: true, name: true } },
                _count: {
                    select: {
                        finalCities: true,
                        realEstates: true
                    }
                }
            },
            orderBy: { name: 'asc' }
        });
        res.status(200).json(neighborhoods);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getNeighborhoodsByCityId = async (req, res) => {
    try {
        const { cityId } = req.params;
        const neighborhoods = await prisma.neighborhood.findMany({
            where: { cityId: parseInt(cityId) },
            include: {
                finalCities: true,
                _count: { select: { realEstates: true } }
            },
            orderBy: { name: 'asc' }
        });
        res.status(200).json(neighborhoods);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const addNeighborhood = async (req, res) => {
    try {
        const { name, cityId } = req.body;
        const neighborhood = await prisma.neighborhood.create({
            data: { name, cityId: parseInt(cityId) },
            include: { city: { select: { name: true } } }
        });
        res.status(201).json(neighborhood);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateNeighborhood = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (updates.cityId) updates.cityId = parseInt(updates.cityId);
        
        const neighborhood = await prisma.neighborhood.update({
            where: { id: parseInt(id) },
            data: updates
        });
        res.status(200).json({ message: 'Neighborhood updated successfully', neighborhood });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Neighborhood not found' });
        }
        res.status(500).json({ error: error.message });
    }
};

const deleteNeighborhood = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.neighborhood.delete({
            where: { id: parseInt(id) }
        });
        res.status(200).json({ message: 'Neighborhood deleted successfully' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Neighborhood not found' });
        }
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllNeighborhoods,
    getNeighborhoodsByCityId,
    addNeighborhood,
    updateNeighborhood,
    deleteNeighborhood
};
