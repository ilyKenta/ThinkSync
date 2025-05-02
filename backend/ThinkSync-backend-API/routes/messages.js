const express = require('express');
const router = express.Router();
const { executeQuery } = require('../db');
const { getUserIdFromToken, extractToken } = require('../utils/auth');
const { BlobServiceClient } = require('@azure/storage-blob');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Azure Blob Storage client
let blobServiceClient;
let containerClient;

// Function to initialize Azure Storage
async function initializeAzureStorage() {
    try {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

        if (!connectionString) {
            throw new Error('Azure Storage connection string is not configured');
        }
        if (!containerName) {
            throw new Error('Azure Storage container name is not configured');
        }

        blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        containerClient = blobServiceClient.getContainerClient(containerName);

        // Test the connection
        await containerClient.getProperties();
        console.log('Successfully connected to Azure Blob Storage');
    } catch (error) {
        console.error('Failed to initialize Azure Storage client:', error);
        process.exit(1);
    }
}

// Initialize storage on startup
initializeAzureStorage().catch(error => {
    console.error('Failed to initialize Azure Storage:', error);
    process.exit(1);
});

// Middleware to authenticate user
const authenticateUser = async (req, res, next) => {
    try {
        const token = extractToken(req);
        const userId = await getUserIdFromToken(token);
        req.userId = userId;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// Get all messages for the authenticated user
router.get('/', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const query = `
            SELECT 
                m.message_ID,
                m.sender_ID,
                m.receiver_ID,
                m.subject,
                m.body,
                m.sent_at,
                m.is_read,
                m.project_ID,
                p.title as project_title,
                sender.sname as sender_name,
                receiver.sname as receiver_name,
                GROUP_CONCAT(
                    JSON_OBJECT(
                        'attachment_ID', ma.attachment_ID,
                        'file_name', ma.file_name,
                        'file_url', ma.file_url
                    )
                ) as attachments
            FROM messages m
            LEFT JOIN projects p ON m.project_ID = p.project_ID
            LEFT JOIN users sender ON m.sender_ID = sender.user_ID
            LEFT JOIN users receiver ON m.receiver_ID = receiver.user_ID
            LEFT JOIN message_attachments ma ON m.message_ID = ma.message_ID
            WHERE m.receiver_ID = ? OR m.sender_ID = ?
            GROUP BY m.message_ID
            ORDER BY m.sent_at DESC
        `;
        
        const messages = await executeQuery(query, [userId, userId]);
        
        // Parse attachments JSON
        messages.forEach(message => {
            if (message.attachments) {
                message.attachments = JSON.parse(`[${message.attachments}]`);
            } else {
                message.attachments = [];
            }
        });

        res.json(messages);
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

// Get unread messages for the authenticated user
router.get('/unread', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const query = `
            SELECT 
                m.message_ID,
                m.sender_ID,
                m.subject,
                m.sent_at,
                sender.name as sender_name,
                COUNT(ma.attachment_ID) as attachment_count
            FROM messages m
            LEFT JOIN users sender ON m.sender_ID = sender.user_ID
            LEFT JOIN message_attachments ma ON m.message_ID = ma.message_ID
            WHERE m.receiver_ID = ? AND m.is_read = FALSE
            GROUP BY m.message_ID
            ORDER BY m.sent_at DESC
        `;
        
        const unreadMessages = await executeQuery(query, [userId]);
        res.json(unreadMessages);
    } catch (error) {
        console.error('Error fetching unread messages:', error);
        res.status(500).json({ error: 'Failed to fetch unread messages' });
    }
});

// Send a new message with optional attachments
router.post('/', authenticateUser, upload.array('attachments', 5), async (req, res) => {
    try {
        const userId = req.userId;
        const { receiver_ID, subject, body, project_ID } = req.body;
        const files = req.files || [];

        // Insert the message
        const messageQuery = `
            INSERT INTO messages (sender_ID, receiver_ID, subject, body, project_ID)
            VALUES (?, ?, ?, ?, ?)
        `;
        const messageResult = await executeQuery(messageQuery, [
            userId,
            receiver_ID,
            subject,
            body,
            project_ID || null
        ]);

        const messageId = messageResult.insertId;

        // Handle attachments if any
        if (files.length > 0) {
            const attachmentPromises = files.map(async (file) => {
                const blobName = `${messageId}/${Date.now()}-${file.originalname}`;
                const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                
                // Upload with metadata
                await blockBlobClient.uploadData(file.buffer, {
                    blobHTTPHeaders: {
                        blobContentType: file.mimetype,
                        blobContentDisposition: `attachment; filename="${encodeURIComponent(file.originalname)}"`,
                    },
                    metadata: {
                        originalName: file.originalname,
                        mimeType: file.mimetype,
                        size: file.size.toString(),
                        uploadDate: new Date().toISOString()
                    }
                });

                const fileUrl = blockBlobClient.url;
                
                const attachmentQuery = `
                    INSERT INTO message_attachments 
                    (message_ID, file_name, file_url, storage_container, blob_name)
                    VALUES (?, ?, ?, ?, ?)
                `;
                
                return executeQuery(attachmentQuery, [
                    messageId,
                    file.originalname,
                    fileUrl,
                    process.env.AZURE_STORAGE_CONTAINER_NAME,
                    blobName
                ]);
            });

            await Promise.all(attachmentPromises);
        }

        res.status(201).json({ message: 'Message sent successfully', messageId });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Mark a message as read
router.put('/:messageId/read', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { messageId } = req.params;

        const query = `
            UPDATE messages 
            SET is_read = TRUE 
            WHERE message_ID = ? AND receiver_ID = ?
        `;
        
        await executeQuery(query, [messageId, userId]);
        res.json({ message: 'Message marked as read' });
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({ error: 'Failed to mark message as read' });
    }
});

// Upload attachment
router.post('/:messageId/attachments', authenticateUser, upload.single('file'), async (req, res) => {
    try {
        if (!blobServiceClient || !containerClient) {
            throw new Error('Azure Storage is not properly configured');
        }

        const { messageId } = req.params;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const blobName = `${messageId}/${file.originalname}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        await blockBlobClient.uploadData(file.buffer);

        const attachmentUrl = blockBlobClient.url;
        await executeQuery(
            'INSERT INTO attachments (message_id, file_name, file_url) VALUES (?, ?, ?)',
            [messageId, file.originalname, attachmentUrl]
        );

        res.json({ url: attachmentUrl });
    } catch (error) {
        console.error('Error uploading attachment:', error);
        res.status(500).json({ error: 'Failed to upload attachment' });
    }
});

// Get attachment
router.get('/:messageId/attachments/:attachmentId', authenticateUser, async (req, res) => {
    try {
        if (!blobServiceClient || !containerClient) {
            throw new Error('Azure Storage is not properly configured');
        }

        const { messageId, attachmentId } = req.params;
        const [attachment] = await executeQuery(
            'SELECT * FROM attachments WHERE id = ? AND message_id = ?',
            [attachmentId, messageId]
        );

        if (!attachment) {
            return res.status(404).json({ error: 'Attachment not found' });
        }

        const blobName = `${messageId}/${attachment.file_name}`;
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);
        const downloadBlockBlobResponse = await blockBlobClient.download();
        const downloaded = await downloadBlockBlobResponse.blobBody;

        res.setHeader('Content-Type', attachment.content_type || 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.file_name}"`);
        downloaded.pipe(res);
    } catch (error) {
        console.error('Error downloading attachment:', error);
        res.status(500).json({ error: 'Failed to download attachment' });
    }
});

module.exports = router; 