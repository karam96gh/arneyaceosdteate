const prisma = require('../config/prisma');

// Get all properties
const getAllProperties = async (req, res) => {
    try {
        const properties = await prisma.property.findMany({
            include: {
                finalType: {
                    include: {
                        subType: {
                            include: {
                                mainType: true
                            }
                        }
                    }
                },
                _count: {
                    select: { propertyValues: true }
                }
            },
            orderBy: [
                { finalTypeId: 'asc' },
                { displayOrder: 'asc' },
                { propertyName: 'asc' }
            ]
        });

        res.status(200).json(properties);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get properties by final type ID
const getPropertiesByFinalType = async (req, res) => {
    try {
        const { finalTypeId } = req.params;
        
        const properties = await prisma.property.findMany({
            where: { finalTypeId: parseInt(finalTypeId) },
            include: {
                finalType: true,
                _count: {
                    select: { propertyValues: true }
                }
            },
            orderBy: [
                { displayOrder: 'asc' },
                { propertyName: 'asc' }
            ]
        });

        res.status(200).json(properties);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get filter properties (properties marked as filters)
const getFilterProperties = async (req, res) => {
    try {
        const { finalTypeId } = req.query;
        
        const whereClause = {
            isFilter: true
        };

        if (finalTypeId) {
            whereClause.finalTypeId = parseInt(finalTypeId);
        }

        const properties = await prisma.property.findMany({
            where: whereClause,
            include: {
                finalType: {
                    include: {
                        subType: {
                            include: {
                                mainType: true
                            }
                        }
                    }
                }
            },
            orderBy: [
                { finalTypeId: 'asc' },
                { displayOrder: 'asc' },
                { propertyName: 'asc' }
            ]
        });

        res.status(200).json(properties);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get property by ID
const getPropertyById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const property = await prisma.property.findUnique({
            where: { id: parseInt(id) },
            include: {
                finalType: {
                    include: {
                        subType: {
                            include: {
                                mainType: true
                            }
                        }
                    }
                },
                propertyValues: {
                    include: {
                        realEstate: {
                            select: {
                                id: true,
                                title: true
                            }
                        }
                    }
                }
            }
        });

        if (!property) {
            return res.status(404).json({ message: 'Property not found' });
        }

        res.status(200).json(property);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create a new property
const createProperty = async (req, res) => {
    try {
        const {
            finalTypeId,
            propertyKey,
            propertyName,
            groupName,
            dataType,
            allowedValues,
            isFilter = false,
            displayOrder = 0,
            isRequired = false,
            placeholder,
            groupSelect = false,
            unit
        } = req.body;

        // Validate required fields
        if (!finalTypeId || !propertyKey || !propertyName || !groupName || !dataType) {
            return res.status(400).json({ 
                message: 'Missing required fields: finalTypeId, propertyKey, propertyName, groupName, dataType' 
            });
        }

        // Validate dataType
        const validDataTypes = ['number', 'text', 'multiple_choice', 'single_choice', 'date', 'boolean', 'file'];
        if (!validDataTypes.includes(dataType)) {
            return res.status(400).json({ 
                message: 'Invalid dataType. Must be one of: ' + validDataTypes.join(', ') 
            });
        }

        // Validate allowedValues for choice types
        if ((dataType === 'multiple_choice' || dataType === 'single_choice') && !allowedValues) {
            return res.status(400).json({ 
                message: 'allowedValues is required for multiple_choice and single_choice types' 
            });
        }

        // Validate file type configurations
        if (dataType === 'file' && allowedValues) {
            // allowedValues for file type should contain file extensions or MIME types
            try {
                const fileConfig = typeof allowedValues === 'string' ? JSON.parse(allowedValues) : allowedValues;
                if (!fileConfig.extensions && !fileConfig.mimeTypes) {
                    return res.status(400).json({ 
                        message: 'File type should specify allowed extensions or mimeTypes in allowedValues' 
                    });
                }
            } catch (error) {
                return res.status(400).json({ message: 'Invalid file configuration in allowedValues' });
            }
        }

        // Parse allowedValues if it's a string
        let parsedAllowedValues = allowedValues;
        if (typeof allowedValues === 'string') {
            try {
                parsedAllowedValues = JSON.parse(allowedValues);
            } catch (error) {
                return res.status(400).json({ message: 'Invalid JSON format for allowedValues' });
            }
        }

        const property = await prisma.property.create({
            data: {
                finalTypeId: parseInt(finalTypeId),
                propertyKey,
                propertyName,
                groupName,
                dataType,
                allowedValues: parsedAllowedValues ? JSON.stringify(parsedAllowedValues) : null,
                isFilter: Boolean(isFilter),
                displayOrder: parseInt(displayOrder),
                isRequired: Boolean(isRequired),
                placeholder,
                groupSelect: Boolean(groupSelect),
                unit
            },
            include: {
                finalType: true
            }
        });

        res.status(201).json(property);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ 
                message: 'Property key already exists for this final type' 
            });
        }
        if (error.code === 'P2003') {
            return res.status(400).json({ message: 'Invalid finalTypeId' });
        }
        res.status(500).json({ error: error.message });
    }
};

// Update a property
const updateProperty = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        // Remove undefined values
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        // Convert string booleans to actual booleans
        if ('isFilter' in updateData) updateData.isFilter = Boolean(updateData.isFilter);
        if ('isRequired' in updateData) updateData.isRequired = Boolean(updateData.isRequired);
        if ('groupSelect' in updateData) updateData.groupSelect = Boolean(updateData.groupSelect);

        // Convert numeric fields
        if ('finalTypeId' in updateData) updateData.finalTypeId = parseInt(updateData.finalTypeId);
        if ('displayOrder' in updateData) updateData.displayOrder = parseInt(updateData.displayOrder);

        // Handle allowedValues
        if ('allowedValues' in updateData && updateData.allowedValues) {
            if (typeof updateData.allowedValues === 'string') {
                try {
                    updateData.allowedValues = JSON.stringify(JSON.parse(updateData.allowedValues));
                } catch (error) {
                    return res.status(400).json({ message: 'Invalid JSON format for allowedValues' });
                }
            } else {
                updateData.allowedValues = JSON.stringify(updateData.allowedValues);
            }
        }

        const property = await prisma.property.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                finalType: true
            }
        });

        res.status(200).json({ message: 'Property updated successfully', property });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Property not found' });
        }
        if (error.code === 'P2002') {
            return res.status(400).json({ 
                message: 'Property key already exists for this final type' 
            });
        }
        res.status(500).json({ error: error.message });
    }
};

