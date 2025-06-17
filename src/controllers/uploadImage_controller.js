const { BASE_URL } = require('../config/upload');

// Define the uploadImage function
const uploadImage = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded.' });
    }

    // Handle the uploaded image here, e.g., save the file path in the database
    const fileName = req.file.filename;
    
    // ✅ إنشاء مسار كامل للصورة حسب نوع الرفع
    let fullImageUrl;
    
    // تحديد نوع الرفع بناءً على المسار
    if (req.originalUrl.includes('uploadImageProduct')) {
      // للمنتجات
      fullImageUrl = `${BASE_URL}/images/products/${fileName}`;
    } else {
      // للصور العامة
      fullImageUrl = `${BASE_URL}/images/${fileName}`;
    }
      
    // Return a success response
    return res.status(200).json({ 
      message: 'Image uploaded successfully', 
      fileName: fileName,
      // ✅ إضافة المسار الكامل
      imageUrl: fullImageUrl
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = { uploadImage };