const conn = require('../config/db');

// Get all subtypes
const getAllSubtypes = (req, res) => {
    const sql = 'SELECT * FROM subtype';
    conn.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(results);
    });
};

// Get subtypes by mainId
const getSubtypesByMainId = (req, res) => {
    const { mainId } = req.params;
    const sql = 'SELECT * FROM subtype WHERE mainId = ?';
    conn.query(sql, [mainId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(results);
    });
};

// Add a new subtype
const addSubtype = (req, res) => {
    const { mainId, name } = req.body;
    const sql = 'INSERT INTO subtype (mainId, name) VALUES (?, ?)';
    conn.query(sql, [mainId, name], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: results.insertId, mainId, name });
    });
};

// Delete a subtype
const deleteSubtype = (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM subtype WHERE id = ?';
    conn.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Subtype not found' });
        }
        res.status(200).json({ message: 'Subtype deleted successfully' });
    });
};

// Update an existing subtype
const updateSubtype = (req, res) => {
    const { id } = req.params;
    const updates = req.body;

    // Ensure at least one field is provided
    if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No fields provided to update' });
    }

    // Dynamically build the SQL query based on provided fields
    const fields = Object.keys(updates);
    const values = Object.values(updates);

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const sql = `UPDATE subtype SET ${setClause} WHERE id = ?`;

    conn.query(sql, [...values, id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Subtype not found' });
        }
        res.status(200).json({ message: 'Subtype updated successfully' });
    });
};

module.exports = {
    getAllSubtypes,
    getSubtypesByMainId,
    addSubtype,
    deleteSubtype,
    updateSubtype, // Export the update function
};

