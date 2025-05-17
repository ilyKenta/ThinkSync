const request = require('supertest');
const express = require('express');
const fundingRoutes = require('../funding');
const db = require('../../db');
const { getUserIdFromToken, extractToken } = require('../../utils/auth');

jest.mock('../../db', () => ({ executeQuery: jest.fn() }));
jest.mock('../../utils/auth', () => ({
  getUserIdFromToken: jest.fn(),
  extractToken: jest.fn()
}));

jest.mock('pdfkit', () => {
  return jest.fn().mockImplementation(() => {
    let res = null;
    const doc = {
      pipe: jest.fn((_res) => { res = _res; }),
      fontSize: jest.fn().mockReturnThis(),
      text: jest.fn().mockReturnThis(),
      moveDown: jest.fn().mockReturnThis(),
      rect: jest.fn().mockReturnThis(),
      stroke: jest.fn().mockReturnThis(),
      fill: jest.fn().mockReturnThis(),
      fillColor: jest.fn().mockReturnThis(),
      image: jest.fn().mockReturnThis(),
      addPage: jest.fn().mockReturnThis(),
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      y: 100,
      end: jest.fn(function () {
        if (res && typeof res.end === 'function') res.end();
      }),
      on: jest.fn()
    };
    return doc;
  });
});
jest.mock('chartjs-node-canvas', () => ({
  ChartJSNodeCanvas: jest.fn().mockImplementation(() => ({
    renderToBuffer: jest.fn().mockResolvedValue(Buffer.from('fakeimage'))
  }))
}));

