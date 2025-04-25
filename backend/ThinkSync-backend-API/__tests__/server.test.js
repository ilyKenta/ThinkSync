const request = require('supertest');
const express = require('express');
const app = require('../server');
const db = require('../db');

// Mock the database health check
jest.mock('../db', () => ({
  checkDatabaseHealth: jest.fn()
}));

describe('Server Setup', () => {
  it('should respond to health check with 200 when database is healthy', async () => {
    // Mock database health check to return true
    db.checkDatabaseHealth.mockResolvedValue(true);

    const response = await request(app)
      .get('/health')
      .send();
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('database', 'healthy');
  });

  it('should respond to health check with 503 when database is unhealthy', async () => {
    // Mock database health check to return false
    db.checkDatabaseHealth.mockResolvedValue(false);

    const response = await request(app)
      .get('/health')
      .send();
    
    expect(response.status).toBe(503);
    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('database', 'unhealthy');
  });

  it('should have CORS enabled', async () => {
    const response = await request(app)
      .options('/health')
      .send();
    
    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });
}); 