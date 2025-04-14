const request = require('supertest');
const express = require('express');
const app = require('../server');

describe('Server Setup', () => {
  it('should respond to health check', async () => {
    const response = await request(app)
      .get('/health')
      .send();
    
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('should have CORS enabled', async () => {
    const response = await request(app)
      .options('/health')
      .send();
    
    expect(response.headers['access-control-allow-origin']).toBeDefined();
  });
}); 