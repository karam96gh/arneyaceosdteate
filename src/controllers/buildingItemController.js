const  pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// جلب العناصر داخل مبنى معين
exports.getBuildingItems = (req, res) => {
    const { buildingId } = req.params;
     pool.promise().query('SELECT * FROM building_items WHERE building_id = ?', [buildingId])
        .then(([rows]) => res.json(rows))
        .catch(err => res.status(500).json({ error: err.message }));
};

// إنشاء عنصر داخل مبنى
exports.createBuildingItem = (req, res) => {
    const { name, price, area, type, building_id } = req.body;
    const id = uuidv4();
     pool.promise().query(
        'INSERT INTO building_items (id, name, price, area, type, building_id) VALUES (?, ?, ?, ?, ?, ?)',
        [id, name, price, area, type, building_id]
    )
    .then(() => res.json({ id, name, price, area, type, building_id }))
    .catch(err => res.status(500).json({ error: err.message }));
};

// تحديث عنصر داخل مبنى
exports.updateBuildingItem = (req, res) => {
    const { id } = req.params;
    const { name, price, area, type } = req.body;
     pool.promise().query(
        'UPDATE building_items SET name = ?, price = ?, area = ?, type = ? WHERE id = ?',
        [name, price, area, type, id]
    )
    .then(() => res.json({ message: 'Building item updated' }))
    .catch(err => res.status(500).json({ error: err.message }));
};

// حذف عنصر داخل مبنى
exports.deleteBuildingItem = (req, res) => {
    const { id } = req.params;
     pool.promise().query('DELETE FROM building_items WHERE id = ?', [id])
        .then(() => res.json({ message: 'Building item deleted' }))
        .catch(err => res.status(500).json({ error: err.message }));
};
