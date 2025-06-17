// src/middleware/urlHelper.js
const { 
    getFileUrl, 
    getPropertyFileUrl, 
    formatRealEstateFiles,
    formatPropertyValues 
} = require('../config/upload');

/**
 * Middleware لإضافة دوال مساعدة للروابط إلى req
 */
const urlHelper = (req, res, next) => {
    // إضافة دوال مساعدة للـ request object
    req.getFileUrl = (uploadType, filename) => getFileUrl(uploadType, filename, req);
    req.getPropertyFileUrl = (propertyKey, filename) => getPropertyFileUrl(propertyKey, filename, req);
    
    // دالة مساعدة لتحويل ملفات العقار
    req.formatRealEstateFiles = (realEstate) => formatRealEstateFiles(realEstate, req);
    
    // دالة مساعدة لتحويل قيم الخصائص
    req.formatPropertyValues = (propertyValues) => formatPropertyValues(propertyValues, req);
    
    // دالة عامة لإضافة الروابط لأي قائمة ملفات
    req.addFileUrls = (files, uploadType = 'REALESTATE') => {
        if (!files || !Array.isArray(files)) return [];
        
        return files.map(file => {
            if (typeof file === 'string') {
                // إذا كان اسم ملف فقط
                return {
                    filename: file,
                    url: req.getFileUrl(uploadType, file)
                };
            } else if (file.name) {
                // إذا كان object يحتوي على name
                return {
                    ...file,
                    filename: file.name,
                    url: req.getFileUrl(uploadType, file.name)
                };
            } else if (file.filename) {
                // إذا كان object يحتوي على filename
                return {
                    ...file,
                    url: req.getFileUrl(uploadType, file.filename)
                };
            }
            
            return file;
        });
    };
    
    // دالة لإضافة رابط لملف واحد
    req.addFileUrl = (file, uploadType = 'REALESTATE') => {
        if (!file) return null;
        
        if (typeof file === 'string') {
            return {
                filename: file,
                url: req.getFileUrl(uploadType, file)
            };
        } else if (file.name) {
            return {
                ...file,
                filename: file.name,
                url: req.getFileUrl(uploadType, file.name)
            };
        } else if (file.filename) {
            return {
                ...file,
                url: req.getFileUrl(uploadType, file.filename)
            };
        }
        
        return file;
    };
    
    // دالة لمعالجة العقار الواحد مع جميع ملفاته
    req.formatSingleRealEstate = (realEstate) => {
        if (!realEstate) return null;
        
        const formatted = { ...realEstate };
        
        // صورة الغلاف
        if (formatted.coverImage) {
            formatted.coverImageUrl = req.getFileUrl('REALESTATE', formatted.coverImage);
        }
        
        // الملفات الإضافية
        if (formatted.files) {
            formatted.filesWithUrls = req.addFileUrls(formatted.files, 'REALESTATE');
        }
        
        // قيم الخصائص (إذا كانت موجودة)
        if (formatted.propertyValues) {
            formatted.formattedPropertyValues = req.formatPropertyValues(formatted.propertyValues);
        }
        
        return formatted;
    };
    
    // دالة لمعالجة قائمة العقارات
    req.formatRealEstateList = (realEstates) => {
        if (!realEstates || !Array.isArray(realEstates)) return [];
        
        return realEstates.map(realEstate => req.formatSingleRealEstate(realEstate));
    };
    
    // دالة لمعالجة النوع الرئيسي مع الأيقونة
    req.formatMainType = (mainType) => {
        if (!mainType) return null;
        
        return {
            ...mainType,
            iconUrl: req.getFileUrl('ICONS', mainType.icon)
        };
    };
    
    // دالة لمعالجة قائمة الأنواع الرئيسية
    req.formatMainTypes = (mainTypes) => {
        if (!mainTypes || !Array.isArray(mainTypes)) return [];
        
        return mainTypes.map(mainType => req.formatMainType(mainType));
    };
    
    next();
};

/**
 * دالة مساعدة للحصول على Base URL من الطلب
 */
const getBaseUrl = (req) => {
    return `${req.protocol}://${req.get('host')}`;
};

/**
 * دالة لإنشاء استجابة موحدة مع الروابط
 */
const createResponse = (req, data, message = null) => {
    const response = {
        success: true,
        data: data
    };
    
    if (message) {
        response.message = message;
    }
    
    // إضافة معلومات الخادم
    response.server = {
        baseUrl: getBaseUrl(req),
        timestamp: new Date().toISOString()
    };
    
    return response;
};

/**
 * دالة لإنشاء استجابة خطأ موحدة
 */
const createErrorResponse = (message, error = null, statusCode = 500) => {
    const response = {
        success: false,
        message: message
    };
    
    if (error && process.env.NODE_ENV === 'development') {
        response.error = error;
    }
    
    response.timestamp = new Date().toISOString();
    
    return { response, statusCode };
};

/**
 * دالة لمعالجة البيانات الأساسية للعقار
 */
const formatBasicRealEstate = (realEstate, req) => {
    return {
        id: realEstate.id,
        title: realEstate.title,
        price: realEstate.price,
        description: realEstate.description,
        location: realEstate.location,
        viewTime: realEstate.viewTime,
        paymentMethod: realEstate.paymentMethod,
        createdAt: realEstate.createdAt,
        
        // المعرفات
        cityId: realEstate.cityId,
        neighborhoodId: realEstate.neighborhoodId,
        finalCityId: realEstate.finalCityId,
        mainCategoryId: realEstate.mainCategoryId,
        subCategoryId: realEstate.subCategoryId,
        finalTypeId: realEstate.finalTypeId,
        buildingId: realEstate.buildingId,
        buildingItemId: realEstate.buildingItemId,
        
        // الأسماء (إذا كانت متوفرة)
        ...(realEstate.city && { cityName: realEstate.city.name }),
        ...(realEstate.neighborhood && { neighborhoodName: realEstate.neighborhood.name }),
        ...(realEstate.finalCity && { finalCityName: realEstate.finalCity.name }),
        ...(realEstate.mainCategory && { mainCategoryName: realEstate.mainCategory.name }),
        ...(realEstate.subCategory && { subCategoryName: realEstate.subCategory.name }),
        ...(realEstate.finalType && { finalTypeName: realEstate.finalType.name }),
        ...(realEstate.building && { buildingName: realEstate.building.title }),
        ...(realEstate.buildingItem && { buildingItemName: realEstate.buildingItem.name }),
        
        // الملفات مع الروابط
        coverImage: realEstate.coverImage,
        coverImageUrl: getFileUrl('REALESTATE', realEstate.coverImage, req),
        
        // البيانات الإضافية
        others: realEstate.others ? JSON.parse(realEstate.others) : null
    };
};

module.exports = {
    urlHelper,
    getBaseUrl,
    createResponse,
    createErrorResponse,
    formatBasicRealEstate
};