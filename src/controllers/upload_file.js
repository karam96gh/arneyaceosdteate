// uploadImage_controller.js
const multer = require('multer');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'src/images/'); // Set the destination directory for uploaded images
  },
  filename: (req, file, cb) => {
    if(file.originalname.endsWith('mp4'))
    {
      const fileName = Date.now() + '-' + 'realestate.mp4';
      cb(null, fileName);

    }
    else if(file.originalname.endsWith('png')){
      const fileName = Date.now() + '-' + 'realestate.png';
      cb(null, fileName);

    }
    else{
      const fileName = Date.now() + '-' + 'realestate.jpg';
      cb(null, fileName);

    }
  },
});

const upload = multer({ storage: storage });

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
