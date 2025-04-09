// Global variables
let excelData = [];
let matchedResults = []; // Store matched results for download
let matchedQueries = []; // Store queries that matched at least one article
let unmatchedQueries = []; // Store queries that didn't match any article
let originalHeaders = []; // Store original headers from uploaded Excel file
let headerMapping = {}; // Map between internal column names and original headers
let isFirstSearch = true; // Track if this is the first search to add special animation

// DOM elements
const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const searchSection = document.getElementById('searchSection');
const resultsSection = document.getElementById('resultsSection');
const searchBtn = document.getElementById('searchBtn');
const searchType = document.getElementById('searchType');
const searchInput = document.getElementById('searchInput');

// Animation flags
let animationsInitialized = false;
let resultsAnimationTimeout = null;
const noMatchesFound = document.getElementById('noMatchesFound');
const unmatchedSection = document.getElementById('unmatchedSection');
const unmatchedInputs = document.getElementById('unmatchedInputs');
const matchedInputs = document.getElementById('matchedInputs');
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
    
    // Add a loading animation to search button
    searchBtn.innerHTML = `<span class="loading mr-2"></span><span>Searching...</span>`;
    searchBtn.disabled = true;
    
    // Get the selected search type
    const selectedType = searchType.value; // 'ref_article' or 'designation'
    const searchTerms = parseSearchTerms(searchInput.value);
    
    if (searchTerms.length === 0) {
        alert('Please enter at least one search term');
        searchBtn.innerHTML = `<span>Search</span>`;
        searchBtn.disabled = false;
        return;
    }
    
    if (!excelData || excelData.length === 0) {
        alert('Please upload an Excel file first');
        searchBtn.innerHTML = `<span>Search</span>`;
        searchBtn.disabled = false;
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
                // Add all matching results to matchedResults array
                result.matches.forEach(item => {
                    // Create a unique identifier based on all fields to properly identify duplicates
                    const itemSignature = JSON.stringify(item);
                    
                    // Check if exactly this item is already in matchedResults
                    const exists = matchedResults.some(existing => 
                        JSON.stringify(existing) === itemSignature);
                    
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
                // Add all matching results to matchedResults array
                result.matches.forEach(item => {
                    // Create a unique identifier based on all fields to properly identify duplicates
                    const itemSignature = JSON.stringify(item);
                    
                    // Check if exactly this item is already in matchedResults
                    const exists = matchedResults.some(existing => 
                        JSON.stringify(existing) === itemSignature);
                    
                    if (!exists) {
                        matchedResults.push(item);
                    }
                });
            } else {
                unmatchedQueries.push(term);
            }
        });
    }
    
    // Show results with animation
    resultsSection.classList.remove('hidden');
    
    // Reset search button
    searchBtn.innerHTML = `<span>Search</span>`;
    searchBtn.disabled = false;
    
    // Add special entry animation for the first search
    if (isFirstSearch) {
        resultsSection.classList.add('animate-fade-in');
        isFirstSearch = false;
    }
    
    // Display matched and unmatched query lists
    displayMatchedQueries(matchedQueries, searchTerms.length);
    displayUnmatchedQueries(unmatchedQueries, searchTerms.length);
}

/**
 * Normalize text by removing diacritical marks and converting to lowercase
 */
