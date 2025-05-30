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
    jest.clearAllMocks();
    extractToken.mockReturnValue(mockToken);
    getUserIdFromToken.mockResolvedValue(mockUserId);
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

  it('should not include duplicate collaborators in GET /', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([{ project_ID: 1, title: 'P1', owner_ID: mockUserId }])
      .mockResolvedValueOnce([{ milestone_ID: 1, title: 'M1', assigned_user_ID: null }])
      .mockResolvedValueOnce([{ user_ID: mockUserId, fname: 'A', sname: 'B' }])
      .mockResolvedValueOnce([
        { user_ID: 'u2', fname: 'C', sname: 'D' },
        { user_ID: mockUserId, fname: 'A', sname: 'B' } // duplicate of owner
      ])
      .mockResolvedValueOnce([]);
    const res = await request(app).get('/api/milestones');
    expect(res.status).toBe(200);
    const collabs = res.body.projects[0].collaborators;
    const ids = collabs.map(c => c.user_ID);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toHaveLength(0); // no duplicates
  });

  it('should calculate correct summary percentages in GET /', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([{ project_ID: 1, title: 'P1', owner_ID: mockUserId }])
      .mockResolvedValueOnce([
        { milestone_ID: 1, title: 'M1', status: 'Completed' },
        { milestone_ID: 2, title: 'M2', status: 'Completed' },
        { milestone_ID: 3, title: 'M3', status: 'Not Started' }
      ])
      .mockResolvedValueOnce([{ user_ID: mockUserId, fname: 'A', sname: 'B' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { status: 'Completed' },
        { status: 'Completed' },
        { status: 'Not Started' }
      ]);
    const res = await request(app).get('/api/milestones');
    expect(res.status).toBe(200);
    expect(res.body.summary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: 'Completed', count: 2, percentage: 66.66666666666666 }),
        expect.objectContaining({ status: 'Not Started', count: 1, percentage: 33.33333333333333 })
      ])
    );
  });

  it('should return empty projects and summary if no projects in GET /', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const res = await request(app).get('/api/milestones');
    expect(res.status).toBe(200);
    expect(res.body.projects).toEqual([]);
    expect(res.body.summary).toEqual([]);
  });

  it('should return project with no milestones in GET /', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([{ project_ID: 1, title: 'P1', owner_ID: mockUserId }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ user_ID: mockUserId, fname: 'A', sname: 'B' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const res = await request(app).get('/api/milestones');
    expect(res.status).toBe(200);
    expect(res.body.projects[0].milestones).toEqual([]);
  });

  it('should create milestone with only required fields', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce({ insertId: 2 });
    const res = await request(app)
      .post('/api/milestones/1')
      .send({ title: 'T' });
    expect(res.status).toBe(201);
    expect(res.body.milestone_ID).toBe(2);
  });

  it('should allow assigned_user_ID as owner', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([{ user_ID: mockUserId }])
      .mockResolvedValueOnce([{ user_ID: mockUserId }])
      .mockResolvedValueOnce({ insertId: 3 });
    const res = await request(app)
      .post('/api/milestones/1')
      .send({ title: 'T', assigned_user_ID: mockUserId });
    expect(res.status).toBe(201);
    expect(res.body.milestone_ID).toBe(3);
  });

  it('should allow assigned_user_ID as collaborator', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([{ user_ID: 'u2' }])
      .mockResolvedValueOnce([{ user_ID: 'u2' }])
      .mockResolvedValueOnce({ insertId: 4 });
    const res = await request(app)
      .post('/api/milestones/1')
      .send({ title: 'T', assigned_user_ID: 'u2' });
    expect(res.status).toBe(201);
    expect(res.body.milestone_ID).toBe(4);
  });

  it('should 400 if assigned_user_ID is not a collaborator or owner', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([{ user_ID: 'u3' }])
      .mockResolvedValueOnce([]);
    const res = await request(app)
      .post('/api/milestones/1')
      .send({ title: 'T', assigned_user_ID: 'u3' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/not a collaborator or owner/);
  });

  it('should 400 if assigned_user_ID does not exist', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([]);
    const res = await request(app)
      .post('/api/milestones/1')
      .send({ title: 'T', assigned_user_ID: 'u4' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/does not exist/);
  });

  it('should 500 if error thrown in collaborators query', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([{ project_ID: 1, title: 'P1', owner_ID: mockUserId }])
      .mockResolvedValueOnce([{ milestone_ID: 1, title: 'M1', assigned_user_ID: null }])
      .mockResolvedValueOnce([{ user_ID: mockUserId, fname: 'A', sname: 'B' }])
      .mockRejectedValueOnce({ code: 'ER_FAKE' });
    const res = await request(app).get('/api/milestones');
    expect(res.status).toBe(500);
  });

  it('should 500 if error thrown in owner query', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([{ project_ID: 1, title: 'P1', owner_ID: mockUserId }])
      .mockResolvedValueOnce([{ milestone_ID: 1, title: 'M1', assigned_user_ID: null }])
      .mockRejectedValueOnce({ code: 'ER_FAKE' });
    const res = await request(app).get('/api/milestones');
    expect(res.status).toBe(500);
  });

  it('should 500 if error thrown in milestones query', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([{ project_ID: 1, title: 'P1', owner_ID: mockUserId }])
      .mockRejectedValueOnce({ code: 'ER_FAKE' });
    const res = await request(app).get('/api/milestones');
    expect(res.status).toBe(500);
  });

  it('should 500 if error thrown in summary query', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([{ project_ID: 1, title: 'P1', owner_ID: mockUserId }])
      .mockResolvedValueOnce([{ milestone_ID: 1, title: 'M1', assigned_user_ID: null }])
      .mockResolvedValueOnce([{ user_ID: mockUserId, fname: 'A', sname: 'B' }])
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce({ code: 'ER_FAKE' });
    const res = await request(app).get('/api/milestones');
    expect(res.status).toBe(500);
  });

  it('should handle DB error in milestone update with assigned user', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }]) // roles check
      .mockResolvedValueOnce([{ user_ID: 'u2' }]) // user check
      .mockRejectedValueOnce({ code: 'ER_FAKE' }); // collab check

    const res = await request(app)
      .put('/api/milestones/1/1')
      .send({ title: 'T', assigned_user_ID: 'u2' });
    expect(res.status).toBe(500);
  });

  it('should handle DB error in milestone creation with assigned user', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }]) // roles check
      .mockResolvedValueOnce([{ user_ID: 'u2' }]) // user check
      .mockRejectedValueOnce({ code: 'ER_FAKE' }); // collab check

    const res = await request(app)
      .post('/api/milestones/1')
      .send({ title: 'T', assigned_user_ID: 'u2' });
    expect(res.status).toBe(500);
  });

  it('should handle DB error in milestone deletion', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }]) // roles check
      .mockRejectedValueOnce({ code: 'ER_FAKE' }); // delete

    const res = await request(app).delete('/api/milestones/1/1');
    expect(res.status).toBe(500);
  });

  it('should handle update with invalid date format', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }]); // roles check

    const res = await request(app)
      .put('/api/milestones/1/1')
      .send({
        title: 'T',
        expected_completion_date: '31-12-2024' // Invalid format
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/expected_completion_date must be in YYYY-MM-DD format/);
  });

  it('should handle update with invalid status', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }]); // roles check

    const res = await request(app)
      .put('/api/milestones/1/1')
      .send({
        title: 'T',
        status: 'InvalidStatus'
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Status must be one of/);
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
    jest.clearAllMocks();
    extractToken.mockReturnValue(mockToken);
    getUserIdFromToken.mockResolvedValue(mockUserId);
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

describe('Milestones Report Generation', () => {
  let app;
  let mockToken = 'mock-token';
  let mockUserId = 'user-1';

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/milestones', milestonesRoutes);
    jest.clearAllMocks();
    extractToken.mockReturnValue(mockToken);
    getUserIdFromToken.mockResolvedValue(mockUserId);
  });

  it('should generate PDF report with pie chart for milestone statistics', async () => {
    // Mock researcher role check
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }]) // roles check
      .mockResolvedValueOnce([
        { project_ID: 1, title: 'Project 1', owner_ID: mockUserId }
      ]) // projects
      .mockResolvedValueOnce([
        { milestone_ID: 1, title: 'M1', status: 'Not Started' },
        { milestone_ID: 2, title: 'M2', status: 'In Progress' },
        { milestone_ID: 3, title: 'M3', status: 'Completed' }
      ]) // milestones
      .mockResolvedValueOnce([{ user_ID: mockUserId, fname: 'John', sname: 'Doe' }]) // owner
      .mockResolvedValueOnce([]); // collaborators

    const res = await request(app)
      .get('/api/milestones/report/generate')
      .expect(200);

    expect(res.headers['content-type']).toMatch(/pdf/);
    expect(PDFDocument).toHaveBeenCalled();
  });

  it('should handle empty milestone data in report generation', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([{ project_ID: 1, title: 'Project 1', owner_ID: mockUserId }])
      .mockResolvedValueOnce([]) // no milestones
      .mockResolvedValueOnce([{ user_ID: mockUserId, fname: 'John', sname: 'Doe' }])
      .mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/milestones/report/generate')
      .expect(200);

    expect(res.headers['content-type']).toMatch(/pdf/);
  });

  it('should handle multiple projects with milestones in report', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([
        { project_ID: 1, title: 'Project 1', owner_ID: mockUserId },
        { project_ID: 2, title: 'Project 2', owner_ID: mockUserId }
      ])
      .mockResolvedValueOnce([
        { milestone_ID: 1, title: 'M1', status: 'Not Started' },
        { milestone_ID: 2, title: 'M2', status: 'In Progress' }
      ])
      .mockResolvedValueOnce([{ user_ID: mockUserId, fname: 'John', sname: 'Doe' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { milestone_ID: 3, title: 'M3', status: 'Completed' },
        { milestone_ID: 4, title: 'M4', status: 'Not Started' }
      ])
      .mockResolvedValueOnce([{ user_ID: mockUserId, fname: 'John', sname: 'Doe' }])
      .mockResolvedValueOnce([]);

    const res = await request(app)
      .get('/api/milestones/report/generate')
      .expect(200);

    expect(res.headers['content-type']).toMatch(/pdf/);
  });

  it('should handle projects with collaborators in report', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([{ project_ID: 1, title: 'Project 1', owner_ID: mockUserId }])
      .mockResolvedValueOnce([
        { milestone_ID: 1, title: 'M1', status: 'Not Started' }
      ])
      .mockResolvedValueOnce([{ user_ID: mockUserId, fname: 'John', sname: 'Doe' }])
      .mockResolvedValueOnce([
        { user_ID: 'u2', fname: 'Jane', sname: 'Smith' }
      ]);

    const res = await request(app)
      .get('/api/milestones/report/generate')
      .expect(200);

    expect(res.headers['content-type']).toMatch(/pdf/);
  });

  it('should handle error during report generation', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockRejectedValueOnce(new Error('Database error'));

    const res = await request(app)
      .get('/api/milestones/report/generate')
      .expect(500);

    expect(res.body.error).toBeDefined();
  });

  it('should handle missing owner information in report', async () => {
    db.executeQuery
      .mockResolvedValueOnce([{ role_name: 'researcher' }])
      .mockResolvedValueOnce([{ project_ID: 1, title: 'Project 1', owner_ID: mockUserId }])
      .mockResolvedValueOnce([
        { milestone_ID: 1, title: 'M1', status: 'Not Started' }
      ])
      .mockResolvedValueOnce([]) // no owner found
      .mockResolvedValueOnce([]); // collaborators

    const res = await request(app)
      .get('/api/milestones/report/generate')
      .expect(200);

    expect(res.headers['content-type']).toMatch(/pdf/);
    // Verify that the error was logged
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining('Owner information not found for project')
    );
  });
});

afterAll(() => { jest.clearAllMocks(); }); 