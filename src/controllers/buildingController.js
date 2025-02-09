const  pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// جلب كل المباني
exports.getBuildings = (req, res) => {
     pool.promise().query('SELECT * FROM buildings')
        .then(([rows]) => res.json(rows))
        .catch(err => res.status(500).json({ error: err.message }));
};

// جلب مبنى معين مع العناصر الخاصة به
exports.getBuildingById = (req, res) => {
    const { id } = req.params;
     pool.promise().query('SELECT * FROM buildings WHERE id = ?', [id])
        .then(([building]) => {
            if (!building.length) return res.status(404).json({ message: 'Building not found' });

             pool.promise().query('SELECT * FROM building_items WHERE building_id = ?', [id])
                .then(([items]) => res.json({ ...building[0], items }))
                .catch(err => res.status(500).json({ error: err.message }));
        })
        .catch(err => res.status(500).json({ error: err.message }));
};

// إنشاء مبنى جديد
exports.createBuilding = (req, res) => {
    const { title, status ,location} = req.body;
    const id = uuidv4();
     pool.promise().query('INSERT INTO buildings (id, title, status,location) VALUES (?, ?, ?,?)', [id, title, status,location])
        .then(() => res.json({ id, title, status,location }))
        .catch(err => res.status(500).json({ error: err.message }));
};

// تحديث مبنى
exports.updateBuilding = (req, res) => {
        const { id } = req.params;
        const updates = req.body;
    
        // Ensure at least one field is provided for updating
        if (!id) {
            return res.status(400).json({ message: "Building ID is required" });
        }
    
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ message: "No fields provided to update" });
        }
    
        // Build dynamic SQL query
        const fields = Object.keys(updates);
        const values = Object.values(updates);
    
        const setClause = fields.map(field => `${field} = ?`).join(", ");
        const sql = `UPDATE buildings SET ${setClause} WHERE id = ?`;
    
        console.log("Executing SQL:", sql, [...values, id]);
    
        pool.query(sql, [...values, id], (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (results.affectedRows === 0) {
                return res.status(404).json({ message: "Building not found" });
            }
            res.status(200).json({ message: "Building updated successfully" });
        });
    };
    

// حذف مبنى
exports.deleteBuilding = (req, res) => {
    const { id } = req.params;
     pool.promise().query('DELETE FROM buildings WHERE id = ?', [id])
        .then(() => res.json({ message: 'Building deleted' }))
        .catch(err => res.status(500).json({ error: err.message }));
};
