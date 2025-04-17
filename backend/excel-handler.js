const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const AppError = require('./utils/AppError');
const { LRUCache } = require('lru-cache');

// Initialize LRU cache for query results
const cacheMaxItems = parseInt(process.env.CACHE_MAX_ITEMS) || 100;
const queryCache = new LRUCache({
  max: cacheMaxItems,
  ttl: 1000 * 60 * 60, // 1 hour cache TTL
});

/**
 * Parse Excel file using streams to minimize memory usage
 * @param {string} filePath - Path to the Excel file
 * @returns {Promise<Object>} - Parsed Excel data with headers and rows
 */
async function parseExcelFile(filePath) {
  try {
    // Read file as a buffer
    const fileBuffer = fs.readFileSync(filePath);
    
    // Parse workbook
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    
    // Process all sheets and combine the data
    let excelData = [];
    let originalHeaders = [];
    let headerMapping = {};
    
    // Get sheet names
    const sheetNames = workbook.SheetNames;
    
    for (const sheetName of sheetNames) {
      const sheet = workbook.Sheets[sheetName];
      
      // Get all rows from this sheet
      const sheetRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
      
      // Skip completely empty rows
      const nonEmptyRows = sheetRows.filter(row => row.some(cell => cell !== ''));
      
      // Store original headers if this is the first sheet we process
      if (originalHeaders.length === 0 && nonEmptyRows.length > 0) {
        originalHeaders = nonEmptyRows[0].map(header => header ? String(header) : '');
        
        // Create header mapping (normalized to internal names)
        originalHeaders.forEach((header, index) => {
          // Create a safe internal column name
          const internalName = `col_${index}`;
          headerMapping[internalName] = header;
        });
      }
      
      // Skip the first row (headers) and process data rows
      if (nonEmptyRows.length > 1) {
        const dataRows = nonEmptyRows.slice(1);
        
        // Convert rows to objects with normalized column names
        const processedRows = dataRows.map(row => {
          const rowObj = {};
          row.forEach((cell, index) => {
            // Use internal column name
            const internalName = `col_${index}`;
            rowObj[internalName] = cell;
          });
          return rowObj;
        });
        
        // Add processed rows to the combined data
        excelData = excelData.concat(processedRows);
      }
    }
    
    return {
      data: excelData,
      headers: originalHeaders,
      headerMapping
    };
  } catch (error) {
    throw new AppError(
      `Failed to parse Excel file: ${error.message}`,
      'EXCEL_PARSE_ERROR',
      500
    );
  }
}

/**
 * Normalize text by removing diacritical marks and converting to lowercase
 * @param {string} text - Text to normalize
 * @returns {string} - Normalized text
 */
