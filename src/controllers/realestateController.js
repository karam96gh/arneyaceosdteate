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
              r.viewTime,

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
            r.finalTypeId,
            r.buildingItemId,
            r.location
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
const getRealEstateByBuildingItemId = (req, res) => {
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
                    r.viewTime,

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
            r.finalTypeId,
            r.buildingItemId,
            r.location
    FROM realestate r
    JOIN cities c ON r.cityId = c.id
    JOIN neighborhoods n ON r.neighborhoodId = n.id
    JOIN maintype m ON r.mainCategoryId = m.id
    JOIN subtype s ON r.subCategoryId = s.id
    JOIN finaltype f ON r.finalTypeId = f.id

    where r.buildingItemId=?
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

            res.status(200).json(resultsWithFiles);
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
        ceilingHeight,totalFloors,finalTypeId,buildingItemId, viewTime

    } = req.body;

    // الحصول على الغلاف
    const coverImage = req.files?.coverImage?.[0]?.filename; // الغلاف كملف واحد
    const files = req.files?.files?.map(file => file.filename) || []; // ملفات متعددة
    const realEstateSql = `
        INSERT INTO realestate (
            price, title, cityId, neighborhoodId, bedrooms, bathrooms, furnished,
            buildingArea, floorNumber, facade, paymentMethod, mainCategoryId,
            subCategoryId, mainFeatures, additionalFeatures, nearbyLocations, coverImage,rentalDuration,
            ceilingHeight,totalFloors,finalTypeId,buildingItemId,viewTime
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?,?,?,?)
    `;

    conn.query(
        realEstateSql,
        [price, title, cityId, neighborhoodId, bedrooms, bathrooms, furnished,
            buildingArea, floorNumber, facade, paymentMethod, mainCategoryId,
            subCategoryId, mainFeatures, additionalFeatures, nearbyLocations, coverImage,rentalDuration,
            ceilingHeight,totalFloors,finalTypeId,buildingItemId,viewTime],
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

const updateRealEstate = async (req, res) => {
    const { id } = req.params;
    const fieldsToUpdate = req.body;
    const coverImage = req.files?.coverImage?.[0]?.filename || null;
    const newFiles = req.files?.files?.map(file => file.filename) || [];

    try {
        const connPromise = conn.promise(); // جعل الاتصال متوافق مع async/await

        // 1️⃣ تحديث بيانات العقار ديناميكياً فقط عند وجود تغييرات
        if (Object.keys(fieldsToUpdate).length > 0) {
            try {
                let updateQuery = 'UPDATE realestate SET ';
                const updateFields = [];
                const values = [];

                for (let key in fieldsToUpdate) {
                    updateFields.push(`${key}=?`);
                    values.push(fieldsToUpdate[key]);
                }
                updateQuery += updateFields.join(', ') + ' WHERE id=?';
                values.push(id);

                await connPromise.query(updateQuery, values);
            } catch (error) {
                console.error("❌ خطأ في تحديث بيانات العقار:", error);
                return res.status(500).json({ error: "حدث خطأ أثناء تحديث بيانات العقار." });
            }
        }

        // 2️⃣ تحديث صورة الغلاف إذا تم رفع صورة جديدة
        if (coverImage) {
            try {
                const [oldCoverRows] = await connPromise.query('SELECT coverImage FROM realestate WHERE id=?', [id]);

                if (oldCoverRows.length > 0 && oldCoverRows[0].coverImage) {
                    const oldCoverPath = path.join(__dirname, "../images", oldCoverRows[0].coverImage);
                    if (fs.existsSync(oldCoverPath)) {
                        fs.unlinkSync(oldCoverPath); // حذف الصورة القديمة
                    }
                }

                await connPromise.query('UPDATE realestate SET coverImage=? WHERE id=?', [coverImage, id]);
            } catch (error) {
                console.error("❌ خطأ في تحديث صورة الغلاف:", error);
                return res.status(500).json({ error: "حدث خطأ أثناء تحديث صورة الغلاف." });
            }
        }

        // 3️⃣ تحديث الملفات إذا تم رفع ملفات جديدة
        if (newFiles.length > 0) {
            try {
                const [oldFiles] = await connPromise.query('SELECT name FROM files WHERE realestateId=?', [id]);

                // حذف الملفات القديمة بعد التأكد من وجودها
                for (let file of oldFiles) {
                    const filePath = path.join(__dirname, "../images", file.name);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                    }
                }

                // حذف السجلات القديمة من قاعدة البيانات
                await connPromise.query('DELETE FROM files WHERE realestateId=?', [id]);

                // إدخال الملفات الجديدة
                for (let fileName of newFiles) {
                    await connPromise.query('INSERT INTO files (name, realestateId) VALUES (?, ?)', [fileName, id]);
                }
            } catch (error) {
                console.error("❌ خطأ في تحديث الملفات:", error);
                return res.status(500).json({ error: "حدث خطأ أثناء تحديث الملفات." });
            }
        }

        res.status(200).json({ message: '✅ تم تحديث العقار بنجاح!' });

    } catch (error) {
        console.error("❌ خطأ غير متوقع:", error);
        res.status(500).json({ error: "حدث خطأ غير متوقع أثناء تحديث العقار." });
    }
};



const getRealEstateSimilar = (req, res) => {
    const { id } = req.params;

    // First, we fetch the real estate item by ID to get its category details.
    const sql = 'SELECT mainCategoryId, subCategoryId, finalTypeId FROM realestate WHERE id = ?';
    conn.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Real estate not found' });
        }

        // Extract the category IDs of the real estate item
        const { mainCategoryId, subCategoryId, finalTypeId } = results[0];

        // Now, fetch similar real estate items based on matching category IDs
        const similarQuery = `
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
        r.viewTime,
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
            r.finalTypeId,
            r.buildingItemId,
            r.location
    FROM realestate r
    JOIN cities c ON r.cityId = c.id
    JOIN neighborhoods n ON r.neighborhoodId = n.id
    JOIN maintype m ON r.mainCategoryId = m.id
    JOIN subtype s ON r.subCategoryId = s.id
    JOIN finaltype f ON r.finalTypeId = f.id

        
            WHERE r.mainCategoryId = ? 
              AND r.subCategoryId = ? 
              AND r.finalTypeId = ? 
              AND r.id != ?`;  // Exclude the original real estate item

        conn.query(similarQuery, [mainCategoryId, subCategoryId, finalTypeId, id], (err, similarRealEstate) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.status(200).json(similarRealEstate);
        });
    });
};


module.exports = {
    getAllRealEstate,
    getRealEstateById,
    addRealEstate,
    deleteRealEstate,
    updateRealEstate,
    getRealEstateByBuildingItemId, 
    getRealEstateSimilar,
    upload// Export the update function
};

