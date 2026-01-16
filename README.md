# Real Estate API 🏡

**Real Estate Management System (API)** — a Node.js + Express backend using Prisma for database access, Multer for file uploads, and a modular structure of controllers, routes, and middleware to manage properties, real estate listings, cities, neighborhoods, and more.

---

## 🔧 Quick overview

- **Language / Runtime:** Node.js (>=16)
- **Framework:** Express
- **ORM:** Prisma (configured to use a SQL database via `DATABASE_URL`)
- **File uploads:** Multer (configured in `src/config/upload.js`)
- **Auth:** JWT-based middleware

---

## 🚀 Getting started

1. Clone the repo:

   git clone <repo-url>

2. Install dependencies:

   npm install

3. Set environment variables (create a `.env` file):

   - `DATABASE_URL` (e.g. `mysql://user:pass@host:port/dbname`)
   - `JWT_SECRET`
   - `NODE_ENV` (optional)
   - `PORT` (optional)

4. Generate Prisma client and run migrations (if needed):

   npm run db:generate
   npm run db:migrate
   npm run db:studio

5. Start the app:

   npm run dev   # development with nodemon
   npm start     # production

> Tip: `npm run db:seed` is configured to run a seed script if present.

---

## 📁 Project structure (key files)

Top-level files:

- `package.json` — scripts, dependencies, and metadata
- `README.md` — this file
- `vercel.json` — Vercel deployment configuration

src/ (main source folder):

- `src/app.js` — Application entry point; sets up Express, middleware, routes, and error handling.
- `src/createInitialAdmin.js` — Helper script to create an initial admin user (run manually as needed).

Config:

- `src/config/database.js` — Database manager wrapping Prisma with connection pooling, health checks, and utilities.
- `src/config/prisma.js` — Simple Prisma client instance with graceful shutdown handling.
- `src/config/upload.js` — Multer storage, allowed types, utilities (URL builders, cleanup, disk space checks), and upload middlewares for `realestate`, `icons`, `properties`, and `general`.

Controllers:

- `src/controllers/*` — One controller per domain: `authController.js`, `buildingController.js`, `buildingItemController.js`, `citiesController.js`, `dashboardController.js`, `filePropertyController.js`, `filesController.js`, `finalCityController.js`, `finalTypeController.js`, `mainTypeController.js`, `neighborhoodsController.js`, `propertiesController.js`, `realestateController.js`, `reservationsController.js`, `subtypeController.js`, plus upload/file image helpers such as `upload_file.js` and `uploadImage_controller.js`.

Middleware:

- `src/middleware/auth.js` — Authentication checks and route protection.
- `src/middleware/preserveUser.js` — Extracts/validates user from JWT and attaches to requests.

Prisma:

- `src/prisma/schema.prisma` — Prisma schema and model definitions (DB schema).

Routes:

- `src/routes/*` — Route definitions that map HTTP endpoints to controllers (e.g., `authRoutes.js`, `propertyRoutes.js`, `realestateRoutes.js`, `uploadImage.js`, etc.).

Static & Uploads:

- `src/images/` — Static image assets used by the app (icons etc.).
- `src/uploads/` — Runtime upload directories (organized under `general/`, `icons/`, `properties/`, `realestate/`). These folders are created automatically by the upload configuration.

Misc:

- `src/controllers/src/images/` — Additional image asset folders referenced by controllers.

---

## ✅ Notable features

- Robust file upload handling with type restrictions, storage strategies, URL builders, disk-space monitoring, and automatic cleanup.
- Database management via Prisma with connection and health check wrappers.
- Clear separation of concerns: routes → controllers → services / config.
- A set of management scripts (`createInitialAdmin.js`, DB scripts) to simplify ops.

---

## 🔐 Environment & Security

- Keep `JWT_SECRET` and `DATABASE_URL` in secure environment variables (do NOT commit `.env` to source control).
- Use production-ready database credentials and enable TLS if required by your provider.

---

## ✅ Contributing

- Fork, create a feature branch, add tests, and open a PR.
- Follow linting rules (`npm run lint`) and formatting (`npm run format`).

---

## 📄 License

This project is licensed under the MIT License. See `LICENSE` for details.

---

## 📚 Database models

A high-level description of the Prisma models defined in `src/prisma/schema.prisma` and their key fields:

