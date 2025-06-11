const prisma = require('../config/prisma');

// Get all cities
const getAllCities = async (req, res) => {
    try {
        const cities = await prisma.city.findMany({
            include: {
                neighborhoods: true,
                _count: {
                    select: {
                        neighborhoods: true,
                        realEstates: true
                    }
                }
            },
            orderBy: {
                id: 'asc'
            }
        });
        
        res.status(200).json(cities);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get a single city by ID
const getCityById = async (req, res) => {
    try {
        const { id } = req.params;
        const city = await prisma.city.findUnique({
            where: { id: parseInt(id) },
            include: {
                neighborhoods: {
                    include: {
                        finalCities: true,
                        _count: {
                            select: { realEstates: true }
                        }
                    }
                },
                _count: {
                    select: {
                        neighborhoods: true,
                        realEstates: true
                    }
                }
            }
        });

        if (!city) {
            return res.status(404).json({ message: 'City not found' });
        }

        res.status(200).json(city);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Add a new city
const addCity = async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ message: 'City name is required' });
        }

        const city = await prisma.city.create({
            data: { name }
        });

        res.status(201).json(city);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'City name already exists' });
        }
        res.status(500).json({ error: error.message });
    }
};

// Update an existing city
const updateCity = async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'City name is required' });
        }

        const city = await prisma.city.update({
            where: { id: parseInt(id) },
            data: { name }
        });

        res.status(200).json({ message: 'City updated successfully', city });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'City not found' });
        }
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'City name already exists' });
        }
        res.status(500).json({ error: error.message });
    }
};

// Delete a city
const deleteCity = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if city has dependencies
        const cityWithDeps = await prisma.city.findUnique({
            where: { id: parseInt(id) },
            include: {
                _count: {
                    select: {
                        neighborhoods: true,
                        realEstates: true
                    }
                }
            }
        });

        if (!cityWithDeps) {
            return res.status(404).json({ message: 'City not found' });
        }

        if (cityWithDeps._count.neighborhoods > 0 || cityWithDeps._count.realEstates > 0) {
            return res.status(400).json({ 
                message: 'Cannot delete city with existing neighborhoods or real estates' 
            });
        }

        await prisma.city.delete({
            where: { id: parseInt(id) }
        });

        res.status(200).json({ message: 'City deleted successfully' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'City not found' });
        }
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllCities,
    getCityById,
    addCity,
    updateCity,
    deleteCity,
};