# CENTRELEC Spare Parts Finder - Backend

This is the server-side implementation of the CENTRELEC Spare Parts Finder application. It provides an Express.js backend for Excel file parsing, searching, and exporting functionality.

## Features

- Server-side Excel file parsing with streaming support
- Multi-criteria search with flexible matching
- Excel export functionality
- LRU caching for improved performance
- Automatic cleanup of temporary files
- Security features (Helmet, rate limiting, CORS)
- Structured logging
- Standardized error handling

## Tech Stack

- Node.js (v18+)
- Express.js
- XLSX for Excel parsing
- Multer for file uploads
- LRU-Cache for caching
- Pino for logging
- Jest and Supertest for testing

## Project Structure

```
/backend
  /middleware        - Express middleware
  /utils             - Utility functions
  /uploads           - Temporary file storage (created at runtime)
  server.js          - Express app + middleware config
  routes.js          - API endpoint definitions
  excel-handler.js   - Business logic (parsing, search, export)
  .env               - Environment variables
  .env.example       - Example environment variables
  openapi.yaml       - API specification
```

## Environment Variables

The application uses the following environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| UPLOAD_DIR | Directory for file uploads | ./uploads |
| MAX_FILE_SIZE | Maximum file size in bytes | 10MB |
| CACHE_MAX_ITEMS | Maximum number of items in LRU cache | 100 |
| TEMP_FILE_TTL | Time-to-live for temporary files (ms) | 1 hour |
| RATE_LIMIT_WINDOW | Rate limiting window (ms) | 1 minute |
| RATE_LIMIT_MAX | Maximum requests per window | 100 |
| CORS_ORIGINS | Allowed CORS origins (comma-separated) | http://localhost:3000 |

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies:

```bash
npm install
```

4. Create a `.env` file (you can copy from `.env.example`):

```bash
cp .env.example .env
```

5. Start the server:

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

## API Endpoints

- `POST /api/upload` - Upload Excel file (multipart/form-data)
- `POST /api/query` - Search by criteria (JSON body)
- `GET /api/export` - Download results as Excel
- `GET /health` - Service health check

For detailed API documentation, see the OpenAPI specification in `openapi.yaml`.

## Testing

Run tests with:

```bash
npm test
```

## Performance Metrics

- Response time: ≤ 1.5s for 1,000 rows
- Memory usage: < 300MB peak memory
- Concurrency: Support for 50 concurrent users
- Main-thread blocking: 90%+ reduction compared to client-side processing
