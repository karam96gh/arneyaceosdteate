const { Router } = require('express');
const multer = require('multer'); // Import multer here
const { uploadImage } = require('../controllers/upload_file');
const fs = require('fs');
const path = require('path');

const router = Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
     const uploadPath = path.join(__dirname, '../controllers/src/images/');
            fs.mkdirSync(uploadPath, { recursive: true }); // التأكد من إنشاء المجلد تلقائيًا
            cb(null, uploadPath);

  },
  filename: (req, file, cb) => {
    if(file.originalname.endsWith('mp4'))
    {
      const fileName = Date.now() + '-' + 'realestate.mp4';
      cb(null, fileName);

    }
    else{
      const fileName = Date.now() + '-' + 'realestate.jpg';
      cb(null, fileName);

    }
  },
});

const upload = multer({ storage: storage });

// Define the image upload route
router.post('/upload/uploadFile', upload.single('file'), uploadImage);

module.exports = router;
