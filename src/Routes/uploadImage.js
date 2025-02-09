const { Router } = require('express');
const multer = require('multer'); // Import multer here
const { uploadImage } = require('../controllers/uploadImage_controller');

const router = Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'src/images/'); // Set the destination directory for uploaded images
  },
  filename: (req, file, cb) => {
    if(file.originalname.endsWith('mp4'))
    {
      const fileName = Date.now() + '-' + 'emmall.mp4';
      cb(null, fileName);

    }
    else{
      const fileName = Date.now() + '-' + 'emmall.jpg';
      cb(null, fileName);

    }
  },
});
const storageProduct = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'src/images/products'); // Set the destination directory for uploaded images
  },
  filename: (req, file, cb) => {
    if(file.originalname.endsWith('mp4'))
    {
      const fileName = Date.now() + '-' + 'store.mp4';
      cb(null, fileName);

    }
    else{
      const fileName = Date.now() + '-' + 'store.jpg';
      cb(null, fileName);

    }
  },
});

const upload = multer({ storage: storage });
const uploadProduct = multer({ storage: storageProduct });

// Define the image upload route
router.post('/upload/uploadImage', upload.single('image'), uploadImage);
router.post('/upload/uploadImageProduct', uploadProduct.single('image'), uploadImage);

module.exports = router;
