// middleware/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../public/uploads');
const profileUploadDir = path.join(__dirname, '../public/uploads/profiles');
const propertyUploadDir = path.join(__dirname, '../public/uploads/properties');
const documentUploadDir = path.join(__dirname, '../public/uploads/documents');
const blogUploadDir = path.join(__dirname, '../public/uploads/blogs');
const bankGuaranteeUploadDir = path.join(__dirname, '../public/uploads/bank-guarantees');
const paymentUploadDir = path.join(__dirname, '../public/uploads/payments');

// Create directories if they don't exist
const dirs = [uploadDir, profileUploadDir, propertyUploadDir, documentUploadDir, blogUploadDir, bankGuaranteeUploadDir, paymentUploadDir];
dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Configure storage for property images
const propertyStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, propertyUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'property-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Configure storage for profile images
const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, profileUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Configure storage for documents
const documentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, documentUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'doc-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Configure storage for bank guarantees
const bankGuaranteeStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, bankGuaranteeUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'bank-guarantee-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Configure storage for payment proofs
const paymentStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, paymentUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'payment-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter for images
const imageFileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only image files are allowed'));
    }
};

// File filter for documents
const documentFileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only images, PDF, and Word documents are allowed'));
    }
};

// Create multer instances
const uploadProperty = multer({
    storage: propertyStorage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: imageFileFilter
});

const uploadProfile = multer({
    storage: profileStorage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: imageFileFilter
});

const uploadDocument = multer({
    storage: documentStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: documentFileFilter
});

const uploadBankGuarantee = multer({
    storage: bankGuaranteeStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: documentFileFilter
});

const uploadPaymentProof = multer({
    storage: paymentStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: documentFileFilter
});

// Single file upload helpers
const single = (fieldName) => {
    if (fieldName === 'profileImage') {
        return uploadProfile.single(fieldName);
    } else if (fieldName === 'document') {
        return uploadDocument.single(fieldName);
    } else if (fieldName === 'guaranteeDocument') {
        return uploadBankGuarantee.single(fieldName);
    } else if (fieldName === 'paymentProof') {
        return uploadPaymentProof.single(fieldName);
    } else if (fieldName === 'barCertificate') {
        return uploadDocument.single(fieldName);
    } else {
        return uploadProperty.single(fieldName);
    }
};

// Multiple files upload for different fields
const fields = (fieldConfigs) => {
    return uploadDocument.fields(fieldConfigs);
};

// Multiple files upload for properties
const array = (fieldName, maxCount) => {
    return uploadProperty.array(fieldName, maxCount || 10);
};

// Handle multiple images for properties
const uploadMultiple = uploadProperty.array('images', 10);

// Handle single document upload
const uploadSingleDocument = uploadDocument.single('document');

// Handle bank guarantee upload
const uploadBankGuaranteeDoc = uploadBankGuarantee.single('guaranteeDocument');

// Handle payment proof upload
const uploadPaymentProofDoc = uploadPaymentProof.single('paymentProof');

// Handle solicitor document uploads
const uploadSolicitorDocs = uploadDocument.fields([
    { name: 'barCertificate', maxCount: 1 },
    { name: 'firmRegistration', maxCount: 1 }
]);

// Export the configured middleware
module.exports = {
    upload: {
        single: single,
        array: array,
        fields: fields
    },
    uploadMultiple,
    uploadSingleDocument,
    uploadBankGuaranteeDoc,
    uploadPaymentProofDoc,
    uploadSolicitorDocs,
    uploadProperty,
    uploadProfile,
    uploadDocument,
    uploadBankGuarantee,
    uploadPaymentProof
};