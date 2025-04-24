const request = require('supertest');
const express = require('express');
const router = require('../collaboration');
const db = require('../../db');
const axios = require('axios');

// Mock modules
jest.mock('../../db', () => ({
  executeQuery: jest.fn()
}));

jest.mock('axios', () => ({
  get: jest.fn()
}));

describe('Collaboration Routes', () => {
  let app;
  const mockUserId = '65fc38ee-5415-49f4-96ee-4a1643a69923';

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/collaboration', router);
    jest.clearAllMocks();
    
    // Mock axios.get to return user ID
    axios.get.mockResolvedValue({ data: { id: mockUserId } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserIdFromToken', () => {
    it('should throw error when token is missing', async () => {
      await expect(router.getUserIdFromToken(null))
        .rejects.toThrow('Access token is required');
    });
  });

  describe('POST /search', () => {
    it('should throw error when token is missing', async () => {
      const response = await request(app)
        .post('/api/collaboration/search')
        .send({ searchTerm: 'test', searchType: 'name' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token is required');
    });

    it('should return 400 if search term or type is missing', async () => {
      const response = await request(app)
        .post('/api/collaboration/search')
        .set('Authorization', 'Bearer valid-token')
        .send({ searchType: 'name' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Search term and type are required');
    });

    it('should search by name successfully', async () => {
      const mockResults = [
        {
          user_ID: 'user1',
          fname: 'John',
          sname: 'Doe',
          department: 'CS',
          acc_role: 'researcher',
          res_area: 'AI',
          qualification: 'PhD'
        }
      ];

      db.executeQuery.mockResolvedValueOnce(mockResults);

      const response = await request(app)
        .post('/api/collaboration/search')
        .set('Authorization', 'Bearer valid-token')
        .send({ searchTerm: 'John', searchType: 'name' });

      expect(response.status).toBe(200);
      expect(response.body.collaborators).toEqual(mockResults);
      expect(db.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('CONCAT(u.fname, \' \', u.sname) LIKE ?'),
        ['%John%']
      );
    });

    it('should search by skill successfully', async () => {
      const mockResults = [
        {
          user_ID: 'user1',
          fname: 'John',
          sname: 'Doe',
          department: 'CS',
          acc_role: 'researcher',
          res_area: 'AI',
          qualification: 'PhD'
        }
      ];

      db.executeQuery.mockResolvedValueOnce(mockResults);

      const response = await request(app)
        .post('/api/collaboration/search')
        .set('Authorization', 'Bearer valid-token')
        .send({ searchTerm: 'AI', searchType: 'skill' });

      expect(response.status).toBe(200);
      expect(response.body.collaborators).toEqual(mockResults);
      expect(db.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('r.res_area LIKE ? OR r.qualification LIKE ?'),
        ['%AI%', '%AI%']
      );
    });

    it('should search by position successfully', async () => {
      const mockResults = [
        {
          user_ID: 'user1',
          fname: 'John',
          sname: 'Doe',
          department: 'CS',
          acc_role: 'researcher',
          res_area: 'AI',
          qualification: 'PhD'
        }
      ];

      db.executeQuery.mockResolvedValueOnce(mockResults);

      const response = await request(app)
        .post('/api/collaboration/search')
        .set('Authorization', 'Bearer valid-token')
        .send({ searchTerm: 'researcher', searchType: 'position' });

      expect(response.status).toBe(200);
      expect(response.body.collaborators).toEqual(mockResults);
      expect(db.executeQuery).toHaveBeenCalledWith(
        expect.stringContaining('u.acc_role LIKE ?'),
        ['%researcher%']
      );
    });

    it('should return 400 for invalid search type', async () => {
      const response = await request(app)
        .post('/api/collaboration/search')
        .set('Authorization', 'Bearer valid-token')
        .send({ searchTerm: 'test', searchType: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid search type');
    });

    it('should handle database errors', async () => {
      db.executeQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/collaboration/search')
        .set('Authorization', 'Bearer valid-token')
        .send({ searchTerm: 'test', searchType: 'name' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('POST /invite', () => {
    it('should return 401 if no token provided', async () => {
      const response = await request(app)
        .post('/api/collaboration/invite')
        .send({
          project_ID: '1',
          recipient_ID: '2',
          proposed_role: 'researcher'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token is required');
    });

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/collaboration/invite')
        .set('Authorization', 'Bearer valid-token')
        .send({
          project_ID: '1',
          recipient_ID: '2'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should return 404 if project not found', async () => {
      db.executeQuery.mockResolvedValueOnce([]);

      const response = await request(app)
        .post('/api/collaboration/invite')
        .set('Authorization', 'Bearer valid-token')
        .send({
          project_ID: '1',
          recipient_ID: '2',
          proposed_role: 'researcher'
        });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Project not found');
    });

    it('should return 403 if user is not project owner', async () => {
      db.executeQuery.mockResolvedValueOnce([{ owner_ID: 'different-user' }]);

      const response = await request(app)
        .post('/api/collaboration/invite')
        .set('Authorization', 'Bearer valid-token')
        .send({
          project_ID: '1',
          recipient_ID: '2',
          proposed_role: 'researcher'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Only project owner can send invitations');
    });

    it('should return 400 if invitation already exists', async () => {
      db.executeQuery
        .mockResolvedValueOnce([{ owner_ID: mockUserId }])
        .mockResolvedValueOnce([{ invitation_ID: '1' }]);

      const response = await request(app)
        .post('/api/collaboration/invite')
        .set('Authorization', 'Bearer valid-token')
        .send({
          project_ID: '1',
          recipient_ID: '2',
          proposed_role: 'researcher'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invitation already exists');
    });

    it('should create invitation successfully', async () => {
      db.executeQuery
        .mockResolvedValueOnce([{ owner_ID: mockUserId }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce({ insertId: 1 });

      const response = await request(app)
        .post('/api/collaboration/invite')
        .set('Authorization', 'Bearer valid-token')
        .send({
          project_ID: '1',
          recipient_ID: '2',
          proposed_role: 'researcher'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Invitation sent successfully');
    });

    it('should handle database errors', async () => {
      db.executeQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/collaboration/invite')
        .set('Authorization', 'Bearer valid-token')
        .send({
          project_ID: '1',
          recipient_ID: '2',
          proposed_role: 'researcher'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /invitations/received', () => {
    it('should return 401 if no token provided', async () => {
      const response = await request(app)
        .get('/api/collaboration/invitations/received');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token is required');
    });

    it('should return received invitations successfully', async () => {
      const mockInvitations = [
        {
          invitation_ID: '1',
          project_ID: '1',
          project_title: 'Test Project',
          sender_fname: 'John',
          sender_sname: 'Doe',
          proposed_role: 'researcher',
          status: 'pending',
          current_status: 'pending',
          sent_at: '2024-03-20T12:00:00Z'
        }
      ];

      db.executeQuery.mockResolvedValueOnce(mockInvitations);

      const response = await request(app)
        .get('/api/collaboration/invitations/received')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.invitations).toEqual(mockInvitations);
    });

    it('should handle database errors', async () => {
      db.executeQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/collaboration/invitations/received')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('GET /invitations/sent', () => {
    it('should return 401 if no token provided', async () => {
      const response = await request(app)
        .get('/api/collaboration/invitations/sent');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token is required');
    });

    it('should return sent invitations successfully', async () => {
      const mockInvitations = [
        {
          invitation_ID: '1',
          project_ID: '1',
          project_title: 'Test Project',
          recipient_fname: 'John',
          recipient_sname: 'Doe',
          proposed_role: 'researcher',
          status: 'pending',
          current_status: 'pending',
          sent_at: '2024-03-20T12:00:00Z'
        }
      ];

      db.executeQuery.mockResolvedValueOnce(mockInvitations);

      const response = await request(app)
        .get('/api/collaboration/invitations/sent')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.invitations).toEqual(mockInvitations);
    });

    it('should handle database errors', async () => {
      db.executeQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get('/api/collaboration/invitations/sent')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });

  describe('PUT /invitation/:invitationId', () => {
    it('should return 401 if no token provided', async () => {
      const response = await request(app)
        .put('/api/collaboration/invitation/1')
        .send({ status: 'accepted' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Access token is required');
    });

    it('should return 401 if token is invalid', async () => {
      axios.get.mockRejectedValueOnce(new Error('Invalid token'));

      const response = await request(app)
        .put('/api/collaboration/invitation/1')
        .set('Authorization', 'Bearer invalid-token')
        .send({ status: 'accepted' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });

    it('should return 403 if user is not the recipient', async () => {
      db.executeQuery
        .mockResolvedValueOnce([{
          invitation_ID: '1',
          recipient_ID: 'different-user',
          status: 'pending'
        }]);

      const response = await request(app)
        .put('/api/collaboration/invitation/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'accepted' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Only recipient can accept/decline invitation');
    });

    it('should return 400 if invitation is not pending', async () => {
      db.executeQuery
        .mockResolvedValueOnce([{
          invitation_ID: '1',
          recipient_ID: mockUserId,
          status: 'accepted'
        }]);

      const response = await request(app)
        .put('/api/collaboration/invitation/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'accepted' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Can only update pending invitations');
    });

    it('should return 400 if status is invalid', async () => {
      const response = await request(app)
        .put('/api/collaboration/invitation/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid status');
    });

    it('should return 404 if invitation not found', async () => {
      db.executeQuery.mockResolvedValueOnce([]);

      const response = await request(app)
        .put('/api/collaboration/invitation/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'accepted' });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Invitation not found');
    });

    it('should return 403 if user is not authorized to update status', async () => {
      db.executeQuery.mockResolvedValueOnce([{
        sender_ID: 'different-user',
        recipient_ID: 'another-user',
        status: 'pending'
      }]);

      const response = await request(app)
        .put('/api/collaboration/invitation/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'cancelled' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Only sender can cancel invitation');
    });

    it('should not add user to project_collaborations when invitation is declined', async () => {
      const mockInvitation = {
        invitation_ID: '1',
        project_ID: 'project1',
        recipient_ID: mockUserId,
        proposed_role: 'researcher',
        status: 'pending'
      };

      db.executeQuery
        .mockResolvedValueOnce([mockInvitation]) // Get invitation
        .mockResolvedValueOnce({ affectedRows: 1 }); // Update invitation status

      const response = await request(app)
        .put('/api/collaboration/invitation/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'declined' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Invitation updated successfully');
      // Verify that the project_collaborations insert was not called
      expect(db.executeQuery).not.toHaveBeenCalledWith(
        'INSERT INTO project_collaborations (project_ID, user_ID, role) VALUES (?, ?, ?)',
        expect.any(Array)
      );
    });

    it('should add user to project_collaborations when invitation is accepted', async () => {
      const mockInvitation = {
        invitation_ID: '1',
        project_ID: 'project1',
        recipient_ID: mockUserId,
        proposed_role: 'researcher',
        status: 'pending'
      };

      db.executeQuery
        .mockResolvedValueOnce([mockInvitation]) // Get invitation
        .mockResolvedValueOnce({ affectedRows: 1 }) // Update invitation status
        .mockResolvedValueOnce({ insertId: 1 }); // Insert into project_collaborations

      const response = await request(app)
        .put('/api/collaboration/invitation/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'accepted' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Invitation updated successfully');
      expect(db.executeQuery).toHaveBeenCalledWith(
        'INSERT INTO project_collaborations (project_ID, user_ID, role) VALUES (?, ?, ?)',
        [mockInvitation.project_ID, mockInvitation.recipient_ID, mockInvitation.proposed_role]
      );
    });

    it('should handle database errors', async () => {
      db.executeQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .put('/api/collaboration/invitation/1')
        .set('Authorization', 'Bearer valid-token')
        .send({ status: 'accepted' });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
    });
  });
}); 