function normalizeText(text) {
    if (!text) return '';
    // Normalize special characters (diacritics)
    return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/**
 * Check if two strings match using flexible criteria
 */
function flexibleMatch(source, target, matchType = 'contains') {
    // Normalize both strings for accent-insensitive comparison
    const normalizedSource = normalizeText(source);
    const normalizedTarget = normalizeText(target);
    
    switch (matchType) {
        case 'exact':
            return normalizedSource === normalizedTarget;
        case 'startsWith':
            return normalizedSource.startsWith(normalizedTarget);
        case 'contains':
            return normalizedSource.includes(normalizedTarget);
        default:
            return normalizedSource.includes(normalizedTarget);
    }
}

/**
 * Search for a single term in the specified field with enhanced matching
 */
function searchSingleTerm(term, field) {
    const matches = [];
    
    // Clean and normalize the search term
    const cleanTerm = term.trim();
    console.log(`Searching for ${field}: "${cleanTerm}"`);
    
    if (field === 'ref_article') {
        console.log(`Searching through ${excelData.length} records for ref_article match...`);
        // For ref_article: use strict exact match
        const exactMatches = excelData.filter(item => {
            if (!item[field]) return false;
            
            // Clean the reference value by trimming whitespace
            const itemRef = String(item[field]).trim();
            
            // For references, we use strict case-sensitive exact matching
            const isExactMatch = itemRef === cleanTerm;
            
            // Log every comparison for debugging
            console.log(`Comparing: "${itemRef}" with "${cleanTerm}" => ${isExactMatch}`);
            
            return isExactMatch;
        });
        
        if (exactMatches.length > 0) {
            console.log(`Found ${exactMatches.length} exact matches for ref_article "${cleanTerm}"`);
            matches.push(...exactMatches);
        } else {
            console.log(`No exact matches found for ref_article "${cleanTerm}"`);
        }
    } else {
        // For designation: use flexible matching
        // 1. Try exact match first
        const exactMatches = excelData.filter(item => {
            if (!item[field]) return false;
            return flexibleMatch(item[field], cleanTerm, 'exact');
        });
        
        if (exactMatches.length > 0) {
            console.log(`Found ${exactMatches.length} exact matches for designation "${cleanTerm}"`);
            matches.push(...exactMatches);
        }
        
        // 2. Try startsWith match
        const startsWithMatches = excelData.filter(item => {
            if (!item[field]) return false;
            if (matches.includes(item)) return false;
            return flexibleMatch(item[field], cleanTerm, 'startsWith');
        });
        
        if (startsWithMatches.length > 0) {
            console.log(`Found ${startsWithMatches.length} startsWith matches for designation "${cleanTerm}"`);
            matches.push(...startsWithMatches);
        }
        
        // 3. Try contains match
        const containsMatches = excelData.filter(item => {
            if (!item[field]) return false;
            if (matches.includes(item)) return false;
            return flexibleMatch(item[field], cleanTerm, 'contains');
        });
        
        if (containsMatches.length > 0) {
            console.log(`Found ${containsMatches.length} contains matches for designation "${cleanTerm}"`);
            matches.push(...containsMatches);
        }
        
        // 4. Check for similar words/variations
        const similarMatches = excelData.filter(item => {
            if (!item[field]) return false;
            if (matches.includes(item)) return false;
            
            const itemValue = String(item[field]);
            const itemWords = itemValue.split(/\s+/);
            
            // If search term has multiple words
            if (cleanTerm.includes(' ')) {
                const searchWords = cleanTerm.split(' ').filter(w => w.length > 2);
                return searchWords.some(searchWord => 
                    itemWords.some(itemWord => areSimilarWords(itemWord, searchWord))
                );
            }
            
            // Single word search term
            return itemWords.some(word => areSimilarWords(word, cleanTerm));
        });
        
        if (similarMatches.length > 0) {
            console.log(`Found ${similarMatches.length} similar word matches for designation "${cleanTerm}"`);
            matches.push(...similarMatches);
        }
    }
    
    return { term, matches };
}

/**
 * Similar words check (simple implementation without external libraries)
 */
function areSimilarWords(str1, str2) {
    // Both strings should be at least 3 characters for this to be meaningful
    if (!str1 || !str2 || str1.length < 3 || str2.length < 3) return false;
    
    // Normalize strings
    const norm1 = normalizeText(str1);
    const norm2 = normalizeText(str2);
    
    // Check for common prefixes (at least 3 chars)
    if (norm1.length >= 3 && norm2.length >= 3) {
        const prefix1 = norm1.substring(0, 3);
        const prefix2 = norm2.substring(0, 3);
        if (prefix1 === prefix2) return true;
    }
    
    // Check for similar words by comparing trigrams
    const getTrigrams = str => {
        const results = [];
        for (let i = 0; i < str.length - 2; i++) {
            results.push(str.substring(i, i + 3));
        }
        return results;
    };
    
    const trigrams1 = getTrigrams(norm1);
    const trigrams2 = getTrigrams(norm2);
    
    // Count shared trigrams
    let sharedCount = 0;
    for (const t1 of trigrams1) {
        if (trigrams2.includes(t1)) sharedCount++;
    }
    
    // Calculate Dice coefficient similarity
    const similarity = (2 * sharedCount) / (trigrams1.length + trigrams2.length);
    
    // Return true if similarity is above threshold
    return similarity > 0.4; // Adjust threshold as needed
}

/**
 * Display matched query terms with animations
 */
function displayMatchedQueries(matched, totalQueries) {
    if (matched.length === 0) {
        noMatchesFound.classList.remove('hidden');
        noMatchesFound.classList.add('animate-fade-in');
        matchedCount.textContent = 'No matches found';
        matchedCount.classList.add('animate-fade-in');
        downloadBtn.classList.add('hidden');
        return;
    }
    
    // Count total matched items across all queries
    const totalMatchedItems = matchedResults.length;
    console.log('Total matched items:', totalMatchedItems);
    console.log('Matched results array:', matchedResults);
    
    // Update matched count with animation and detailed info
    matchedCount.textContent = `Matched Inputs: ${matched.length}/${totalQueries} (Total Items: ${totalMatchedItems})`;
    matchedCount.classList.add('animate-fade-in');
    
    // Display each matched query with its match count
    matchedInputs.innerHTML = '';
    matched.forEach(query => {
        // Count matches based on the current search type (ref_article or designation)
        const searchType = document.getElementById('searchType').value;
        const matchCount = matchedResults.filter(result => {
            const itemValue = String(result[searchType] || '').trim();
            const queryValue = String(query).trim();
            return itemValue === queryValue;
        }).length;
        
        console.log(`Query "${query}" has ${matchCount} matches in ${searchType}`);
        
        const div = document.createElement('div');
        div.className = 'matched-item result-item';
        
        // Create query span
        const querySpan = document.createElement('span');
        querySpan.className = 'font-medium';
        querySpan.textContent = query;
        
        // Create count badge with more detailed info
        const countBadge = document.createElement('span');
        countBadge.className = 'ml-2 px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full';
        countBadge.textContent = `${matchCount} match${matchCount !== 1 ? 'es' : ''}`;
        
        // Log the match count for debugging
        console.log(`Query "${query}" matched ${matchCount} items`);
        
        div.appendChild(querySpan);
        div.appendChild(countBadge);
        matchedInputs.appendChild(div);
    });
    
    // Show download button if there are matched results with animation
    if (matchedResults.length > 0) {
        downloadBtn.classList.remove('hidden');
        downloadBtn.classList.add('animate-fade-in');
    } else {
        downloadBtn.classList.add('hidden');
    }
    
    // Create results table with slight delay for better visual flow
    if (matchedResults.length > 0) {
        setTimeout(() => {
            createResultsTable(matchedResults);
        }, 300);
    }
}

/**
 * Display unmatched queries with animations
 */
function displayUnmatchedQueries(unmatched, totalQueries) {
    if (unmatched.length === 0) {
        unmatchedSection.classList.add('hidden');
        return;
    }
    
    // Show unmatched section with animation
    unmatchedSection.classList.remove('hidden');
    unmatchedSection.classList.add('animate-fade-in');
    unmatchedSection.style.animationDelay = '0.5s';
    
    // Add animation to count display
    unmatchedCount.textContent = `Unmatched Inputs: ${unmatched.length}/${totalQueries}`;
    unmatchedCount.classList.add('animate-fade-in');
    
    // Display unmatched items with staggered animation
    unmatchedInputs.innerHTML = '';
    unmatched.forEach((query, index) => {
        const div = document.createElement('div');
        div.className = 'unmatched-item p-2 rounded';
        div.textContent = query;
        
        // Add staggered animation
        div.style.opacity = '0';
        div.style.transform = 'translateY(20px)';
        div.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        unmatchedInputs.appendChild(div);
        
        // Trigger animation with slight delay based on index
        setTimeout(() => {
            div.style.opacity = '1';
            div.style.transform = 'translateY(0)';
        }, 600 + (index * 100));
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

/**
 * Function to download results as Excel with animation
 */
function downloadResults() {
    if (!matchedResults || matchedResults.length === 0) {
        alert('No results to download');
        return;
    }
    
    // Add loading animation to download button
    const originalContent = downloadBtn.innerHTML;
    downloadBtn.innerHTML = `<span class="loading mr-2"></span><span>Preparing...</span>`;
    downloadBtn.disabled = true;
    
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
        
        // Reset download button after slight delay with success animation
        setTimeout(() => {
            downloadBtn.innerHTML = `<svg class="w-5 h-5 inline-block mr-1 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <span>Downloaded!</span>`;
            
            setTimeout(() => {
                downloadBtn.innerHTML = originalContent;
                downloadBtn.disabled = false;
            }, 2000);
        }, 1000);
    } catch (error) {
        console.error('Error creating Excel file:', error);
        alert('Error creating Excel file: ' + error.message);
    }
}
