// Global variables
let excelData = [];
let matchedResults = []; // Store matched results for download
let matchedQueries = []; // Store queries that matched at least one article
let unmatchedQueries = []; // Store queries that didn't match any article
let originalHeaders = []; // Store original headers from uploaded Excel file
let headerMapping = {}; // Map between internal column names and original headers

// DOM elements
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const searchSection = document.getElementById('searchSection');
const resultsSection = document.getElementById('resultsSection');
const searchBtn = document.getElementById('searchBtn');
const searchType = document.getElementById('searchType');
const searchInput = document.getElementById('searchInput');
const noMatchesFound = document.getElementById('noMatchesFound');
const unmatchedSection = document.getElementById('unmatchedSection');
const unmatchedInputs = document.getElementById('unmatchedInputs');
const matchedInputs = document.getElementById('matchedInputs');
const debugBtn = document.getElementById('debugBtn');
const debugOutput = document.getElementById('debugOutput');
const downloadBtn = document.getElementById('downloadBtn');
const matchedCount = document.getElementById('matchedCount');
const unmatchedCount = document.getElementById('unmatchedCount');
const matchedTable = document.getElementById('matchedTable');

// File input event listener
fileInput.addEventListener('change', handleFileUpload);

// Search button event listener
searchBtn.addEventListener('click', performSearch);

// Download button event listener
downloadBtn.addEventListener('click', downloadResults);

// Debug button event listener
debugBtn.addEventListener('click', function() {
    debugOutput.classList.toggle('hidden');
    
    if (!debugOutput.classList.contains('hidden')) {
        // Show debug information
        let debugHtml = '<h3>Debug Information</h3>';
        
        // Check if data is loaded
        if (excelData.length === 0) {
            debugHtml += '<p>No Excel data loaded yet!</p>';
        } else {
            debugHtml += `<p>Loaded ${excelData.length} records</p>`;
            
            // Show first 5 records
            debugHtml += '<p><strong>First 5 Records:</strong></p>';
            debugHtml += '<ol>';
            for (let i = 0; i < Math.min(5, excelData.length); i++) {
                const item = excelData[i];
                debugHtml += `<li>ref_article: "${item.ref_article || 'undefined'}", designation: "${item.designation || 'undefined'}"</li>`;
            }
            debugHtml += '</ol>';
            
            // Test search for common values
            const testTerms = ['4S', 'TRANSPARENT', 'XLSPH1104'];
            debugHtml += '<p><strong>Test Searches:</strong></p>';
            debugHtml += '<ul>';
            
            testTerms.forEach(term => {
                const matches = excelData.filter(item => 
                    (item.ref_article && item.ref_article.toString().toLowerCase().includes(term.toLowerCase())) ||
                    (item.designation && item.designation.toString().toLowerCase().includes(term.toLowerCase()))
                );
                debugHtml += `<li>Search for "${term}": ${matches.length} matches</li>`;
            });
            
            debugHtml += '</ul>';
        }
        
        debugOutput.innerHTML = debugHtml;
    }
});

// Function to download results as Excel
function downloadResults() {
    if (!matchedResults || matchedResults.length === 0) {
        alert('No results to download');
        return;
    }
    
    try {
        // Create a new workbook
        const wb = XLSX.utils.book_new();
        
        // If we have the original headers, convert the matched results to use them
        if (originalHeaders.length > 0) {
            // Create a new array with the original header names
            const resultsWithOriginalHeaders = matchedResults.map(item => {
                const newItem = {};
                // Map each property to its original header name
                Object.keys(item).forEach(key => {
                    const originalHeader = headerMapping[key] || key;
                    newItem[originalHeader] = item[key];
                });
                return newItem;
            });
            
            // Convert to worksheet with original headers preserved
            const ws = XLSX.utils.json_to_sheet(resultsWithOriginalHeaders);
            XLSX.utils.book_append_sheet(wb, ws, 'SearchResults');
        } else {
            // If no original headers available, use the default conversion
            const ws = XLSX.utils.json_to_sheet(matchedResults);
            XLSX.utils.book_append_sheet(wb, ws, 'SearchResults');
        }
        
        // Generate download with current date in filename
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
        XLSX.writeFile(wb, `search_results_${dateStr}.xlsx`);
    } catch (error) {
        console.error('Error creating Excel file:', error);
        alert('Error creating Excel file: ' + error.message);
    }
}

