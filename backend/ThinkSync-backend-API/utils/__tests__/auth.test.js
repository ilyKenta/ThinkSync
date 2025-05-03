process.env.AZURE_CLIENT_ID = 'client-id';
const { getUserIdFromToken, extractToken, validateToken } = require('../auth');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Mock jwksClient
jest.mock('jwks-rsa', () =>
  jest.fn().mockImplementation(() => ({
    getSigningKey: jest.fn().mockResolvedValue({
      getPublicKey: jest.fn().mockReturnValue('public-key')
    })
  }))
);

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  decode: jest.fn(),
  verify: jest.fn()
}));

describe('Auth Utilities', () => {
  const mockToken = 'mock-token';
  const mockValidToken = {
    header: { kid: 'key-id' },
    oid: 'user-123',
    aud: 'client-id',
    exp: Math.floor(Date.now() / 1000) + 3600,
    nbf: Math.floor(Date.now() / 1000) - 3600
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractToken', () => {
    it('should extract token from Authorization header', () => {
      const req = {
        headers: {
          authorization: 'Bearer mock-token'
        }
      };
      expect(extractToken(req)).toBe('mock-token');
    });

    it('should throw error when Authorization header is missing', () => {
      const req = { headers: {} };
      expect(() => extractToken(req)).toThrow('Access token is required');
    });

    it('should throw error when Authorization header is malformed', () => {
      const req = {
        headers: {
          authorization: 'InvalidFormat mock-token'
        }
      };
      expect(() => extractToken(req)).toThrow('Access token is required');
    });
  });

  describe('validateToken', () => {
    beforeEach(() => {
      jwt.decode.mockReturnValue(mockValidToken);
      jwt.verify.mockReturnValue(mockValidToken);
    });

    it('should validate a valid token', async () => {
      const result = await validateToken(mockToken);
      expect(result).toEqual(mockValidToken);
      expect(jwt.decode).toHaveBeenCalledWith(mockToken, { complete: true });
      expect(jwt.verify).toHaveBeenCalledWith(
        mockToken,
        'public-key',
        expect.objectContaining({
          algorithms: ['RS256'],
          ignoreExpiration: false,
          ignoreNotBefore: false
        })
      );
    });

    it('should throw error for empty token', async () => {
      await expect(validateToken('')).rejects.toThrow('Token is empty');
    });

    it('should throw error for invalid token format', async () => {
      jwt.decode.mockReturnValue(null);
      await expect(validateToken(mockToken)).rejects.toThrow('Invalid token format');
    });

    it('should throw error for expired token', async () => {
      jwt.verify.mockReturnValue({
        ...mockValidToken,
        exp: Math.floor(Date.now() / 1000) - 1
      });
      await expect(validateToken(mockToken)).rejects.toThrow('Token has expired');
    });

    it('should throw error for token not yet valid', async () => {
      jwt.verify.mockReturnValue({
        ...mockValidToken,
        nbf: Math.floor(Date.now() / 1000) + 3600
      });
      await expect(validateToken(mockToken)).rejects.toThrow('Token is not yet valid');
    });

    it('should throw error for invalid audience', async () => {
      jwt.verify.mockReturnValue({
        ...mockValidToken,
        aud: 'invalid-audience'
      });
      await expect(validateToken(mockToken)).rejects.toThrow('Token invalid');
    });
  });

  describe('getUserIdFromToken', () => {
    beforeEach(() => {
      jwt.decode.mockReturnValue(mockValidToken);
      jwt.verify.mockReturnValue(mockValidToken);
    });

    it('should return user ID from valid token', async () => {
      const userId = await getUserIdFromToken(mockToken);
      expect(userId).toBe('user-123');
    });

    it('should throw error when token validation fails', async () => {
      jwt.verify.mockImplementation(() => { throw new Error('Invalid token'); });
      await expect(getUserIdFromToken(mockToken)).rejects.toThrow('Token validation failed: Invalid token');
    });
  });
}); 