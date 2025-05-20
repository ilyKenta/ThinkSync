import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ComposeMessage from '../ComposeMessage';

jest.mock('../page.module.css', () => new Proxy({}, { get: (target, prop) => prop }));

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation((msg) => {
    if (
      typeof msg === 'string' &&
      (msg.includes('Authentication error') || msg.includes('Submission error'))
    ) return;
  });
});
afterEach(() => {
  if ((console.error as any).mockRestore) {
    (console.error as any).mockRestore();
  }
});

describe('ComposeMessage', () => {
  let onClose: jest.Mock;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    onClose = jest.fn();
    jest.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-token'),
        setItem: jest.fn(),
        clear: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
    // Mock alert
    global.alert = jest.fn();
    // Globally mock fetch to always return a valid object with json method
    mockFetch = jest.fn((url) => {
      if (url && typeof url === 'string') {
        if (url.includes('search-users') || url.includes('search-projects')) {
          return Promise.resolve({ ok: true, json: async () => [] });
        }
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    global.fetch = mockFetch;
  });

  it('renders all main fields and buttons', () => {
    render(<ComposeMessage onClose={onClose} />);
    expect(screen.getByText('Compose Message')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search users...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search projects...')).toBeInTheDocument();
    expect(screen.getByText('Send')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<ComposeMessage onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows alert if trying to send without selecting a user', async () => {
    render(<ComposeMessage onClose={onClose} />);

    // Fill in the form
    fireEvent.change(screen.getByPlaceholderText('Search users...'), {
      target: { value: 'Al' }
    });
    fireEvent.change(screen.getByPlaceholderText('Search projects...'), {
      target: { value: 'Proj' }
    });
    const subjectInput = screen.getAllByRole('textbox')[2];
    fireEvent.change(subjectInput, { target: { value: 'Subject' } });
    const messageInput = document.querySelector('textarea');
    if (!messageInput) throw new Error('Message textarea not found');
    fireEvent.change(messageInput, { target: { value: 'Body' } });

    // Try to send without selecting a user
    fireEvent.click(screen.getByText('Send'));

    // Check if the error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Please select a recipient')).toBeInTheDocument();
    });
  });

  it('shows and selects user search results', async () => {
    // Mock fetch for user search
    mockFetch.mockResolvedValueOnce({
      json: () => Promise.resolve([
        { user_ID: 1, fname: 'Alice', sname: 'Smith' },
        { user_ID: 2, fname: 'Bob', sname: 'Jones' },
      ]),
      ok: true,
    });
    render(<ComposeMessage onClose={onClose} />);
    fireEvent.change(screen.getByPlaceholderText('Search users...'), { target: { value: 'Al' } });
    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Alice Smith'));
    expect(screen.getByText('Selected: Alice Smith')).toBeInTheDocument();
  });

  it('shows and selects project search results', async () => {
    // Mock fetch for user and project search based on URL
    mockFetch.mockImplementation((url) => {
      if (url.includes('search-users')) {
        return Promise.resolve({ ok: true, json: async () => [] });
      }
      if (url.includes('search-projects')) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { project_ID: 1, title: 'Project X', owner_fname: 'Alice', owner_sname: 'Smith' },
          ],
        });
      }
      // Default
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });
    render(<ComposeMessage onClose={onClose} />);
    fireEvent.change(screen.getByPlaceholderText('Search projects...'), { target: { value: 'Pro' } });
    // Wait for the project button to appear
    const projectButton = await screen.findByRole('button', { name: /Project X/i });
    fireEvent.click(projectButton);
    // Wait for the input value to update to the project title
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search projects...')).toHaveValue('Project X');
    });
    // Wait for the linked project mark to appear
    await waitFor(() => {
      expect(screen.getByTestId('linked-project')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('handles subject and body input changes', () => {
    render(<ComposeMessage onClose={onClose} />);
    const subjectInput = screen.getAllByRole('textbox')[2];
    fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
    expect(subjectInput).toHaveValue('Test Subject');
    const messageInput = document.querySelector('textarea');
    if (!messageInput) throw new Error('Message textarea not found');
    fireEvent.change(messageInput, { target: { value: 'Test Body' } });
    expect(messageInput).toHaveValue('Test Body');
  });

  it('validates file attachments (type, size, count)', () => {
    const { container } = render(<ComposeMessage onClose={onClose} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    if (!fileInput) throw new Error('File input not found');
    // Helper to set files property
    function setFiles(input: HTMLInputElement, files: File[]) {
      Object.defineProperty(input, 'files', {
        value: files,
        configurable: true,
      });
    }
    // Invalid type
    const invalidFile = new File(['data'], 'file.txt', { type: 'text/plain' });
    setFiles(fileInput, [invalidFile]);
    fireEvent.change(fileInput);
    expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('not an allowed type'));
    fileInput.value = '';
    // Valid file, but too large
    const largeFile = new File(['a'.repeat(51 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });
    setFiles(fileInput, [largeFile]);
    fireEvent.change(fileInput);
    expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('too large'));
    fileInput.value = '';
    // Valid file, but too many
    const validFile = new File(['data'], 'file1.pdf', { type: 'application/pdf' });
    setFiles(fileInput, [validFile, validFile, validFile, validFile, validFile, validFile]);
    fireEvent.change(fileInput);
    expect(global.alert).toHaveBeenCalledWith('You can attach up to 5 files.');
  });

  it('sends message successfully', async () => {
    // Mock successful API response
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('search-users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { user_ID: 1, fname: 'Alice', sname: 'Smith' }
          ])
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'Message sent successfully!' })
      });
    });

    render(<ComposeMessage onClose={onClose} />);

    // Fill in the form
    fireEvent.change(screen.getByPlaceholderText('Search users...'), {
      target: { value: 'Alice' }
    });

    // Wait for and select the user
    const userButton = await screen.findByText('Alice Smith');
    fireEvent.click(userButton);

    const subjectInput = screen.getAllByRole('textbox')[2];
    fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
    const messageInput = document.querySelector('textarea');
    if (!messageInput) throw new Error('Message textarea not found');
    fireEvent.change(messageInput, { target: { value: 'Test Body' } });

    // Send the message
    fireEvent.click(screen.getByText('Send'));

    // Check if the modal is closed
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows alert on send error', async () => {
    // Mock failed API response
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url.includes('search-users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { user_ID: 1, fname: 'Alice', sname: 'Smith' }
          ])
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to send message' })
      });
    });

    render(<ComposeMessage onClose={onClose} />);

    // Fill in the form
    fireEvent.change(screen.getByPlaceholderText('Search users...'), {
      target: { value: 'Alice' }
    });

    // Wait for and select the user
    const userButton = await screen.findByText('Alice Smith');
    fireEvent.click(userButton);

    const subjectInput = screen.getAllByRole('textbox')[2];
    fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
    const messageInput = document.querySelector('textarea');
    if (!messageInput) throw new Error('Message textarea not found');
    fireEvent.change(messageInput, { target: { value: 'Test Body' } });

    // Try to send the message
    fireEvent.click(screen.getByText('Send'));

    // Check if the error message is displayed
    await waitFor(() => {
      expect(screen.getByText('Failed to send message')).toBeInTheDocument();
    });

    // Verify that onClose was not called
    expect(onClose).not.toHaveBeenCalled();
  });
}); 