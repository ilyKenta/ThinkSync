const request = require('supertest');
const express = require('express');
const milestonesRoutes = require('../milestones');
const db = require('../../db');
const { getUserIdFromToken, extractToken } = require('../../utils/auth');
const PDFDocument = require('pdfkit');

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
        if (res && typeof res.end === 'function') {
          // Debug log for test
          // eslint-disable-next-line no-console
          console.log('[PDFKit mock] doc.end() called, ending response');
          res.end();
        }
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

describe('Milestones API', () => {
  let app;
  let mockToken = 'mock-token';
  let mockUserId = 'user-1';

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/milestones', milestonesRoutes);
    extractToken.mockReturnValue(mockToken);
    getUserIdFromToken.mockResolvedValue(mockUserId);
    jest.clearAllMocks();
  });

  // --- GET / ---
  it('should return projects, milestones, collaborators, and summary for a researcher', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }]) // roles
      .mockResolvedValueOnce([{ project_ID: 1, title: 'P1', owner_ID: mockUserId }]) // projects
      .mockResolvedValueOnce([{ milestone_ID: 1, title: 'M1', assigned_user_ID: null }]) // milestones
      .mockResolvedValueOnce([{ user_ID: mockUserId, fname: 'A', sname: 'B' }]) // owner
      .mockResolvedValueOnce([]) // collaborators
      .mockResolvedValueOnce([]) // allMilestones
    ;
    const res = await request(app).get('/api/milestones');
    expect(res.status).toBe(200);
    expect(res.body.projects).toBeDefined();
    expect(res.body.summary).toBeDefined();
  });

  it('should return 403 if not a researcher', async () => {
    db.executeQuery.mockResolvedValueOnce([]); // roles
    const res = await request(app).get('/api/milestones');
    expect(res.status).toBe(403);
  });

  it('should handle DB error with 500', async () => {
    db.executeQuery.mockRejectedValueOnce({ code: 'ER_FAKE' });
    const res = await request(app).get('/api/milestones');
    expect(res.status).toBe(500);
  });

  it('should handle auth error with 401', async () => {
    getUserIdFromToken.mockRejectedValueOnce(new Error('bad auth'));
    const res = await request(app).get('/api/milestones');
    expect(res.status).toBe(401);
  });

  // --- POST /:projectId ---
  it('should create a milestone', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }]) // roles
      .mockResolvedValueOnce({ insertId: 1 });
    const res = await request(app)
      .post('/api/milestones/1')
      .send({ title: 'T', description: 'D', status: 'Not Started' });
    expect(res.status).toBe(201);
    expect(res.body.milestone_ID).toBe(1);
  });

  it('should 403 if not a researcher', async () => {
    db.executeQuery.mockResolvedValueOnce([]); // roles
    const res = await request(app)
      .post('/api/milestones/1')
      .send({ title: 'T', description: 'D', status: 'Not Started' });
    expect(res.status).toBe(403);
  });

  it('should 400 on validation error', async () => {
    db.executeQuery.mockResolvedValueOnce([{ role_name: 'researcher' }]);
    const res = await request(app)
      .post('/api/milestones/1')
      .send({ title: '', description: 'D', status: 'Not Started' });
    expect(res.status).toBe(400);
  });

  it('should 400 if assigned_user_ID not found', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([]); // userCheck
    const res = await request(app)
      .post('/api/milestones/1')
      .send({ title: 'T', description: 'D', assigned_user_ID: 'bad', status: 'Not Started' });
    expect(res.status).toBe(400);
  });

  it('should 400 if assigned_user_ID not a collaborator/owner', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([{ user_ID: 'good' }]) // userCheck
      .mockResolvedValueOnce([]); // collabCheck
    const res = await request(app)
      .post('/api/milestones/1')
      .send({ title: 'T', description: 'D', assigned_user_ID: 'bad', status: 'Not Started' });
    expect(res.status).toBe(400);
  });

  it('should 500 on DB error', async () => {
    db.executeQuery.mockResolvedValueOnce([{ role_name: 'researcher' }]);
    db.executeQuery.mockRejectedValueOnce({ code: 'ER_FAKE' });
    const res = await request(app)
      .post('/api/milestones/1')
      .send({ title: 'T', description: 'D', status: 'Not Started' });
    expect(res.status).toBe(500);
  });

  it('should 401 on auth error', async () => {
    getUserIdFromToken.mockRejectedValueOnce(new Error('bad auth'));
    const res = await request(app)
      .post('/api/milestones/1')
      .send({ title: 'T', description: 'D', status: 'Not Started' });
    expect(res.status).toBe(401);
  });

  it('should 403 if not a researcher (report)', async () => {
    db.executeQuery.mockResolvedValueOnce([]); // roles
    const res = await request(app).get('/api/milestones/report/generate');
    expect(res.status).toBe(403);
  });

  it('should 500 on DB error (report)', async () => {
    db.executeQuery.mockResolvedValueOnce([{ role_name: 'researcher' }]);
    db.executeQuery.mockRejectedValueOnce({ code: 'ER_FAKE' });
    const res = await request(app).get('/api/milestones/report/generate');
    expect(res.status).toBe(500);
  });

  it('should hit the PDF report route and return a PDF content-type', (done) => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }]) // roles
      .mockResolvedValueOnce([]); // projects
    request(app)
      .get('/api/milestones/report/generate')
      .expect(200)
      .end((err, res) => {
        expect(res.headers['content-type']).toMatch(/pdf/);
        const PDFDocument = require('pdfkit');
        expect(PDFDocument).toHaveBeenCalled();
        done(err);
      });
  });

  // --- GET /:milestoneId ---
  it('should return milestone and collaborators', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }]) // roles
      .mockResolvedValueOnce([{ milestone_ID: 1, project_ID: 1 }]) // milestones
      .mockResolvedValueOnce([{ user_ID: 'u1', fname: 'A', sname: 'B' }]); // collaborators
    const res = await request(app).get('/api/milestones/1');
    expect(res.status).toBe(200);
    expect(res.body.milestone).toBeDefined();
    expect(res.body.collaborators).toBeDefined();
  });

  it('should 403 if not a researcher (milestone)', async () => {
    db.executeQuery.mockResolvedValueOnce([]); // roles
    const res = await request(app).get('/api/milestones/1');
    expect(res.status).toBe(403);
  });

  it('should 404 if not found', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([]); // milestones
    const res = await request(app).get('/api/milestones/1');
    expect(res.status).toBe(404);
  });

  it('should 500 on DB error (milestone)', async () => {
    db.executeQuery.mockRejectedValue({ code: 'ER_FAKE' });
    const res = await request(app).get('/api/milestones/1');
    expect(res.status).toBe(500);
  });

  it('should 401 on auth error (milestone)', async () => {
    getUserIdFromToken.mockRejectedValue(new Error('bad auth'));
    const res = await request(app).get('/api/milestones/1');
    expect(res.status).toBe(401);
  });

  // --- PUT /:projectId/:milestoneId ---
  it('should update a milestone', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }]) // roles
      .mockResolvedValueOnce({ affectedRows: 1 });
    const res = await request(app)
      .put('/api/milestones/1/1')
      .send({ title: 'T', description: 'D', status: 'Not Started' });
    expect(res.status).toBe(200);
  });

  it('should 403 if not a researcher (update)', async () => {
    db.executeQuery.mockResolvedValueOnce([]); // roles
    const res = await request(app)
      .put('/api/milestones/1/1')
      .send({ title: 'T', description: 'D', status: 'Not Started' });
    expect(res.status).toBe(403);
  });

  it('should 400 on validation error (update)', async () => {
    db.executeQuery.mockResolvedValueOnce([{ role_name: 'researcher' }]);
    const res = await request(app)
      .put('/api/milestones/1/1')
      .send({ title: '', description: 'D', status: 'Not Started' });
    expect(res.status).toBe(400);
  });

  it('should 400 if assigned_user_ID not found (update)', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([]); // userCheck
    const res = await request(app)
      .put('/api/milestones/1/1')
      .send({ title: 'T', description: 'D', assigned_user_ID: 'bad', status: 'Not Started' });
    expect(res.status).toBe(400);
  });

  it('should 400 if assigned_user_ID not a collaborator/owner (update)', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([{ user_ID: 'good' }]) // userCheck
      .mockResolvedValueOnce([]); // collabCheck
    const res = await request(app)
      .put('/api/milestones/1/1')
      .send({ title: 'T', description: 'D', assigned_user_ID: 'bad', status: 'Not Started' });
    expect(res.status).toBe(400);
  });

  it('should 404 if not found (update)', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce({ affectedRows: 0 });
    const res = await request(app)
      .put('/api/milestones/1/1')
      .send({ title: 'T', description: 'D', status: 'Not Started' });
    expect(res.status).toBe(404);
  });

  it('should 500 on DB error (update)', async () => {
    db.executeQuery.mockRejectedValue({ code: 'ER_FAKE' });
    const res = await request(app)
      .put('/api/milestones/1/1')
      .send({ title: 'T', description: 'D', status: 'Not Started' });
    expect(res.status).toBe(500);
  });

  it('should 401 on auth error (update)', async () => {
    getUserIdFromToken.mockRejectedValue(new Error('bad auth'));
    const res = await request(app)
      .put('/api/milestones/1/1')
      .send({ title: 'T', description: 'D', status: 'Not Started' });
    expect(res.status).toBe(401);
  });

  // --- DELETE /:projectId/:milestoneId ---
  it('should delete a milestone', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce({ affectedRows: 1 });
    const res = await request(app)
      .delete('/api/milestones/1/1');
    expect(res.status).toBe(200);
  });

  it('should 403 if not a researcher (delete)', async () => {
    db.executeQuery.mockResolvedValueOnce([]); // roles
    const res = await request(app)
      .delete('/api/milestones/1/1');
    expect(res.status).toBe(403);
  });

  it('should 404 if not found (delete)', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce({ affectedRows: 0 });
    const res = await request(app)
      .delete('/api/milestones/1/1');
    expect(res.status).toBe(404);
  });

  it('should 500 on DB error (delete)', async () => {
    db.executeQuery.mockRejectedValue({ code: 'ER_FAKE' });
    const res = await request(app)
      .delete('/api/milestones/1/1');
    expect(res.status).toBe(500);
  });

  it('should 401 on auth error (delete)', async () => {
    getUserIdFromToken.mockRejectedValue(new Error('bad auth'));
    const res = await request(app)
      .delete('/api/milestones/1/1');
    expect(res.status).toBe(401);
  });
});