- **City** — stores cities. Key fields: `id`, `name`, `createdAt`, `updatedAt`. Relations: `neighborhoods`, `realEstates`.
- **Neighborhood** — city neighborhoods. Key fields: `id`, `name`, `cityId`. Relations: `finalCities`, `realEstates`.
- **FinalCity** — fine-grained city locations within a neighborhood. Key fields: `id`, `name`, `location`, `neighborhoodId`.
- **MainType** — main categories (e.g., sale/rent categories). Key fields: `id`, `name`, `icon`.
- **SubType** — subtype under a main type. Key fields: `id`, `name`, `mainId`.
- **FinalType** — final category used by listings. Key fields: `id`, `name`, `subId`. Relations: `properties`, `realEstates`.
- **Building** — building records. Key fields: `id`, `title`, `status`, `location`, `companyId`.
- **BuildingItem** — units or items inside a building (apartment/shop/etc.). Key fields: `id`, `name`, `price`, `area`, `type`, `buildingId`, `companyId`.
- **RealEstate** — the main listing entity. Key fields: `id`, `cityId`, `neighborhoodId`, `price`, `title`, `finalTypeId`, `coverImage`, `companyId`, `location`, `description`. Relations: `files`, `propertyValues`, `building`, `buildingItem`, `company`.
- **File** — uploaded files for listings. Key fields: `id`, `name`, `realestateId`.
- **Property** — metadata about properties/features per `FinalType` (e.g., bedrooms, bathrooms). Key fields: `id`, `finalTypeId`, `propertyKey`, `propertyName`, `dataType`, `allowedValues`.
- **PropertyValue** — values of properties assigned to a listing. Key fields: `id`, `realEstateId`, `propertyId`, `value`.
- **User** — application user (normal, company, admin). Key fields: `id`, `username`, `password`, `fullName`, `email`, `phone`, `role`, `companyName`, `vipExpiryDate`.
- **Reservation** — visit/reservation requests. Key fields: `id`, `propertyId`, `userId`, `companyId`, `status`, `visitDate`, `visitTime`.

Enums (selection): `UserRole`, `ReservationStatus`, `BuildingStatus`, `BuildingItemType`, `PropertyDataType`.

---

## 🔧 Key functions & utilities

Here's a concise guide to the project’s important functions and how to use them:

- `src/config/database.js` (dbManager singleton)
  - `initialize()` — connect Prisma with pooling and start health checks.
  - `healthCheck()` — run a simple query to verify DB connection.
  - `disconnect()` — graceful disconnect.
  - `getPrisma()` — get the Prisma client instance.
  - `transaction(callback)` — perform transactional operations.
  - `rawQuery(query, params)` — execute raw SQL safely.
  - `batch(operations)` — execute a Prisma transaction batch.

- `src/config/prisma.js`
  - `prisma` — a configured PrismaClient instance exported for direct use when simple usage is enough.

- `src/config/upload.js`
  - URL builders: `buildRealEstateFileUrl(filename)`, `buildIconUrl(filename)`, `buildPropertyFileUrl(propertyKey, filename)`, `buildGeneralFileUrl(filename)`, `getFileUrl(uploadType, filename)`.
  - File utilities: `deleteFile(filePath)`, `cleanupOldFiles(directory, maxAgeInDays)`, `getFolderSize(directory)`, `formatFileSize(bytes)`.
  - Multer helpers: `createStorage(uploadType, subfolder)`, `createFileFilter(allowedTypes)`, `createUploadMiddleware(uploadType, allowedTypes, maxSize)`.
  - Middlewares: `uploadMiddlewares` (available: `realEstate`, `icons`, `properties`, `general`), `checkDiskSpace`, `uploadErrorHandler`.

- Middleware (auth helpers in `src/middleware/auth.js`)
  - `requireAuth(req, res, next)` — verifies JWT and attaches `req.user`.
  - `requireRole(roles)` — enforces role-based access control.
  - `requirePropertyOwnership(req, res, next)` / `requireBuildingOwnership(...)` / `requireBuildingItemOwnership(...)` — ownership checks for resources.
  - `extractToken(req)` — helper to pull token from header/query.

- Controllers (common exported actions)
  - `authController` — `login`, `register`, `getMe`, `getUsers`.
  - `propertiesController` — `getAllProperties`, `getPropertiesByFinalType`, `getFilterProperties`, `getPropertyById`, `createProperty`, `bulkCreateProperties`, `updateProperty`, `deleteProperty`.
  - `realestateController` — `getAllRealEstate`, `getRealEstateById`, `addRealEstate`, `updateRealEstate`, `deleteRealEstate` (also uses `uploadMiddlewares.realEstate` for file uploads).
  - Upload helpers/controllers — `uploadImage`, `uploadFile` and small helpers to store and return file URLs.
  - Other controllers (`citiesController`, `neighborhoodsController`, `buildingController`, `buildingItemController`, `reservationsController`, `dashboardController`, etc.) follow similar CRUD patterns (list, get, create, update, delete) and include domain-specific utilities and validations.

---

## 📤 رفع ملفات الخصائص (Property Files)

