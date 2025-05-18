// First, mock all modules before any imports
jest.mock('helmet', () => {
  const mockFn = jest.fn(() => (req, res, next) => {
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('x-frame-options', 'DENY');
    res.setHeader('x-xss-protection', '1; mode=block');
    next();
  });
  return mockFn;
});

jest.mock('cors', () => {
  const mockFn = jest.fn(() => (req, res, next) => {
    if (req.method === 'OPTIONS') {
      res.setHeader('access-control-allow-origin', '*');
      res.setHeader('access-control-allow-methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('access-control-allow-headers', 'Content-Type,Authorization,X-Requested-With');
      res.setHeader('access-control-expose-headers', 'Content-Range,X-Content-Range');
      res.setHeader('access-control-allow-credentials', 'true');
      res.status(204).end();
      return;
    }
    next();
  });
  return mockFn;
});

jest.mock('../db', () => ({
  checkDatabaseHealth: jest.fn()
}));

jest.mock('@azure/storage-blob', () => ({
  BlobServiceClient: {
    fromConnectionString: jest.fn().mockReturnValue({
      getContainerClient: jest.fn().mockReturnValue({
        uploadBlockBlob: jest.fn(),
        getBlobClient: jest.fn()
      })
    })
  }
}));

// Mock route modules
jest.mock('../routes/auth', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/login', (req, res) => res.status(200).send());
  return router;
});

jest.mock('../routes/project', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/owner', (req, res) => res.status(200).send());
  return router;
});

jest.mock('../routes/collaboration', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/invitations/received', (req, res) => res.status(200).send());
  return router;
});

jest.mock('../routes/admin', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/users', (req, res) => res.status(200).send());
  return router;
});

jest.mock('../routes/reviewer', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/projects', (req, res) => res.status(200).send());
  return router;
});

jest.mock('../routes/messages', () => {
  const express = require('express');
  const router = express.Router();
  router.get('/conversations', (req, res) => res.status(200).send());
  return {
    router,
    initializeAzureStorage: jest.fn(),
    storageClient: {},
    containerClient: {}
  };
});

// Now import the modules
const request = require('supertest');
const db = require('../db');

// Set environment variables
process.env.PORT = '5000';
process.env.AZURE_STORAGE_CONNECTION_STRING = 'mock-connection-string';
process.env.AZURE_STORAGE_CONTAINER_NAME = 'mock-container';

// Import server after all mocks are set up
const app = require('../server');

describe('Server Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Setup', () => {
    it('should use express.json middleware', () => {
      const jsonMiddleware = app._router.stack.find(layer => layer.name === 'jsonParser');
      expect(jsonMiddleware).toBeDefined();
    });
  });

  describe('CORS Configuration', () => {
    it('should set correct CORS headers', async () => {
      const response = await request(app)
        .options('/health')
        .send();
      
      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toBe('GET,POST,PUT,DELETE,OPTIONS');
      expect(response.headers['access-control-allow-headers']).toBe('Content-Type,Authorization,X-Requested-With');
      expect(response.headers['access-control-expose-headers']).toBe('Content-Range,X-Content-Range');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should handle preflight requests', async () => {
      const response = await request(app)
        .options('/health')
        .set('Access-Control-Request-Method', 'GET')
        .set('Origin', 'http://localhost:3000')
        .send();
      
      expect(response.status).toBe(204);
    });
  });

  describe('Security Headers', () => {
    it('should have Helmet security headers enabled', async () => {
      const response = await request(app)
        .get('/health')
        .send();
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });

  describe('Health Check Endpoint', () => {
    it('should return 200 and healthy status when database is healthy', async () => {
      db.checkDatabaseHealth.mockResolvedValue(true);

      const response = await request(app)
        .get('/health')
        .send();
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('database', 'healthy');
    });

    it('should return 503 and unhealthy status when database is unhealthy', async () => {
      db.checkDatabaseHealth.mockResolvedValue(false);

      const response = await request(app)
        .get('/health')
        .send();
      
      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('status', 'OK');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('database', 'unhealthy');
    });

    it('should handle database health check errors', async () => {
      db.checkDatabaseHealth.mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/health')
        .send();
      
      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('status', 'ERROR');
      expect(response.body).toHaveProperty('database', 'unhealthy');
      expect(response.body).toHaveProperty('error', 'Health check failed');
    });
  });

  describe('Route Registration', () => {
    it('should register auth routes', async () => {
      const response = await request(app)
        .get('/api/auth/login')
        .send();
      
      expect(response.status).toBe(200);
    });

    it('should register project routes', async () => {
      const response = await request(app)
        .get('/api/projects/owner')
        .send();
      
      expect(response.status).toBe(200);
    });

    it('should register collaboration routes', async () => {
      const response = await request(app)
        .get('/api/collaborations/invitations/received')
        .send();
      
      expect(response.status).toBe(200);
    });

    it('should register admin routes', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .send();
      
      expect(response.status).toBe(200);
    });

    it('should register reviewer routes', async () => {
      const response = await request(app)
        .get('/api/reviewer/projects')
        .send();
      
      expect(response.status).toBe(200);
    });

    it('should register message routes', async () => {
      const response = await request(app)
        .get('/api/messages/conversations')
        .send();
      
      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors', async () => {
      const response = await request(app)
        .get('/nonexistent-route')
        .send();
      
      expect(response.status).toBe(404);
    });

    it('should handle JSON parsing errors', async () => {
      const response = await request(app)
        .post('/api/projects/create')
        .set('Content-Type', 'application/json')
        .send('invalid json');
      
      expect(response.status).toBe(400);
    });
  });
}); 