describe('validateMilestoneFields', () => {
  const validateMilestoneFields = require('../milestones').validateMilestoneFields;
  it('should return error for invalid expected_completion_date', () => {
    const result = validateMilestoneFields({ title: 'T', expected_completion_date: 'not-a-date' });
    expect(result).toMatch(/expected_completion_date/);
  });
  it('should return error for invalid status', () => {
    const result = validateMilestoneFields({ title: 'T', status: 'BadStatus' });
    expect(result).toMatch(/Status must be one of/);
  });
});

describe('Milestones API edge cases', () => {
  let app;
  let mockToken = 'mock-token';
  let mockUserId = 'user-1';
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/milestones', require('../milestones'));
    extractToken.mockReturnValue(mockToken);
    getUserIdFromToken.mockResolvedValue(mockUserId);
    jest.clearAllMocks();
  });

  it('should 500 if owner info not found in GET /', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }]) // roles
      .mockResolvedValueOnce([{ project_ID: 1, title: 'P1', owner_ID: mockUserId }]) // projects
      .mockResolvedValueOnce([]); // owner not found
    const res = await request(app).get('/api/milestones');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/server error/i);
  });

  it('should return empty summary if no milestones in GET /', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }]) // roles
      .mockResolvedValueOnce([]) // projects
      .mockResolvedValueOnce([]); // allMilestones
    const res = await request(app).get('/api/milestones');
    expect(res.status).toBe(200);
    expect(res.body.summary).toEqual([]);
  });

  it('should 500 on DB error with code in GET /', async () => {
    db.executeQuery.mockRejectedValueOnce({ code: 'ER_FAKE' });
    const res = await request(app).get('/api/milestones');
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/server error/i);
  });

  it('should 401 on other error in GET /', async () => {
    db.executeQuery.mockRejectedValueOnce(new Error('bad auth'));
    const res = await request(app).get('/api/milestones');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/bad auth/);
  });

  it('should skip project if error thrown in project processing in PDF report', (done) => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }]) // roles
      .mockResolvedValueOnce([{ project_ID: 1, title: 'P1', owner_ID: mockUserId }]) // projects
      .mockRejectedValueOnce(new Error('milestone error')) // milestones (throws)
      .mockResolvedValueOnce([{ user_ID: mockUserId, fname: 'A', sname: 'B' }]) // owner
      .mockResolvedValueOnce([]) // collaborators
      .mockResolvedValueOnce([]); // allMilestones for summary
    request(app)
      .get('/api/milestones/report/generate')
      .end((err, res) => {
        if (err) return done(err);
        expect(res.headers['content-type']).toMatch(/pdf/);
        done();
      });
  });
});

afterAll(() => { jest.clearAllMocks(); }); 