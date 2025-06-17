// 🛡️ الحل المحدث - مع إصلاح allowedValues
const prisma = require('../config/prisma');

// ✅ إضافة mapping للتحويل بين القيم
const DATA_TYPE_MAPPING = {
  // من القيم المرسلة -> إلى قيم Prisma Enum
  'number': 'NUMBER',
  'text': 'TEXT',
  'multiple_choice': 'MULTIPLE_CHOICE',
  'single_choice': 'SINGLE_CHOICE',
  'date': 'DATE',
  'boolean': 'BOOLEAN',
  'file': 'FILE'
};

// ✅ العكس للقراءة من قاعدة البيانات
const REVERSE_DATA_TYPE_MAPPING = {
  'NUMBER': 'number',
  'TEXT': 'text',
  'MULTIPLE_CHOICE': 'multiple_choice',
  'SINGLE_CHOICE': 'single_choice',
  'DATE': 'date',
  'BOOLEAN': 'boolean',
  'FILE': 'file'
};

// ✅ دالة مساعدة للتحويل
const convertDataType = (dataType, toDatabase = true) => {
  if (toDatabase) {
    return DATA_TYPE_MAPPING[dataType] || dataType;
  } else {
    return REVERSE_DATA_TYPE_MAPPING[dataType] || dataType;
  }
};

// ✅ دالة مساعدة لتحويل allowedValues
const parseAllowedValues = (allowedValues) => {
  if (!allowedValues) return null;
  
  try {
    // إذا كانت string، حول إلى array
    if (typeof allowedValues === 'string') {
      return JSON.parse(allowedValues);
    }
    // إذا كانت array بالفعل، أرجعها كما هي
    if (Array.isArray(allowedValues)) {
      return allowedValues;
    }
    return null;
  } catch (error) {
    console.warn('Failed to parse allowedValues:', allowedValues);
    return null;
  }
};

// ✅ دالة مساعدة لتحويل البيانات المقروءة
const formatPropertyForResponse = (property) => {
  return {
    ...property,
    dataType: convertDataType(property.dataType, false), // تحويل للقراءة
    allowedValues: parseAllowedValues(property.allowedValues) // ✅ تحويل إلى array
  };
};

// Get all properties (محدثة)
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

        // ✅ تحويل dataType و allowedValues للعرض
        const formattedProperties = properties.map(formatPropertyForResponse);
        res.status(200).json(formattedProperties);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get properties by final type ID (محدثة)
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

        // ✅ تحويل dataType و allowedValues للعرض
        const formattedProperties = properties.map(formatPropertyForResponse);
        res.status(200).json(formattedProperties);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get filter properties (محدثة)
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

        const formattedProperties = properties.map(formatPropertyForResponse);
        res.status(200).json(formattedProperties);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get property by ID (محدثة)
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

        const formattedProperty = formatPropertyForResponse(property);
        res.status(200).json(formattedProperty);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Create a new property (محدثة)
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

        // ✅ التحقق من صحة dataType (استخدام القيم الأصلية)
        const validDataTypes = ['number', 'text', 'multiple_choice', 'single_choice', 'date', 'boolean', 'file'];
        if (!validDataTypes.includes(dataType)) {
            return res.status(400).json({ 
                message: 'Invalid dataType',
                provided: dataType,
                valid: validDataTypes
            });
        }

        // التحقق من الحقول المطلوبة
        if (!finalTypeId || !propertyKey || !propertyName || !groupName || !dataType) {
            return res.status(400).json({ 
                message: 'Missing required fields',
                required: ['finalTypeId', 'propertyKey', 'propertyName', 'groupName', 'dataType']
            });
        }

        // ✅ معالجة allowedValues - تحويل array إلى JSON string للحفظ
        let processedAllowedValues = null;
        if (allowedValues) {
            if (Array.isArray(allowedValues)) {
                // إذا كانت array، حولها إلى JSON string
                processedAllowedValues = JSON.stringify(allowedValues);
            } else if (typeof allowedValues === 'string') {
                try {
                    // تأكد من صحة JSON
                    JSON.parse(allowedValues);
                    processedAllowedValues = allowedValues;
                } catch (error) {
                    return res.status(400).json({ 
                        message: 'Invalid JSON format for allowedValues' 
                    });
                }
            } else {
                // إذا كانت object، حولها إلى JSON string
                processedAllowedValues = JSON.stringify(allowedValues);
            }
        }

        // ✅ إنشاء الخاصية مع تحويل dataType
        const property = await prisma.property.create({
            data: {
                finalTypeId: parseInt(finalTypeId),
                propertyKey: propertyKey.trim(),
                propertyName: propertyName.trim(),
                groupName: groupName.trim(),
                dataType: convertDataType(dataType, true), // ✅ تحويل للقاعدة
                allowedValues: processedAllowedValues,
                isFilter: Boolean(isFilter),
                displayOrder: parseInt(displayOrder) || 0,
                isRequired: Boolean(isRequired),
                placeholder: placeholder || null,
                groupSelect: Boolean(groupSelect),
                unit: unit || null
            },
            include: {
                finalType: true
            }
        });

        // ✅ تحويل للعرض
        const formattedProperty = formatPropertyForResponse(property);
        res.status(201).json({
            message: 'Property created successfully',
            property: formattedProperty
        });
    } catch (error) {
        console.error('Error creating property:', error);
        
        if (error.code === 'P2002') {
            return res.status(400).json({ 
                message: 'Property key already exists for this final type' 
            });
        }
        if (error.code === 'P2003') {
            return res.status(400).json({ 
                message: 'Invalid finalTypeId' 
            });
        }
        
        res.status(500).json({ error: error.message });
    }
};

