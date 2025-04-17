const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const AppError = require('./utils/AppError');
const excelHandler = require('./excel-handler');

const router = express.Router();

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || './uploads';
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024; // 10MB default

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const fileExt = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExt}`;
    cb(null, fileName);
  }
});

// File filter to only allow Excel files
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream'
  ];
  
  if (allowedTypes.includes(file.mimetype) || 
      file.originalname.endsWith('.xlsx') || 
      file.originalname.endsWith('.xls')) {
    cb(null, true);
  } else {
    cb(new AppError('Only Excel files (.xlsx, .xls) are allowed', 'INVALID_FILE_TYPE', 400), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSize
  }
});

// Store active file uploads in memory
const activeUploads = new Map();

/**
 * @route POST /api/upload
 * @description Upload Excel file for processing
 */
router.post('/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 'FILE_REQUIRED', 400);
    }
    
    const fileId = path.basename(req.file.path);
    const filePath = req.file.path;
    
    // Store file info in memory
    activeUploads.set(fileId, {
      originalName: req.file.originalname,
      path: filePath,
      uploadedAt: new Date()
    });
    
    // Parse the file to validate it's a proper Excel file
    await excelHandler.parseExcelFile(filePath);
    
    res.status(200).json({
      code: 'FILE_UPLOADED',
      message: 'File uploaded successfully',
      fileId,
      originalName: req.file.originalname
    });
  } catch (error) {
    // Clean up the file if there was an error
    if (req.file && req.file.path) {
      fs.unlink(req.file.path, () => {});
    }
    next(error);
  }
});

/**
 * @route POST /api/query
 * @description Search Excel data based on criteria
 */
router.post('/query', async (req, res, next) => {
  try {
    const { fileId, searchField, searchTerms } = req.body;
    
    if (!fileId) {
      throw new AppError('File ID is required', 'FILE_ID_REQUIRED', 400);
    }
    
    if (!searchField) {
      throw new AppError('Search field is required', 'SEARCH_FIELD_REQUIRED', 400);
    }
    
    if (!searchTerms || !Array.isArray(searchTerms) || searchTerms.length === 0) {
      throw new AppError('Search terms array is required', 'SEARCH_TERMS_REQUIRED', 400);
    }
    
    // Get file info
    const fileInfo = activeUploads.get(fileId);
    if (!fileInfo) {
      throw new AppError('File not found, please upload again', 'FILE_NOT_FOUND', 404);
    }
    
    // Perform search
    const results = await excelHandler.performSearch(searchField, searchTerms, fileInfo.path);
    
    res.status(200).json({
      code: 'SEARCH_COMPLETED',
      ...results
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/export
 * @description Download search results as Excel file
 */
router.get('/export', async (req, res, next) => {
  try {
    const { fileId, searchField, searchTerms } = req.query;
    
    if (!fileId) {
      throw new AppError('File ID is required', 'FILE_ID_REQUIRED', 400);
    }
    
    if (!searchField) {
      throw new AppError('Search field is required', 'SEARCH_FIELD_REQUIRED', 400);
    }
    
    if (!searchTerms) {
      throw new AppError('Search terms are required', 'SEARCH_TERMS_REQUIRED', 400);
    }
    
    // Parse search terms from query string
    const parsedSearchTerms = searchTerms.split(',');
    
    // Get file info
    const fileInfo = activeUploads.get(fileId);
    if (!fileInfo) {
      throw new AppError('File not found, please upload again', 'FILE_NOT_FOUND', 404);
    }
    
    // Perform search to get results
    const { matchedResults } = await excelHandler.performSearch(searchField, parsedSearchTerms, fileInfo.path);
    
    if (!matchedResults || matchedResults.length === 0) {
      throw new AppError('No results to export', 'NO_RESULTS', 404);
    }
    
    // Generate Excel file
    const excelBuffer = excelHandler.generateExcelFile(matchedResults);
    
    // Generate filename with current date
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
    const filename = `search_results_${dateStr}.xlsx`;
    
    // Set headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', excelBuffer.length);
    
    // Send file
    res.status(200).send(excelBuffer);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
