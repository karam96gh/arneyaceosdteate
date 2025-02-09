const conn = require('../config/db');

// Get all neighborhoods
const getAllNeighborhoods = (req, res) => {
    const sql = 'SELECT * FROM neighborhoods';
    conn.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(results);
    });
};

// Get neighborhoods by city ID
const getNeighborhoodsByCityId = (req, res) => {
    const { cityId } = req.params;
    const sql = 'SELECT * FROM neighborhoods WHERE cityId = ?';
    conn.query(sql, [cityId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(results);
    });
};

// Add a new neighborhood
const addNeighborhood = (req, res) => {
    const { name, cityId } = req.body;
    const sql = 'INSERT INTO neighborhoods (name, cityId) VALUES (?, ?)';
    conn.query(sql, [name, cityId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: results.insertId, name, cityId });
    });
};

// Delete a neighborhood
const deleteNeighborhood = (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM neighborhoods WHERE id = ?';
    conn.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Neighborhood not found' });
        }
        res.status(200).json({ message: 'Neighborhood deleted successfully' });
    });
};
// Update a neighborhood
const updateNeighborhood = (req, res) => {
    const { id } = req.params; // Neighborhood ID from URL
    const updates = req.body; // Fields to update from request body

    // Ensure at least one field is provided
    if (!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No fields provided to update' });
    }

    // Dynamically build the SQL query based on provided fields
    const fields = Object.keys(updates);
    const values = Object.values(updates);

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const sql = `UPDATE neighborhoods SET ${setClause} WHERE id = ?`;

    conn.query(sql, [...values, id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'Neighborhood not found' });
        }
        res.status(200).json({ message: 'Neighborhood updated successfully' });
    });
};


module.exports = {
    getAllNeighborhoods,
    getNeighborhoodsByCityId,
    addNeighborhood,
    deleteNeighborhood,
    updateNeighborhood
};