/**
 * Handle Excel file upload and processing
 */
function handleFileUpload(e) {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Display file name
    fileName.textContent = `Selected file: ${file.name}`;
    fileName.classList.add('file-uploading');
    
    // Read the Excel file
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Get sheet names
            const sheetNames = workbook.SheetNames;
            console.log("Sheet names:", sheetNames);
            
            // Process all sheets and combine the data
            excelData = [];
            originalHeaders = []; // Reset original headers
            headerMapping = {}; // Reset header mapping
            
            for (const sheetName of sheetNames) {
                console.log(`Processing sheet: ${sheetName}`);
                const sheet = workbook.Sheets[sheetName];
                
                // Log sheet range
                const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
                console.log(`Sheet range: ${sheet['!ref']}, rows: ${range.e.r - range.s.r + 1}, cols: ${range.e.c - range.s.c + 1}`);
                
                // Get all rows from this sheet
                const sheetRows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                console.log(`Raw row count for ${sheetName}: ${sheetRows.length}`);
                
                // Skip completely empty rows but don't filter based on specific columns
                const nonEmptyRows = sheetRows.filter(row => row.some(cell => cell !== ''));
                console.log(`Non-empty rows for ${sheetName}: ${nonEmptyRows.length}`);
                
                // Store original headers if this is the first sheet we process
                if (originalHeaders.length === 0 && nonEmptyRows.length > 0) {
                    originalHeaders = nonEmptyRows[0].map(header => header ? String(header) : '');
                    console.log("Original headers:", originalHeaders);
                }
                
                // Determine column indices (default to B=1 and C=2 if can't detect)
                let refArticleIndex = 1; // Default to column B
                let designationIndex = 2; // Default to column C
                
                // Check if first row contains headers
                if (nonEmptyRows.length > 0) {
                    const headers = nonEmptyRows[0];
                    for (let i = 0; i < headers.length; i++) {
                        const header = String(headers[i] || '').toLowerCase().trim();
                        if (header.includes('ref') || header.includes('article')) {
                            refArticleIndex = i;
                            console.log(`Found ref_article in column ${i}`);
                        } else if (header.includes('des') || header.includes('designation')) {
                            designationIndex = i;
                            console.log(`Found designation in column ${i}`);
                        }
                    }
                }
                
                // Create mapping between our column names and original headers
                headerMapping = {
                    'ref_article': originalHeaders[refArticleIndex] || 'ref_article',
                    'designation': originalHeaders[designationIndex] || 'designation'
                };
                
                // Add mappings for other columns
                for (let i = 0; i < originalHeaders.length; i++) {
                    if (i !== refArticleIndex && i !== designationIndex) {
                        headerMapping[`column_${i}`] = originalHeaders[i] || `column_${i}`;
                    }
                }
                
                console.log("Header mapping:", headerMapping);
                
                // Process all rows including those with partial data
                // Skip the first row if it contains headers
                const startRow = nonEmptyRows.length > 0 && 
                                typeof nonEmptyRows[0][0] === 'string' && 
                                nonEmptyRows[0][refArticleIndex] && 
                                String(nonEmptyRows[0][refArticleIndex]).toLowerCase().includes('ref') ? 1 : 0;
                
                for (let i = startRow; i < nonEmptyRows.length; i++) {
                    const row = nonEmptyRows[i];
                    
                    // Create an item for each row, don't skip any rows even if ref_article or designation is missing
                    const item = {
                        ref_article: row[refArticleIndex] !== undefined ? String(row[refArticleIndex]) : '',
                        designation: row[designationIndex] !== undefined ? String(row[designationIndex]) : ''
                    };
                    
                    // Add all other columns
                    for (let j = 0; j < row.length; j++) {
                        if (j !== refArticleIndex && j !== designationIndex) {
                            const columnName = `column_${j}`;
                            item[columnName] = String(row[j] || '');
                        }
                    }
                    
                    excelData.push(item);
                }
            }
            
            // Show data sample for verification
            console.log(`Total records loaded: ${excelData.length}`);
            console.log("Sample data (first 5 records):", excelData.slice(0, 5));
            
            // Debug specific record references
            console.log("Records with '4S':", excelData.filter(item => 
                item.ref_article && item.ref_article.toLowerCase().includes('4s')).length);
            console.log("Records with 'XLSPH':", excelData.filter(item => 
                item.ref_article && item.ref_article.toLowerCase().includes('xlsph')).length);
            
            // Initialize search functionality
            if (excelData.length > 0) {
                // Show search section
                searchSection.classList.remove('hidden');
                
                // Create a data summary in the UI
                const dataPreview = document.createElement('div');
                dataPreview.className = 'mt-2 text-xs text-gray-500 overflow-auto max-h-20';
                dataPreview.innerHTML = `<strong>Data loaded:</strong> ${excelData.length} records from ${sheetNames.length} sheet(s)`;
                fileName.parentNode.appendChild(dataPreview);
                
                // Remove uploading animation
                fileName.classList.remove('file-uploading');
                fileName.textContent = `Loaded: ${file.name}`;
                
                // Clear previous search results
                resetResults();
            } else {
                fileName.textContent = `Error: No valid data found in the Excel file`;
                fileName.classList.remove('file-uploading');
            }
            
        } catch (error) {
            fileName.textContent = `Error: ${error.message}`;
            fileName.classList.remove('file-uploading');
            console.error('Error processing Excel file:', error);
        }
    };
    
    reader.onerror = function() {
        fileName.textContent = 'Error reading the file';
        fileName.classList.remove('file-uploading');
    };
    
    reader.readAsArrayBuffer(file);
}

