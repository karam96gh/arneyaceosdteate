// src/utils/fileMigrationHelper.js
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://62.171.153.198:4002';

// مسارات البحث للملفات القديمة
const OLD_PATHS = {
    REALESTATE: [
        'src/images/',
        'src/controllers/src/images/',
        'src/images/products/',
        'uploads/'
    ],
    ICONS: [
        'src/images/',
        'src/controllers/src/images/',
        'uploads/icons/'
    ]
};

// فحص وجود الملفات في المسارات المختلفة
const scanExistingFiles = () => {
    console.log('🔍 Scanning existing files...\n');
    
    const foundFiles = {
        realestate: [],
        icons: [],
        missing: []
    };

    // فحص ملفات العقارات
    console.log('📁 Real Estate Files:');
    OLD_PATHS.REALESTATE.forEach(searchPath => {
        const fullPath = path.join(__dirname, '..', searchPath);
        if (fs.existsSync(fullPath)) {
            try {
                const files = fs.readdirSync(fullPath);
                files.forEach(file => {
                    const filePath = path.join(fullPath, file);
                    const stats = fs.statSync(filePath);
                    if (stats.isFile() && /\.(jpg|jpeg|png|gif|webp|mp4|avi|mov)$/i.test(file)) {
                        foundFiles.realestate.push({
                            name: file,
                            path: searchPath,
                            size: stats.size,
                            modified: stats.mtime
                        });
                        console.log(`  ✅ ${file} - ${searchPath}`);
                    }
                });
            } catch (error) {
                console.log(`  ❌ Cannot read ${searchPath}: ${error.message}`);
            }
        } else {
            console.log(`  ⚠️  Path not found: ${searchPath}`);
        }
    });

    console.log('\n🎯 Icon Files:');
    OLD_PATHS.ICONS.forEach(searchPath => {
        const fullPath = path.join(__dirname, '..', searchPath);
        if (fs.existsSync(fullPath)) {
            try {
                const files = fs.readdirSync(fullPath);
                files.forEach(file => {
                    const filePath = path.join(fullPath, file);
                    const stats = fs.statSync(filePath);
                    if (stats.isFile() && /\.(jpg|jpeg|png|gif|webp)$/i.test(file)) {
                        foundFiles.icons.push({
                            name: file,
                            path: searchPath,
                            size: stats.size,
                            modified: stats.mtime
                        });
                        console.log(`  ✅ ${file} - ${searchPath}`);
                    }
                });
            } catch (error) {
                console.log(`  ❌ Cannot read ${searchPath}: ${error.message}`);
            }
        } else {
            console.log(`  ⚠️  Path not found: ${searchPath}`);
        }
    });

    return foundFiles;
};

// إنشاء تقرير الملفات الموجودة
const generateFileReport = (foundFiles) => {
    console.log('\n📊 File Report:');
    console.log('================');
    console.log(`📁 Real Estate Files: ${foundFiles.realestate.length}`);
    console.log(`🎯 Icon Files: ${foundFiles.icons.length}`);
    console.log(`❌ Missing Files: ${foundFiles.missing.length}`);

    // تفاصيل التوزيع
    console.log('\n📍 Distribution by Path:');
    const distribution = {};
    
    [...foundFiles.realestate, ...foundFiles.icons].forEach(file => {
        if (!distribution[file.path]) {
            distribution[file.path] = 0;
        }
        distribution[file.path]++;
    });

    Object.entries(distribution).forEach(([path, count]) => {
        console.log(`  ${path}: ${count} files`);
    });
};

// اختبار دالة findActualFilePath
const testFileLookup = (filename, type) => {
    console.log(`\n🧪 Testing lookup for: ${filename} (${type})`);
    
    const typeKey = type.toUpperCase();
    
    // المسار الجديد
    const newPath = path.join(__dirname, `../uploads/${type.toLowerCase()}/`, filename);
    console.log(`  🆕 New path: ${newPath}`);
    console.log(`     Exists: ${fs.existsSync(newPath)}`);

    // المسارات القديمة
    if (OLD_PATHS[typeKey]) {
        OLD_PATHS[typeKey].forEach(oldPath => {
            const fullPath = path.join(__dirname, '..', oldPath, filename);
            console.log(`  🔍 Old path: ${fullPath}`);
            console.log(`     Exists: ${fs.existsSync(fullPath)}`);
        });
    }

    // النتيجة النهائية
    const result = findActualFilePathLocal(filename, type);
    console.log(`  🎯 Final URL: ${result}`);
    
    return result;
};

// نسخة محلية من دالة البحث للاختبار
const findActualFilePathLocal = (filename, type) => {
    if (!filename) return null;
    if (filename.startsWith('http')) return filename;

    const typeKey = type.toUpperCase();
    
    // المسار الجديد
    const newPath = path.join(__dirname, `../uploads/${type.toLowerCase()}/`, filename);
    if (fs.existsSync(newPath)) {
        return `${BASE_URL}/uploads/${type.toLowerCase()}/${filename}`;
    }

    // البحث في المسارات القديمة
    if (OLD_PATHS[typeKey]) {
        for (const oldPath of OLD_PATHS[typeKey]) {
            const fullPath = path.join(__dirname, '..', oldPath, filename);
            if (fs.existsSync(fullPath)) {
                const webPath = oldPath.replace(/^src\//, '').replace(/^controllers\//, '');
                return `${BASE_URL}/${webPath}${filename}`;
            }
        }
    }

    // افتراضي
    console.warn(`File not found: ${filename} for type: ${type}`);
    return `${BASE_URL}/uploads/${type.toLowerCase()}/${filename}`;
};

// تشغيل فحص شامل
const runFullScan = () => {
    console.log('🚀 Starting Full File System Scan...\n');
    
    const foundFiles = scanExistingFiles();
    generateFileReport(foundFiles);
    
    // اختبار بعض الملفات
    console.log('\n🧪 Testing File Lookup:');
    console.log('========================');
    
    // اختبار ملف أيقونة
    testFileLookup('icon.png', 'icons');
    
    // اختبار ملف عقار (إذا وجد)
    if (foundFiles.realestate.length > 0) {
        testFileLookup(foundFiles.realestate[0].name, 'realestate');
    }
    
    console.log('\n✅ Scan completed!');
    return foundFiles;
};

// دالة مساعدة لإنشاء المجلدات الجديدة
const createNewDirectories = () => {
    const newDirs = [
        'uploads/realestate',
        'uploads/icons', 
        'uploads/properties',
        'uploads/general'
    ];

    newDirs.forEach(dir => {
        const fullPath = path.join(__dirname, '..', dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            console.log(`✅ Created directory: ${dir}`);
        } else {
            console.log(`📁 Directory exists: ${dir}`);
        }
    });
};

// إذا تم تشغيل الملف مباشرة
if (require.main === module) {
    console.log('🔧 File Migration Helper Tool');
    console.log('==============================\n');
    
    createNewDirectories();
    runFullScan();
}

module.exports = {
    scanExistingFiles,
    generateFileReport,
    testFileLookup,
    runFullScan,
    createNewDirectories,
    findActualFilePathLocal
};