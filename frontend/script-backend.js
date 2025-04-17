// Global variables
let matchedResults = []; // Store matched results for download
let matchedQueries = []; // Store queries that matched at least one article
let unmatchedQueries = []; // Store queries that didn't match any article
let currentFileId = null; // Store the current file ID from the backend

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

// Backend API URL (configurable)
const API_BASE_URL = 'http://localhost:3000/api';

// File input event listener
fileInput.addEventListener('change', handleFileUpload);

// Search button event listener
searchBtn.addEventListener('click', performSearch);

// Download button event listener
downloadBtn.addEventListener('click', downloadResults);

/**
 * Handle Excel file upload and processing
 */
async function handleFileUpload(e) {
    const file = e.target.files[0];
    
    if (!file) return;
    
    // Display file name
    fileName.textContent = `Selected file: ${file.name}`;
    fileName.classList.add('file-uploading');
    
    try {
        // Create form data for file upload
        const formData = new FormData();
        formData.append('file', file);
        
        // Upload file to backend
        const response = await fetch(`${API_BASE_URL}/upload`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to upload file');
        }
        
        const data = await response.json();
        
        // Store file ID for later use
        currentFileId = data.fileId;
        
        // Show success message
        fileName.textContent = `Selected file: ${file.name} (Uploaded)`;
        fileName.classList.remove('file-uploading');
        fileName.classList.add('file-uploaded');
        
        // Show search section
        searchSection.classList.remove('hidden');
        
        // Reset results
        resetResults();
    } catch (error) {
        console.error('Error uploading file:', error);
        fileName.textContent = `Error: ${error.message}`;
        fileName.classList.remove('file-uploading');
        fileName.classList.add('file-error');
    }
}

/**
 * Parse input text into an array of search terms, splitting by line breaks only
 */
