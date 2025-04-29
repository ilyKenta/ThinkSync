const express = require('express');
const router = express.Router();
const { executeQuery } = require('../db');
const { getUserIdFromToken, extractToken } = require('../utils/auth');
const { BlobServiceClient } = require('@azure/storage-blob');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// Initialize Azure Blob Storage client
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
const containerClient = blobServiceClient.getContainerClient(process.env.AZURE_STORAGE_CONTAINER_NAME);

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

// Get a specific message's attachment
router.get('/attachments/:attachmentId', authenticateUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { attachmentId } = req.params;

        // First verify the user has access to this attachment
        const accessQuery = `
            SELECT ma.*, m.sender_ID, m.receiver_ID
            FROM message_attachments ma
            JOIN messages m ON ma.message_ID = m.message_ID
            WHERE ma.attachment_ID = ? AND (m.sender_ID = ? OR m.receiver_ID = ?)
        `;
        
        const attachment = await executeQuery(accessQuery, [attachmentId, userId, userId]);
        
        if (!attachment || attachment.length === 0) {
            return res.status(404).json({ error: 'Attachment not found or access denied' });
        }

        const { storage_container, blob_name, file_name } = attachment[0]; // Get first result from array

        if (!blob_name) {
            return res.status(404).json({ error: 'Attachment blob name not found' });
        }

        try {
            // Get the blob client
            const containerClient = blobServiceClient.getContainerClient(storage_container || process.env.AZURE_STORAGE_CONTAINER_NAME);
            const blockBlobClient = containerClient.getBlockBlobClient(blob_name);

            // Get blob properties and metadata
            const properties = await blockBlobClient.getProperties();
            
            // Use the original filename from the database
            const originalFileName = file_name;
            
            // Set response headers with proper metadata and CORS
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, X-File-Name, Content-Type');
            
            // Set content headers
            res.setHeader('Content-Type', properties.contentType || 'application/octet-stream');
            res.setHeader('X-File-Name', originalFileName);
            res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(originalFileName)}`);
            res.setHeader('Content-Length', properties.contentLength);

            // Stream the blob to the response
            const downloadResponse = await blockBlobClient.download();
            downloadResponse.readableStreamBody.pipe(res);
        } catch (error) {
            console.error('Error accessing blob:', error);
            res.status(500).json({ error: 'Failed to access attachment file' });
        }

    } catch (error) {
        console.error('Error downloading attachment:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to download attachment' });
        }
    }
});

module.exports = router; 