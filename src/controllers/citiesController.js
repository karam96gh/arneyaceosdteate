const conn = require('../config/db');

// Get all cities
const getAllCities = (req, res) => {
    const sql = 'SELECT * FROM cities';
    conn.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(results);
    });
};

// Get a single city by ID
const getCityById = (req, res) => {
    const { id } = req.params;
    const sql = 'SELECT * FROM cities WHERE id = ?';
    conn.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'City not found' });
        }
        res.status(200).json(results[0]);
    });
};

// Add a new city
const addCity = (req, res) => {
    const { name } = req.body;
    const sql = 'INSERT INTO cities (name) VALUES (?)';
    conn.query(sql, [name], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: results.insertId, name });
    });
};

// Update an existing city
const updateCity = (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const sql = 'UPDATE cities SET name = ? WHERE id = ?';
    conn.query(sql, [name, id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'City not found' });
        }
        res.status(200).json({ message: 'City updated successfully' });
    });
};

// Delete a city
const deleteCity = (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM cities WHERE id = ?';
    conn.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'City not found' });
        }
        res.status(200).json({ message: 'City deleted successfully' });
    });
};

module.exports = {
    getAllCities,
    getCityById,
    addCity,
    updateCity,
    deleteCity,
};
