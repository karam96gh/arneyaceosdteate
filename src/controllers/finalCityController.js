const conn = require('../config/db');

// Get all finalcity
const getAllFinalCity = (req, res) => {
    const sql = 'SELECT * FROM finalCity';
    conn.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(results);
    });
};

// Get finalcity by city ID
const getFinalCityByneighborhoodId = (req, res) => {
    const { neighborhoodId } = req.params;
    const sql = 'SELECT * FROM finalCity WHERE neighborhoodId = ?';
    conn.query(sql, [neighborhoodId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(results);
    });
};

// Add a new neighborhood
const addFinalCity = (req, res) => {
    const { name, neighborhoodId,location } = req.body;
    const sql = 'INSERT INTO finalCity (name, neighborhoodId,location) VALUES (?, ?,?)';
    conn.query(sql, [name, neighborhoodId,location], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: results.insertId, name, neighborhoodId });
    });
};

// Delete a neighborhood
const deleteFinalCity = (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM finalCity WHERE id = ?';
    conn.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'FinalCity not found' });
        }
        res.status(200).json({ message: 'FinalCity deleted successfully' });
    });
};
// Update a neighborhood
const updateFinalCity = (req, res) => {
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
    const sql = `UPDATE finalCity SET ${setClause} WHERE id = ?`;

    conn.query(sql, [...values, id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'FinalCity not found' });
        }
        res.status(200).json({ message: 'FinalCity updated successfully' });
    });
};


module.exports = {
    getAllFinalCity,
    getFinalCityByneighborhoodId,
    addFinalCity,
    deleteFinalCity,
    updateFinalCity
};
