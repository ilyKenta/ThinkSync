const request = require('supertest');
const express = require('express');
const projectRoutes = require('../project');
const axios = require('axios');
const db = require('../../db');

// Mock environment variables and modules
jest.mock('axios');
jest.mock('../../db', () => ({
  executeQuery: jest.fn()
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

    // Mock axios for token validation
    axios.get.mockResolvedValue({
      data: {
        id: mockUserId
      }
    });

    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
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
        .mockResolvedValueOnce([{ insertId: 1 }]) // Project insert
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
  });

  describe('GET /owner/:ownerId', () => {
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

      db.executeQuery.mockResolvedValueOnce(mockProjects);

      const response = await request(app)
        .get(`/api/project/owner/${mockUserId}`)
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(200);
      expect(response.body.projects).toBeDefined();
      expect(response.body.projects[0]).toHaveProperty('goals');
      expect(response.body.projects[0]).toHaveProperty('research_areas');
      expect(response.body.projects[0]).toHaveProperty('funding_available');
      expect(db.executeQuery).toHaveBeenCalledTimes(1);
    });

    it('should handle no projects found', async () => {
      db.executeQuery.mockResolvedValueOnce([]);

      const response = await request(app)
        .get(`/api/project/owner/${mockUserId}`)
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('No projects found for this owner');
    });
  });

  describe('PUT /update/:projectId', () => {
    const validUpdate = {
      project: {
        title: 'Updated Project',
        description: 'Updated Description',
        goals: 'Updated Goals',
        research_areas: 'Updated Research Areas',
        start_date: '2024-03-21',
        end_date: '2024-04-21',
        funding_available: false
      },
      requirements: [
        {
          skill_required: 'Python',
          experience_level: 'professional',
          role: 'Lead Developer',
          technical_requirements: 'Django, Flask'
        }
      ]
    };

    it('should update a project successfully', async () => {
      const projectId = 1;
      db.executeQuery
        .mockResolvedValueOnce([{ owner_ID: mockUserId }]) // Check ownership
        .mockResolvedValueOnce([]) // Update project
        .mockResolvedValueOnce([]) // Delete old requirements
        .mockResolvedValueOnce([]); // Insert new requirements

      const response = await request(app)
        .put(`/api/project/update/${projectId}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validUpdate);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Project updated successfully');
      expect(db.executeQuery).toHaveBeenCalledTimes(4);
    });

    it('should handle unauthorized update', async () => {
      const projectId = 1;
      db.executeQuery.mockResolvedValueOnce([{ owner_ID: 'different-user' }]);

      const response = await request(app)
        .put(`/api/project/update/${projectId}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(validUpdate);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Unauthorized to update this project');
    });

    it('should handle missing project data', async () => {
      const projectId = 1;
      const invalidUpdate = {
        requirements: validUpdate.requirements
      };

      const response = await request(app)
        .put(`/api/project/update/${projectId}`)
        .set('Authorization', `Bearer ${mockToken}`)
        .send(invalidUpdate);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing project or requirements data');
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

    it('should handle project not found', async () => {
      const projectId = 999;
      db.executeQuery.mockResolvedValueOnce([]);

      const response = await request(app)
        .delete(`/api/project/delete/${projectId}`)
        .set('Authorization', `Bearer ${mockToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });
  });
}); 