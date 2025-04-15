const mysql = require('mysql2/promise');
const db = require('../db');

jest.mock('mysql2/promise', () => ({
  createConnection: jest.fn()
}));

describe('Database Connection', () => {
  let mockConnection;
  
  beforeEach(() => {
    // Mock environment variables
    process.env.DB_HOST = 'localhost';
    process.env.DB_USER = 'test-user';
    process.env.DB_PASSWORD = 'test-password';
    process.env.DB_NAME = 'test-db';
    process.env.DB_PORT = '3306';

    jest.useFakeTimers();
    mockConnection = {
      execute: jest.fn()
    };
    mysql.createConnection.mockReset();
    mysql.createConnection.mockImplementation(() => Promise.resolve(mockConnection));
    console.error = jest.fn();
    console.log = jest.fn();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  it('should create connection with correct config', async () => {
    await db.connect();
    
    expect(mysql.createConnection).toHaveBeenCalledWith({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT,
      ssl: {
        rejectUnauthorized: true
      }
    });
  });

  it('should handle connection error', async () => {
    const error = new Error('Connection failed');
    mysql.createConnection.mockImplementationOnce(() => Promise.reject(error));
    
    await expect(db.connect()).rejects.toThrow('Connection failed');
    expect(console.error).toHaveBeenCalledWith('Database connection failed:', error);
  });

  it('should retry connection on failure', async () => {
    const error = new Error('Connection failed');
    mysql.createConnection
      .mockImplementationOnce(() => Promise.reject(error))
      .mockImplementationOnce(() => Promise.resolve(mockConnection));
    
    await db.connectWithRetry();
    
    expect(console.error).toHaveBeenCalledWith('Database connection failed:', error);
    expect(console.log).toHaveBeenCalledWith('Retrying in 5 seconds... (5 retries left)');
    
    jest.advanceTimersByTime(5000);
    
    expect(mysql.createConnection).toHaveBeenCalledTimes(2);
  });

  it('should give up after max retries', async () => {
    const error = new Error('Connection failed');
    mysql.createConnection.mockImplementation(() => Promise.reject(error));
    
    await expect(db.connectWithRetry()).rejects.toThrow('Connection failed');
    expect(console.log).toHaveBeenCalledWith('Max retries reached. Giving up.');
    expect(mysql.createConnection).toHaveBeenCalledTimes(6); // Initial + 5 retries
  });

  it('should log successful connection', async () => {
    await db.connect();
    
    expect(console.log).toHaveBeenCalledWith('Connected to MySQL database');
  });

  it('should execute query successfully', async () => {
    const mockResults = [{ id: 1 }];
    mockConnection.execute.mockResolvedValueOnce([mockResults]);
    
    const results = await db.executeQuery('SELECT * FROM test');
    
    expect(results).toEqual(mockResults);
    expect(mockConnection.execute).toHaveBeenCalledWith('SELECT * FROM test', []);
  });

  it('should handle query execution error', async () => {
    const error = new Error('Query failed');
    mockConnection.execute.mockRejectedValueOnce(error);
    
    await expect(db.executeQuery('SELECT * FROM test')).rejects.toThrow('Query failed');
    expect(console.error).toHaveBeenCalledWith('Query execution failed:', error);
  });
}); 