بعض الخصائص من نوع `FILE` (مثل `blueprints_pdf`, `purchase_agreement_pdf`, `payment_plan_pdf`) تحتاج إلى رفع ملفات PDF أو مستندات.

### ✅ الطريقة الموصى بها: رفع الملفات مع بيانات العقار

يمكنك رفع ملفات الخصائص مباشرة مع بيانات إضافة العقار في نفس الطلب:

```javascript
const formData = new FormData();

// بيانات العقار الأساسية
formData.append('title', 'شقة للبيع');
formData.append('price', '50000');
formData.append('cityId', '1');
// ... باقي البيانات

// صورة الغلاف والملفات الإضافية
formData.append('coverImage', coverImageFile);
formData.append('files', imageFile1);
formData.append('files', imageFile2);

// خصائص عادية (نصية، رقمية)
formData.append('properties[bedrooms]', '3');
formData.append('properties[bathrooms]', '2');

// ✅ ملفات الخصائص الديناميكية - فقط أضفها مباشرة باسم الخاصية!
formData.append('blueprints_pdf', blueprintsPdfFile);
formData.append('purchase_agreement_pdf', agreementPdfFile);
formData.append('payment_plan_pdf', paymentPlanPdfFile);

// إرسال الطلب
const response = await fetch('/api/realestate', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const { data } = await response.json();
// الآن العقار تم إنشاؤه مع جميع الملفات!
```

**كيف يعمل:**
- الـ API يقبل أي ملفات ديناميكية تُرسل
- يتحقق تلقائياً من وجود خاصية بنفس الاسم ونوع `FILE` في قاعدة البيانات
- يحفظ الملف ومعلوماته تلقائياً
- لا حاجة لطلبات منفصلة!

---

### 📌 طريقة بديلة: رفع الملفات بعد إنشاء العقار

إذا كنت تريد رفع الملفات بعد إنشاء العقار، يمكنك استخدام الـ API المخصص:

### 1. رفع ملف لخاصية معينة

**Endpoint:** `POST /api/properties/files/:realEstateId/:propertyId/upload`

**مثال باستخدام FormData:**

```javascript
const formData = new FormData();
formData.append('file', pdfFile); // File object

fetch(`https://eqraat.com/api/properties/files/${realEstateId}/${propertyId}/upload`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('File uploaded:', data.fileInfo);
  // data.fileInfo.path سيحتوي على الرابط الكامل للملف
});
```

**الاستجابة:**
```json
{
  "message": "File uploaded successfully",
  "fileInfo": {
    "fileName": "1737087081419-blueprints_pdf.pdf",
    "originalName": "floor-plan.pdf",
    "size": 524288,
    "path": "https://eqraat.com/api/images/properties/blueprints_pdf/1737087081419-blueprints_pdf.pdf"
  }
}
```

### 2. الحصول على معلومات ملف خاصية

**Endpoint:** `GET /api/properties/files/:realEstateId/:propertyId`

```javascript
fetch(`https://eqraat.com/api/properties/files/${realEstateId}/${propertyId}`, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(response => response.json())
.then(data => {
  console.log('Download URL:', data.fileInfo.downloadUrl);
});
```

### 3. حذف ملف خاصية

**Endpoint:** `DELETE /api/properties/files/:realEstateId/:propertyId`

### 4. الحصول على جميع ملفات الخصائص لعقار

**Endpoint:** `GET /api/properties/files/:realEstateId`

**الاستجابة:**
```json
[
  {
    "propertyId": 605,
    "propertyKey": "blueprints_pdf",
    "propertyName": "خرائط وتصاميمpdf",
    "groupName": "المستندات",
    "fileInfo": {
      "fileName": "1737087081419-blueprints_pdf.pdf",
      "originalName": "floor-plan.pdf",
      "size": 524288,
      "downloadUrl": "https://eqraat.com/api/images/properties/blueprints_pdf/1737087081419-blueprints_pdf.pdf"
    }
  }
]
```

### ⚠️ ملاحظات مهمة

1. **✅ يمكنك رفع ملفات الخصائص مباشرة مع بيانات العقار** - استخدم اسم الخاصية كـ fieldname
2. **الملفات الديناميكية**: أي ملف يُرسل باسم مختلف عن `coverImage` و `files` سيُعامل كملف خاصية
3. **التحقق التلقائي**: الـ API يتحقق من وجود الخاصية ونوعها `FILE` قبل الحفظ
4. **الأنواع المسموحة:** حسب إعدادات `allowedValues` للخاصية في قاعدة البيانات
5. **الحد الأقصى لحجم الملف:** 10MB للعقارات (حسب إعدادات Multer)

---

If you'd like, I can expand the file descriptions with examples of key methods, update badges, or generate a simple API reference from the routes — tell me which you'd prefer next! ✨