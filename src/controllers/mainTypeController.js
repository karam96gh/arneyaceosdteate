const conn = require('../config/db');
const fs = require('fs');

// Get all maintypes
const getAllMaintypes = (req, res) => {
    const sql = 'SELECT * FROM maintype';  // Query to get all maintypes
    conn.query(sql, (err, maintypes) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        // For each maintype, get the associated subtypes
        const maintypesWithSubtypes = [];

        let maintypeCount = 0;

        // Loop through each maintype and fetch subtypes for it
        maintypes.forEach((maintype, index) => {
            const subtypesSql = 'SELECT * FROM subtype WHERE mainId = ?';
            conn.query(subtypesSql, [maintype.id], (err, subtypes) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                // Add subtypes list to maintype
                maintypesWithSubtypes.push({
                    id: maintype.id,
                    name: maintype.name,
                    icon: maintype.icon,
                    subtypes: subtypes  // Add the subtypes list
                });

                maintypeCount++;

                // Send the response once all maintypes have been processed
                if (maintypeCount === maintypes.length) {
                    res.status(200).json(maintypesWithSubtypes);
                }
            });
        });
    });
};


// Get a single maintype by ID
const getMaintypeById = (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM maintype WHERE id = ?';
    conn.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Maintype not found' });
        }
        res.status(200).json(results[0]);
    });
};

// إعداد رفع الملفات
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
// Add a new maintype
const addMaintype = (req, res) => {
    const { name } = req.body;
    const icon = req.file?.filename; // التصحيح هنا
    console.log(icon);
    const sql = 'INSERT INTO maintype (name, icon) VALUES (?, ?)';
    conn.query(sql, [name, icon], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: results.insertId, name, icon });
    });
};

const updateMaintype = (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    if (req.file) {
        updates.icon = req.file.filename; // تعيين اسم الصورة الجديدة
    }

    const fields = Object.keys(updates);
    const values = Object.values(updates);

    if (fields.length === 0) {
        return res.status(400).json({ message: 'No fields provided to update' });
    }

    // 🔍 الحصول على اسم الأيقونة القديمة قبل التحديث
    const getOldIconQuery = 'SELECT icon FROM maintype WHERE id = ?';
    conn.query(getOldIconQuery, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Maintype not found' });
        }

        const oldIcon = results[0].icon; // اسم الأيقونة القديمة

        // 🔄 تحديث بيانات `maintype`
        const updateQuery = `UPDATE maintype SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`;
        conn.query(updateQuery, [...values, id], (err, updateResults) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (updateResults.affectedRows === 0) {
                return res.status(404).json({ message: 'Maintype not found' });
            }

            // 🗑️ **حذف الصورة القديمة إن وجدت**
            if (req.file && oldIcon) {
                const oldIconPath = path.join(__dirname, 'src/images/', oldIcon);
                if (fs.existsSync(oldIconPath)) {
                    fs.unlinkSync(oldIconPath); // حذف الصورة القديمة
                }
            }

            res.status(200).json({ message: 'Maintype updated successfully' });
        });
    });
};

// Delete a maintype
const deleteMaintype = (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM maintype WHERE id = ?';
    conn.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Maintype not found' });
        }
        res.status(200).json({ message: 'Maintype deleted successfully' });
    });
};

module.exports = {
    getAllMaintypes,
    getMaintypeById,
    addMaintype,
    updateMaintype,
    deleteMaintype,
    upload
};
