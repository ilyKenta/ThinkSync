import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Page from '../page';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('AdminMessage Page', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockMessages = [
    {
      message_ID: 1,
      sender_ID: 1,
      receiver_ID: 2,
      subject: 'Test Subject',
      body: 'Test message body',
      sent_at: '2024-03-20T10:00:00Z',
      is_read: false,
      sender_fname: 'John',
      sender_sname: 'Doe',
      receiver_fname: 'Jane',
      receiver_sname: 'Smith',
      project_title: 'Test Project',
      attachments: [
        {
          attachment_ID: 1,
          message_ID: 1,
          file_name: 'test.pdf',
          file_url: 'http://example.com/test.pdf'
        }
      ]
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'jwt') return 'mock-token';
      if (key === 'user_ID') return '1';
      return null;
    });
    window.alert = jest.fn();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/messages')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMessages),
          blob: () => Promise.resolve(new Blob()),
        });
      }
      if (url.includes('/api/messages/mark-read')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  // Initial Render Tests
  describe('Initial Render', () => {
    it('should render the admin messaging page with correct layout', async () => {
      render(<Page />);
      await waitFor(() => {
        expect(screen.getByText('ThinkSync')).toBeInTheDocument();
        expect(screen.getByText('Admin Messages')).toBeInTheDocument();
        expect(screen.getByText('Inbox')).toBeInTheDocument();
      });
    });

    it('should display admin navigation menu items', async () => {
      render(<Page />);
      await waitFor(() => {
        expect(screen.getByText('Manage Users')).toBeInTheDocument();
        expect(screen.getByText('Submitted Proposals')).toBeInTheDocument();
        expect(screen.getByText('Messager')).toBeInTheDocument();
      });
    });
  });

  // Message List Tests
  describe('Message List', () => {
    it('should display conversation previews', async () => {
      render(<Page />);
      await waitFor(() => {
        const nameElement = screen.getByText((content, element) => {
          return element?.textContent === 'Jane Smith';
        });
        expect(nameElement).toBeInTheDocument();
        expect(screen.getByText('Test message body...')).toBeInTheDocument();
      });
    });

    it('should handle empty message list', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        })
      );
      render(<Page />);
      await waitFor(() => {
        expect(screen.getByText('No messages yet.')).toBeInTheDocument();
      });
    });
  });

  // Message Selection Tests
  describe('Message Selection', () => {
    it('should display selected conversation', async () => {
      render(<Page />);
      await waitFor(() => {
        const nameElement = screen.getByText((content, element) => {
          return element?.textContent === 'Jane Smith';
        });
        fireEvent.click(nameElement);
        expect(screen.getByText('Chat with Jane Smith')).toBeInTheDocument();
        expect(screen.getByText('Test message body')).toBeInTheDocument();
      });
    });

    it('should mark messages as read when conversation is selected', async () => {
      render(<Page />);
      await waitFor(() => {
        const nameElement = screen.getByText((content, element) => {
          return element?.textContent === 'Jane Smith';
        });
        fireEvent.click(nameElement);
      });
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/messages/mark-read'),
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('"senderId":"2"')
          })
        );
      });
    });
  });

  // Message Composition Tests
  describe('Message Composition', () => {
    it('should open compose message modal', async () => {
      render(<Page />);
      await waitFor(() => {
        const composeButton = screen.getByRole('button', { name: /Compose Message/i });
        fireEvent.click(composeButton);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should send a new message', async () => {
      // Mock the fetch implementation for this specific test
      (global.fetch as jest.Mock).mockImplementation((url, options) => {
        if (url.includes('/api/messages') && options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ message: 'Message sent successfully' })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMessages)
        });
      });

      render(<Page />);
      
      // Wait for initial load and select conversation
      await waitFor(() => {
        const nameElement = screen.getByText((content, element) => {
          return element?.textContent === 'Jane Smith';
        });
        fireEvent.click(nameElement);
      });

      // Type and send message
      const messageInput = screen.getByPlaceholderText('Type a message...');
      await userEvent.type(messageInput, 'New test message');
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);

      // Verify the fetch call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/messages'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-token'
            })
          })
        );
      });
    });
  });

  // Navigation Tests
  describe('Navigation', () => {
    it('should navigate to admin dashboard', async () => {
      render(<Page />);
      await waitFor(() => {
        fireEvent.click(screen.getByText('Manage Users'));
        expect(mockRouter.push).toHaveBeenCalledWith('/admin-dashboard');
      });
    });

    it('should navigate to proposals', async () => {
      render(<Page />);
      await waitFor(() => {
        fireEvent.click(screen.getByText('Submitted Proposals'));
        expect(mockRouter.push).toHaveBeenCalledWith('/admin-dashboard');
      });
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    it('should handle fetch error', async () => {
      // Mock console.error to prevent error output in test
      const originalConsoleError = console.error;
      console.error = jest.fn();

      // Mock fetch to return an empty array for the error case
      (global.fetch as jest.Mock).mockImplementationOnce(() => 
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve([]) // Return empty array instead of error object
        })
      );

      // Render the component
      render(<Page />);

      // Wait for the component to handle the error
      await waitFor(() => {
        expect(screen.getByText('Admin Messages')).toBeInTheDocument();
        expect(screen.getByText('No messages yet.')).toBeInTheDocument();
      }, { timeout: 3000 });

      // Restore console.error
      console.error = originalConsoleError;
    });

    it('should handle missing token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      render(<Page />);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/messages'),
        expect.any(Object)
      );
    });
  });
});