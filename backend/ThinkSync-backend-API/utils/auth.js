const axios = require('axios');

// Helper function to get user ID from Microsoft Entra token
async function getUserIdFromToken(token) {
    // Uncomment for real token validation
    // if (!token) {
    //     throw new Error('Access token is required');
    // }
    // try {
    //     const graphResponse = await axios.get("https://graph.microsoft.com/v1.0/me", {
    //         headers: {
    //             Authorization: `Bearer ${token}`
    //         }
    //     });
    //     return graphResponse.data.id;
    // } catch (error) {
    //     throw new Error('Invalid token');
    // }
    // For development/testing, return a static user ID
    return '65fc38ee-5415-49f4-96ee-4a1643a69923';
}

// Helper function to extract token from Authorization header
function extractToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('No token provided');
    }
    return authHeader.split(' ')[1];
}

module.exports = {
    getUserIdFromToken,
    extractToken
}; 