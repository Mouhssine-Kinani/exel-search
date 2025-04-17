// Backend API connector for CENTRELEC Spare Parts Finder
// This script intercepts the original frontend functionality and redirects it to the backend API

// API Base URL
const API_BASE_URL = 'http://localhost:3000/api';

// Current file ID from backend
let currentFileId = null;

// Wait for the document to be fully loaded before overriding functions
document.addEventListener('DOMContentLoaded', () => {
    console.log('Backend connector initialized');
    
    // Wait a bit to ensure all scripts are loaded and functions are defined
    setTimeout(() => {
        setupBackendConnector();
    }, 500);
});

function setupBackendConnector() {
    // Store references to original functions
    const originalHandleFileUpload = window.handleFileUpload;
    const originalPerformSearch = window.performSearch;
    const originalDownloadResults = window.downloadResults;
    
    // Only override if the original functions exist
    if (typeof originalHandleFileUpload === 'function') {
        console.log('Overriding handleFileUpload');
        
        // Override file upload function
        window.handleFileUpload = async function(e) {
            const file = e.target.files[0];
            
            if (!file) return;
            
            // Display file name and loading state (keep original UI behavior)
            fileName.textContent = `Selected file: ${file.name}`;
            fileName.classList.add('file-uploading');
            
            try {
                console.log('Uploading file to backend:', file.name);
                
                // Create form data for file upload
                const formData = new FormData();
                formData.append('file', file);
                
                // Upload file to backend
                const response = await fetch(`${API_BASE_URL}/upload`, {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.message || 'Failed to upload file');
                }
                
                console.log('File uploaded successfully:', data);
                
                // Store file ID for later use
                currentFileId = data.fileId;
                
                // Show success message
                fileName.textContent = `Selected file: ${file.name} (Uploaded)`;
                fileName.classList.remove('file-uploading');
                fileName.classList.add('file-uploaded');
                
                // Show search section (keep original UI behavior)
                searchSection.classList.remove('hidden');
                
                // Reset results
                if (typeof resetResults === 'function') {
                    resetResults();
                }
            } catch (error) {
                console.error('Error uploading file:', error);
                fileName.textContent = `Error: ${error.message}`;
                fileName.classList.remove('file-uploading');
                fileName.classList.add('file-error');
            }
        };
    }
    
    if (typeof originalPerformSearch === 'function') {
        console.log('Overriding performSearch');
        
        // Override search function
        window.performSearch = async function() {
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
            if (typeof resetResults === 'function') {
                resetResults();
            }
            
            // Show loading state
            searchBtn.innerHTML = '<span class="loading mr-2"></span><span>Searching...</span>';
            searchBtn.disabled = true;
            
            try {
                console.log('Sending search request to backend:', { field, searchTerms });
                
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
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.message || 'Search failed');
                }
                
                console.log('Search results received:', data);
                
                // Store results globally for the original UI to use
                window.matchedResults = data.matchedResults || [];
                window.matchedQueries = data.matchedQueries || [];
                window.unmatchedQueries = data.unmatchedQueries || [];
                
                // Show results section
                resultsSection.classList.remove('hidden');
                
                // Display matched queries
                if (window.matchedQueries.length > 0) {
                    displayMatchedQueries(window.matchedQueries, window.matchedQueries.length + window.unmatchedQueries.length);
                    
                    // Show download button if we have results
                    if (window.matchedResults.length > 0) {
                        downloadBtn.classList.remove('hidden');
                    }
                } else {
                    noMatchesFound.classList.remove('hidden');
                }
                
                // Display unmatched queries
                if (window.unmatchedQueries.length > 0) {
                    displayUnmatchedQueries(window.unmatchedQueries, window.matchedQueries.length + window.unmatchedQueries.length);
                }
            } catch (error) {
                console.error('Error performing search:', error);
                alert(`Search error: ${error.message}`);
            } finally {
                // Reset search button
                searchBtn.innerHTML = '<span>Search</span>';
                searchBtn.disabled = false;
            }
        };
    }
    
    if (typeof originalDownloadResults === 'function') {
        console.log('Overriding downloadResults');
        
        // Override download function
        window.downloadResults = async function() {
            if (!window.matchedResults || window.matchedResults.length === 0) {
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
                
                console.log('Downloading results from backend');
                
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
        };
    }
}
