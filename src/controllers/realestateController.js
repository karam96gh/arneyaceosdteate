const conn = require('../config/db');
const fs = require('fs');

// Get all real estate listings
const getAllRealEstate = (req, res) => {
    const realEstateSql = `
        SELECT 
            r.id, 
            c.name AS cityName, 
            n.name AS neighborhoodName, 
                m.name AS mainCategoryName, 
        s.name AS subCategoryName, 
        f.name AS finalTypeName, 
            r.bedrooms, 
            r.cityId,
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
            r.finalTypeId
        FROM realestate r
        JOIN cities c ON r.cityId = c.id
        JOIN neighborhoods n ON r.neighborhoodId = n.id
            JOIN maintype m ON r.mainCategoryId = m.id
    JOIN subtype s ON r.subCategoryId = s.id
    JOIN finaltype f ON r.finalTypeId = f.id
    `;

    const filesSql = 'SELECT name FROM files WHERE realestateId = ?';

    conn.query(realEstateSql, (err, realEstateResults) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const realEstateIds = realEstateResults.map(re => re.id);

        if (realEstateIds.length === 0) {
            return res.status(200).json([]);
        }

        const filesPromises = realEstateIds.map(id =>
            new Promise((resolve, reject) => {
                conn.query(filesSql, [id], (err, files) => {
                    if (err) {
                        return reject(err);
                    }
                    const fileNames = files.map(file => file.name); // Extract file names
                    resolve({ id, files: fileNames });
                });
            })
        );

        Promise.all(filesPromises)
            .then(filesData => {
                const resultsWithFiles = realEstateResults.map(realEstate => {
                    const files = filesData.find(f => f.id === realEstate.id)?.files || [];
                    return { ...realEstate, files };
                });

                res.status(200).json(resultsWithFiles);
            })
            .catch(error => {
                res.status(500).json({ error: error.message });
            });
    });
};

// Get real estate by ID
const getRealEstateById = (req, res) => {
    const { id } = req.params;
    const sql = `
    SELECT 
        r.id, 
        c.name AS cityName, 
        n.name AS neighborhoodName, 
        m.name AS mainCategoryName, 
        s.name AS subCategoryName, 
        f.name AS finalTypeName, 
        r.bedrooms, 
        r.bathrooms, 
                r.price, 
        r.title, 
  r.cityId,
            r.neighborhoodId,
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
            r.finalTypeId
    FROM realestate r
    JOIN cities c ON r.cityId = c.id
    JOIN neighborhoods n ON r.neighborhoodId = n.id
    JOIN maintype m ON r.mainCategoryId = m.id
    JOIN subtype s ON r.subCategoryId = s.id
    JOIN finaltype f ON r.finalTypeId = f.id

    where r.id=?
`;  
const filesSql = 'SELECT name FROM files WHERE realestateId = ?';

conn.query(sql,[id], (err, realEstateResults) => {
    if (err) {
        return res.status(500).json({ error: err.message });
    }

    const realEstateIds = realEstateResults.map(re => re.id);

    if (realEstateIds.length === 0) {
        return res.status(200).json({ message: 'Realestate not found' });
    }

    const filesPromises = realEstateIds.map(id =>
        new Promise((resolve, reject) => {
            conn.query(filesSql, [id], (err, files) => {
                if (err) {
                    return reject(err);
                }
                const fileNames = files.map(file => file.name); // Extract file names
                resolve({ id, files: fileNames });
            });
        })
    );

    Promise.all(filesPromises)
        .then(filesData => {
            const resultsWithFiles = realEstateResults.map(realEstate => {
                const files = filesData.find(f => f.id === realEstate.id)?.files || [];
                return { ...realEstate, files };
            });

            res.status(200).json(resultsWithFiles[0]);
        })
        .catch(error => {
            res.status(500).json({ error: error.message });
        });
});
};

// Add a new real estate listing
const multer = require('multer');
const path = require('path');

// إعداد رفع الملفات
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'src/images/');
        fs.mkdirSync(uploadPath, { recursive: true }); // التأكد من إنشاء المجلد تلقائيًا
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        try {
              const fileExtension = path.extname(file.originalname); 
            
            // إنشاء اسم فريد مع الاحتفاظ بالامتداد
            const uniqueName = `${Date.now()}${fileExtension}`;
            cb(null, uniqueName);
        } catch (err) {
            console.error('Error saving file:', err);
            cb(err);
        }
    },
});

const upload = multer({ storage });

// الوظيفة لإضافة العقار
const addRealEstate = (req, res) => {
    const {
        price, title, cityId, neighborhoodId, bedrooms, bathrooms, furnished,
        buildingArea, floorNumber, facade, paymentMethod, mainCategoryId,
        subCategoryId, mainFeatures, additionalFeatures, nearbyLocations,rentalDuration,
        ceilingHeight,totalFloors,finalTypeId
    } = req.body;

    // الحصول على الغلاف
    const coverImage = req.files?.coverImage?.[0]?.filename; // الغلاف كملف واحد
    const files = req.files?.files?.map(file => file.filename) || []; // ملفات متعددة
    const realEstateSql = `
        INSERT INTO realestate (
            price, title, cityId, neighborhoodId, bedrooms, bathrooms, furnished,
            buildingArea, floorNumber, facade, paymentMethod, mainCategoryId,
            subCategoryId, mainFeatures, additionalFeatures, nearbyLocations, coverImage,rentalDuration,
            ceilingHeight,totalFloors,finalTypeId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?,?)
    `;

    conn.query(
        realEstateSql,
        [price, title, cityId, neighborhoodId, bedrooms, bathrooms, furnished,
            buildingArea, floorNumber, facade, paymentMethod, mainCategoryId,
            subCategoryId, mainFeatures, additionalFeatures, nearbyLocations, coverImage,rentalDuration,
            ceilingHeight,totalFloors,finalTypeId],
        (err, results) => {
            if (err) {
            console.log(err.message);
                return res.status(500).json({ error: err.message });
            }

            const realEstateId = results.insertId;

            // إدخال الملفات
            if (files.length > 0) {
                const filesSql = 'INSERT INTO files (name, realestateId) VALUES ?';
                const filesData = files.map(fileName => [fileName, realEstateId]);

                conn.query(filesSql, [filesData], (filesErr) => {
                    if (filesErr) {
                        return res.status(500).json({ error: filesErr.message });
                    }

                    res.status(201).json({ id: realEstateId, message: 'Real estate added with files successfully' });
                });
            } else {
                res.status(201).json({ id: realEstateId, message: 'Real estate added successfully without additional files' });
            }
        }
    );
};

// Delete a real estate listing
const deleteRealEstate = (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM realestate WHERE id = ?';
    conn.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Real estate not found' });
        }
        res.status(200).json({ message: 'Real estate deleted successfully' });
    });
};
// Update a real estate listing
const updateRealEstate = (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    // Build the SQL query dynamically to only include fields provided in the request body
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    console.log(updates);
    if (fields.length === 0) {
        return res.status(400).json({ message: 'No fields provided to update' });
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const sql = `UPDATE realestate SET ${setClause} WHERE id = ?`;

    conn.query(sql, [...values, id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Real estate not found' });
        }
        res.status(200).json({ message: 'Real estate updated successfully' });
    });
};

module.exports = {
    getAllRealEstate,
    getRealEstateById,
    addRealEstate,
    deleteRealEstate,
    updateRealEstate, 
    upload// Export the update function
};

