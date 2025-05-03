const express = require('express');
const request = require('supertest');
const reviewerRouter = require('../reviewer');
const db = require('../../db');
const { getUserIdFromToken, extractToken } = require('../../utils/auth');

// Mock the required modules
jest.mock('../../db', () => ({
    executeQuery: jest.fn()
}));

jest.mock('../../utils/auth', () => ({
    getUserIdFromToken: jest.fn(),
    extractToken: jest.fn()
}));

describe('Reviewer Routes', () => {
    let app;
    const mockUserId = 123;
    const mockToken = 'mock-token';

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/reviewer', reviewerRouter);
        jest.clearAllMocks();

        // Setup default mocks
        extractToken.mockReturnValue(mockToken);
        getUserIdFromToken.mockResolvedValue(mockUserId);
    });

    describe('isReviewer Middleware', () => {
        it('should allow access for valid reviewer', async () => {
            db.executeQuery.mockResolvedValue([{ role_name: 'reviewer' }]);

            const response = await request(app)
                .get('/api/reviewer/proposals')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(extractToken).toHaveBeenCalled();
            expect(getUserIdFromToken).toHaveBeenCalledWith(mockToken);
            expect(db.executeQuery).toHaveBeenCalled();
        });

        it('should deny access for non-reviewer', async () => {
            db.executeQuery.mockResolvedValue([{ role_name: 'user' }]);

            const response = await request(app)
                .get('/api/reviewer/proposals')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('Unauthorized: User is not a reviewer');
        });

        it('should handle missing token', async () => {
            extractToken.mockReturnValue(null);

            const response = await request(app)
                .get('/api/reviewer/proposals');

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Authentication failed');
        });

        it('should handle invalid token', async () => {
            getUserIdFromToken.mockRejectedValue(new Error('Token invalid'));

            const response = await request(app)
                .get('/api/reviewer/proposals')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(401);
            expect(response.body.error).toBe('Token invalid');
        });
    });

    describe('GET /proposals', () => {
        beforeEach(() => {
            // Setup default mocks for successful authentication and reviewer role
            extractToken.mockReturnValue(mockToken);
            getUserIdFromToken.mockResolvedValue(mockUserId);
            db.executeQuery.mockResolvedValue([{ role_name: 'reviewer' }]);
        });

        it('should return proposals for reviewer', async () => {
            const mockProposals = [
                {
                    project_ID: 1,
                    title: 'Test Project',
                    description: 'Test Description',
                    goals: 'Test Goals',
                    start_date: '2023-01-01',
                    end_date: '2023-12-31',
                    funding_available: 1000,
                    skill_required: 'Test Skill',
                    experience_level: 'Expert',
                    requirement_role: 'Developer',
                    technical_requirements: 'Test Requirements',
                    researcher_ID: 456,
                    researcher_fname: 'John',
                    researcher_sname: 'Doe',
                    assignment_ID: 789,
                    Assigned_at: '2023-01-01'
                }
            ];

            db.executeQuery
                .mockResolvedValueOnce([{ role_name: 'reviewer' }]) // Mock reviewer check
                .mockResolvedValueOnce(mockProposals); // Mock proposals fetch

            const response = await request(app)
                .get('/api/reviewer/proposals')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(response.body.proposals).toEqual(mockProposals);
            expect(db.executeQuery).toHaveBeenCalledWith(
                expect.any(String),
                [mockUserId]
            );
        });

        it('should handle database error', async () => {
            db.executeQuery
                .mockResolvedValueOnce([{ role_name: 'reviewer' }]) // Mock reviewer check
                .mockRejectedValueOnce(new Error('Database error')); // Mock proposals fetch error

            const response = await request(app)
                .get('/api/reviewer/proposals')
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to fetch proposals');
        });
    });

    describe('POST /proposals/:projectId/review', () => {
        beforeEach(() => {
            // Setup default mocks for successful authentication
            extractToken.mockReturnValue(mockToken);
            getUserIdFromToken.mockResolvedValue(mockUserId);
            db.executeQuery.mockResolvedValue([{ role_name: 'reviewer' }]);
        });

        it('should submit review successfully', async () => {
            const projectId = 1;
            const reviewData = {
                feedback: 'Good project',
                outcome: 'approved'
            };

            db.executeQuery
                .mockResolvedValueOnce([{ role_name: 'reviewer' }]) // Mock reviewer check
                .mockResolvedValueOnce([{ id: 1 }]) // Mock assignment check
                .mockResolvedValueOnce({ insertId: 1 }); // Mock review insertion

            const response = await request(app)
                .post(`/api/reviewer/proposals/${projectId}/review`)
                .set('Authorization', `Bearer ${mockToken}`)
                .send(reviewData);

            expect(response.status).toBe(200);
            expect(response.body.message).toBe('Review submitted successfully');
            expect(db.executeQuery).toHaveBeenCalledTimes(3);
        });

        it('should reject missing required fields', async () => {
            const projectId = 1;
            const reviewData = {
                feedback: 'Good project'
                // Missing outcome
            };

            const response = await request(app)
                .post(`/api/reviewer/proposals/${projectId}/review`)
                .set('Authorization', `Bearer ${mockToken}`)
                .send(reviewData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Missing required fields');
        });

        it('should reject invalid outcome', async () => {
            const projectId = 1;
            const reviewData = {
                feedback: 'Good project',
                outcome: 'invalid'
            };

            const response = await request(app)
                .post(`/api/reviewer/proposals/${projectId}/review`)
                .set('Authorization', `Bearer ${mockToken}`)
                .send(reviewData);

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Invalid outcome');
        });

        it('should reject unassigned project', async () => {
            const projectId = 1;
            const reviewData = {
                feedback: 'Good project',
                outcome: 'approved'
            };

            db.executeQuery
                .mockResolvedValueOnce([{ role_name: 'reviewer' }]) // Mock reviewer check
                .mockResolvedValueOnce([]); // No assignment found

            const response = await request(app)
                .post(`/api/reviewer/proposals/${projectId}/review`)
                .set('Authorization', `Bearer ${mockToken}`)
                .send(reviewData);

            expect(response.status).toBe(403);
            expect(response.body.error).toBe('Project not assigned to this reviewer');
        });

        it('should handle database error', async () => {
            const projectId = 1;
            const reviewData = {
                feedback: 'Good project',
                outcome: 'approved'
            };

            db.executeQuery
                .mockResolvedValueOnce([{ role_name: 'reviewer' }]) // Mock reviewer check
                .mockResolvedValueOnce([{ id: 1 }]) // Mock assignment check
                .mockRejectedValueOnce(new Error('Database error')); // Mock review insertion error

            const response = await request(app)
                .post(`/api/reviewer/proposals/${projectId}/review`)
                .set('Authorization', `Bearer ${mockToken}`)
                .send(reviewData);

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to submit review');
        });
    });

    describe('GET /proposals/:projectId/review', () => {
        beforeEach(() => {
            // Setup default mocks for successful authentication and reviewer role
            extractToken.mockReturnValue(mockToken);
            getUserIdFromToken.mockResolvedValue(mockUserId);
            db.executeQuery.mockResolvedValue([{ role_name: 'reviewer' }]);
        });

        it('should return review status', async () => {
            const projectId = "1";
            const mockReview = {
                outcome: 'approved'
            };

            // Clear previous mocks
            db.executeQuery.mockClear();

            // Set up the mock chain
            db.executeQuery
                .mockResolvedValueOnce([{ role_name: 'reviewer' }]) // Mock reviewer check
                .mockResolvedValueOnce([mockReview]); // Mock review fetch

            const response = await request(app)
                .get(`/api/reviewer/proposals/${projectId}/review`)
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(response.body.review).toEqual(mockReview);
            
            // Verify the second call (review fetch) was made with the correct parameters
            expect(db.executeQuery).toHaveBeenNthCalledWith(
                2,
                expect.any(String),
                [projectId]
            );
        });

        it('should return null for no review', async () => {
            const projectId = 1;

            db.executeQuery
                .mockResolvedValueOnce([{ role_name: 'reviewer' }]) // Mock reviewer check
                .mockResolvedValueOnce([]); // Mock review fetch - no review found

            const response = await request(app)
                .get(`/api/reviewer/proposals/${projectId}/review`)
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(200);
            expect(response.body.review).toBeNull();
        });

        it('should handle database error', async () => {
            const projectId = 1;

            db.executeQuery
                .mockResolvedValueOnce([{ role_name: 'reviewer' }]) // Mock reviewer check
                .mockRejectedValueOnce(new Error('Database error')); // Mock review fetch error

            const response = await request(app)
                .get(`/api/reviewer/proposals/${projectId}/review`)
                .set('Authorization', `Bearer ${mockToken}`);

            expect(response.status).toBe(500);
            expect(response.body.error).toBe('Failed to fetch review');
        });
    });
}); 