/**
 * Parse input text into an array of search terms, handling both commas and line breaks
 */
function parseSearchTerms(input) {
    if (!input) return [];
    
    // Replace line breaks with commas, then split by comma
    const normalized = input.replace(/\n/g, ',');
    
    return normalized.split(',')
        .map(term => term.trim())
        .filter(term => term.length > 0);
}

/**
 * Perform search based on user input
 */
function performSearch() {
    resetResults();
    
    // Get the selected search type
    const selectedType = searchType.value; // 'ref_article' or 'designation'
    const searchTerms = parseSearchTerms(searchInput.value);
    
    if (searchTerms.length === 0) {
        alert('Please enter at least one search term');
        return;
    }
    
    if (!excelData || excelData.length === 0) {
        alert('Please upload an Excel file first');
        return;
    }
    
    console.log(`Searching in ${selectedType} for terms:`, searchTerms);
    
    // Reset query tracking arrays
    matchedQueries = [];
    unmatchedQueries = [];
    matchedResults = [];
    
    // Perform search based on selected type
    if (selectedType === 'ref_article') {
        // Search for each term individually to track which ones matched
        searchTerms.forEach(term => {
            const result = searchSingleTerm(term, 'ref_article');
            
            if (result.matches.length > 0) {
                matchedQueries.push(term);
                // Add unique results to matchedResults array
                result.matches.forEach(item => {
                    // Check if this item is already in matchedResults
                    const exists = matchedResults.some(existing => 
                        existing.ref_article === item.ref_article);
                    
                    if (!exists) {
                        matchedResults.push(item);
                    }
                });
            } else {
                unmatchedQueries.push(term);
            }
        });
    } else {
        // Search in designation field
        searchTerms.forEach(term => {
            const result = searchSingleTerm(term, 'designation');
            
            if (result.matches.length > 0) {
                matchedQueries.push(term);
                // Add unique results to matchedResults array
                result.matches.forEach(item => {
                    // Check if this item is already in matchedResults
                    const exists = matchedResults.some(existing => 
                        existing.ref_article === item.ref_article);
                    
                    if (!exists) {
                        matchedResults.push(item);
                    }
                });
            } else {
                unmatchedQueries.push(term);
            }
        });
    }
    
    // Show results
    resultsSection.classList.remove('hidden');
    
    // Display matched and unmatched query lists
    displayMatchedQueries(matchedQueries, searchTerms.length);
    displayUnmatchedQueries(unmatchedQueries, searchTerms.length);
}

