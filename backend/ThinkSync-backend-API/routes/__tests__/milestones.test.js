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
  const { ChartJSNodeCanvas } = require('chartjs-node-canvas');

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/milestones', milestonesRoutes);
    extractToken.mockReturnValue(mockToken);
    getUserIdFromToken.mockResolvedValue(mockUserId);
    jest.clearAllMocks();
  });

  it('should handle multiple projects with milestones in GET /', async () => {
    // Mock researcher role check
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }]) // roles check
      .mockResolvedValueOnce([
        { project_ID: 1, title: 'P1', owner_ID: mockUserId },
        { project_ID: 2, title: 'P2', owner_ID: mockUserId }
      ]) // projects
      .mockResolvedValueOnce([{ milestone_ID: 1, title: 'M1', status: 'Not Started' }]) // milestones for P1
      .mockResolvedValueOnce([{ user_ID: mockUserId, fname: 'A', sname: 'B' }]) // owner for P1
      .mockResolvedValueOnce([]) // collaborators for P1
      .mockResolvedValueOnce([{ milestone_ID: 2, title: 'M2', status: 'In Progress' }]) // milestones for P2
      .mockResolvedValueOnce([{ user_ID: mockUserId, fname: 'A', sname: 'B' }]) // owner for P2
      .mockResolvedValueOnce([]) // collaborators for P2
      .mockResolvedValueOnce([
        { status: 'Not Started' },
        { status: 'In Progress' }
      ]); // allMilestones for summary

    const res = await request(app).get('/api/milestones');
    expect(res.status).toBe(200);
    expect(res.body.projects).toHaveLength(2);
    expect(res.body.summary).toHaveLength(2);
  });

  it('should handle projects with collaborators in GET /', async () => {
    // Mock researcher role check
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }]) // roles check
      .mockResolvedValueOnce([{ project_ID: 1, title: 'P1', owner_ID: mockUserId }]) // projects
      .mockResolvedValueOnce([{ milestone_ID: 1, title: 'M1', status: 'Not Started' }]) // milestones
      .mockResolvedValueOnce([{ user_ID: mockUserId, fname: 'A', sname: 'B' }]) // owner
      .mockResolvedValueOnce([{ user_ID: 'u2', fname: 'C', sname: 'D' }]) // collaborators
      .mockResolvedValueOnce([{ status: 'Not Started' }]); // allMilestones

    const res = await request(app).get('/api/milestones');
    expect(res.status).toBe(200);
    expect(res.body.projects[0].collaborators).toHaveLength(2);
  });
});

describe('validateMilestoneFields', () => {
  const validateMilestoneFields = require('../milestones').validateMilestoneFields;

  it('should return null for valid fields', () => {
    const result = validateMilestoneFields({
      title: 'Valid Title',
      description: 'Valid Description',
      expected_completion_date: '2024-12-31',
      status: 'Not Started'
    });
    expect(result).toBeNull();
  });

  it('should return error for missing title', () => {
    const result = validateMilestoneFields({
      description: 'Valid Description',
      expected_completion_date: '2024-12-31',
      status: 'Not Started'
    });
    expect(result).toMatch(/Title is required/);
  });

  it('should return error for empty title', () => {
    const result = validateMilestoneFields({
      title: '   ',
      description: 'Valid Description',
      expected_completion_date: '2024-12-31',
      status: 'Not Started'
    });
    expect(result).toMatch(/Title is required/);
  });

  it('should return error for non-string title', () => {
    const result = validateMilestoneFields({
      title: 123,
      description: 'Valid Description',
      expected_completion_date: '2024-12-31',
      status: 'Not Started'
    });
    expect(result).toMatch(/Title is required/);
  });

  it('should return error for non-string description', () => {
    const result = validateMilestoneFields({
      title: 'Valid Title',
      description: 123,
      expected_completion_date: '2024-12-31',
      status: 'Not Started'
    });
    expect(result).toMatch(/Description must be a string/);
  });

  it('should accept null description', () => {
    const result = validateMilestoneFields({
      title: 'Valid Title',
      description: null,
      expected_completion_date: '2024-12-31',
      status: 'Not Started'
    });
    expect(result).toBeNull();
  });

  it('should accept undefined description', () => {
    const result = validateMilestoneFields({
      title: 'Valid Title',
      description: undefined,
      expected_completion_date: '2024-12-31',
      status: 'Not Started'
    });
    expect(result).toBeNull();
  });

  it('should accept null expected_completion_date', () => {
    const result = validateMilestoneFields({
      title: 'Valid Title',
      description: 'Valid Description',
      expected_completion_date: null,
      status: 'Not Started'
    });
    expect(result).toBeNull();
  });

  it('should accept undefined expected_completion_date', () => {
    const result = validateMilestoneFields({
      title: 'Valid Title',
      description: 'Valid Description',
      expected_completion_date: undefined,
      status: 'Not Started'
    });
    expect(result).toBeNull();
  });

  it('should return error for invalid date format', () => {
    const result = validateMilestoneFields({
      title: 'Valid Title',
      description: 'Valid Description',
      expected_completion_date: '12/31/2024',
      status: 'Not Started'
    });
    expect(result).toMatch(/expected_completion_date must be in YYYY-MM-DD format/);
  });

  it('should return error for invalid status', () => {
    const result = validateMilestoneFields({
      title: 'Valid Title',
      description: 'Valid Description',
      expected_completion_date: '2024-12-31',
      status: 'Invalid Status'
    });
    expect(result).toMatch(/Status must be one of/);
  });

  it('should accept null status', () => {
    const result = validateMilestoneFields({
      title: 'Valid Title',
      description: 'Valid Description',
      expected_completion_date: '2024-12-31',
      status: null
    });
    expect(result).toBeNull();
  });

  it('should accept undefined status', () => {
    const result = validateMilestoneFields({
      title: 'Valid Title',
      description: 'Valid Description',
      expected_completion_date: '2024-12-31',
      status: undefined
    });
    expect(result).toBeNull();
  });
});

afterAll(() => { jest.clearAllMocks(); }); 