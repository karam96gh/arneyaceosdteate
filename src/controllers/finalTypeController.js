// finalTypeController.js

const conn = require('../config/db');

// CREATE: Add a new finalType
const createFinalType = (req, res) => {
  const { subId, name } = req.body;
  const sql = "INSERT INTO finaltype (subId, name) VALUES (?, ?)";
  conn.query(sql, [subId, name], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({ id: results.insertId, message: "finalType created successfully" });
  });
};

// READ: Get all finalTypes
const getAllFinalTypes = (req, res) => {
  const sql = "SELECT * FROM finaltype";
  conn.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json(results);
  });
};

// READ: Get a single finalType by ID
const getFinalTypeBySubId = (req, res) => {
  const { subId } = req.params;
  const sql = "SELECT * FROM finaltype WHERE subId = ?";
  conn.query(sql, [subId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "finalType not found" });
    }
    res.status(200).json(results);
  });
};

// UPDATE: Update a finalType by ID
const updateFinalType = (req, res) => {
    const { id } = req.params; // finalType ID
    const updates = req.body; // Fields to update
    
    // Check if there are updates in the request body
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No fields provided to update' });
    }
  
    // Dynamically build the SET clause for SQL query
    const fields = Object.keys(updates);
    const values = Object.values(updates);
  
    const setClause = fields.map(field => `${field} = ?`).join(', ');
    const sql = `UPDATE finaltype SET ${setClause} WHERE id = ?`;
  
    // Execute the query
    conn.query(sql, [...values, id], (err, results) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      // Check if the row exists
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: 'finalType not found' });
      }
      
      res.status(200).json({ message: 'finalType updated successfully' });
    });
  };
  

// DELETE: Delete a finalType by ID
const deleteFinalType = (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM finaltype WHERE id = ?";
  conn.query(sql, [id], (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json({ message: "finalType deleted successfully" });
  });
};

module.exports = {
  createFinalType,
  getAllFinalTypes,
  getFinalTypeBySubId,
  updateFinalType,
  deleteFinalType,
};
