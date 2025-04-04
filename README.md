# Excel Search Application

## Overview

The Excel Search Application is a web-based tool designed to efficiently search through large Excel files for specific reference articles or designations. It provides a simple and intuitive interface for importing Excel data, performing searches, and exporting matching results.

## Features

- **Excel File Import**: Upload and parse `.xlsx` or `.xls` files
- **Flexible Search Options**:
  - Search by Reference Article or Designation
  - Enter multiple search terms (comma or line-break separated)
  - Automatic matching using exact, starts-with, and contains strategies
- **Result Tracking**:
  - Shows which search queries matched records
  - Shows which search queries didn't match any records
  - Displays counters for matched and unmatched inputs
- **Export Functionality**:
  - Download matched results as an Excel file
  - Preserves original column headers and structure
  - Results file includes date in filename

## Technologies Used

- **Frontend**: HTML, CSS, JavaScript
- **UI Framework**: Tailwind CSS
- **Excel Processing**: SheetJS (xlsx)

## How to Use

1. **Upload an Excel File**:
   - Click the upload area or drag and drop an Excel file
   - The application will process all sheets in the file

2. **Enter Search Terms**:
   - Select whether to search by Reference Article or Designation
   - Enter one or more search terms in the text area
   - Terms can be separated by commas or line breaks

3. **Review Results**:
   - See which search terms matched records
   - See which search terms didn't match any records
   - View count statistics for matched and unmatched terms

4. **Export Results**:
   - Click the Download button to save matched results
   - Results will be saved as an Excel file with original headers preserved

## Search Tips

- Search is case-insensitive
- The application will try to find matches in this order:
  1. Exact matches
  2. Starts-with matches
  3. Contains matches
  4. Word matches (for multi-word searches)
- For multi-word searches, words longer than 2 characters will be used for matching

## Debug Mode

A debug button is available in the search section that provides information about:
- Number of records loaded
- Sample of the first few records
- Test search results for common terms

## Browser Compatibility

The application works best in modern browsers that support:
- ES6 JavaScript
- Modern CSS features
- FileReader API

## Installation and Deployment

The application is client-side only and requires no server-side installation:

1. Download or clone the repository
2. Open `index.html` in a web browser or host the files on any web server
3. No database or backend is required

## Files

- `index.html`: Main application interface
- `styles.css`: Custom styling beyond Tailwind
- `script.js`: Core application logic
- `debug.html`: Separate debugging interface for troubleshooting Excel files
