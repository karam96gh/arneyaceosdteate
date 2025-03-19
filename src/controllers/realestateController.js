const conn = require('../config/db');
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const util = require('util');

// Convert callbacks to promises for cleaner async/await usage
const queryAsync = util.promisify(conn.query).bind(conn);

// Common SQL fragments
const REAL_ESTATE_SELECT_FIELDS = `
    r.id, 
    r.description,
    r.finalCityId,
    r.createdAt,
    c.name AS cityName, 
    n.name AS neighborhoodName, 
    m.name AS mainCategoryName,
    fc.name AS finalCityName,
    s.name AS subCategoryName, 
    f.name AS finalTypeName, 
    r.bedrooms, 
    r.cityId,
    r.buildingAge,
    r.viewTime,
    r.neighborhoodId,
    r.bathrooms, 
    r.price,
    r.title,
    r.furnished, 
    r.buildingArea, 
    r.floorNumber, 
    r.facade, 
    r.paymentMethod, 
    r.mainCategoryId, 
    r.subCategoryId, 
    r.mainFeatures, 
    r.additionalFeatures, 
    r.nearbyLocations, 
    r.coverImage,
    r.rentalDuration,
    r.ceilingHeight,
    r.totalFloors,
    r.finalTypeId,
    r.buildingItemId,
    r.location
`;

const REAL_ESTATE_JOIN_TABLES = `
    FROM realestate r
    JOIN cities c ON r.cityId = c.id
    JOIN neighborhoods n ON r.neighborhoodId = n.id
    JOIN maintype m ON r.mainCategoryId = m.id
    JOIN subtype s ON r.subCategoryId = s.id
    JOIN finaltype f ON r.finalTypeId = f.id
    JOIN finalCity fc ON r.finalCityId = fc.id
`;

// Helper function to fetch files for real estate listings
async function getFilesForRealEstate(realEstateIds) {
    if (!realEstateIds.length) return [];
    
    const filesSql = 'SELECT realestateId, name FROM files WHERE realestateId IN (?)';
    const files = await queryAsync(filesSql, [realEstateIds]);
    
    // Create a map of id => files
    const filesMap = {};
    files.forEach(file => {
        if (!filesMap[file.realestateId]) {
            filesMap[file.realestateId] = [];
        }
        filesMap[file.realestateId].push(file.name);
    });
    
    return filesMap;
}

// Helper function to attach files to real estate results
function attachFilesToResults(results, filesMap) {
    return results.map(realEstate => ({
        ...realEstate,
        files: filesMap[realEstate.id] || []
    }));
}

