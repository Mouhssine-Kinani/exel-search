# exel-search
# Excel Search Application

A web application that allows users to import Excel files and search through the data efficiently.

## Features

- **File Import**: Upload Excel (.xlsx or .xls) files
- **Search Functionality**: Search by Reference Article or Designation with partial matching
- **Multiple Search Queries**: Enter multiple search values at once (comma-separated)
- **Unmatched Entries Tracking**: See which search terms didn't match any records
- **Fast Search**: Optimized for quick results even with large Excel files

## Technologies Used

- HTML, CSS, JavaScript
- Tailwind CSS for styling
- SheetJS (xlsx) for Excel file processing
- Fuse.js for fast, fuzzy searching

## How to Use

1. **Open** `index.html` in your web browser
2. **Upload** an Excel file by clicking on the upload area
3. **Enter** your search terms in either the Reference Article or Designation fields (or both)
   - Separate multiple search terms with commas
4. **Click** the Search button to see results
5. **View** matched results in the table and any unmatched terms in the section below

## Excel File Format

The application expects your Excel file to have at least these columns:
- `ref_article` - Reference article identifiers
- `designation` - Item descriptions or designations

Additional columns will also be displayed in the results.

## Browser Compatibility

This application works on all modern browsers including:
- Chrome
- Firefox
- Edge
- Safari
