const request = require('supertest');
const express = require('express');
const authRoutes = require('../auth');
const axios = require('axios');
const db = require('../../db');

describe('Auth Routes', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('POST /api/auth/microsoft', () => {
    it('should return 401 if no token is provided', async () => {
      const response = await request(app)
        .post('/api/auth/microsoft')
        .send({});
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token missing');
    });

    it('should return 401 if invalid token is provided', async () => {
      // Mock axios to reject the request
      axios.get.mockRejectedValueOnce(new Error('Invalid token'));

      const response = await request(app)
        .post('/api/auth/microsoft')
        .send({ token: 'invalid-token' });
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid Microsoft token');
    });

    it('should create new user if not exists', async () => {
      // Mock successful Microsoft Graph API call
      axios.get.mockResolvedValueOnce({
        data: {
          id: 'test-user-id',
          givenName: 'Test',
          surname: 'User',
          mail: 'test@wits.ac.za'
        }
      });

      // Mock database to return empty results (user doesn't exist)
      db.execute.mockImplementationOnce((query, params, callback) => {
        callback(null, []);
      });

      // Mock successful user creation
      db.execute.mockImplementationOnce((query, params, callback) => {
        callback(null, { affectedRows: 1 });
      });

      const response = await request(app)
        .post('/api/auth/microsoft')
        .send({ token: 'valid-token' });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user_ID');
    });

    it('should return existing user if already registered', async () => {
      // Mock successful Microsoft Graph API call
      axios.get.mockResolvedValueOnce({
        data: {
          id: 'test-user-id',
          givenName: 'Test',
          surname: 'User',
          mail: 'test@wits.ac.za'
        }
      });

      // Mock database to return existing user
      db.execute.mockImplementationOnce((query, params, callback) => {
        callback(null, [{ user_ID: 'test-user-id', fname: 'Test', sname: 'User' }]);
      });

      const response = await request(app)
        .post('/api/auth/microsoft')
        .send({ token: 'valid-token' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('User authenticated successfully');
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user_ID');
    });
  });
}); 