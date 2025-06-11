const prisma = require('../config/prisma');

const getAllFinalCity = async (req, res) => {
    try {
        const finalCities = await prisma.finalCity.findMany({
            include: {
                neighborhood: {
                    include: { city: { select: { name: true } } }
                },
                _count: { select: { realEstates: true } }
            },
            orderBy: { name: 'asc' }
        });
        res.status(200).json(finalCities);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getFinalCityByneighborhoodId = async (req, res) => {
    try {
        const { neighborhoodId } = req.params;
        const finalCities = await prisma.finalCity.findMany({
            where: { neighborhoodId: parseInt(neighborhoodId) },
            include: {
                neighborhood: { select: { name: true } },
                _count: { select: { realEstates: true } }
            },
            orderBy: { name: 'asc' }
        });
        res.status(200).json(finalCities);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const addFinalCity = async (req, res) => {
    try {
        const { name, neighborhoodId, location } = req.body;
        const finalCity = await prisma.finalCity.create({
            data: {
                name,
                neighborhoodId: parseInt(neighborhoodId),
                location: location || '32.5555,32.999'
            }
        });
        res.status(201).json(finalCity);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateFinalCity = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        if (updates.neighborhoodId) updates.neighborhoodId = parseInt(updates.neighborhoodId);
        
        const finalCity = await prisma.finalCity.update({
            where: { id: parseInt(id) },
            data: updates
        });
        res.status(200).json({ message: 'FinalCity updated successfully', finalCity });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'FinalCity not found' });
        }
        res.status(500).json({ error: error.message });
    }
};

const deleteFinalCity = async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.finalCity.delete({
            where: { id: parseInt(id) }
        });
        res.status(200).json({ message: 'FinalCity deleted successfully' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'FinalCity not found' });
        }
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllFinalCity,
    getFinalCityByneighborhoodId,
    addFinalCity,
    updateFinalCity,
    deleteFinalCity
};

