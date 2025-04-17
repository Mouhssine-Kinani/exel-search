const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../server');

// Create test uploads directory if it doesn't exist
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

describe('API Endpoints', () => {
  // Health check endpoint
  describe('GET /health', () => {
    it('should return 200 and status ok', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  // File upload endpoint
  describe('POST /api/upload', () => {
    it('should return 400 if no file is provided', async () => {
      const res = await request(app).post('/api/upload');
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('code', 'FILE_REQUIRED');
    });

    // This test requires a sample Excel file
    it('should upload a valid Excel file', async () => {
      // Create a path to a sample Excel file
      const sampleFilePath = path.join(__dirname, 'fixtures', 'sample.xlsx');
      
      // Skip test if sample file doesn't exist
      if (!fs.existsSync(sampleFilePath)) {
        console.log('Skipping upload test - sample file not found');
        return;
      }

      const res = await request(app)
        .post('/api/upload')
        .attach('file', sampleFilePath);
      
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('code', 'FILE_UPLOADED');
      expect(res.body).toHaveProperty('fileId');
    });
  });

  // Query endpoint
  describe('POST /api/query', () => {
    it('should return 400 if fileId is missing', async () => {
      const res = await request(app)
        .post('/api/query')
        .send({
          searchField: 'ref_article',
          searchTerms: ['ABC123']
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('code', 'FILE_ID_REQUIRED');
    });

    it('should return 400 if searchField is missing', async () => {
      const res = await request(app)
        .post('/api/query')
        .send({
          fileId: 'test-file-id',
          searchTerms: ['ABC123']
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('code', 'SEARCH_FIELD_REQUIRED');
    });

    it('should return 400 if searchTerms is missing', async () => {
      const res = await request(app)
        .post('/api/query')
        .send({
          fileId: 'test-file-id',
          searchField: 'ref_article'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('code', 'SEARCH_TERMS_REQUIRED');
    });

    it('should return 404 if fileId is not found', async () => {
      const res = await request(app)
        .post('/api/query')
        .send({
          fileId: 'non-existent-file-id',
          searchField: 'ref_article',
          searchTerms: ['ABC123']
        });
      
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('code', 'FILE_NOT_FOUND');
    });
  });

  // Export endpoint
  describe('GET /api/export', () => {
    it('should return 400 if fileId is missing', async () => {
      const res = await request(app)
        .get('/api/export')
        .query({
          searchField: 'ref_article',
          searchTerms: 'ABC123'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('code', 'FILE_ID_REQUIRED');
    });

    it('should return 400 if searchField is missing', async () => {
      const res = await request(app)
        .get('/api/export')
        .query({
          fileId: 'test-file-id',
          searchTerms: 'ABC123'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('code', 'SEARCH_FIELD_REQUIRED');
    });

    it('should return 400 if searchTerms is missing', async () => {
      const res = await request(app)
        .get('/api/export')
        .query({
          fileId: 'test-file-id',
          searchField: 'ref_article'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('code', 'SEARCH_TERMS_REQUIRED');
    });

    it('should return 404 if fileId is not found', async () => {
      const res = await request(app)
        .get('/api/export')
        .query({
          fileId: 'non-existent-file-id',
          searchField: 'ref_article',
          searchTerms: 'ABC123'
        });
      
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('code', 'FILE_NOT_FOUND');
    });
  });
});
