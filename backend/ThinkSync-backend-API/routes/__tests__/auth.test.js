const request = require('supertest');
const express = require('express');
const authRoutes = require('../auth');
const axios = require('axios');
const db = require('../../db');
const jwt = require('jsonwebtoken');

// Mock environment variables
process.env.JWT_SECRET = 'test-secret';

// Mock modules
jest.mock('axios');
jest.mock('../../db', () => ({
  execute: jest.fn()
}));

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
      it('should return user ID on success', async () => {
        const mockId = 'test-user-id';
        axios.get.mockResolvedValueOnce({
          data: { id: mockId }
        });

        const result = await authRoutes.fetchUserIdFromGraph('valid-token');
        expect(result).toBe(mockId);
      });

      it('should throw error on failure', async () => {
        axios.get.mockRejectedValueOnce(new Error('Graph API error'));

        await expect(authRoutes.fetchUserIdFromGraph('invalid-token'))
          .rejects.toThrow('Failed to fetch user ID from Microsoft Graph');
      });
    });

    describe('isValidUserPayload', () => {
      it('should validate basic user payload', () => {
        const validPayload = {
          phone_number: '1234567890',
          department: 'Test Dept',
          acc_role: 'Test Role'
        };
        expect(authRoutes.isValidUserPayload(validPayload)).toBe(true);
      });

      it('should validate researcher/reviewer payload', () => {
        const validPayload = {
          phone_number: '1234567890',
          department: 'Test Dept',
          acc_role: 'Test Role',
          res_area: 'Test Area',
          qualification: 'Test Qual',
          current_proj: 'Test Project'
        };
        expect(authRoutes.isValidUserPayload(validPayload, true)).toBe(true);
      });

      it('should reject invalid basic payload', () => {
        const invalidPayload = {
          phone_number: '1234567890',
          department: 'Test Dept'
          // missing acc_role
        };
        expect(authRoutes.isValidUserPayload(invalidPayload)).toBe(false);
      });

      it('should reject invalid researcher/reviewer payload', () => {
        const invalidPayload = {
          phone_number: '1234567890',
          department: 'Test Dept',
          acc_role: 'Test Role',
          res_area: 'Test Area'
          // missing qualification and current_proj
        };
        expect(authRoutes.isValidUserPayload(invalidPayload, true)).toBe(false);
      });

      it('should reject payload with invalid types', () => {
        const invalidPayload = {
          phone_number: 12345, // should be string
          department: 'Test Dept',
          acc_role: 'Test Role'
        };
        expect(authRoutes.isValidUserPayload(invalidPayload)).toBe(false);
      });
    });
  });

  describe('Route Handlers', () => {
    describe('POST /api/auth/microsoft', () => {
      it('should handle missing token', async () => {
        const response = await request(app)
          .post('/api/auth/microsoft')
          .send({});

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Access token missing');
      });

      it('should handle incomplete user data', async () => {
        axios.get.mockResolvedValueOnce({
          data: { id: 'test-id' } // missing givenName, surname, mail
        });

        const response = await request(app)
          .post('/api/auth/microsoft')
          .send({ token: 'valid-token' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Incomplete user data from Microsoft');
      });

      it('should handle invalid email domain', async () => {
        axios.get.mockResolvedValueOnce({
          data: {
            id: 'test-id',
            givenName: 'Test',
            surname: 'User',
            mail: 'test@invalid.com'
          }
        });

        const response = await request(app)
          .post('/api/auth/microsoft')
          .send({ token: 'valid-token' });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Please sign up using a University of Witwatersrand email domain');
      });

      it('should create new user if not exists', async () => {
        axios.get.mockResolvedValueOnce({
          data: {
            id: 'test-id',
            givenName: 'Test',
            surname: 'User',
            mail: 'test@student.wits.ac.za'
          }
        });

        // First query returns empty (user doesn't exist)
        // Second query is the insert
        db.execute
          .mockImplementationOnce((query, params, callback) => callback(null, []))
          .mockImplementationOnce((query, params, callback) => callback(null, { insertId: 1 }));

        const response = await request(app)
          .post('/api/auth/microsoft')
          .send({ token: 'valid-token' });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('User registered successfully');
      });

      it('should return existing user if already registered', async () => {
        axios.get.mockResolvedValueOnce({
          data: {
            id: 'test-id',
            givenName: 'Test',
            surname: 'User',
            mail: 'test@student.wits.ac.za'
          }
        });

        // Query returns existing user
        db.execute.mockImplementationOnce((query, params, callback) => 
          callback(null, [{ user_ID: 'test-id' }])
        );

        const response = await request(app)
          .post('/api/auth/microsoft')
          .send({ token: 'valid-token' });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('User authenticated successfully');
      });

      it('should handle database errors', async () => {
        axios.get.mockResolvedValueOnce({
          data: {
            id: 'test-id',
            givenName: 'Test',
            surname: 'User',
            mail: 'test@student.wits.ac.za'
          }
        });

        db.execute.mockImplementationOnce((query, params, callback) => 
          callback(new Error('Database error'), null)
        );

        const response = await request(app)
          .post('/api/auth/microsoft')
          .send({ token: 'valid-token' });

        expect(response.status).toBe(400);
      });
    });

    describe('POST /api/auth/reviewer', () => {
      const validReviewerData = {
        token: 'valid-token',
        phone_number: '1234567890',
        department: 'Test Dept',
        acc_role: 'reviewer',
        res_area: 'Test Area',
        qualification: 'Test Qual',
        current_proj: 'Test Project'
      };

      it('should handle missing token', async () => {
        const { token, ...dataWithoutToken } = validReviewerData;
        const response = await request(app)
          .post('/api/auth/reviewer')
          .send(dataWithoutToken);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Token is required');
      });

      it('should handle invalid input fields', async () => {
        const invalidData = {
          token: 'valid-token',
          phone_number: '1234567890',
          // missing other required fields
        };

        const response = await request(app)
          .post('/api/auth/reviewer')
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Missing or invalid input fields for reviewer');
      });

      it('should handle non-existent user', async () => {
        axios.get.mockResolvedValueOnce({
          data: { id: 'test-id' }
        });

        db.execute.mockImplementationOnce((query, params, callback) => 
          callback(null, []) // Empty result means user doesn't exist
        );

        const response = await request(app)
          .post('/api/auth/reviewer')
          .send(validReviewerData);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('User does not exist in database');
      });

      it('should handle existing reviewer', async () => {
        axios.get.mockResolvedValueOnce({
          data: { id: 'test-id' }
        });

        // First query returns user exists
        // Second query returns reviewer already exists
        db.execute
          .mockImplementationOnce((query, params, callback) => callback(null, [{ user_ID: 'test-id' }]))
          .mockImplementationOnce((query, params, callback) => callback(null, [{ user_ID: 'test-id' }]));

        const response = await request(app)
          .post('/api/auth/reviewer')
          .send(validReviewerData);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('User already signed up as reviewer');
      });

      it('should successfully create reviewer', async () => {
        axios.get.mockResolvedValueOnce({
          data: { id: 'test-id' }
        });

        // Mock all necessary database calls
        db.execute
          .mockImplementationOnce((query, params, callback) => callback(null, [{ user_ID: 'test-id' }])) // User exists
          .mockImplementationOnce((query, params, callback) => callback(null, [])) // Not already a reviewer
          .mockImplementationOnce((query, params, callback) => callback(null, { affectedRows: 1 })) // Update user
          .mockImplementationOnce((query, params, callback) => callback(null, { insertId: 1 })) // Insert reviewer
          .mockImplementationOnce((query, params, callback) => callback(null, { affectedRows: 1 })); // Insert role

        const response = await request(app)
          .post('/api/auth/reviewer')
          .send(validReviewerData);

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('All input successful');
      });
    });

    describe('POST /api/auth/researcher', () => {
      const validResearcherData = {
        token: 'valid-token',
        phone_number: '1234567890',
        department: 'Test Dept',
        acc_role: 'researcher',
        res_area: 'Test Area',
        qualification: 'Test Qual',
        current_proj: 'Test Project'
      };

      it('should handle missing token', async () => {
        const { token, ...dataWithoutToken } = validResearcherData;
        const response = await request(app)
          .post('/api/auth/researcher')
          .send(dataWithoutToken);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Token is required');
      });

      it('should handle invalid input fields', async () => {
        const invalidData = {
          token: 'valid-token',
          phone_number: '1234567890',
          // missing other required fields
        };

        const response = await request(app)
          .post('/api/auth/researcher')
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Missing or invalid input fields for researcher');
      });

      it('should handle non-existent user', async () => {
        axios.get.mockResolvedValueOnce({
          data: { id: 'test-id' }
        });

        db.execute.mockImplementationOnce((query, params, callback) => 
          callback(null, []) // Empty result means user doesn't exist
        );

        const response = await request(app)
          .post('/api/auth/researcher')
          .send(validResearcherData);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('User does not exist in database');
      });

      it('should handle existing researcher', async () => {
        axios.get.mockResolvedValueOnce({
          data: { id: 'test-id' }
        });

        // First query returns user exists
        // Second query returns researcher already exists
        db.execute
          .mockImplementationOnce((query, params, callback) => callback(null, [{ user_ID: 'test-id' }]))
          .mockImplementationOnce((query, params, callback) => callback(null, [{ user_ID: 'test-id' }]));

        const response = await request(app)
          .post('/api/auth/researcher')
          .send(validResearcherData);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('User already signed up as researcher');
      });

      it('should successfully create researcher', async () => {
        axios.get.mockResolvedValueOnce({
          data: { id: 'test-id' }
        });

        // Mock all necessary database calls
        db.execute
          .mockImplementationOnce((query, params, callback) => callback(null, [{ user_ID: 'test-id' }])) // User exists
          .mockImplementationOnce((query, params, callback) => callback(null, [])) // Not already a researcher
          .mockImplementationOnce((query, params, callback) => callback(null, { affectedRows: 1 })) // Update user
          .mockImplementationOnce((query, params, callback) => callback(null, { insertId: 1 })) // Insert researcher
          .mockImplementationOnce((query, params, callback) => callback(null, { affectedRows: 1 })); // Insert role

        const response = await request(app)
          .post('/api/auth/researcher')
          .send(validResearcherData);

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('All input successful');
      });
    });

    describe('POST /api/auth/admin', () => {
      const validAdminData = {
        token: 'valid-token',
        phone_number: '1234567890',
        department: 'Test Dept',
        acc_role: 'admin'
      };

      it('should handle missing token', async () => {
        const { token, ...dataWithoutToken } = validAdminData;
        const response = await request(app)
          .post('/api/auth/admin')
          .send(dataWithoutToken);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Token is required');
      });

      it('should handle invalid input fields', async () => {
        const invalidData = {
          token: 'valid-token',
          phone_number: '1234567890',
          // missing other required fields
        };

        const response = await request(app)
          .post('/api/auth/admin')
          .send(invalidData);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Missing or invalid input fields for admin');
      });

      it('should handle non-existent user', async () => {
        axios.get.mockResolvedValueOnce({
          data: { id: 'test-id' }
        });

        db.execute.mockImplementationOnce((query, params, callback) => 
          callback(null, []) // Empty result means user doesn't exist
        );

        const response = await request(app)
          .post('/api/auth/admin')
          .send(validAdminData);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('User does not exist in database');
      });

      it('should handle existing admin', async () => {
        axios.get.mockResolvedValueOnce({
          data: { id: 'test-id' }
        });

        // First query returns user exists
        // Second query returns admin already exists
        db.execute
          .mockImplementationOnce((query, params, callback) => callback(null, [{ user_ID: 'test-id' }]))
          .mockImplementationOnce((query, params, callback) => callback(null, [{ user_ID: 'test-id' }]));

        const response = await request(app)
          .post('/api/auth/admin')
          .send(validAdminData);

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('User already enrolled as admin');
      });

      it('should successfully create admin', async () => {
        axios.get.mockResolvedValueOnce({
          data: { id: 'test-id' }
        });

        // Mock all necessary database calls
        db.execute
          .mockImplementationOnce((query, params, callback) => callback(null, [{ user_ID: 'test-id' }])) // User exists
          .mockImplementationOnce((query, params, callback) => callback(null, [])) // Not already an admin
          .mockImplementationOnce((query, params, callback) => callback(null, { affectedRows: 1 })) // Update user
          .mockImplementationOnce((query, params, callback) => callback(null, { insertId: 1 })) // Insert admin
          .mockImplementationOnce((query, params, callback) => callback(null, { affectedRows: 1 })); // Insert role

        const response = await request(app)
          .post('/api/auth/admin')
          .send(validAdminData);

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('All input successful');
      });
    });
  });
}); 