const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const PORT = process.env.PORT || 4100;
const app = express();

// Import routes
const citiesRoutes = require('./routes/citiesRoutes');
const filesRoutes = require('./routes/filesRoutes');
const maintypeRoutes = require('./routes/maintypeRoutes');
const neighborhoodsRoutes = require('./routes/neighborhoodsRoutes');
const finalCityRoutes = require('./routes/finalCityRoutes');
const realestateRoutes = require('./routes/realestateRoutes');
const subtypeRoutes = require('./routes/subtypeRoutes');
const finalTypeRoutes = require('./routes/finalTypeRoutes');
const buildingRoutes = require('./routes/buildingRoutes');
const propertyRoutes = require('./routes/propertyRoutes'); // إضافة مسارات الخصائص الجديدة
const filePropertyRoutes = require('./routes/filePropertyRoutes'); // إضافة مسارات ملفات الخصائص

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

// API Routes
app.use('/api/cities', citiesRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/maintypes', maintypeRoutes);
app.use('/api/neighborhoods', neighborhoodsRoutes);
app.use('/api/finalCity', finalCityRoutes);
app.use('/api/realestate', realestateRoutes);
app.use('/api/subtypes', subtypeRoutes);
app.use('/api/finaltypes', finalTypeRoutes);
app.use('/api/properties', propertyRoutes); // إضافة مسارات الخصائص
app.use('/api/properties', filePropertyRoutes); // إضافة مسارات ملفات الخصائص
app.use('/api', buildingRoutes);

// File upload routes
app.use('/images', require('./routes/uploadImage'));
app.use('/api', require('./routes/upload_file'));

// Static file serving
app.use(express.static(path.join(__dirname, './controllers/src/images')));
app.use(express.static(path.join(__dirname, './images/products')));
app.use('/images/properties', express.static(path.join(__dirname, './controllers/src/images/properties'))); // ملفات الخصائص

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Real Estate API',
        version: '2.0.0' 
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ error: 'Invalid JSON format' });
    }
    
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File size too large' });
    }
    
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully');
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$disconnect();
    process.exit(0);
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🏠 Real Estate API: http://localhost:${PORT}/api`);
});

module.exports = app;   