// Bulk create properties (محدثة)
const bulkCreateProperties = async (req, res) => {
    try {
        const { finalTypeId, properties } = req.body;

        if (!finalTypeId || !Array.isArray(properties) || properties.length === 0) {
            return res.status(400).json({ 
                message: 'finalTypeId and properties array are required' 
            });
        }

        // التحقق من وجود finalType
        const finalType = await prisma.finalType.findUnique({
            where: { id: parseInt(finalTypeId) }
        });

        if (!finalType) {
            return res.status(404).json({ 
                message: 'Final type not found'
            });
        }

        // ✅ معالجة البيانات مع التحويل
        const validDataTypes = ['number', 'text', 'multiple_choice', 'single_choice', 'date', 'boolean', 'file'];
        
        const propertiesData = properties.map((prop, index) => {
            // التحقق من نوع البيانات
            if (!validDataTypes.includes(prop.dataType)) {
                throw new Error(`Invalid dataType "${prop.dataType}" at index ${index}`);
            }

            // ✅ معالجة allowedValues
            let processedAllowedValues = null;
            if (prop.allowedValues) {
                if (Array.isArray(prop.allowedValues)) {
                    // إذا كانت array، حولها إلى JSON string
                    processedAllowedValues = JSON.stringify(prop.allowedValues);
                } else if (typeof prop.allowedValues === 'string') {
                    try {
                        JSON.parse(prop.allowedValues);
                        processedAllowedValues = prop.allowedValues;
                    } catch (error) {
                        throw new Error(`Invalid JSON in allowedValues at index ${index}`);
                    }
                } else {
                    processedAllowedValues = JSON.stringify(prop.allowedValues);
                }
            }

            return {
                finalTypeId: parseInt(finalTypeId),
                propertyKey: (prop.propertyKey || '').trim(),
                propertyName: (prop.propertyName || '').trim(),
                groupName: (prop.groupName || '').trim(),
                dataType: convertDataType(prop.dataType, true), // ✅ تحويل للقاعدة
                allowedValues: processedAllowedValues,
                isFilter: Boolean(prop.isFilter),
                displayOrder: parseInt(prop.displayOrder) || index,
                isRequired: Boolean(prop.isRequired),
                placeholder: prop.placeholder || null,
                groupSelect: Boolean(prop.groupSelect),
                unit: prop.unit || null
            };
        });

        const createdProperties = await prisma.property.createMany({
            data: propertiesData,
            skipDuplicates: true
        });

        res.status(201).json({ 
            message: `${createdProperties.count} properties created successfully`,
            count: createdProperties.count,
            total: properties.length
        });
    } catch (error) {
        console.error('Error in bulk create properties:', error);
        res.status(500).json({ error: error.message });
    }
};

// Update property (محدثة)
const updateProperty = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };

        // إزالة القيم غير المحددة
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });

        // تحويل dataType إذا تم تمريره
        if (updateData.dataType) {
            const validDataTypes = ['number', 'text', 'multiple_choice', 'single_choice', 'date', 'boolean', 'file'];
            if (!validDataTypes.includes(updateData.dataType)) {
                return res.status(400).json({ 
                    message: 'Invalid dataType',
                    provided: updateData.dataType,
                    valid: validDataTypes
                });
            }
            updateData.dataType = convertDataType(updateData.dataType, true); // ✅ تحويل للقاعدة
        }

        // ✅ معالجة allowedValues
        if ('allowedValues' in updateData && updateData.allowedValues) {
            if (Array.isArray(updateData.allowedValues)) {
                updateData.allowedValues = JSON.stringify(updateData.allowedValues);
            } else if (typeof updateData.allowedValues === 'string') {
                try {
                    JSON.parse(updateData.allowedValues);
                    // إذا كان JSON صحيح، احتفظ به كما هو
                } catch (error) {
                    return res.status(400).json({ message: 'Invalid JSON format for allowedValues' });
                }
            } else {
                updateData.allowedValues = JSON.stringify(updateData.allowedValues);
            }
        }

        // معالجة باقي البيانات...
        if ('isFilter' in updateData) updateData.isFilter = Boolean(updateData.isFilter);
        if ('isRequired' in updateData) updateData.isRequired = Boolean(updateData.isRequired);
        if ('groupSelect' in updateData) updateData.groupSelect = Boolean(updateData.groupSelect);
        if ('finalTypeId' in updateData) updateData.finalTypeId = parseInt(updateData.finalTypeId);
        if ('displayOrder' in updateData) updateData.displayOrder = parseInt(updateData.displayOrder);

        const property = await prisma.property.update({
            where: { id: parseInt(id) },
            data: updateData,
            include: {
                finalType: true
            }
        });

        // ✅ تحويل للعرض
        const formattedProperty = formatPropertyForResponse(property);
        res.status(200).json({ 
            message: 'Property updated successfully', 
            property: formattedProperty 
        });
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

// Delete property (بدون تغيير)
const deleteProperty = async (req, res) => {
    try {
        const { id } = req.params;

        // التحقق من وجود قيم للخاصية
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

// Get property groups (بدون تغيير)
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