// Get all real estate listings
const getAllRealEstate = async (req, res) => {
    try {
        const realEstateSql = `
            SELECT ${REAL_ESTATE_SELECT_FIELDS}
            ${REAL_ESTATE_JOIN_TABLES}
        `;
        
        const realEstateResults = await queryAsync(realEstateSql);
        
        if (realEstateResults.length === 0) {
            return res.status(200).json([]);
        }
        
        const realEstateIds = realEstateResults.map(re => re.id);
        const filesMap = await getFilesForRealEstate(realEstateIds);
        const resultsWithFiles = attachFilesToResults(realEstateResults, filesMap);
        
        res.status(200).json(resultsWithFiles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get real estate by ID
const getRealEstateById = async (req, res) => {
    try {
        const { id } = req.params;
        const sql = `
            SELECT ${REAL_ESTATE_SELECT_FIELDS}
            ${REAL_ESTATE_JOIN_TABLES}
            WHERE r.id = ?
        `;
        
        const realEstateResults = await queryAsync(sql, [id]);
        
        if (realEstateResults.length === 0) {
            return res.status(200).json({ message: 'Realestate not found' });
        }
        
        const filesMap = await getFilesForRealEstate([id]);
        const resultsWithFiles = attachFilesToResults(realEstateResults, filesMap);
        
        res.status(200).json(resultsWithFiles[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Get real estate by building item ID
const getRealEstateByBuildingItemId = async (req, res) => {
    try {
        const { id } = req.params;
        const sql = `
            SELECT ${REAL_ESTATE_SELECT_FIELDS}
            ${REAL_ESTATE_JOIN_TABLES}
            WHERE r.buildingItemId = ?
        `;
        
        const realEstateResults = await queryAsync(sql, [id]);
        
        if (realEstateResults.length === 0) {
            return res.status(200).json({ message: 'Realestate not found' });
        }
        
        const realEstateIds = realEstateResults.map(re => re.id);
        const filesMap = await getFilesForRealEstate(realEstateIds);
        const resultsWithFiles = attachFilesToResults(realEstateResults, filesMap);
        
        res.status(200).json(resultsWithFiles);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'src/images/');
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        try {
            const fileExtension = path.extname(file.originalname);
            const uniqueName = `${Date.now()}${fileExtension}`;
            cb(null, uniqueName);
        } catch (err) {
            console.error('Error saving file:', err);
            cb(err);
        }
    },
});

const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'coverImage') {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
        
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed for coverImage!'), false);
        }
    } else {
        cb(null, true);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
    }
});

// Add a new real estate listing
const addRealEstate = async (req, res) => {
    try {
        const {
            price, title, cityId, neighborhoodId, bedrooms, bathrooms, furnished,
            buildingArea, floorNumber, facade, paymentMethod, mainCategoryId,
            subCategoryId, mainFeatures, additionalFeatures, nearbyLocations, rentalDuration,
            ceilingHeight, totalFloors, finalTypeId, buildingItemId, viewTime, location, 
            description, buildingAge, finalCityId
        } = req.body;

        const coverImage = req.files?.coverImage?.[0]?.filename;
        const files = req.files?.files?.map(file => file.filename) || [];
        
        const realEstateSql = `
            INSERT INTO realestate (
                price, title, cityId, neighborhoodId, bedrooms, bathrooms, furnished,
                buildingArea, floorNumber, facade, paymentMethod, mainCategoryId,
                subCategoryId, mainFeatures, additionalFeatures, nearbyLocations, coverImage,
                rentalDuration, ceilingHeight, totalFloors, finalTypeId, buildingItemId, 
                viewTime, location, description, buildingAge, finalCityId
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const realEstateResult = await queryAsync(
            realEstateSql,
            [price, title, cityId, neighborhoodId, bedrooms, bathrooms, furnished,
            buildingArea, floorNumber, facade, paymentMethod, mainCategoryId,
            subCategoryId, mainFeatures, additionalFeatures, nearbyLocations, coverImage,
            rentalDuration, ceilingHeight, totalFloors, finalTypeId, buildingItemId, 
            viewTime, location, description, buildingAge, finalCityId]
        );

        const realEstateId = realEstateResult.insertId;

        // Insert files if any
        if (files.length > 0) {
            const filesSql = 'INSERT INTO files (name, realestateId) VALUES ?';
            const filesData = files.map(fileName => [fileName, realEstateId]);
            await queryAsync(filesSql, [filesData]);
            
            res.status(201).json({ 
                id: realEstateId, 
                message: 'Real estate added with files successfully' 
            });
        } else {
            res.status(201).json({ 
                id: realEstateId, 
                message: 'Real estate added successfully without additional files' 
            });
        }
    } catch (err) {
        console.error('Error adding real estate:', err);
        res.status(500).json({ error: err.message });
    }
};

// Delete a real estate listing
const deleteRealEstate = async (req, res) => {
    try {
        const { id } = req.params;
        
        // First delete associated files
        await queryAsync('DELETE FROM files WHERE realestateId = ?', [id]);
        
        // Then delete the real estate record
        const result = await queryAsync('DELETE FROM realestate WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Real estate not found' });
        }
        
        res.status(200).json({ message: 'Real estate deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Delete a file
const deleteFile = async (req, res) => {
    try {
        const { name } = req.params;
        const result = await queryAsync('DELETE FROM files WHERE name = ?', [name]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'File not found' });
        }
        
        res.status(200).json({ message: 'File deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Update a real estate listing
const updateRealEstate = async (req, res) => {
    try {
        const { id } = req.params;
        const fieldsToUpdate = { ...req.body };
        const newFiles = Array.isArray(req.body.files) ? req.body.files : [];
        
        // Remove files from fields to update
        delete fieldsToUpdate.files;
        
        // Update real estate data if there are fields to update
        if (Object.keys(fieldsToUpdate).length > 0) {
            const updateFields = Object.keys(fieldsToUpdate).map(key => `${key}=?`);
            const values = [...Object.values(fieldsToUpdate), id];
            
            const updateQuery = `UPDATE realestate SET ${updateFields.join(', ')} WHERE id=?`;
            await queryAsync(updateQuery, values);
        }
        
        // Update files if any new files
        if (newFiles.length > 0) {
            for (let fileName of newFiles) {
                // Delete existing file entries with the same name
                await queryAsync('DELETE FROM files WHERE name=?', [fileName]);
                
                // Insert new file entry
                await queryAsync('INSERT INTO files (name, realestateId) VALUES (?, ?)', [fileName, id]);
            }
        }
        
        res.status(200).json({ message: 'Real estate updated successfully' });
    } catch (err) {
        console.error('Error updating real estate:', err);
        res.status(500).json({ error: err.message });
    }
};

// Get similar real estate listings
const getRealEstateSimilar = async (req, res) => {
    try {
        const { id } = req.params;
        
        // Fetch the target real estate to get its category details
        const targetSql = 'SELECT mainCategoryId, subCategoryId, finalTypeId FROM realestate WHERE id = ?';
        const targetResults = await queryAsync(targetSql, [id]);
        
        if (targetResults.length === 0) {
            return res.status(404).json({ message: 'Real estate not found' });
        }
        
        const { mainCategoryId, subCategoryId, finalTypeId } = targetResults[0];
        
        // Fetch similar listings
        const similarQuery = `
            SELECT ${REAL_ESTATE_SELECT_FIELDS}
            ${REAL_ESTATE_JOIN_TABLES}
            WHERE r.mainCategoryId = ? 
            AND r.subCategoryId = ? 
            AND r.finalTypeId = ? 
            AND r.id != ?
            LIMIT 10
        `;
        
        const similarResults = await queryAsync(
            similarQuery, 
            [mainCategoryId, subCategoryId, finalTypeId, id]
        );
        
        res.status(200).json(similarResults);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Filter real estate fields based on property type
const filter = (req, res) => {
    const { main, sub, finall } = req.body;
    
    // Initialize default fields visibility
    const realestateFields = {
        id: true,
        description: true,
        finalCityId: true,
        bedrooms: true,
        cityId: true,
        buildingAge: true,
        viewTime: true,
        neighborhoodId: true,
        bathrooms: true,
        price: true,
        title: true,
        furnished: true,
        buildingArea: true,
        floorNumber: true,
        facade: true,
        paymentMethod: true,
        mainCategoryId: true,
        subCategoryId: true,
        mainFeatures: true,
        additionalFeatures: true,
        nearbyLocations: true,
        coverImage: true,
        rentalDuration: false,
        ceilingHeight: true,
        totalFloors: true,
        finalTypeId: true,
        buildingItemId: true,
        location: true
    };
    
    const finalType = finall || 's';
    const commercialTypes = ['محل', 'أرض', 'معرض', 'مخزن', 'مصنع', 'ورشة', 'مبنى', 'أراضي'];
    
    // Adjust fields for commercial properties
    if (commercialTypes.includes(sub) || commercialTypes.includes(finalType)) {
        realestateFields.bathrooms = false;
        realestateFields.bedrooms = false;
        realestateFields.totalFloors = false;
        realestateFields.floorNumber = false;
        realestateFields.furnished = false;
        realestateFields.buildingAge = false;
        realestateFields.ceilingHeight = false;
    }
    
    // Special case for buildings
    if (sub === 'مبنى' || finalType === 'مبنى') {
        realestateFields.totalFloors = true;
        realestateFields.buildingAge = true;
    }
    
    // Show rental duration only for rental properties
    if (main === 'إيجار') {
        realestateFields.rentalDuration = true;
    }
    
    return res.json(realestateFields);
};

module.exports = {
    getAllRealEstate,
    getRealEstateById,
    addRealEstate,
    deleteRealEstate,
    updateRealEstate,
    getRealEstateByBuildingItemId,
    getRealEstateSimilar,
    deleteFile,
    filter,
    uploadImage: upload // Export the upload middleware
};