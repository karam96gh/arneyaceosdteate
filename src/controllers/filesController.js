const conn = require('../config/db');

// Get all files
const getAllFiles = (req, res) => {
    const sql = 'SELECT * FROM files';
    conn.query(sql, (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(results);
    });
};

// Get files for a real estate
const getFilesByRealEstateId = (req, res) => {
    const { realestateId } = req.params;
    const sql = 'SELECT * FROM files WHERE realestateId = ?';
    conn.query(sql, [realestateId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json(results);
    });
};

// Add a new file
const addFile = (req, res) => {
    const { name, realestateId } = req.body;
    const sql = 'INSERT INTO files (name, realestateId) VALUES (?, ?)';
    conn.query(sql, [name, realestateId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: results.insertId, name, realestateId });
    });
};

// Delete a file
const deleteFile = (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM files WHERE id = ?';
    conn.query(sql, [id], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ message: 'File not found' });
        }
        res.status(200).json({ message: 'File deleted successfully' });
    });
};

module.exports = {
    getAllFiles,
    getFilesByRealEstateId,
    addFile,
    deleteFile,
};
