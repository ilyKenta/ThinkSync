jest.spyOn(console, 'error').mockImplementation(() => {});
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(process, 'exit').mockImplementation(() => {});

const { BlobServiceClient } = require('@azure/storage-blob');
const path = require('path');
const messagesPath = path.resolve(__dirname, '../messages.js');

// Clear the require cache for messages.js so we can re-require with different envs
function clearMessagesCache() {
  delete require.cache[messagesPath];
}

describe('initializeAzureStorage', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    clearMessagesCache();
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should log and exit if AZURE_STORAGE_CONNECTION_STRING is missing', async () => {
    process.env.AZURE_STORAGE_CONNECTION_STRING = '';
    process.env.AZURE_STORAGE_CONTAINER_NAME = 'dummy';
    const { initializeAzureStorage } = require('../messages');
    await initializeAzureStorage();
    const calls = console.error.mock.calls;
    expect(calls.some(call => call[0].includes('Failed to initialize Azure Storage client:') && call[1] && call[1].message && call[1].message.includes('Azure Storage connection string is not configured'))).toBe(true);
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should log and exit if AZURE_STORAGE_CONTAINER_NAME is missing', async () => {
    process.env.AZURE_STORAGE_CONNECTION_STRING = 'dummy';
    process.env.AZURE_STORAGE_CONTAINER_NAME = '';
    const { initializeAzureStorage } = require('../messages');
    await initializeAzureStorage();
    const calls = console.error.mock.calls;
    expect(calls.some(call => call[0].includes('Failed to initialize Azure Storage client:') && call[1] && call[1].message && call[1].message.includes('Azure Storage container name is not configured'))).toBe(true);
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should log and exit if getProperties throws', async () => {
    process.env.AZURE_STORAGE_CONNECTION_STRING = 'dummy';
    process.env.AZURE_STORAGE_CONTAINER_NAME = 'dummy';
    const mockGetProperties = jest.fn().mockRejectedValue(new Error('fail'));
    const mockGetContainerClient = jest.fn().mockReturnValue({ getProperties: mockGetProperties });
    BlobServiceClient.fromConnectionString = jest.fn().mockReturnValue({ getContainerClient: mockGetContainerClient });
    clearMessagesCache();
    const { initializeAzureStorage } = require('../messages');
    await initializeAzureStorage();
    const calls = console.error.mock.calls;
    console.log('console.error.mock.calls:', JSON.stringify(calls));
    expect(calls.some(call => call[0] && call[0].includes('Failed to initialize Azure Storage client:'))).toBe(true);
    expect(process.exit).toHaveBeenCalledWith(1);
  });
}); 