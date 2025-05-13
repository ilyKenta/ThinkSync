const express = require('express');
const request = require('supertest');
const adminRouter = require('../admin');
const db = require('../../db');

// Mock db module
jest.mock('../../db', () => ({
  executeQuery: jest.fn()
}));

// Mock auth utilities
jest.mock('../../utils/auth', () => ({
  getUserIdFromToken: jest.fn(),
  extractToken: jest.fn()
}));

describe('Admin Routes', () => {
  let app;
  const mockToken = 'mock-token';
  const mockUserId = 'user-123';

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/admin', adminRouter);
    jest.clearAllMocks();
    db.executeQuery.mockReset();

    // Setup default mocks
    require('../../utils/auth').getUserIdFromToken.mockResolvedValue(mockUserId);
    require('../../utils/auth').extractToken.mockReturnValue(mockToken);
  });

  describe('GET /users', () => {
    const mockUsers = [
      {
        user_ID: '1',
        fname: 'John',
        sname: 'Doe',
        phone_number: '1234567890',
        department: 'IT',
        acc_role: 'admin',
        roles: 'admin, reviewer'
      }
    ];

    it('should return all users with roles', async () => {
      db.executeQuery
        .mockResolvedValueOnce([{ role_name: 'admin' }]) // isAdmin
        .mockResolvedValueOnce(mockUsers); // users

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ users: mockUsers });
    });

    it('should return 403 when user is not admin', async () => {
      db.executeQuery.mockResolvedValueOnce([]); // isAdmin returns not admin

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({ error: 'Unauthorized: User is not an admin' });
    });

    it('should return 500 on server error', async () => {
      db.executeQuery.mockResolvedValueOnce([{ role_name: 'admin' }]); // isAdmin
      db.executeQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Server error' });
    });
  });

  describe('PUT /users/:userId/role', () => {
    it('should update user role successfully', async () => {
      db.executeQuery
        .mockResolvedValueOnce([{ role_name: 'admin' }]) // isAdmin
        .mockResolvedValueOnce([]) // current role check
        .mockResolvedValueOnce([]) // remove roles
        .mockResolvedValueOnce([]); // add new role

      const response = await request(app)
        .put('/api/admin/users/2/role')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ newRole: 'reviewer' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'User role updated successfully' });
    });

    it('should return 400 when trying to change own role', async () => {
      // 1. isAdmin check
      db.executeQuery.mockResolvedValueOnce([{ role_name: 'admin' }]);
      // getUserIdFromToken is already mocked to return mockUserId

      const response = await request(app)
        .put(`/api/admin/users/${mockUserId}/role`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ newRole: 'reviewer' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Admin cannot change their own role' });
    });

    it('should return 400 for invalid role', async () => {
      db.executeQuery.mockResolvedValueOnce([{ role_name: 'admin' }]); // isAdmin

      const response = await request(app)
        .put('/api/admin/users/2/role')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ newRole: 'invalid_role' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Invalid role specified' });
    });

    it('should handle migration from researcher to reviewer', async () => {
      const oldData = {
        res_area: 'AI',
        qualification: 'PhD',
        current_proj: 'Project X'
      };

      db.executeQuery
        .mockResolvedValueOnce([{ role_name: 'admin' }]) // isAdmin
        .mockResolvedValueOnce([{ role_name: 'researcher' }]) // current role
        .mockResolvedValueOnce([]) // remove roles
        .mockResolvedValueOnce([oldData]) // get old data
        .mockResolvedValueOnce([]) // delete from old table
        .mockResolvedValueOnce([]) // delete from new table
        .mockResolvedValueOnce([]) // insert into new table
        .mockResolvedValueOnce([]); // add new role

      const response = await request(app)
        .put('/api/admin/users/2/role')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ newRole: 'reviewer' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'User role updated successfully' });
    });

    it('should handle migration from reviewer to researcher', async () => {
      const oldData = {
        res_area: 'AI',
        qualification: 'PhD',
        current_proj: 'Project X'
      };

      db.executeQuery
        .mockResolvedValueOnce([{ role_name: 'admin' }]) // isAdmin
        .mockResolvedValueOnce([{ role_name: 'reviewer' }]) // current role
        .mockResolvedValueOnce([]) // remove roles
        .mockResolvedValueOnce([oldData]) // get old data
        .mockResolvedValueOnce([]) // delete from old table
        .mockResolvedValueOnce([]) // delete from new table
        .mockResolvedValueOnce([]) // insert into new table
        .mockResolvedValueOnce([]); // add new role

      const response = await request(app)
        .put('/api/admin/users/2/role')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ newRole: 'researcher' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'User role updated successfully' });
    });

    it('should handle server error during role update', async () => {
      db.executeQuery
        .mockResolvedValueOnce([{ role_name: 'admin' }]) // isAdmin
        .mockRejectedValueOnce(new Error('Database error')); // Error during role update

      const response = await request(app)
        .put('/api/admin/users/2/role')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ newRole: 'reviewer' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Server error' });
    });

    it('should return 400 when newRole is missing', async () => {
      db.executeQuery.mockResolvedValueOnce([{ role_name: 'admin' }]); // isAdmin
      const response = await request(app)
        .put('/api/admin/users/2/role')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({});
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Missing required fields' });
    });

    it('should migrate user data if old table has data (researcher to reviewer)', async () => {
      const oldData = {
        res_area: 'AI',
        qualification: 'PhD',
        current_proj: 'Project X'
      };
      db.executeQuery
        .mockResolvedValueOnce([{ role_name: 'admin' }]) // isAdmin
        .mockResolvedValueOnce([{ role_name: 'researcher' }]) // current role
        .mockResolvedValueOnce([]) // remove roles
        .mockResolvedValueOnce([oldData]) // get old data from researcher
        .mockResolvedValueOnce([]) // delete from researcher
        .mockResolvedValueOnce([]) // delete from reviewer
        .mockResolvedValueOnce([]) // insert into reviewer
        .mockResolvedValueOnce([]); // add new role
      const response = await request(app)
        .put('/api/admin/users/2/role')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ newRole: 'reviewer' });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'User role updated successfully' });
    });

    it('should migrate user data if old table has data (reviewer to researcher)', async () => {
      const oldData = {
        res_area: 'AI',
        qualification: 'PhD',
        current_proj: 'Project X'
      };
      db.executeQuery
        .mockResolvedValueOnce([{ role_name: 'admin' }]) // isAdmin
        .mockResolvedValueOnce([{ role_name: 'reviewer' }]) // current role
        .mockResolvedValueOnce([]) // remove roles
        .mockResolvedValueOnce([oldData]) // get old data from reviewer
        .mockResolvedValueOnce([]) // delete from reviewer
        .mockResolvedValueOnce([]) // delete from researcher
        .mockResolvedValueOnce([]) // insert into researcher
        .mockResolvedValueOnce([]); // add new role
      const response = await request(app)
        .put('/api/admin/users/2/role')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ newRole: 'researcher' });
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'User role updated successfully' });
    });

    it('should handle migration with empty data from old table', async () => {
      db.executeQuery
        .mockResolvedValueOnce([{ role_name: 'admin' }]) // isAdmin
        .mockResolvedValueOnce([{ role_name: 'researcher' }]) // current role
        .mockResolvedValueOnce([]) // remove roles
        .mockResolvedValueOnce([]) // get old data returns empty
        .mockResolvedValueOnce([]) // delete from researcher
        .mockResolvedValueOnce([]) // delete from reviewer
        .mockResolvedValueOnce([]) // insert empty data into reviewer
        .mockResolvedValueOnce([]); // add new role

      const response = await request(app)
        .put('/api/admin/users/2/role')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ newRole: 'reviewer' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'User role updated successfully' });
    });

    it('should handle migration from researcher to reviewer with partial data', async () => {
      const oldData = {
        res_area: 'AI',
        qualification: null,
        current_proj: ''
      };
      db.executeQuery
        .mockResolvedValueOnce([{ role_name: 'admin' }]) // isAdmin
        .mockResolvedValueOnce([{ role_name: 'researcher' }]) // current role
        .mockResolvedValueOnce([]) // remove roles
        .mockResolvedValueOnce([oldData]) // get old data with partial fields
        .mockResolvedValueOnce([]) // delete from researcher
        .mockResolvedValueOnce([]) // delete from reviewer
        .mockResolvedValueOnce([]) // insert partial data into reviewer
        .mockResolvedValueOnce([]); // add new role

      const response = await request(app)
        .put('/api/admin/users/2/role')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ newRole: 'reviewer' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'User role updated successfully' });
    });

    it('should handle migration from reviewer to researcher with partial data', async () => {
      const oldData = {
        res_area: '',
        qualification: 'PhD',
        current_proj: null
      };
      db.executeQuery
        .mockResolvedValueOnce([{ role_name: 'admin' }]) // isAdmin
        .mockResolvedValueOnce([{ role_name: 'reviewer' }]) // current role
        .mockResolvedValueOnce([]) // remove roles
        .mockResolvedValueOnce([oldData]) // get old data with partial fields
        .mockResolvedValueOnce([]) // delete from reviewer
        .mockResolvedValueOnce([]) // delete from researcher
        .mockResolvedValueOnce([]) // insert partial data into researcher
        .mockResolvedValueOnce([]); // add new role

      const response = await request(app)
        .put('/api/admin/users/2/role')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ newRole: 'researcher' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'User role updated successfully' });
    });

    it('should return 400 when reviewerId is missing in assign-reviewer', async () => {
      db.executeQuery.mockResolvedValueOnce([{ role_name: 'admin' }]); // isAdmin

      const response = await request(app)
        .post('/api/admin/projects/1/assign-reviewer')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Reviewer ID is required' });
    });

    it('should return 400 when reviewerId is null in assign-reviewer', async () => {
      db.executeQuery.mockResolvedValueOnce([{ role_name: 'admin' }]); // isAdmin

      const response = await request(app)
        .post('/api/admin/projects/1/assign-reviewer')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ reviewerId: null });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Reviewer ID is required' });
    });

    it('should return 400 when reviewerId is undefined in assign-reviewer', async () => {
      db.executeQuery.mockResolvedValueOnce([{ role_name: 'admin' }]); // isAdmin

      const response = await request(app)
        .post('/api/admin/projects/1/assign-reviewer')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ reviewerId: undefined });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Reviewer ID is required' });
    });
  });

  describe('GET /projects/pending', () => {
    const mockProjects = [
      {
        project_ID: '1',
        title: 'Test Project',
        description: 'Test Description',
        researcher_fname: 'John',
        researcher_sname: 'Doe'
      }
    ];

    it('should return pending projects', async () => {
      // 1. isAdmin check
      db.executeQuery.mockImplementationOnce(() => Promise.resolve([{ role_name: 'admin' }]))
        .mockImplementationOnce(() => Promise.resolve(mockProjects));

      const response = await request(app)
        .get('/api/admin/projects/pending')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ projects: mockProjects });
    });

    it('should return 500 on server error', async () => {
      db.executeQuery.mockImplementationOnce(() => Promise.resolve([{ role_name: 'admin' }]))
        .mockImplementationOnce(() => Promise.reject(new Error('Database error')));

      const response = await request(app)
        .get('/api/admin/projects/pending')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Server error' });
    });
  });

  describe('GET /reviewers/search', () => {
    it('should return reviewers by research area', async () => {
      // 1. isAdmin check
      const dbReviewers = [
        {
          user_ID: '1',
          fname: 'John',
          sname: 'Doe',
          department: 'IT',
          acc_role: 'reviewer',
          qualification: 'PhD'
        }
      ];
      db.executeQuery.mockImplementationOnce(() => Promise.resolve([{ role_name: 'admin' }]))
        .mockImplementationOnce(() => Promise.resolve(dbReviewers));

      const response = await request(app)
        .get('/api/admin/reviewers/search?research_area=AI')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ reviewers: dbReviewers });
    });

    it('should return 400 when research area is missing', async () => {
      db.executeQuery.mockResolvedValueOnce([{ role_name: 'admin' }]); // isAdmin

      const response = await request(app)
        .get('/api/admin/reviewers/search')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Research area is required' });
    });
  });

  describe('POST /projects/:projectId/assign-reviewer', () => {
    it('should assign reviewer to project', async () => {
      // 1. isAdmin check
      // 2. project exists
      // 3. reviewer exists
      // 4. no assignment
      // 5. assign reviewer
      db.executeQuery
        .mockResolvedValueOnce([{ role_name: 'admin' }])
        .mockResolvedValueOnce([{ project_ID: '1' }])
        .mockResolvedValueOnce([{ role_name: 'reviewer' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const response = await request(app)
        .post('/api/admin/projects/1/assign-reviewer')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ reviewerId: '2' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ message: 'Reviewer assigned successfully' });
    });

    it('should return 404 when project not found', async () => {
      db.executeQuery
        .mockResolvedValueOnce([{ role_name: 'admin' }]) // isAdmin
        .mockResolvedValueOnce([]); // project not found

      const response = await request(app)
        .post('/api/admin/projects/1/assign-reviewer')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ reviewerId: '2' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Project not found or not pending review' });
    });

    it('should return 404 when reviewer not found', async () => {
      // 1. isAdmin check
      // 2. project exists
      // 3. reviewer not found
      db.executeQuery
        .mockResolvedValueOnce([{ role_name: 'admin' }])
        .mockResolvedValueOnce([{ project_ID: '1' }])
        .mockResolvedValueOnce([]);

      const response = await request(app)
        .post('/api/admin/projects/1/assign-reviewer')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ reviewerId: '2' });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Reviewer not found or not a valid reviewer' });
    });

    it('should return 400 when reviewer already assigned', async () => {
      // 1. isAdmin check
      // 2. project exists
      // 3. reviewer exists
      // 4. already assigned
      db.executeQuery
        .mockResolvedValueOnce([{ role_name: 'admin' }])
        .mockResolvedValueOnce([{ project_ID: '1' }])
        .mockResolvedValueOnce([{ role_name: 'reviewer' }])
        .mockResolvedValueOnce([{ assignment_ID: '1' }]);

      const response = await request(app)
        .post('/api/admin/projects/1/assign-reviewer')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ reviewerId: '2' });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Reviewer is already assigned to this project' });
    });

    it('should handle server error during reviewer assignment', async () => {
      db.executeQuery
        .mockResolvedValueOnce([{ role_name: 'admin' }]) // isAdmin
        .mockRejectedValueOnce(new Error('Database error')); // Error during assignment

      const response = await request(app)
        .post('/api/admin/projects/1/assign-reviewer')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ reviewerId: '2' });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Server error' });
    });

    it('should handle authentication error during reviewer assignment', async () => {
      jest.clearAllMocks();

      const auth = require('../../utils/auth');
      auth.extractToken.mockReturnValue('invalid-token');
      auth.getUserIdFromToken.mockResolvedValue('admin-user-id');

      // isAdmin check passes
      db.executeQuery
        .mockResolvedValueOnce([{ role_name: 'admin' }]) // isAdmin
        // The *next* call (project check) throws the auth error
        .mockRejectedValueOnce(new Error('Invalid authorization format'));

      const response = await request(app)
        .post('/api/admin/projects/1/assign-reviewer')
        .set('Authorization', 'Bearer invalid-token')
        .send({ reviewerId: '2' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Invalid authorization format' });
    });

    it('should return 400 when reviewerId is missing', async () => {
      db.executeQuery.mockResolvedValueOnce([{ role_name: 'admin' }]); // isAdmin
      const response = await request(app)
        .post('/api/admin/projects/1/assign-reviewer')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({});
      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: 'Reviewer ID is required' });
    });

    it('should return 404 when project not found or not pending review', async () => {
      db.executeQuery
        .mockResolvedValueOnce([{ role_name: 'admin' }]) // isAdmin
        .mockResolvedValueOnce([]); // project not found
      const response = await request(app)
        .post('/api/admin/projects/1/assign-reviewer')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ reviewerId: '2' });
      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: 'Project not found or not pending review' });
    });
  });

  describe('isAdmin Middleware', () => {
    it('should return 401 when token is missing', async () => {
      // Clear all mocks to ensure no default behavior
      jest.clearAllMocks();
      // Mock extractToken to return null
      require('../../utils/auth').extractToken.mockReturnValue(null);
      // Mock getUserIdFromToken to throw specific error
      require('../../utils/auth').getUserIdFromToken.mockRejectedValue(new Error('Access token is required'));

      const response = await request(app)
        .get('/api/admin/users');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Access token is required' });
    });

    it('should return 401 when token format is invalid', async () => {
      require('../../utils/auth').getUserIdFromToken.mockRejectedValue(new Error('Invalid token format'));

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'InvalidFormat');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Invalid token format' });
    });

    it('should return 401 when token is invalid', async () => {
      require('../../utils/auth').getUserIdFromToken.mockRejectedValue(new Error('Token invalid'));

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Token invalid' });
    });

    it('should return 401 when token has expired', async () => {
      require('../../utils/auth').getUserIdFromToken.mockRejectedValue(new Error('Token has expired'));

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', 'Bearer expired-token');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: 'Token has expired' });
    });

    it('should return 500 on server error', async () => {
      db.executeQuery.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: 'Server error' });
    });
  });
}); 