function parseSearchTerms(input) {
    if (!input) return [];
    
    // Split by line breaks and filter out empty lines
    return input.split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

/**
 * Perform search based on user input
 */
async function performSearch() {
    // Validate file upload
    if (!currentFileId) {
        alert('Please upload an Excel file first');
        return;
    }
    
    // Get search field
    const field = searchType.value;
    
    // Get and parse search terms
    const searchTermsInput = searchInput.value.trim();
    if (!searchTermsInput) {
        alert('Please enter at least one search term');
        return;
    }
    
    const searchTerms = parseSearchTerms(searchTermsInput);
    if (searchTerms.length === 0) {
        alert('Please enter at least one valid search term');
        return;
    }
    
    // Reset previous results
    resetResults();
    
    // Show loading state
    searchBtn.innerHTML = '<span class="loading mr-2"></span><span>Searching...</span>';
    searchBtn.disabled = true;
    
    try {
        // Send search request to backend
        const response = await fetch(`${API_BASE_URL}/query`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileId: currentFileId,
                searchField: field,
                searchTerms: searchTerms
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Search failed');
        }
        
        const data = await response.json();
        
        // Store results for download
        matchedResults = data.matchedResults || [];
        matchedQueries = data.matchedQueries || [];
        unmatchedQueries = data.unmatchedQueries || [];
        
        // Display results
        displaySearchResults();
    } catch (error) {
        console.error('Error performing search:', error);
        alert(`Search error: ${error.message}`);
    } finally {
        // Reset search button
        searchBtn.innerHTML = '<span>Search</span>';
        searchBtn.disabled = false;
    }
}

/**
 * Display search results
 */
function displaySearchResults() {
    // Show results section
    resultsSection.classList.remove('hidden');
    
    // Display matched queries
    if (matchedQueries.length > 0) {
        displayMatchedQueries(matchedQueries, matchedQueries.length + unmatchedQueries.length);
        
        // Show download button if we have results
        if (matchedResults.length > 0) {
            downloadBtn.classList.remove('hidden');
        }
    } else {
        noMatchesFound.classList.remove('hidden');
    }
    
    // Display unmatched queries
    if (unmatchedQueries.length > 0) {
        displayUnmatchedQueries(unmatchedQueries, matchedQueries.length + unmatchedQueries.length);
    }
}

/**
 * Display matched query terms with animations
 */
function displayMatchedQueries(matched, totalQueries) {
    if (!matched || matched.length === 0) return;
    
    // Show matched count
    matchedCount.textContent = `Matched Inputs: ${matched.length}/${totalQueries}`;
    matchedCount.classList.add('animate-fade-in');
    
    // Create a table for matched results if we have data
    if (matchedResults.length > 0) {
        // Get the first result to extract headers
        const firstResult = matchedResults[0];
        const headers = Object.keys(firstResult);
        
        // Create table
        const table = document.createElement('table');
        table.className = 'min-w-full divide-y divide-gray-200 mt-4 animate-fade-in';
        
        // Create header row
        const thead = document.createElement('thead');
        thead.className = 'bg-gray-50';
        const headerRow = document.createElement('tr');
        
        headers.forEach(header => {
            const th = document.createElement('th');
            th.className = 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider';
            th.textContent = header;
            headerRow.appendChild(th);
        });
        
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create table body
        const tbody = document.createElement('tbody');
        tbody.className = 'bg-white divide-y divide-gray-200';
        
        // Add rows with staggered animation
        matchedResults.forEach((result, index) => {
            const row = document.createElement('tr');
            row.className = 'result-row';
            row.style.opacity = '0';
            row.style.transform = 'translateY(20px)';
            row.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            
            headers.forEach(header => {
                const td = document.createElement('td');
                td.className = 'px-6 py-4 whitespace-nowrap text-sm text-gray-500';
                td.textContent = result[header] || '';
                row.appendChild(td);
            });
            
            tbody.appendChild(row);
            
            // Trigger animation with slight delay based on index
            setTimeout(() => {
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            }, 100 + (index * 50));
        });
        
        table.appendChild(tbody);
        
        // Add table to the DOM
        matchedTable.innerHTML = '';
        matchedTable.appendChild(table);
    }
    
    // Display matched query terms
    matchedInputs.innerHTML = '';
    matched.forEach((query, index) => {
        const div = document.createElement('div');
        div.className = 'matched-item p-2 rounded';
        div.textContent = query;
        
        // Add staggered animation
        div.style.opacity = '0';
        div.style.transform = 'translateY(20px)';
        div.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        matchedInputs.appendChild(div);
        
        // Trigger animation with slight delay based on index
        setTimeout(() => {
            div.style.opacity = '1';
            div.style.transform = 'translateY(0)';
        }, 300 + (index * 100));
    });
}

/**
 * Display unmatched queries with animations
 */
function displayUnmatchedQueries(unmatched, totalQueries) {
    if (!unmatched || unmatched.length === 0) return;
    
    // Show unmatched section
    unmatchedSection.classList.remove('hidden');
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
    matchedTable.innerHTML = '';
    downloadBtn.classList.add('hidden');
    noMatchesFound.classList.add('hidden');
    unmatchedSection.classList.add('hidden');
    resultsSection.classList.add('hidden');
}

/**
 * Download results as Excel
 */
async function downloadResults() {
    if (!matchedResults || matchedResults.length === 0) {
        alert('No results to download');
        return;
    }
    
    // Add loading animation to download button
    const originalContent = downloadBtn.innerHTML;
    downloadBtn.innerHTML = `<span class="loading mr-2"></span><span>Preparing...</span>`;
    downloadBtn.disabled = true;
    
    try {
        // Get search field and terms for the export request
        const field = searchType.value;
        const searchTerms = parseSearchTerms(searchInput.value.trim());
        
        // Create URL with query parameters
        const queryParams = new URLSearchParams({
            fileId: currentFileId,
            searchField: field,
            searchTerms: searchTerms.join(',')
        });
        
        // Create download URL
        const downloadUrl = `${API_BASE_URL}/export?${queryParams}`;
        
        // Create a temporary link element
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.setAttribute('download', ''); // Browser will determine filename from Content-Disposition header
        document.body.appendChild(link);
        
        // Trigger download
        link.click();
        
        // Clean up
        document.body.removeChild(link);
        
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
        console.error('Error downloading results:', error);
        alert('Error downloading results: ' + error.message);
        
        // Reset download button
        downloadBtn.innerHTML = originalContent;
        downloadBtn.disabled = false;
    }
}