function normalizeText(text) {
  if (!text) return '';
  return String(text).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/**
 * Check if two strings match using flexible criteria
 * @param {string} source - Source text
 * @param {string} target - Target text to match against
 * @param {string} matchType - Type of matching (contains, exact)
 * @returns {boolean} - Whether the strings match
 */
function flexibleMatch(source, target, matchType = 'contains') {
  if (!source || !target) return false;
  
  const normalizedSource = normalizeText(source);
  const normalizedTarget = normalizeText(target);
  
  if (matchType === 'exact') {
    return normalizedSource === normalizedTarget;
  } else {
    // Default to 'contains'
    return normalizedSource.includes(normalizedTarget) || normalizedTarget.includes(normalizedSource);
  }
}

/**
 * Check if two words are similar (simple implementation)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {boolean} - Whether the words are similar
 */
function areSimilarWords(str1, str2) {
  if (!str1 || !str2) return false;
  
  // Normalize both strings
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  
  // If either string is very short, require exact match
  if (s1.length <= 2 || s2.length <= 2) {
    return s1 === s2;
  }
  
  // Calculate allowed distance based on string length
  const maxLength = Math.max(s1.length, s2.length);
  const allowedDistance = Math.floor(maxLength * 0.3); // Allow 30% difference
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(s1, s2);
  
  return distance <= allowedDistance;
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - Levenshtein distance
 */
function levenshteinDistance(a, b) {
  const matrix = [];
  
  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Search for a term in the specified field
 * @param {string} term - Search term
 * @param {string} field - Field to search in
 * @param {Array} data - Data to search
 * @param {Object} headerMapping - Mapping between internal column names and original headers
 * @returns {Array} - Matched results
 */
function searchSingleTerm(term, field, data, headerMapping) {
  if (!term || !field || !data || !data.length) {
    return [];
  }
  
  const normalizedTerm = normalizeText(term);
  
  // Find the internal column name that maps to the requested field
  let targetColumn = null;
  for (const [internalName, originalHeader] of Object.entries(headerMapping)) {
    if (originalHeader.toLowerCase() === field.toLowerCase()) {
      targetColumn = internalName;
      break;
    }
  }
  
  if (!targetColumn) {
    // If exact field name not found, try to find a similar one
    for (const [internalName, originalHeader] of Object.entries(headerMapping)) {
      if (flexibleMatch(originalHeader, field)) {
        targetColumn = internalName;
        break;
      }
    }
  }
  
  if (!targetColumn) {
    throw new AppError(
      `Field "${field}" not found in the Excel file`,
      'FIELD_NOT_FOUND',
      400
    );
  }
  
  // Search for matches
  return data.filter(item => {
    const cellValue = item[targetColumn];
    if (!cellValue) return false;
    
    const normalizedCell = normalizeText(cellValue);
    
    // Try exact match first
    if (normalizedCell === normalizedTerm) {
      return true;
    }
    
    // Then try contains match
    if (normalizedCell.includes(normalizedTerm) || normalizedTerm.includes(normalizedCell)) {
      return true;
    }
    
    // Finally try similarity match for longer terms
    if (normalizedTerm.length > 3 && areSimilarWords(normalizedCell, normalizedTerm)) {
      return true;
    }
    
    return false;
  });
}

/**
 * Perform search based on user input
 * @param {string} searchField - Field to search in
 * @param {Array} searchTerms - Array of search terms
 * @param {string} filePath - Path to the Excel file
 * @returns {Promise<Object>} - Search results with matched and unmatched queries
 */
async function performSearch(searchField, searchTerms, filePath) {
  try {
    // Generate cache key
    const cacheKey = `${filePath}:${searchField}:${searchTerms.join(',')}`;
    
    // Check cache first
    const cachedResult = queryCache.get(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }
    
    // Parse Excel file if not in cache
    const { data, headers, headerMapping } = await parseExcelFile(filePath);
    
    // Initialize results
    const matchedResults = [];
    const matchedQueries = [];
    const unmatchedQueries = [];
    
    // Process each search term
    for (const term of searchTerms) {
      if (!term.trim()) continue;
      
      const matches = searchSingleTerm(term, searchField, data, headerMapping);
      
      if (matches.length > 0) {
        // Convert internal column names back to original headers for the response
        const formattedMatches = matches.map(item => {
          const formattedItem = {};
          Object.entries(item).forEach(([internalName, value]) => {
            const originalHeader = headerMapping[internalName] || internalName;
            formattedItem[originalHeader] = value;
          });
          return formattedItem;
        });
        
        matchedResults.push(...formattedMatches);
        matchedQueries.push(term);
      } else {
        unmatchedQueries.push(term);
      }
    }
    
    // Remove duplicates from matched results
    const uniqueResults = [];
    const seen = new Set();
    
    for (const item of matchedResults) {
      // Create a key for deduplication (using the first column value)
      const key = Object.values(item)[0];
      if (!seen.has(key)) {
        seen.add(key);
        uniqueResults.push(item);
      }
    }
    
    const result = {
      matchedResults: uniqueResults,
      matchedQueries,
      unmatchedQueries,
      headers
    };
    
    // Cache the result
    queryCache.set(cacheKey, result);
    
    return result;
  } catch (error) {
    throw new AppError(
      `Search failed: ${error.message}`,
      error.code || 'SEARCH_ERROR',
      error.statusCode || 500
    );
  }
}

/**
 * Generate Excel file from search results
 * @param {Array} data - Data to export
 * @returns {Buffer} - Excel file buffer
 */
function generateExcelFile(data) {
  try {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Convert to worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'SearchResults');
    
    // Generate Excel file as buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    
    return buffer;
  } catch (error) {
    throw new AppError(
      `Failed to generate Excel file: ${error.message}`,
      'EXCEL_GENERATION_ERROR',
      500
    );
  }
}

module.exports = {
  parseExcelFile,
  performSearch,
  generateExcelFile
};