/**
 * Search for a single term in the specified field
 */
function searchSingleTerm(term, field) {
    const matches = [];
    
    // Clean and normalize the search term
    const cleanTerm = term.trim().toLowerCase();
    console.log(`Searching for ${field}: "${cleanTerm}"`);
    
    // 1. Try exact match first (case insensitive)
    const exactMatches = excelData.filter(item => {
        if (!item[field]) return false;
        const itemValue = item[field].toString().trim().toLowerCase();
        return itemValue === cleanTerm;
    });
    
    if (exactMatches.length > 0) {
        console.log(`Found ${exactMatches.length} exact matches for "${cleanTerm}"`);
        matches.push(...exactMatches);
    } else {
        // 2. Try startsWith match
        const startsWithMatches = excelData.filter(item => {
            if (!item[field]) return false;
            const itemValue = item[field].toString().trim().toLowerCase();
            return itemValue.startsWith(cleanTerm);
        });
        
        if (startsWithMatches.length > 0) {
            console.log(`Found ${startsWithMatches.length} startsWith matches for "${cleanTerm}"`);
            matches.push(...startsWithMatches);
        } else {
            // 3. Try contains match
            const containsMatches = excelData.filter(item => {
                if (!item[field]) return false;
                const itemValue = item[field].toString().trim().toLowerCase();
                return itemValue.includes(cleanTerm);
            });
            
            if (containsMatches.length > 0) {
                console.log(`Found ${containsMatches.length} contains matches for "${cleanTerm}"`);
                matches.push(...containsMatches);
            } else {
                // 4. For multiword searches, try word matching
                if (cleanTerm.includes(' ')) {
                    const words = cleanTerm.split(' ').filter(w => w.length > 2);
                    
                    if (words.length > 0) {
                        const wordMatches = excelData.filter(item => {
                            if (!item[field]) return false;
                            const itemValue = item[field].toString().trim().toLowerCase();
                            
                            return words.some(word => itemValue.includes(word));
                        });
                        
                        if (wordMatches.length > 0) {
                            console.log(`Found ${wordMatches.length} word matches for "${cleanTerm}"`);
                            matches.push(...wordMatches);
                        }
                    }
                }
            }
        }
    }
    
    return { term, matches };
}

/**
 * Display matched query terms
 */
function displayMatchedQueries(matched, totalQueries) {
    if (matched.length === 0) {
        noMatchesFound.classList.remove('hidden');
        matchedCount.textContent = 'No matches found';
        downloadBtn.classList.add('hidden');
        return;
    }
    
    // Update matched count
    matchedCount.textContent = `Matched Inputs: ${matched.length}/${totalQueries}`;
    
    // Display matched queries
    matchedInputs.innerHTML = '';
    matched.forEach(query => {
        const div = document.createElement('div');
        div.className = 'matched-item p-2 bg-green-50 border-l-4 border-green-500 rounded';
        div.textContent = query;
        matchedInputs.appendChild(div);
    });
    
    // Show download button if there are matched results
    if (matchedResults.length > 0) {
        downloadBtn.classList.remove('hidden');
    } else {
        downloadBtn.classList.add('hidden');
    }
}

/**
 * Display unmatched queries
 */
function displayUnmatchedQueries(unmatched, totalQueries) {
    if (unmatched.length === 0) {
        unmatchedSection.classList.add('hidden');
        return;
    }
    
    unmatchedSection.classList.remove('hidden');
    unmatchedCount.textContent = `Unmatched Inputs: ${unmatched.length}/${totalQueries}`;
    
    unmatchedInputs.innerHTML = '';
    unmatched.forEach(query => {
        const div = document.createElement('div');
        div.className = 'unmatched-item p-2 bg-red-50 border-l-4 border-red-500 rounded';
        div.textContent = query;
        unmatchedInputs.appendChild(div);
    });
}

/**
 * Reset search results
 */
function resetResults() {
    matchedResults = [];
    matchedQueries = [];
    unmatchedQueries = [];
    matchedInputs.innerHTML = '';
    unmatchedInputs.innerHTML = '';
    downloadBtn.classList.add('hidden');
    noMatchesFound.classList.add('hidden');
    unmatchedSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
}
