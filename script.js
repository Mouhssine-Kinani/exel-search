// Global variables
let excelData = [];
let fuseRefArticle = null;
let fuseDesignation = null;

// DOM elements
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const searchSection = document.getElementById('searchSection');
const resultsSection = document.getElementById('resultsSection');
const searchBtn = document.getElementById('searchBtn');
const refArticleInput = document.getElementById('refArticle');
const designationInput = document.getElementById('designation');
const tableHeader = document.getElementById('tableHeader');
const tableBody = document.getElementById('tableBody');
const noMatchesFound = document.getElementById('noMatchesFound');
const unmatchedSection = document.getElementById('unmatchedSection');
const unmatchedInputs = document.getElementById('unmatchedInputs');
const debugBtn = document.getElementById('debugBtn');
const debugOutput = document.getElementById('debugOutput');

// File input event listener
fileInput.addEventListener('change', handleFileUpload);

// Search button event listener
searchBtn.addEventListener('click', performSearch);

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
 * Perform search based on user input
 */
function performSearch() {
    resetResults();
    
    const refArticles = refArticleInput.value.split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);
    
    const designations = designationInput.value.split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0);
    
    if (refArticles.length === 0 && designations.length === 0) {
        alert('Please enter at least one reference article or designation');
        return;
    }
    
    if (!excelData || excelData.length === 0) {
        alert('Please upload an Excel file first');
        return;
    }
    
    console.log("Searching for ref_articles:", refArticles);
    console.log("Searching for designations:", designations);
    
    resultsSection.classList.remove('hidden');
    
    // Search for reference articles
    const refResults = searchByRefArticle(refArticles);
    
    // Search for designations
    const desResults = searchByDesignation(designations);
    
    // Combine and display results
    displayResults(refResults, desResults);
    
    // Display unmatched inputs
    displayUnmatched(refResults.unmatched, desResults.unmatched);
}

/**
 * Search by reference article - prioritize exact matches
 */
function searchByRefArticle(refArticles) {
    const results = [];
    const unmatched = [];
    
    if (refArticles.length === 0) {
        return { results, unmatched };
    }
    
    // For each search term
    refArticles.forEach(ref => {
        let found = false;
        let matches = [];
        
        // Clean and normalize the search term
        const cleanRef = ref.trim().toLowerCase();
        console.log(`Searching for ref_article: "${cleanRef}"`);
        
        // 1. Try exact match first (case insensitive)
        const exactMatches = excelData.filter(item => {
            if (!item.ref_article) return false;
            const itemRef = item.ref_article.toString().trim().toLowerCase();
            return itemRef === cleanRef;
        });
        
        if (exactMatches.length > 0) {
            console.log(`Found ${exactMatches.length} exact matches for "${cleanRef}"`);
            matches = exactMatches;
            found = true;
        } else {
            // 2. Try startsWith match (prioritize items that start with the search term)
            const startsWithMatches = excelData.filter(item => {
                if (!item.ref_article) return false;
                const itemRef = item.ref_article.toString().trim().toLowerCase();
                return itemRef.startsWith(cleanRef);
            });
            
            if (startsWithMatches.length > 0) {
                console.log(`Found ${startsWithMatches.length} startsWith matches for "${cleanRef}"`);
                matches = startsWithMatches;
                found = true;
            } else {
                // 3. Try contains match (search term is within the field)
                const containsMatches = excelData.filter(item => {
                    if (!item.ref_article) return false;
                    const itemRef = item.ref_article.toString().trim().toLowerCase();
                    return itemRef.includes(cleanRef);
                });
                
                if (containsMatches.length > 0) {
                    console.log(`Found ${containsMatches.length} contains matches for "${cleanRef}"`);
                    matches = containsMatches;
                    found = true;
                } else {
                    // 4. Try more lenient contains (item ref is within search term)
                    const reverseContainsMatches = excelData.filter(item => {
                        if (!item.ref_article) return false;
                        const itemRef = item.ref_article.toString().trim().toLowerCase();
                        return cleanRef.includes(itemRef) && itemRef.length > 2; // Only consider meaningful matches
                    });
                    
                    if (reverseContainsMatches.length > 0) {
                        console.log(`Found ${reverseContainsMatches.length} reverse contains matches for "${cleanRef}"`);
                        matches = reverseContainsMatches;
                        found = true;
                    }
                }
            }
        }
        
        // Add matches to results if found
        if (found && matches.length > 0) {
            results.push(...matches);
        } else {
            // No matches found
            unmatched.push({ value: ref, type: 'ref_article' });
            console.log(`No matches found for "${cleanRef}"`);
        }
    });
    
    return { results, unmatched };
}

/**
 * Search by designation - prioritize exact matches
 */
