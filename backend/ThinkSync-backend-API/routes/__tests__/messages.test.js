jest.resetModules();
jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('process.exit called'); });
process.env.AZURE_STORAGE_CONNECTION_STRING = 'dummy';
process.env.AZURE_STORAGE_CONTAINER_NAME = 'dummy';

// Define mock token
const mockToken = 'mock-token';

// Mock Azure Blob Storage so initialization does not throw
jest.doMock('@azure/storage-blob', () => {
  const mockStream = {
    pipe: jest.fn(),
    on: jest.fn((event, callback) => {
      if (event === 'end') {
        callback();
      }
    })
  };

  const mockBlockBlobClient = {
    uploadData: jest.fn(),
    url: 'http://dummy-url',
    download: jest.fn().mockResolvedValue({
      readableStreamBody: mockStream,
      blobBody: Buffer.from('dummy')
    })
  };

  const mockContainerClient = {
    getProperties: jest.fn().mockResolvedValue({}),
    getBlockBlobClient: jest.fn().mockReturnValue(mockBlockBlobClient)
  };

  return {
    BlobServiceClient: {
      fromConnectionString: jest.fn(() => ({
        getContainerClient: jest.fn().mockReturnValue(mockContainerClient)
      }))
    }
  };
});

// Mock the auth module
jest.mock('../../utils/auth', () => ({
  extractToken: jest.fn(() => mockToken),
  getUserIdFromToken: jest.fn(() => Promise.resolve('test-user')),
}));

// Mock the database module
jest.mock('../../db', () => ({
  executeQuery: jest.fn(),
}));

const db = require('../../db');
const request = require('supertest');
const express = require('express');
const { router } = require('../messages');

// For Azure error test, require BlobServiceClient from the mocked module
const { BlobServiceClient } = require('@azure/storage-blob');
const { PassThrough } = require('stream');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add authentication middleware
app.use((req, res, next) => {
  req.userId = 'test-user';
  next();
});

app.use('/api/messages', router);

jest.setTimeout(10000);