// Delete a property
const deleteProperty = async (req, res) => {
    try {
        const { id } = req.params;

        // Check if property has values
        const propertyWithValues = await prisma.property.findUnique({
            where: { id: parseInt(id) },
            include: {
                _count: {
                    select: { propertyValues: true }
                }
            }
        });

        if (!propertyWithValues) {
            return res.status(404).json({ message: 'Property not found' });
        }

        if (propertyWithValues._count.propertyValues > 0) {
            return res.status(400).json({ 
                message: 'Cannot delete property with existing values' 
            });
        }

        await prisma.property.delete({
            where: { id: parseInt(id) }
        });

        res.status(200).json({ message: 'Property deleted successfully' });
    } catch (error) {
        if (error.code === 'P2025') {
            return res.status(404).json({ message: 'Property not found' });
        }
        res.status(500).json({ error: error.message });
    }
};

// Bulk create properties for a final type
const bulkCreateProperties = async (req, res) => {
    try {
        const { finalTypeId, properties } = req.body;

        if (!finalTypeId || !Array.isArray(properties) || properties.length === 0) {
            return res.status(400).json({ 
                message: 'finalTypeId and properties array are required' 
            });
        }

        // Validate final type exists
        const finalType = await prisma.finalType.findUnique({
            where: { id: parseInt(finalTypeId) }
        });

        if (!finalType) {
            return res.status(404).json({ message: 'Final type not found' });
        }

        // Prepare data for bulk creation
        const propertiesData = properties.map((prop, index) => ({
            finalTypeId: parseInt(finalTypeId),
            propertyKey: prop.propertyKey,
            propertyName: prop.propertyName,
            groupName: prop.groupName,
            dataType: prop.dataType,
            allowedValues: prop.allowedValues ? JSON.stringify(prop.allowedValues) : null,
            isFilter: Boolean(prop.isFilter),
            displayOrder: prop.displayOrder || index,
            isRequired: Boolean(prop.isRequired),
            placeholder: prop.placeholder,
            groupSelect: Boolean(prop.groupSelect),
            unit: prop.unit
        }));

        const createdProperties = await prisma.property.createMany({
            data: propertiesData,
            skipDuplicates: true
        });

        res.status(201).json({ 
            message: `${createdProperties.count} properties created successfully`,
            count: createdProperties.count
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get property groups for a final type
const getPropertyGroups = async (req, res) => {
    try {
        const { finalTypeId } = req.params;
        
        const groups = await prisma.property.groupBy({
            by: ['groupName'],
            where: { finalTypeId: parseInt(finalTypeId) },
            _count: {
                groupName: true
            },
            orderBy: {
                groupName: 'asc'
            }
        });

        res.status(200).json(groups);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getAllProperties,
    getPropertiesByFinalType,
    getFilterProperties,
    getPropertyById,
    createProperty,
    updateProperty,
    deleteProperty,
    bulkCreateProperties,
    getPropertyGroups
};