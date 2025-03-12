const conn = require('../config/db');
const fs = require('fs');

// Get all real estate listings
const getAllRealEstate = (req, res) => {
    const realEstateSql = `
        SELECT 
            r.id, 
            r.description,
            r.finalCityId,
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
        FROM realestate r
        JOIN cities c ON r.cityId = c.id
        JOIN neighborhoods n ON r.neighborhoodId = n.id
            JOIN maintype m ON r.mainCategoryId = m.id
    JOIN subtype s ON r.subCategoryId = s.id
    JOIN finaltype f ON r.finalTypeId = f.id
        JOIN finalCity fc ON r.finalCityId = fc.id

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
            r.description,
            r.finalCityId,
            c.name AS cityName, 
            n.name AS neighborhoodName, 
                m.name AS mainCategoryName,
                fc.name as finalCityName,
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
        FROM realestate r
        JOIN cities c ON r.cityId = c.id
        JOIN neighborhoods n ON r.neighborhoodId = n.id
            JOIN maintype m ON r.mainCategoryId = m.id
    JOIN subtype s ON r.subCategoryId = s.id
    JOIN finaltype f ON r.finalTypeId = f.id
        JOIN finalCity fc ON r.finalCityId = fc.id
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
            r.description,
            r.finalCityId,
            c.name AS cityName, 
            n.name AS neighborhoodName, 
                m.name AS mainCategoryName,
                fc.name as finalCityName,
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
        FROM realestate r
        JOIN cities c ON r.cityId = c.id
        JOIN neighborhoods n ON r.neighborhoodId = n.id
            JOIN maintype m ON r.mainCategoryId = m.id
    JOIN subtype s ON r.subCategoryId = s.id
    JOIN finaltype f ON r.finalTypeId = f.id
        JOIN finalCity fc ON r.finalCityId = fc.id

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

// إضافة فلتر للتحقق من نوع الملف
const fileFilter = (req, file, cb) => {
    // التحقق إذا كان الملف صورة للحقل coverImage فقط
    if (file.fieldname === 'coverImage') {
        // قائمة بأنواع الصور المسموح بها
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
        
        if (allowedMimeTypes.includes(file.mimetype)) {
            // قبول الملف لأنه صورة
            cb(null, true);
        } else {
            // رفض الملف لأنه ليس صورة
            cb(new Error('Only image files are allowed for coverImage!'), false);
        }
    } else {
        // قبول الملفات الأخرى بدون تحقق (مثل files)
        cb(null, true);
    }
};

// إنشاء وسيط multer مع إعدادات التخزين والفلتر
const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB كحد أقصى لحجم الملف (اختياري)
    }
});

// تصدير وسيط الرفع لاستخدامه في الراوتر
const uploadImage = upload;

module.exports = { uploadImage };

// الوظيفة لإضافة العقار
const addRealEstate = (req, res) => {
    const {
        price, title, cityId, neighborhoodId, bedrooms, bathrooms, furnished,
        buildingArea, floorNumber, facade, paymentMethod, mainCategoryId,
        subCategoryId, mainFeatures, additionalFeatures, nearbyLocations,rentalDuration,
        ceilingHeight,totalFloors,finalTypeId,buildingItemId, viewTime,location,description,buildingAge,finalCityId


    } = req.body;

    // الحصول على الغلاف
    const coverImage = req.files?.coverImage?.[0]?.filename; // الغلاف كملف واحد
    const files = req.files?.files?.map(file => file.filename) || []; // ملفات متعددة
    const realEstateSql = `
        INSERT INTO realestate (
            price, title, cityId, neighborhoodId, bedrooms, bathrooms, furnished,
            buildingArea, floorNumber, facade, paymentMethod, mainCategoryId,
            subCategoryId, mainFeatures, additionalFeatures, nearbyLocations, coverImage,rentalDuration,
            ceilingHeight,totalFloors,finalTypeId,buildingItemId,viewTime,location,description,buildingAge,finalCityId
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?,?,?,?,?,?,?,?)
    `;

    conn.query(
        realEstateSql,
        [price, title, cityId, neighborhoodId, bedrooms, bathrooms, furnished,
            buildingArea, floorNumber, facade, paymentMethod, mainCategoryId,
            subCategoryId, mainFeatures, additionalFeatures, nearbyLocations, coverImage,rentalDuration,
            ceilingHeight,totalFloors,finalTypeId,buildingItemId,viewTime,location,description,buildingAge,finalCityId],
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
const deleteFile = (req, res) => {
    const { name} = req.params;
    const sql = 'DELETE FROM files WHERE name = ?';
    conn.query(sql, [name], (err, results) => {
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
    const newFiles = Array.isArray(req.body.files) ? req.body.files : [];
    console.log(newFiles);
    try {
        const connPromise = conn.promise(); // جعل الاتصال متوافق مع async/await

        // 1️⃣ تحديث بيانات العقار ديناميكياً فقط عند وجود تغييرات
        if (Object.keys(fieldsToUpdate).length > 0) {
            try {
                let updateQuery = 'UPDATE realestate SET ';
                const updateFields = [];
                const values = [];

                for (let key in fieldsToUpdate) {
                    if(key!='files'){
                    updateFields.push(`${key}=?`);
                    values.push(fieldsToUpdate[key]);
                    }
                }
                updateQuery += updateFields.join(', ') + ' WHERE id=?';
                values.push(id);

                await connPromise.query(updateQuery, values);
            } catch (error) {
                console.error("❌ خطأ في تحديث بيانات العقار:", error);
                return res.status(500).json({ error: "حدث خطأ أثناء تحديث بيانات العقار." });
            }
        }

       

        // 3️⃣ تحديث الملفات إذا تم رفع ملفات جديدة
        if (newFiles.length > 0) {
            try {
          
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
            r.description,
            r.finalCityId,
            c.name AS cityName, 
            n.name AS neighborhoodName, 
                m.name AS mainCategoryName,
                fc.name as finalCityName,
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
        FROM realestate r
        JOIN cities c ON r.cityId = c.id
        JOIN neighborhoods n ON r.neighborhoodId = n.id
            JOIN maintype m ON r.mainCategoryId = m.id
    JOIN subtype s ON r.subCategoryId = s.id
    JOIN finaltype f ON r.finalTypeId = f.id
        JOIN finalCity fc ON r.finalCityId = fc.id
        
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
    deleteFile,
    upload// Export the update function
};

