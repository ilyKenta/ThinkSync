const request = require('supertest');
const express = require('express');
const dashboardRoutes = require('../dashboard');
const db = require('../../db');
const { getUserIdFromToken, extractToken } = require('../../utils/auth');

jest.mock('../../db', () => ({ executeQuery: jest.fn() }));
jest.mock('../../utils/auth', () => ({
  getUserIdFromToken: jest.fn(),
  extractToken: jest.fn()
}));

describe('Dashboard API', () => {
  let app;
  let mockToken = 'mock-token';
  let mockUserId = 'user-1';

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/dashboard', dashboardRoutes);
    extractToken.mockReturnValue(mockToken);
    getUserIdFromToken.mockResolvedValue(mockUserId);
    jest.clearAllMocks();
  });

  // GET /widgets
  it('should return widgets for a user', async () => {
    db.executeQuery.mockResolvedValueOnce([{ widget_ID: 1, widget_type: 'projects' }]);
    const res = await request(app).get('/api/dashboard/widgets');
    expect(res.status).toBe(200);
    expect(res.body.widgets).toBeDefined();
    expect(Array.isArray(res.body.widgets)).toBe(true);
  });

  it('should handle DB error on GET /widgets', async () => {
    db.executeQuery.mockRejectedValueOnce(new Error('db error'));
    const res = await request(app).get('/api/dashboard/widgets');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('db error');
  });

  // POST /widgets
  it('should add a new widget', async () => {
    db.executeQuery.mockResolvedValueOnce({ insertId: 42 });
    const res = await request(app)
      .post('/api/dashboard/widgets')
      .send({ widget_type: 'projects', position_x: 1, position_y: 2, width: 2, height: 2 });
    expect(res.status).toBe(201);
    expect(res.body.widget_ID).toBe(42);
  });

  it('should 400 on invalid widget type', async () => {
    const res = await request(app)
      .post('/api/dashboard/widgets')
      .send({ widget_type: 'invalid', position_x: 1, position_y: 2 });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Invalid widget type/);
  });

  it('should handle DB error on POST /widgets', async () => {
    db.executeQuery.mockRejectedValueOnce(new Error('db error'));
    const res = await request(app)
      .post('/api/dashboard/widgets')
      .send({ widget_type: 'projects', position_x: 1, position_y: 2 });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('db error');
  });

  // PUT /widgets/:widgetId
  it('should update a widget', async () => {
    db.executeQuery.mockResolvedValueOnce({ affectedRows: 1 });
    const res = await request(app)
      .put('/api/dashboard/widgets/5')
      .send({ position_x: 2, position_y: 3, width: 2, height: 2 });
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated/);
  });

  it('should 404 if widget not found on update', async () => {
    db.executeQuery.mockResolvedValueOnce({ affectedRows: 0 });
    const res = await request(app)
      .put('/api/dashboard/widgets/5')
      .send({ position_x: 2, position_y: 3, width: 2, height: 2 });
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/);
  });

  it('should handle DB error on PUT /widgets/:widgetId', async () => {
    db.executeQuery.mockRejectedValueOnce(new Error('db error'));
    const res = await request(app)
      .put('/api/dashboard/widgets/5')
      .send({ position_x: 2, position_y: 3, width: 2, height: 2 });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('db error');
  });

  // DELETE /widgets/:widgetId
  it('should delete a widget', async () => {
    db.executeQuery.mockResolvedValueOnce({ affectedRows: 1 });
    const res = await request(app)
      .delete('/api/dashboard/widgets/5');
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/deleted/);
  });

  it('should 404 if widget not found on delete', async () => {
    db.executeQuery.mockResolvedValueOnce({ affectedRows: 0 });
    const res = await request(app)
      .delete('/api/dashboard/widgets/5');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/);
  });

  it('should handle DB error on DELETE /widgets/:widgetId', async () => {
    db.executeQuery.mockRejectedValueOnce(new Error('db error'));
    const res = await request(app)
      .delete('/api/dashboard/widgets/5');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('db error');
  });

  // Edge: Auth errors
  it('should 500 if getUserIdFromToken throws (GET)', async () => {
    getUserIdFromToken.mockRejectedValueOnce(new Error('bad auth'));
    const res = await request(app).get('/api/dashboard/widgets');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('bad auth');
  });
  it('should 500 if getUserIdFromToken throws (POST)', async () => {
    getUserIdFromToken.mockRejectedValueOnce(new Error('bad auth'));
    const res = await request(app)
      .post('/api/dashboard/widgets')
      .send({ widget_type: 'projects', position_x: 1, position_y: 2 });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('bad auth');
  });
  it('should 500 if getUserIdFromToken throws (PUT)', async () => {
    getUserIdFromToken.mockRejectedValueOnce(new Error('bad auth'));
    const res = await request(app)
      .put('/api/dashboard/widgets/5')
      .send({ position_x: 2, position_y: 3, width: 2, height: 2 });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('bad auth');
  });
  it('should 500 if getUserIdFromToken throws (DELETE)', async () => {
    getUserIdFromToken.mockRejectedValueOnce(new Error('bad auth'));
    const res = await request(app)
      .delete('/api/dashboard/widgets/5');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('bad auth');
  });
}); 