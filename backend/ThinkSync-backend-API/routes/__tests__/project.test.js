const request = require('supertest');
const express = require('express');
const projectRoutes = require('../project');
const db = require('../../db');
const { getUserIdFromToken, extractToken } = require('../../utils/auth');

// Mock modules
jest.mock('../../db', () => ({
  executeQuery: jest.fn()
}));

jest.mock('../../utils/auth', () => ({
  getUserIdFromToken: jest.fn(),
  extractToken: jest.fn()
}));

describe('Project Routes', () => {
  let app;
  let mockToken;
  let mockUserId;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/project', projectRoutes);
    
    mockToken = 'mock-token';
    mockUserId = '65fc38ee-5415-49f4-96ee-4a1643a69923';
    console.error = jest.fn();
    console.log = jest.fn();

    // Mock token extraction and user ID retrieval
    extractToken.mockReturnValue(mockToken);
    getUserIdFromToken.mockResolvedValue(mockUserId);

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Token Validation', () => {
    it('should handle missing token', async () => {
      extractToken.mockReturnValue(null);
      getUserIdFromToken.mockRejectedValueOnce(new Error('Access token is required'));

      const response = await request(app)
        .post('/api/project/create')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token is required');
      expect(console.error).toHaveBeenCalledWith('Error creating project:', expect.any(Error));
    });

    it('should handle invalid token format', async () => {
      extractToken.mockReturnValue(null);
      getUserIdFromToken.mockRejectedValueOnce(new Error('Access token is required'));

      const response = await request(app)
        .post('/api/project/create')
        .set('Authorization', 'InvalidFormat')
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token is required');
      expect(console.error).toHaveBeenCalledWith('Error creating project:', expect.any(Error));
    });

    it('should handle invalid token from Microsoft Graph', async () => {
      getUserIdFromToken.mockRejectedValueOnce(new Error('Token invalid'));

      const response = await request(app)
        .post('/api/project/create')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Token invalid');
      expect(console.error).toHaveBeenCalledWith('Error creating project:', expect.any(Error));
    });
  });

  describe('POST /create', () => {
    const validPayload = {
      project: {
        title: 'Test Project',
        description: 'Test Description',
        goals: 'Test Goals',
        research_areas: 'Test Research Areas',
        start_date: '2024-03-20',
        end_date: '2024-04-20',
        funding_available: true
      },
      requirements: [
        {
          skill_required: 'JavaScript',
          experience_level: 'intermediate',
          role: 'Developer',
          technical_requirements: 'Node.js, React'
        }
      ]
    };

    it('should create a project successfully', async () => {
      db.executeQuery
        .mockResolvedValueOnce({ insertId: 1 }) // Project insert
        .mockResolvedValueOnce([]); // Requirements insert

      const response = await request(app)
        .post('/api/project/create')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validPayload);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Project created successfully');
      expect(db.executeQuery).toHaveBeenCalledTimes(2);
      expect(db.executeQuery).toHaveBeenNthCalledWith(1, 
        'INSERT INTO projects (owner_ID, title, description, goals, research_areas, start_date, end_date, funding_available, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())',
        [mockUserId, validPayload.project.title, validPayload.project.description, validPayload.project.goals, 
         validPayload.project.research_areas, validPayload.project.start_date, validPayload.project.end_date, 
         validPayload.project.funding_available]
      );
    });

    it('should handle database error during project creation', async () => {
      db.executeQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/project/create')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validPayload);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
      expect(console.error).toHaveBeenCalledWith('Error creating project:', expect.any(Error));
    });

    it('should handle database error during requirements creation', async () => {
      db.executeQuery
        .mockResolvedValueOnce({ insertId: 1 }) // Project insert
        .mockRejectedValueOnce(new Error('Database error')); // Requirements insert

      const response = await request(app)
        .post('/api/project/create')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validPayload);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
      expect(console.error).toHaveBeenCalledWith('Error creating project:', expect.any(Error));
    });

    it('should handle missing project data', async () => {
      const invalidPayload = {
        requirements: validPayload.requirements
      };

      const response = await request(app)
        .post('/api/project/create')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing project or requirements data');
    });

    it('should handle missing requirements data', async () => {
      const invalidPayload = {
        project: validPayload.project
      };

      const response = await request(app)
        .post('/api/project/create')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing project or requirements data');
    });

    it('should handle invalid project data', async () => {
      const invalidPayload = {
        project: {
          ...validPayload.project,
          funding_available: 'not-a-boolean' // Invalid type
        },
        requirements: validPayload.requirements
      };

      const response = await request(app)
        .post('/api/project/create')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid project data');
    });

    it('should handle invalid requirements data', async () => {
      const invalidPayload = {
        project: validPayload.project,
        requirements: [{
          skill_required: 'JavaScript',
          experience_level: 'invalid-level', // Invalid level
          role: 'Developer',
          technical_requirements: 'Node.js, React'
        }]
      };

      const response = await request(app)
        .post('/api/project/create')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid requirements data');
    });

    it('should handle invalid date format', async () => {
      const invalidPayload = {
        project: {
          ...validPayload.project,
          start_date: '2024/03/20', // Invalid format
          end_date: '2024-04-20'
        },
        requirements: validPayload.requirements
      };

      const response = await request(app)
        .post('/api/project/create')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid project data');
    });

    it('should handle invalid date order', async () => {
      const invalidPayload = {
        project: {
          ...validPayload.project,
          start_date: '2024-04-20', // Later than end_date
          end_date: '2024-03-20'
        },
        requirements: validPayload.requirements
      };

      const response = await request(app)
        .post('/api/project/create')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid project data');
    });

    it('should handle missing required fields', async () => {
      const invalidPayload = {
        project: {
          title: 'Test Project',
          // Missing description
          goals: 'Test Goals',
          research_areas: 'Test Research Areas',
          start_date: '2024-03-20',
          end_date: '2024-04-20',
          funding_available: true
        },
        requirements: validPayload.requirements
      };

      const response = await request(app)
        .post('/api/project/create')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid project data');
    });
  });

  describe('GET /owner', () => {
    it('should get all projects for an owner', async () => {
      const mockProjects = [
        {
          project_ID: 1,
          owner_ID: mockUserId,
          title: 'Test Project',
          description: 'Test Description',
          goals: 'Test Goals',
          research_areas: 'Test Research Areas',
          start_date: '2024-03-20',
          end_date: '2024-04-20',
          funding_available: true,
          created_at: '2024-03-19T12:00:00Z',
          requirement_ID: 1,
          skill_required: 'JavaScript',
          experience_level: 'intermediate',
          role: 'Developer',
          technical_requirements: 'Node.js, React'
        }
      ];

      const mockCollaborators = [
        {
          project_ID: 1,
          user_ID: 'user123',
          fname: 'John',
          sname: 'Doe',
          department: 'IT',
          acc_role: 'Developer',
          role: 'Collaborator',
          joined_at: '2024-03-19T12:00:00Z'
        }
      ];

      const mockReviews = [
        {
          project_ID: 1,
          review_ID: 1,
          reviewer_ID: 'reviewer123',
          feedback: 'Good project',
          outcome: 'approved',
          reviewed_at: '2024-03-19T12:00:00Z'
        }
      ];

      // Mock all three database queries
      db.executeQuery
        .mockResolvedValueOnce(mockProjects) // Projects query
        .mockResolvedValueOnce(mockCollaborators) // Collaborators query
        .mockResolvedValueOnce(mockReviews); // Reviews query

      const response = await request(app)
        .get(`/api/project/owner`)
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.projects).toBeDefined();
      expect(response.body.projects[0]).toHaveProperty('goals');
      expect(response.body.projects[0]).toHaveProperty('research_areas');
      expect(response.body.projects[0]).toHaveProperty('funding_available');
      expect(response.body.projects[0]).toHaveProperty('collaborators');
      expect(response.body.projects[0]).toHaveProperty('reviews');
      expect(db.executeQuery).toHaveBeenCalledTimes(3);
    });

    it('should handle database error when fetching projects', async () => {
      db.executeQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get(`/api/project/owner`)
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
      expect(console.error).toHaveBeenCalledWith('Error fetching projects:', expect.any(Error));
    });

    ['Access token is required', 'Invalid token format', 'Token invalid', 'Token has expired'].forEach(tokenError => {
      it(`should return 401 for token error: ${tokenError} (db.executeQuery throws)`, async () => {
        getUserIdFromToken.mockResolvedValueOnce(mockUserId);
        db.executeQuery.mockRejectedValueOnce(new Error(tokenError));
        const response = await request(app)
          .get('/api/project/owner')
          .set('Authorization', `Bearer ${mockToken}`);
        expect(response.status).toBe(401);
        expect(response.body.error).toBe(tokenError);
      });
    });

    it('should return 500 for generic error (db.executeQuery throws)', async () => {
      getUserIdFromToken.mockResolvedValueOnce(mockUserId);
      db.executeQuery.mockRejectedValueOnce(new Error('Some other error'));
      const response = await request(app)
        .get('/api/project/owner')
        .set('Authorization', `Bearer ${mockToken}`);
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('PUT /update/:projectId', () => {
    const validUpdatePayload = {
      project: {
        title: 'Updated Project',
        description: 'Updated Description',
        goals: 'Updated Goals',
        research_areas: 'Updated Research Areas',
        start_date: '2024-03-20',
        end_date: '2024-04-20',
        funding_available: true
      },
      requirements: [
        {
          skill_required: 'Python',
          experience_level: 'professional',
          role: 'Data Scientist',
          technical_requirements: 'TensorFlow, PyTorch'
        }
      ]
    };

    it('should handle project not found', async () => {
      db.executeQuery.mockResolvedValueOnce([]); // No project found

      const response = await request(app)
        .put('/api/project/update/999')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validUpdatePayload);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });

    it('should handle unauthorized update', async () => {
      db.executeQuery.mockResolvedValueOnce([{ owner_ID: 'different-user' }]); // Different owner

      const response = await request(app)
        .put('/api/project/update/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validUpdatePayload);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Unauthorized to update this project');
    });

    it('should handle database error during project update', async () => {
      db.executeQuery
        .mockResolvedValueOnce([{ owner_ID: mockUserId }]) // Project found
        .mockRejectedValueOnce(new Error('Database error')); // Update fails

      const response = await request(app)
        .put('/api/project/update/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validUpdatePayload);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should handle database error during requirements update', async () => {
      db.executeQuery
        .mockResolvedValueOnce([{ owner_ID: mockUserId }]) // Project found
        .mockResolvedValueOnce({ affectedRows: 1 }) // Project update
        .mockResolvedValueOnce({ affectedRows: 1 }) // Delete requirements
        .mockRejectedValueOnce(new Error('Database error')); // Insert requirements fails

      const response = await request(app)
        .put('/api/project/update/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validUpdatePayload);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should handle invalid requirements during update', async () => {
      const invalidPayload = {
        project: validUpdatePayload.project,
        requirements: [{
          skill_required: 'Python',
          experience_level: 'invalid-level', // Invalid level
          role: 'Data Scientist',
          technical_requirements: 'TensorFlow, PyTorch'
        }]
      };

      db.executeQuery.mockResolvedValueOnce([{ owner_ID: mockUserId }]); // Project found

      const response = await request(app)
        .put('/api/project/update/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid requirements data');
    });

    ['Access token is required', 'Invalid token format', 'Token invalid', 'Token has expired'].forEach(tokenError => {
      it(`should return 401 for token error: ${tokenError} (db.executeQuery throws)`, async () => {
        getUserIdFromToken.mockResolvedValueOnce(mockUserId);
        db.executeQuery.mockRejectedValueOnce(new Error(tokenError));
        const response = await request(app)
          .put('/api/project/update/1')
          .set('Authorization', `Bearer ${mockToken}`)
          .send({ project: {
            title: 'Test', description: 'Test', goals: 'Test', research_areas: 'Test', start_date: '2024-01-01', end_date: '2024-12-31', funding_available: true
          }, requirements: [{ skill_required: 'JS', experience_level: 'beginner', role: 'Dev', technical_requirements: 'Node' }] });
        expect(response.status).toBe(401);
        expect(response.body.error).toBe(tokenError);
      });
    });

    it('should return 500 for generic error (db.executeQuery throws)', async () => {
      getUserIdFromToken.mockResolvedValueOnce(mockUserId);
      db.executeQuery.mockRejectedValueOnce(new Error('Some other error'));
      const response = await request(app)
        .put('/api/project/update/1')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ project: {
          title: 'Test', description: 'Test', goals: 'Test', research_areas: 'Test', start_date: '2024-01-01', end_date: '2024-12-31', funding_available: true
        }, requirements: [{ skill_required: 'JS', experience_level: 'beginner', role: 'Dev', technical_requirements: 'Node' }] });
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('DELETE /delete/:projectId', () => {
    it('should delete a project successfully', async () => {
      const projectId = 1;
      db.executeQuery
        .mockResolvedValueOnce([{ owner_ID: mockUserId }]) // Check ownership
        .mockResolvedValueOnce([]); // Delete project

      const response = await request(app)
        .delete(`/api/project/delete/${projectId}`)
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Project deleted successfully');
      expect(db.executeQuery).toHaveBeenCalledTimes(2);
    });

    it('should handle database error during project deletion', async () => {
      const projectId = 1;
      db.executeQuery
        .mockResolvedValueOnce([{ owner_ID: mockUserId }]) // Check ownership
        .mockRejectedValueOnce(new Error('Database error')); // Delete project

      const response = await request(app)
        .delete(`/api/project/delete/${projectId}`)
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
      expect(console.error).toHaveBeenCalledWith('Error deleting project:', expect.any(Error));
    });

    it('should handle database error during ownership check', async () => {
      const projectId = 1;
      db.executeQuery.mockRejectedValueOnce(new Error('Database error')); // Check ownership

      const response = await request(app)
        .delete(`/api/project/delete/${projectId}`)
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
      expect(console.error).toHaveBeenCalledWith('Error deleting project:', expect.any(Error));
    });

    ['Access token is required', 'Invalid token format', 'Token invalid', 'Token has expired'].forEach(tokenError => {
      it(`should return 401 for token error: ${tokenError} (db.executeQuery throws)`, async () => {
        getUserIdFromToken.mockResolvedValueOnce(mockUserId);
        db.executeQuery.mockRejectedValueOnce(new Error(tokenError));
        const response = await request(app)
          .delete('/api/project/delete/1')
          .set('Authorization', `Bearer ${mockToken}`);
        expect(response.status).toBe(401);
        expect(response.body.error).toBe(tokenError);
      });
    });

    it('should return 500 for generic error (db.executeQuery throws)', async () => {
      getUserIdFromToken.mockResolvedValueOnce(mockUserId);
      db.executeQuery.mockRejectedValueOnce(new Error('Some other error'));
      const response = await request(app)
        .delete('/api/project/delete/1')
        .set('Authorization', `Bearer ${mockToken}`);
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /collaborator', () => {
    const tokenErrors = [
      'Access token is required',
      'Invalid token format',
      'Token invalid',
      'Token has expired'
    ];

    tokenErrors.forEach(tokenError => {
      it(`should return 401 for token error: ${tokenError}`, async () => {
        getUserIdFromToken.mockRejectedValueOnce(new Error(tokenError));
        const response = await request(app)
          .get('/api/project/collaborator')
          .set('Authorization', `Bearer ${mockToken}`);
        expect(response.status).toBe(401);
        expect(response.body.error).toBe(tokenError);
      });
    });

    it('should return 500 for generic error', async () => {
      getUserIdFromToken.mockRejectedValueOnce(new Error('Some other error'));
      const response = await request(app)
        .get('/api/project/collaborator')
        .set('Authorization', `Bearer ${mockToken}`);
      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });
}); 