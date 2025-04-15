const mysql = require('mysql2/promise');

// Mock environment variables
process.env.PORT = '5000';
process.env.CORS_ORIGIN = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-secret';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'test-user';
process.env.DB_PASSWORD = 'test-password';
process.env.DB_NAME = 'test-db';
process.env.DB_PORT = '3306';

// Mock console methods to prevent noise in test output
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});

// Mock the database connection
jest.mock('./db', () => {
  return {
    execute: jest.fn().mockImplementation((query, params, callback) => {
      // Mock successful query execution
      callback(null, []);
    }),
    connect: jest.fn().mockImplementation((callback) => {
      // Mock successful connection
      if (callback) callback(null);
    })
  };
});

// Mock axios for Microsoft Graph API calls
jest.mock('axios', () => ({
  get: jest.fn().mockImplementation((url, config) => {
    if (url === 'https://graph.microsoft.com/v1.0/me') {
      return Promise.resolve({
        data: {
          id: 'mock-user-id',
          givenName: 'Test',
          surname: 'User',
          mail: 'test@example.com'
        }
      });
    }
    return Promise.reject(new Error('Unexpected API call'));
  })
}));

// Global beforeAll and afterAll hooks
beforeAll(() => {
  // Setup any test environment requirements
});

afterAll(() => {
  // Cleanup any test environment requirements
}); 