function searchByDesignation(designations) {
    const results = [];
    const unmatched = [];
    
    if (designations.length === 0) {
        return { results, unmatched };
    }
    
    // For each search term
    designations.forEach(des => {
        let found = false;
        let matches = [];
        
        // Clean and normalize the search term
        const cleanDes = des.trim().toLowerCase();
        console.log(`Searching for designation: "${cleanDes}"`);
        
        // 1. Try exact match first (case insensitive)
        const exactMatches = excelData.filter(item => {
            if (!item.designation) return false;
            const itemDes = item.designation.toString().trim().toLowerCase();
            return itemDes === cleanDes;
        });
        
        if (exactMatches.length > 0) {
            console.log(`Found ${exactMatches.length} exact matches for "${cleanDes}"`);
            matches = exactMatches;
            found = true;
        } else {
            // 2. Try startsWith match (prioritize items that start with the search term)
            const startsWithMatches = excelData.filter(item => {
                if (!item.designation) return false;
                const itemDes = item.designation.toString().trim().toLowerCase();
                return itemDes.startsWith(cleanDes);
            });
            
            if (startsWithMatches.length > 0) {
                console.log(`Found ${startsWithMatches.length} startsWith matches for "${cleanDes}"`);
                matches = startsWithMatches;
                found = true;
            } else {
                // 3. Try contains match (search term is within the field)
                const containsMatches = excelData.filter(item => {
                    if (!item.designation) return false;
                    const itemDes = item.designation.toString().trim().toLowerCase();
                    return itemDes.includes(cleanDes);
                });
                
                if (containsMatches.length > 0) {
                    console.log(`Found ${containsMatches.length} contains matches for "${cleanDes}"`);
                    matches = containsMatches;
                    found = true;
                } else {
                    // 4. Try word match (search for individual words in multi-word designations)
                    if (cleanDes.includes(' ')) {
                        const words = cleanDes.split(' ').filter(w => w.length > 2); // Skip small words
                        
                        if (words.length > 0) {
                            const wordMatches = excelData.filter(item => {
                                if (!item.designation) return false;
                                const itemDes = item.designation.toString().trim().toLowerCase();
                                
                                // Check if any significant word matches
                                return words.some(word => itemDes.includes(word));
                            });
                            
                            if (wordMatches.length > 0) {
                                console.log(`Found ${wordMatches.length} word matches for "${cleanDes}"`);
                                matches = wordMatches;
                                found = true;
                            }
                        }
                    }
                }
            }
        }
        
        // Add matches to results if found
        if (found && matches.length > 0) {
            results.push(...matches);
        } else {
            // No matches found
            unmatched.push({ value: des, type: 'designation' });
            console.log(`No matches found for "${cleanDes}"`);
        }
    });
    
    return { results, unmatched };
}

/**
 * Display search results in the table
 */
function displayResults(refResults, desResults) {
    // Combine results
    let combinedResults = [...refResults.results, ...desResults.results];
    
    // Remove duplicates by ref_article (assuming it's unique)
    const uniqueMap = new Map();
    combinedResults.forEach(item => {
        // Only keep the first occurrence of each ref_article
        if (item.ref_article && !uniqueMap.has(item.ref_article.toString())) {
            uniqueMap.set(item.ref_article.toString(), item);
        }
    });
    
    const uniqueResults = Array.from(uniqueMap.values());
    
    if (uniqueResults.length === 0) {
        noMatchesFound.classList.remove('hidden');
        return;
    }
    
    // Get all keys from the first item to create table headers
    if (uniqueResults.length > 0) {
        const keys = Object.keys(uniqueResults[0]);
        
        // Create table header
        tableHeader.innerHTML = '';
        keys.forEach(key => {
            const th = document.createElement('th');
            th.textContent = key.toUpperCase();
            tableHeader.appendChild(th);
        });
        
        // Create table rows
        tableBody.innerHTML = '';
        uniqueResults.forEach(result => {
            const row = document.createElement('tr');
            
            keys.forEach(key => {
                const td = document.createElement('td');
                td.textContent = result[key] !== undefined ? result[key] : '';
                row.appendChild(td);
            });
            
            tableBody.appendChild(row);
        });
    }
}

/**
 * Display unmatched inputs
 */
function displayUnmatched(refUnmatched, desUnmatched) {
    const allUnmatched = [...refUnmatched, ...desUnmatched];
    
    if (allUnmatched.length === 0) {
        unmatchedSection.classList.add('hidden');
        return;
    }
    
    unmatchedSection.classList.remove('hidden');
    unmatchedInputs.innerHTML = '';
    
    allUnmatched.forEach(item => {
        const div = document.createElement('div');
        div.className = 'unmatched-item';
        div.textContent = `${item.type === 'ref_article' ? 'Reference' : 'Designation'}: ${item.value}`;
        unmatchedInputs.appendChild(div);
    });
}

/**
 * Reset search results
 */
function resetResults() {
    tableHeader.innerHTML = '';
    tableBody.innerHTML = '';
    unmatchedInputs.innerHTML = '';
    noMatchesFound.classList.add('hidden');
    unmatchedSection.classList.add('hidden');
}

// Add export functionality to window object for testing
window.exportData = {
    getExcelData: () => excelData,
    getFuseRefArticle: () => fuseRefArticle,
    getFuseDesignation: () => fuseDesignation
};
