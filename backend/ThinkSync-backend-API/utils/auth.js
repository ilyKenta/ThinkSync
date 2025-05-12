const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');


const MICROSOFT_ENTRA_CONFIG = {
    audience: process.env.AZURE_CLIENT_ID, // Your application's client ID
    jwksUri: 'https://login.microsoftonline.com/common/discovery/keys'
};

// Function to validate the token
async function validateToken(token) {
    try {
        // Basic validation
        if (!token) {
            console.error('Token is empty');
            throw new Error('Token is empty');
        }

        // Get the signing key from Microsoft's JWKS endpoint
        const client = jwksClient({
            jwksUri: MICROSOFT_ENTRA_CONFIG.jwksUri,
            cache: true,
            rateLimit: true,
            jwksRequestsPerMinute: 10
        });

        // Get the key ID from the token header
        const decodedToken = jwt.decode(token, { complete: true });
        if (!decodedToken || !decodedToken.header || !decodedToken.header.kid) {
            console.error('Invalid token format');
            throw new Error('Invalid token format');
        }

        // Get the signing key
        const key = await client.getSigningKey(decodedToken.header.kid);
        const signingKey = key.getPublicKey();

        // Verify the token
        const verifiedToken = jwt.verify(token, signingKey, {
            algorithms: ['RS256'],
            ignoreExpiration: false,
            ignoreNotBefore: false
        });

        // Check if the audience matches
        const validAudiences = [
            MICROSOFT_ENTRA_CONFIG.audience,
            `api://${MICROSOFT_ENTRA_CONFIG.audience}`,
            `https://${MICROSOFT_ENTRA_CONFIG.audience}`
        ];

        if (!validAudiences.includes(verifiedToken.aud)) {
            console.error('Invalid audience:', {
                received: verifiedToken.aud,
                expected: validAudiences
            });
            throw new Error(`Token invalid`);
        }

        // Check token expiration
        const now = Math.floor(Date.now() / 1000);
        if (verifiedToken.exp < now) {
            console.error('Token expired');
            throw new Error('Token has expired');
        }

        // Check token not before time
        if (verifiedToken.nbf > now) {
            console.error('Token not yet valid');
            throw new Error('Token is not yet valid');
        }

        return verifiedToken;
    } catch (error) {
        console.error('Token validation error:', error.message);
        throw new Error(`Token validation failed: ${error.message}`);
    }
}

// Helper function to get user ID from Microsoft Entra token
async function getUserIdFromToken(token) {
    try {
        // First validate the token
        const validatedToken = await validateToken(token);
        // Return the user's object ID (oid)
        return validatedToken.oid;
    } catch (error) {
        console.error('Error getting user ID from token:', error.message);
        throw error;
    }
    //return '65fc38ee-5415-49f4-96ee-4a1643a69923';
}

// Helper function to extract token from Authorization header
function extractToken(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Access token is required');
    }
    return authHeader.split(' ')[1];
}

module.exports = {
    getUserIdFromToken,
    extractToken,
    validateToken
}; 