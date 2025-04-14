const request = require('supertest');
const express = require('express');
const authRoutes = require('../auth');
const axios = require('axios');
const db = require('../../db');
const jwt = require('jsonwebtoken');

// Mock environment variables
process.env.JWT_SECRET = 'test-secret';

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    jest.clearAllMocks();
  });

  describe('Helper Functions', () => {
    describe('executeQuery', () => {
      it('should resolve with results on success', async () => {
        const mockResults = [{ id: 1 }];
        db.execute.mockImplementation((query, params, callback) => {
          callback(null, mockResults);
        });

        const result = await authRoutes.executeQuery('SELECT * FROM users', []);
        expect(result).toEqual(mockResults);
      });

      it('should reject with error on failure', async () => {
        const mockError = new Error('Database error');
        db.execute.mockImplementation((query, params, callback) => {
          callback(mockError, null);
        });

        await expect(authRoutes.executeQuery('SELECT * FROM users', []))
          .rejects.toThrow('Database error');
      });
    });

    describe('fetchUserIdFromGraph', () => {
      it('should return user ID from Microsoft Graph', async () => {
        const mockUserId = 'test-user-id';
        axios.get.mockResolvedValueOnce({
          data: { id: mockUserId }
        });

        const result = await authRoutes.fetchUserIdFromGraph('valid-token');
        expect(result).toBe(mockUserId);
      });

      it('should throw error on failed Graph API call', async () => {
        axios.get.mockRejectedValueOnce(new Error('Graph API error'));

        await expect(authRoutes.fetchUserIdFromGraph('invalid-token'))
          .rejects.toThrow('Failed to fetch user ID from Microsoft Graph');
      });
    });

    describe('isValidUserPayload', () => {
      it('should validate basic user payload', () => {
        const validPayload = {
          phone_number: '1234567890',
          department: 'Science',
          acc_role: 'researcher'
        };
        expect(authRoutes.isValidUserPayload(validPayload)).toBe(true);
      });

      it('should validate researcher payload with all fields', () => {
        const validPayload = {
          phone_number: '1234567890',
          department: 'Science',
          acc_role: 'researcher',
          res_area: 'Computer Science',
          qualification: 'PhD',
          current_proj: 'AI Research'
        };
        expect(authRoutes.isValidUserPayload(validPayload, true)).toBe(true);
      });

      it('should reject invalid payload types', () => {
        const invalidPayload = {
          phone_number: 123, // Should be string
          department: 'Science',
          acc_role: 'researcher'
        };
        expect(authRoutes.isValidUserPayload(invalidPayload)).toBe(false);
      });

      it('should reject missing required fields', () => {
        const invalidPayload = {
          phone_number: '1234567890',
          // Missing department
          acc_role: 'researcher'
        };
        expect(authRoutes.isValidUserPayload(invalidPayload)).toBe(false);
      });
    });
  });

  describe('Route Handlers', () => {
    describe('POST /api/auth/microsoft', () => {
      it('should return 401 if no token is provided', async () => {
        const response = await request(app)
          .post('/api/auth/microsoft')
          .send({});
        
        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Access token missing');
      });

      it('should return 400 if invalid token is provided', async () => {
        axios.get.mockRejectedValueOnce(new Error('Invalid token'));

        const response = await request(app)
          .post('/api/auth/microsoft')
          .send({ token: 'invalid-token' });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Invalid Microsoft token');
      });

      it('should create new user if not exists', async () => {
        const mockUserData = {
          id: 'test-user-id',
          givenName: 'Test',
          surname: 'User',
          mail: 'test@wits.ac.za'
        };

        axios.get.mockResolvedValueOnce({ data: mockUserData });
        db.execute.mockImplementation((query, params, callback) => {
          if (query.includes('SELECT')) {
            callback(null, []);
          } else if (query.includes('INSERT')) {
            callback(null, { affectedRows: 1 });
          }
        });

        const response = await request(app)
          .post('/api/auth/microsoft')
          .send({ token: 'valid-token' });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('User registered successfully');
      });

      it('should return existing user if already registered', async () => {
        const mockUserData = {
          id: 'test-user-id',
          givenName: 'Test',
          surname: 'User',
          mail: 'test@wits.ac.za'
        };

        axios.get.mockResolvedValueOnce({ data: mockUserData });
        db.execute.mockImplementation((query, params, callback) => {
          callback(null, [{ user_ID: mockUserData.id, fname: mockUserData.givenName, sname: mockUserData.surname }]);
        });

        const response = await request(app)
          .post('/api/auth/microsoft')
          .send({ token: 'valid-token' });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('User authenticated successfully');
      });

      it('should return 400 if email domain is not wits.ac.za', async () => {
        axios.get.mockResolvedValueOnce({
          data: {
            id: 'test-user-id',
            givenName: 'Test',
            surname: 'User',
            mail: 'test@gmail.com'
          }
        });

        const response = await request(app)
          .post('/api/auth/microsoft')
          .send({ token: 'valid-token' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Please sign up using a University of Witwatersrand email domain');
      });
    });

    describe('POST /api/auth/reviewer', () => {
      it('should return 400 if token is missing', async () => {
        const response = await request(app)
          .post('/api/auth/reviewer')
          .send({});
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Token is required');
      });

      it('should return 400 if payload is invalid', async () => {
        const response = await request(app)
          .post('/api/auth/reviewer')
          .send({ token: 'valid-token' });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Missing or invalid input fields for reviewer');
      });

      it('should successfully register reviewer', async () => {
        const mockPayload = {
          token: 'valid-token',
          phone_number: '1234567890',
          department: 'Science',
          acc_role: 'reviewer',
          res_area: 'Computer Science',
          qualification: 'PhD',
          current_proj: 'AI Research'
        };

        axios.get.mockResolvedValueOnce({ data: { id: 'test-user-id' } });
        db.execute.mockImplementation((query, params, callback) => {
          if (query.includes('SELECT * FROM users')) {
            callback(null, [{ user_ID: 'test-user-id' }]);
          } else if (query.includes('SELECT * FROM reviewer')) {
            callback(null, []);
          } else {
            callback(null, { affectedRows: 1 });
          }
        });

        const response = await request(app)
          .post('/api/auth/reviewer')
          .send(mockPayload);

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('All input successful');
      });
    });

    describe('POST /api/auth/researcher', () => {
      it('should return 400 if token is missing', async () => {
        const response = await request(app)
          .post('/api/auth/researcher')
          .send({});
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Token is required');
      });

      it('should return 400 if payload is invalid', async () => {
        const response = await request(app)
          .post('/api/auth/researcher')
          .send({ token: 'valid-token' });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Missing or invalid input fields for researcher');
      });

      it('should successfully register researcher', async () => {
        const mockPayload = {
          token: 'valid-token',
          phone_number: '1234567890',
          department: 'Science',
          acc_role: 'researcher',
          res_area: 'Computer Science',
          qualification: 'PhD',
          current_proj: 'AI Research'
        };

        axios.get.mockResolvedValueOnce({ data: { id: 'test-user-id' } });
        db.execute.mockImplementation((query, params, callback) => {
          if (query.includes('SELECT * FROM users')) {
            callback(null, [{ user_ID: 'test-user-id' }]);
          } else if (query.includes('SELECT * FROM researcher')) {
            callback(null, []);
          } else {
            callback(null, { affectedRows: 1 });
          }
        });

        const response = await request(app)
          .post('/api/auth/researcher')
          .send(mockPayload);

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('All input successful');
      });
    });

    describe('POST /api/auth/admin', () => {
      it('should return 400 if token is missing', async () => {
        const response = await request(app)
          .post('/api/auth/admin')
          .send({});
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Token is required');
      });

      it('should return 400 if payload is invalid', async () => {
        const response = await request(app)
          .post('/api/auth/admin')
          .send({ token: 'valid-token' });
        
        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Missing or invalid input fields for admin');
      });

      it('should successfully register admin', async () => {
        const mockPayload = {
          token: 'valid-token',
          phone_number: '1234567890',
          department: 'Science',
          acc_role: 'admin'
        };

        axios.get.mockResolvedValueOnce({ data: { id: 'test-user-id' } });
        db.execute.mockImplementation((query, params, callback) => {
          if (query.includes('SELECT * FROM users')) {
            callback(null, [{ user_ID: 'test-user-id' }]);
          } else if (query.includes('JOIN user_roles')) {
            callback(null, []);
          } else {
            callback(null, { affectedRows: 1 });
          }
        });

        const response = await request(app)
          .post('/api/auth/admin')
          .send(mockPayload);

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('All input successful');
      });
    });
  });
}); 