describe('Funding API', () => {
  let app;
  let mockToken = 'mock-token';
  let mockUserId = 'user-1';

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/funding', fundingRoutes);
    extractToken.mockReturnValue(mockToken);
    getUserIdFromToken.mockResolvedValue(mockUserId);
    jest.clearAllMocks();
  });

  // POST /:projectId
  it('should initialize funding', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }]) // roles
      .mockResolvedValueOnce([{ funding_available: 100 }]) // projectCheck
      .mockResolvedValueOnce([]) // fundingArr
      .mockResolvedValueOnce({ insertId: 1 }); // insert
    const res = await request(app)
      .post('/api/funding/1')
      .send({ total_awarded: 100, grant_status: 'active', grant_end_date: '2024-01-01' });
    expect(res.status).toBe(201);
    expect(res.body.funding_ID).toBe(1);
  });
  it('should 403 if not a researcher (init)', async () => {
    db.executeQuery.mockResolvedValueOnce([]); // roles
    const res = await request(app)
      .post('/api/funding/1')
      .send({ total_awarded: 100 });
    expect(res.status).toBe(403);
  });
  it('should 400 on validation error (init)', async () => {
    db.executeQuery.mockResolvedValueOnce([{ role_name: 'researcher' }]);
    const res = await request(app)
      .post('/api/funding/1')
      .send({ total_awarded: -1 });
    expect(res.status).toBe(400);
  });
  it('should 400 if project has no funding available', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([]); // projectCheck
    const res = await request(app)
      .post('/api/funding/1')
      .send({ total_awarded: 100 });
    expect(res.status).toBe(400);
  });
  it('should 400 if funding already exists', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([{ funding_available: 100 }])
      .mockResolvedValueOnce([{}]); // fundingArr
    const res = await request(app)
      .post('/api/funding/1')
      .send({ total_awarded: 100 });
    expect(res.status).toBe(400);
  });
  it('should 500 on DB error (init)', async () => {
    db.executeQuery.mockRejectedValueOnce({ code: 'ER_FAKE' });
    const res = await request(app)
      .post('/api/funding/1')
      .send({ total_awarded: 100 });
    expect(res.status).toBe(500);
  });
  it('should 401 on auth error (init)', async () => {
    getUserIdFromToken.mockRejectedValueOnce(new Error('bad auth'));
    const res = await request(app)
      .post('/api/funding/1')
      .send({ total_awarded: 100 });
    expect(res.status).toBe(401);
  });

  // GET /
  it('should get funding summary for all projects', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }]) // roles
      .mockResolvedValueOnce([{ project_ID: 1, title: 'P1', description: 'desc' }]) // projects
      .mockResolvedValueOnce([{ funding_ID: 1, total_awarded: 100, grant_status: 'active', grant_end_date: '2024-01-01' }]) // fundingArr
      .mockResolvedValueOnce([{ funding_ID: 1, category: 'Personnel', amount_spent: 50 }]); // categories
    const res = await request(app).get('/api/funding');
    expect(res.status).toBe(200);
    expect(res.body.projects).toBeDefined();
  });
  it('should 403 if not a researcher (get summary)', async () => {
    db.executeQuery.mockResolvedValueOnce([]); // roles
    const res = await request(app).get('/api/funding');
    expect(res.status).toBe(403);
  });
  it('should 500 on DB error (get summary)', async () => {
    db.executeQuery.mockRejectedValueOnce({ code: 'ER_FAKE' });
    const res = await request(app).get('/api/funding');
    expect(res.status).toBe(500);
  });
  it('should 401 on auth error (get summary)', async () => {
    getUserIdFromToken.mockRejectedValueOnce(new Error('bad auth'));
    const res = await request(app).get('/api/funding');
    expect(res.status).toBe(401);
  });

  // PUT /:projectId
  it('should update funding', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([{ funding_ID: 1 }])
      .mockResolvedValueOnce({});
    const res = await request(app)
      .put('/api/funding/1')
      .send({ total_awarded: 200, grant_status: 'completed', grant_end_date: '2024-12-31' });
    expect(res.status).toBe(200);
  });
  it('should 403 if not a researcher (update)', async () => {
    db.executeQuery.mockResolvedValueOnce([]); // roles
    const res = await request(app)
      .put('/api/funding/1')
      .send({ total_awarded: 200 });
    expect(res.status).toBe(403);
  });
  it('should 400 on validation error (update)', async () => {
    db.executeQuery.mockResolvedValueOnce([{ role_name: 'researcher' }]);
    const res = await request(app)
      .put('/api/funding/1')
      .send({ total_awarded: -1 });
    expect(res.status).toBe(400);
  });
  it('should 404 if funding not found (update)', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([]); // fundingArr
    const res = await request(app)
      .put('/api/funding/1')
      .send({ total_awarded: 200 });
    expect(res.status).toBe(404);
  });
  it('should 500 on DB error (update)', async () => {
    db.executeQuery.mockRejectedValueOnce({ code: 'ER_FAKE' });
    const res = await request(app)
      .put('/api/funding/1')
      .send({ total_awarded: 200 });
    expect(res.status).toBe(500);
  });
  it('should 401 on auth error (update)', async () => {
    getUserIdFromToken.mockRejectedValueOnce(new Error('bad auth'));
    const res = await request(app)
      .put('/api/funding/1')
      .send({ total_awarded: 200 });
    expect(res.status).toBe(401);
  });

  // POST /:projectId/categories
  it('should add a funding category', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([{ funding_ID: 1 }])
      .mockResolvedValueOnce({ insertId: 2 });
    const res = await request(app)
      .post('/api/funding/1/categories')
      .send({ category: 'Equipment', amount_spent: 10 });
    expect(res.status).toBe(201);
    expect(res.body.category_ID).toBe(2);
  });
  it('should 403 if not a researcher (add category)', async () => {
    db.executeQuery.mockResolvedValueOnce([]); // roles
    const res = await request(app)
      .post('/api/funding/1/categories')
      .send({ category: 'Equipment', amount_spent: 10 });
    expect(res.status).toBe(403);
  });
  it('should 400 on missing category (add category)', async () => {
    db.executeQuery.mockResolvedValueOnce([{ role_name: 'researcher' }]);
    const res = await request(app)
      .post('/api/funding/1/categories')
      .send({ amount_spent: 10 });
    expect(res.status).toBe(400);
  });
  it('should 400 on missing amount_spent (add category)', async () => {
    db.executeQuery.mockResolvedValueOnce([{ role_name: 'researcher' }]);
    const res = await request(app)
      .post('/api/funding/1/categories')
      .send({ category: 'Equipment' });
    expect(res.status).toBe(400);
  });
  it('should 404 if funding not found (add category)', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([]); // fundingArr
    const res = await request(app)
      .post('/api/funding/1/categories')
      .send({ category: 'Equipment', amount_spent: 10 });
    expect(res.status).toBe(404);
  });
  it('should 500 on DB error (add category)', async () => {
    db.executeQuery.mockRejectedValueOnce({ code: 'ER_FAKE' });
    const res = await request(app)
      .post('/api/funding/1/categories')
      .send({ category: 'Equipment', amount_spent: 10 });
    expect(res.status).toBe(500);
  });
  it('should 401 on auth error (add category)', async () => {
    getUserIdFromToken.mockRejectedValueOnce(new Error('bad auth'));
    const res = await request(app)
      .post('/api/funding/1/categories')
      .send({ category: 'Equipment', amount_spent: 10 });
    expect(res.status).toBe(401);
  });

  // PUT /:projectId/categories/:categoryId
  it('should update a funding category', async () => {
    db.executeQuery.mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce({ affectedRows: 1 });
    const res = await request(app)
      .put('/api/funding/1/categories/2')
      .send({ category: 'Equipment', amount_spent: 20 });
    expect(res.status).toBe(200);
  });
  it('should 403 if not a researcher (update category)', async () => {
    db.executeQuery.mockResolvedValueOnce([]); // roles
    const res = await request(app)
      .put('/api/funding/1/categories/2')
      .send({ category: 'Equipment', amount_spent: 20 });
    expect(res.status).toBe(403);
  });
  it('should 400 on missing category (update category)', async () => {
    db.executeQuery.mockResolvedValueOnce([{ role_name: 'researcher' }]);
    const res = await request(app)
      .put('/api/funding/1/categories/2')
      .send({ amount_spent: 20 });
    expect(res.status).toBe(400);
  });
  it('should 400 on missing amount_spent (update category)', async () => {
    db.executeQuery.mockResolvedValueOnce([{ role_name: 'researcher' }]);
    const res = await request(app)
      .put('/api/funding/1/categories/2')
      .send({ category: 'Equipment' });
    expect(res.status).toBe(400);
  });
  it('should 404 if not found (update category)', async () => {
    db.executeQuery.mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce({ affectedRows: 0 });
    const res = await request(app)
      .put('/api/funding/1/categories/2')
      .send({ category: 'Equipment', amount_spent: 20 });
    expect(res.status).toBe(404);
  });
  it('should 500 on DB error (update category)', async () => {
    db.executeQuery.mockRejectedValueOnce({ code: 'ER_FAKE' });
    const res = await request(app)
      .put('/api/funding/1/categories/2')
      .send({ category: 'Equipment', amount_spent: 20 });
    expect(res.status).toBe(500);
  });
  it('should 401 on auth error (update category)', async () => {
    getUserIdFromToken.mockRejectedValueOnce(new Error('bad auth'));
    const res = await request(app)
      .put('/api/funding/1/categories/2')
      .send({ category: 'Equipment', amount_spent: 20 });
    expect(res.status).toBe(401);
  });

  // DELETE /:projectId/categories/:categoryId
  it('should delete a funding category', async () => {
    db.executeQuery.mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce({ affectedRows: 1 });
    const res = await request(app)
      .delete('/api/funding/1/categories/2');
    expect(res.status).toBe(200);
  });
  it('should 403 if not a researcher (delete category)', async () => {
    db.executeQuery.mockResolvedValueOnce([]); // roles
    const res = await request(app)
      .delete('/api/funding/1/categories/2');
    expect(res.status).toBe(403);
  });
  it('should 404 if not found (delete category)', async () => {
    db.executeQuery.mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce({ affectedRows: 0 });
    const res = await request(app)
      .delete('/api/funding/1/categories/2');
    expect(res.status).toBe(404);
  });
  it('should 500 on DB error (delete category)', async () => {
    db.executeQuery.mockRejectedValueOnce({ code: 'ER_FAKE' });
    const res = await request(app)
      .delete('/api/funding/1/categories/2');
    expect(res.status).toBe(500);
  });
  it('should 401 on auth error (delete category)', async () => {
    getUserIdFromToken.mockRejectedValueOnce(new Error('bad auth'));
    const res = await request(app)
      .delete('/api/funding/1/categories/2');
    expect(res.status).toBe(401);
  });

  // DELETE /:projectId
  it('should delete funding and categories', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([{ funding_ID: 1 }])
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const res = await request(app)
      .delete('/api/funding/1');
    expect(res.status).toBe(200);
  });
  it('should 403 if not a researcher (delete funding)', async () => {
    db.executeQuery.mockResolvedValueOnce([]); // roles
    const res = await request(app)
      .delete('/api/funding/1');
    expect(res.status).toBe(403);
  });
  it('should 404 if not found (delete funding)', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([]); // fundingArr
    const res = await request(app)
      .delete('/api/funding/1');
    expect(res.status).toBe(404);
  });
  it('should 500 on DB error (delete funding)', async () => {
    db.executeQuery.mockRejectedValueOnce({ code: 'ER_FAKE' });
    const res = await request(app)
      .delete('/api/funding/1');
    expect(res.status).toBe(500);
  });
  it('should 401 on auth error (delete funding)', async () => {
    getUserIdFromToken.mockRejectedValueOnce(new Error('bad auth'));
    const res = await request(app)
      .delete('/api/funding/1');
    expect(res.status).toBe(401);
  });

  // PDF Report: GET /report
  it('should return a PDF funding report', (done) => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }]) // roles
      .mockResolvedValueOnce([{ project_ID: 1, title: 'P1', description: 'desc', funding_ID: 1, total_awarded: 100, grant_status: 'active' }]) // projects
      .mockResolvedValueOnce([{ category: 'Personnel', amount_spent: 50 }]); // categories
    request(app)
      .get('/api/funding/report')
      .buffer()
      .parse((res, cb) => {
        res.setEncoding('binary');
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => { cb(null, Buffer.from(data, 'binary')); });
      })
      .end((err, res) => {
        expect(res.headers['content-type']).toMatch(/pdf/);
        done(err);
      });
  });
  it('should handle error during chart generation and still end PDF', (done) => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }]) // roles
      .mockResolvedValueOnce([{ project_ID: 1, title: 'P1', description: 'desc', funding_ID: 1, total_awarded: 100, grant_status: 'active' }]) // projects
      .mockResolvedValueOnce([{ category: 'Personnel', amount_spent: 50 }]); // categories
    // Mock ChartJSNodeCanvas to throw
    const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
    ChartJSNodeCanvas.mockImplementationOnce(() => ({
      renderToBuffer: jest.fn().mockRejectedValue(new Error('chart error'))
    }));
    request(app)
      .get('/api/funding/report')
      .buffer()
      .parse((res, cb) => {
        res.setEncoding('binary');
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => { cb(null, Buffer.from(data, 'binary')); });
      })
      .end((err, res) => {
        expect(res.headers['content-type']).toMatch(/pdf/);
        done(err);
      });
  });
  it('should skip project if error thrown in project processing and continue', (done) => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }]) // roles
      .mockResolvedValueOnce([{ project_ID: 1, title: 'P1', description: 'desc', funding_ID: 1, total_awarded: 100, grant_status: 'active' }]) // projects
      .mockRejectedValueOnce(new Error('category error')) // categories (throws)
      .mockResolvedValueOnce([{ project_ID: 2, title: 'P2', description: 'desc', funding_ID: 2, total_awarded: 200, grant_status: 'active' }]) // next project
      .mockResolvedValueOnce([{ category: 'Equipment', amount_spent: 100 }]); // categories for next project
    request(app)
      .get('/api/funding/report')
      .buffer()
      .parse((res, cb) => {
        res.setEncoding('binary');
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => { cb(null, Buffer.from(data, 'binary')); });
      })
      .end((err, res) => {
        expect(res.headers['content-type']).toMatch(/pdf/);
        done(err);
      });
  });
});

afterAll(() => { jest.clearAllMocks(); }); 