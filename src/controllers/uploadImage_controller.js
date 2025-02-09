


// Define the uploadImage function
const uploadImage = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded.' });
    }

    // Handle the uploaded image here, e.g., save the file path in the database
    const fileName = req.file.filename;
      
    // Return a success response
    return res.status(200).json({ message: 'Image uploaded successfully', fileName });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { uploadImage };