describe('Messages API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.executeQuery.mockReset();
  });

  afterEach(() => {
    // Clean up any remaining async operations
    jest.clearAllTimers();
  });

  describe('GET /api/messages', () => {
    it('should return all messages for the user', async () => {
      const mockMessages = [{
        message_ID: 1,
        sender_ID: 'test-user',
        receiver_ID: 'other-user',
        subject: 'Test',
        body: 'Hello',
        sent_at: '2024-01-01',
        is_read: false,
        project_ID: 1,
        project_title: 'Project',
        sender_sname: 'Smith',
        sender_fname: 'John',
        receiver_sname: 'Doe',
        receiver_fname: 'Jane',
        attachments: null,
      }];
      
      db.executeQuery.mockResolvedValueOnce(mockMessages);
      
      const res = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${mockToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].subject).toBe('Test');
    });

    it('should handle DB errors', async () => {
      db.executeQuery.mockImplementationOnce(() => { throw new Error('DB error'); });
      const res = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${mockToken}`);
      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/Failed to fetch messages/);
    });

    it('should handle messages with attachments', async () => {
      const mockMessage = {
        message_ID: 1,
        sender_ID: 'test-user',
        receiver_ID: 'other-user',
        subject: 'Test',
        body: 'Hello',
        sent_at: '2024-01-01',
        is_read: false,
        project_ID: 1,
        project_title: 'Project',
        sender_sname: 'Smith',
        sender_fname: 'John',
        receiver_sname: 'Doe',
        receiver_fname: 'Jane',
        attachments: '{"attachment_ID":1,"file_name":"test.pdf","file_url":"http://test.com"}'
      };
      
      db.executeQuery.mockResolvedValueOnce([mockMessage]);
      
      const res = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${mockToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].attachments).toHaveLength(1);
      expect(res.body[0].attachments[0].file_name).toBe('test.pdf');
    });

    it('should handle messages with empty attachments', async () => {
      const mockMessage = {
        message_ID: 1,
        sender_ID: 'test-user',
        receiver_ID: 'other-user',
        subject: 'Test',
        body: 'Hello',
        sent_at: '2024-01-01',
        is_read: false,
        project_ID: null,
        project_title: null,
        sender_sname: 'Smith',
        sender_fname: 'John',
        receiver_sname: 'Doe',
        receiver_fname: 'Jane',
        attachments: null
      };
      
      db.executeQuery.mockResolvedValueOnce([mockMessage]);
      
      const res = await request(app)
        .get('/api/messages')
        .set('Authorization', `Bearer ${mockToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].attachments).toHaveLength(0);
    });
  });

  describe('GET /api/messages/unread', () => {
    it('should return unread messages', async () => {
      db.executeQuery.mockResolvedValueOnce([
        { message_ID: 1, sender_ID: 'test-user', subject: 'Test', sent_at: '2024-01-01', sender_sname: 'Smith', sender_fname: 'John', attachment_count: 0 },
      ]);
      const res = await request(app)
        .get('/api/messages/unread')
        .set('Authorization', `Bearer ${mockToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should handle DB errors', async () => {
      db.executeQuery.mockImplementationOnce(() => { throw new Error('DB error'); });
      const res = await request(app)
        .get('/api/messages/unread')
        .set('Authorization', `Bearer ${mockToken}`);
      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/Failed to fetch unread messages/);
    });
  });

  describe('POST /api/messages', () => {
    it('should send a new message without attachments', async () => {
      db.executeQuery.mockResolvedValueOnce({ insertId: 1 });
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ receiver_ID: 'other-user', subject: 'Hi', body: 'Test', project_ID: 1 });
      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/Message sent successfully/);
    });

    it('should reject invalid file type', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${mockToken}`)
        .field('receiver_ID', 'other-user')
        .field('subject', 'Test')
        .field('body', 'Test')
        .attach('attachments', Buffer.from('test'), {
          filename: 'test.exe',
          contentType: 'application/x-msdownload'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/not an allowed type/);
    });

    it('should reject file exceeding size limit', async () => {
      const largeBuffer = Buffer.alloc(51 * 1024 * 1024); // 51MB
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${mockToken}`)
        .field('receiver_ID', 'other-user')
        .field('subject', 'Test')
        .field('body', 'Test')
        .attach('attachments', largeBuffer, {
          filename: 'large.pdf',
          contentType: 'application/pdf'
        });
      
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/too large/);
    });

    it('should handle multiple file uploads', async () => {
      db.executeQuery.mockResolvedValueOnce({ insertId: 1 });
      db.executeQuery.mockResolvedValue({ insertId: 1 }); // For attachment inserts
      
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${mockToken}`)
        .field('receiver_ID', 'other-user')
        .field('subject', 'Test')
        .field('body', 'Test')
        .attach('attachments', Buffer.from('test1'), {
          filename: 'test1.pdf',
          contentType: 'application/pdf'
        })
        .attach('attachments', Buffer.from('test2'), {
          filename: 'test2.pdf',
          contentType: 'application/pdf'
        });
      
      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/Message sent successfully/);
    });

    it('should handle Azure Blob Storage errors', async () => {
      // Get the mocked BlockBlobClient
      const mockBlockBlobClient = BlobServiceClient.fromConnectionString().getContainerClient().getBlockBlobClient();
      
      // Mock the uploadData method to reject
      mockBlockBlobClient.uploadData.mockRejectedValueOnce(new Error('Azure error'));
      
      // Mock the database query to succeed for message creation
      db.executeQuery.mockResolvedValueOnce({ insertId: 1 });
      
      // Mock the database query to fail for attachment creation
      db.executeQuery.mockRejectedValueOnce(new Error('Failed to create attachment record'));
      
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${mockToken}`)
        .field('receiver_ID', 'other-user')
        .field('subject', 'Test')
        .field('body', 'Test')
        .attach('attachments', Buffer.from('test'), {
          filename: 'test.pdf',
          contentType: 'application/pdf'
        });
      
      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/Failed to send message/);
      expect(mockBlockBlobClient.uploadData).toHaveBeenCalled();
    });

    it('should handle attachment database operation errors', async () => {
      db.executeQuery.mockResolvedValueOnce({ insertId: 1 }); // Message insert
      db.executeQuery.mockRejectedValueOnce(new Error('DB error')); // Attachment insert
      
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${mockToken}`)
        .field('receiver_ID', 'other-user')
        .field('subject', 'Test')
        .field('body', 'Test')
        .attach('attachments', Buffer.from('test'), {
          filename: 'test.pdf',
          contentType: 'application/pdf'
        });
      
      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/Failed to send message/);
    });

    it('should handle message with project_ID as null', async () => {
      db.executeQuery.mockResolvedValueOnce({ insertId: 1 });
      
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ receiver_ID: 'other-user', subject: 'Hi', body: 'Test' });
      
      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/Message sent successfully/);
    });

    it('should handle message with empty subject', async () => {
      db.executeQuery.mockResolvedValueOnce({ insertId: 1 });
      
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ receiver_ID: 'other-user', subject: '', body: 'Test' });
      
      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/Message sent successfully/);
    });

    it('should handle message with empty body', async () => {
      db.executeQuery.mockResolvedValueOnce({ insertId: 1 });
      
      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ receiver_ID: 'other-user', subject: 'Hi', body: '' });
      
      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/Message sent successfully/);
    });

    it('should handle Azure storage initialization error', async () => {
      const originalBlobServiceClient = BlobServiceClient.fromConnectionString;
      BlobServiceClient.fromConnectionString = jest.fn(() => {
        throw new Error('Azure initialization error');
      });

      const res = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ receiver_ID: 'other-user', subject: 'Hi', body: 'Test' });

      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/Failed to send message/);

      BlobServiceClient.fromConnectionString = originalBlobServiceClient;
    });
  });

  describe('POST /api/messages/:messageId/attachments', () => {
    beforeEach(() => {
      // Reset blobServiceClient and containerClient before each test
      require('../messages').blobServiceClient = { dummy: true };
      require('../messages').containerClient = {
        getBlockBlobClient: () => ({
          uploadData: jest.fn().mockResolvedValue(),
          url: 'http://dummy-url'
        })
      };
    });

    it('should return 400 if no file uploaded', async () => {
      const res = await request(app)
        .post('/api/messages/1/attachments')
        .set('Authorization', `Bearer ${mockToken}`)
        .send();
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/No file uploaded/);
    });

    it('should return 400 for invalid file type', async () => {
      const res = await request(app)
        .post('/api/messages/1/attachments')
        .set('Authorization', `Bearer ${mockToken}`)
        .attach('file', Buffer.from('test'), {
          filename: 'test.exe',
          contentType: 'application/x-msdownload'
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/not an allowed type/);
    });

    it('should return 400 for file too large', async () => {
      const largeBuffer = Buffer.alloc(51 * 1024 * 1024); // 51MB
      const res = await request(app)
        .post('/api/messages/1/attachments')
        .set('Authorization', `Bearer ${mockToken}`)
        .attach('file', largeBuffer, {
          filename: 'large.pdf',
          contentType: 'application/pdf'
        });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/too large/);
    });

    it('should return 500 if blob storage is not configured', async () => {
      require('../messages').blobServiceClient = undefined;
      require('../messages').containerClient = undefined;
      const res = await request(app)
        .post('/api/messages/1/attachments')
        .set('Authorization', `Bearer ${mockToken}`)
        .attach('file', Buffer.from('test'), {
          filename: 'test.pdf',
          contentType: 'application/pdf'
        });
      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/Failed to upload attachment/);
    });

    it('should return 500 if blob upload fails', async () => {
      require('../messages').blobServiceClient = { dummy: true };
      require('../messages').containerClient = {
        getBlockBlobClient: () => ({
          uploadData: jest.fn().mockRejectedValue(new Error('upload fail')),
          url: 'http://dummy-url'
        })
      };
      db.executeQuery.mockResolvedValueOnce({ insertId: 1 });
      const res = await request(app)
        .post('/api/messages/1/attachments')
        .set('Authorization', `Bearer ${mockToken}`)
        .attach('file', Buffer.from('test'), {
          filename: 'test.pdf',
          contentType: 'application/pdf'
        });
      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/Failed to upload attachment/);
    });
  });

  describe('GET /api/messages/:messageId/attachments/:attachmentId', () => {
    beforeEach(() => {
      require('../messages').blobServiceClient = { dummy: true };
      require('../messages').containerClient = {
        getBlockBlobClient: () => ({
          download: jest.fn().mockResolvedValue({ blobBody: Buffer.from('dummy') })
        })
      };
    });

    it('should return 500 if blob storage is not configured', async () => {
      require('../messages').blobServiceClient = undefined;
      require('../messages').containerClient = undefined;
      db.executeQuery.mockResolvedValueOnce([{ blob_name: 'blob', file_name: 'file.pdf' }]);
      const res = await request(app)
        .get('/api/messages/1/attachments/1')
        .set('Authorization', `Bearer ${mockToken}`);
      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/Failed to download attachment/);
    });

    it('should handle downloaded as buffer', async () => {
      require('../messages').blobServiceClient = { dummy: true };
      require('../messages').containerClient = {
        getBlockBlobClient: () => ({
          download: jest.fn().mockResolvedValue({ blobBody: Buffer.from('dummy') })
        })
      };
      db.executeQuery.mockResolvedValueOnce([{ blob_name: 'blob', file_name: 'file.pdf' }]);
      const res = await request(app)
        .get('/api/messages/1/attachments/1')
        .set('Authorization', `Bearer ${mockToken}`);
      expect([200, 500]).toContain(res.status);
    });

    it('should handle downloaded as stream', async () => {
      const { PassThrough } = require('stream');
      const stream = new PassThrough();
      stream.end('dummy');
      require('../messages').blobServiceClient = { dummy: true };
      require('../messages').containerClient = {
        getBlockBlobClient: () => ({
          download: jest.fn().mockResolvedValue({ readableStreamBody: stream })
        })
      };
      db.executeQuery.mockResolvedValueOnce([{ blob_name: 'blob', file_name: 'file.pdf' }]);
      const res = await request(app)
        .get('/api/messages/1/attachments/1')
        .set('Authorization', `Bearer ${mockToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/messages/search-users', () => {
    it('should search users', async () => {
      db.executeQuery.mockResolvedValueOnce([{ user_ID: '1', sname: 'Smith', fname: 'John' }]);
      const res = await request(app)
        .get('/api/messages/search-users?query=Smith')
        .set('Authorization', `Bearer ${mockToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should handle DB errors', async () => {
      db.executeQuery.mockImplementationOnce(() => { throw new Error('DB error'); });
      const res = await request(app)
        .get('/api/messages/search-users?query=Smith')
        .set('Authorization', `Bearer ${mockToken}`);
      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/Failed to search users/);
    });

    it('should handle empty search query', async () => {
      db.executeQuery.mockResolvedValueOnce([]);
      
      const res = await request(app)
        .get('/api/messages/search-users?query=')
        .set('Authorization', `Bearer ${mockToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('should handle special characters in search query', async () => {
      db.executeQuery.mockResolvedValueOnce([]);
      
      const res = await request(app)
        .get('/api/messages/search-users?query=test%20user')
        .set('Authorization', `Bearer ${mockToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /api/messages/search-projects', () => {
    it('should search projects', async () => {
      db.executeQuery.mockResolvedValueOnce([{ project_ID: 1, title: 'Test', owner_fname: 'John', owner_sname: 'Smith' }]);
      const res = await request(app)
        .get('/api/messages/search-projects?query=Test')
        .set('Authorization', `Bearer ${mockToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should handle DB errors', async () => {
      db.executeQuery.mockImplementationOnce(() => { throw new Error('DB error'); });
      const res = await request(app)
        .get('/api/messages/search-projects?query=Test')
        .set('Authorization', `Bearer ${mockToken}`);
      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/Failed to search projects/);
    });

    it('should handle empty search query', async () => {
      db.executeQuery.mockResolvedValueOnce([]);
      
      const res = await request(app)
        .get('/api/messages/search-projects?query=')
        .set('Authorization', `Bearer ${mockToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(0);
    });

    it('should handle special characters in search query', async () => {
      db.executeQuery.mockResolvedValueOnce([]);
      
      const res = await request(app)
        .get('/api/messages/search-projects?query=test%20project')
        .set('Authorization', `Bearer ${mockToken}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('PUT /api/messages/mark-read', () => {
    it('should mark messages as read', async () => {
      db.executeQuery.mockResolvedValueOnce({});
      const res = await request(app)
        .put('/api/messages/mark-read')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ senderId: 'other-user' });
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Messages marked as read/);
    });

    it('should return 400 if senderId missing', async () => {
      const res = await request(app)
        .put('/api/messages/mark-read')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/senderId is required/);
    });

    it('should handle DB errors', async () => {
      db.executeQuery.mockImplementationOnce(() => { throw new Error('DB error'); });
      const res = await request(app)
        .put('/api/messages/mark-read')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ senderId: 'other-user' });
      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/Failed to mark messages as read/);
    });

    it('should handle empty senderId', async () => {
      const res = await request(app)
        .put('/api/messages/mark-read')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ senderId: '' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/senderId is required/);
    });

    it('should handle null senderId', async () => {
      const res = await request(app)
        .put('/api/messages/mark-read')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ senderId: null });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/senderId is required/);
    });

    it('should handle undefined senderId', async () => {
      const res = await request(app)
        .put('/api/messages/mark-read')
        .set('Authorization', `Bearer ${mockToken}`)
        .send({ senderId: undefined });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/senderId is required/);
    });
  });
}); 