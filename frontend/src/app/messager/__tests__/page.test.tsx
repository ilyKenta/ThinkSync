import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Page from '../page';
import { useRouter, usePathname } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn()
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

describe('Messaging Page', () => {
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
    (usePathname as jest.Mock).mockReturnValue('/messager');
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'jwt') return 'mock-token';
      if (key === 'user_ID') return '1';
      return null;
    });
    // Mock alert and console.error
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
      if (url.includes('/api/messages/unread')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{}]),
          blob: () => Promise.resolve(new Blob()),
        });
      }
      if (url.includes('/api/messages/mark-read')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
          blob: () => Promise.resolve(new Blob()),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
        blob: () => Promise.resolve(new Blob()),
      });
    });
  });

  // Initial Render Tests
  describe('Initial Render', () => {
    it('should render the messaging page with correct layout', async () => {
      render(<Page />);
      await waitFor(() => {
        expect(screen.getByText('ThinkSync')).toBeInTheDocument();
        expect(screen.getByText('My Messages')).toBeInTheDocument();
        expect(screen.getByText('Inbox')).toBeInTheDocument();
      });
    });

    it('should display navigation menu items', async () => {
      render(<Page />);
      await waitFor(() => {
        expect(screen.getByText('My Projects')).toBeInTheDocument();
        expect(screen.getByText('Shared Projects')).toBeInTheDocument();
        expect(screen.getByText('Custom Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Messager')).toBeInTheDocument();
        expect(screen.getByText('Milestones')).toBeInTheDocument();
        expect(screen.getByText('Funding')).toBeInTheDocument();
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

    it('should show unread message indicator', async () => {
      render(<Page />);
      await waitFor(() => {
        const messagerButton = screen.getByRole('button', { name: /Messager/i });
        expect(messagerButton).toHaveTextContent('1');
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
      render(<Page />);
      await waitFor(() => {
        const nameElement = screen.getByText((content, element) => {
          return element?.textContent === 'Jane Smith';
        });
        fireEvent.click(nameElement);
      });
      const messageInput = screen.getByPlaceholderText('Type a message...');
      await userEvent.type(messageInput, 'New test message');
      fireEvent.click(screen.getByText('Send'));
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/messages'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('New test message')
          })
        );
      });
    });
  });

  // Attachment Tests
  describe('Attachments', () => {
    it('should display attachment in message', async () => {
      render(<Page />);
      await waitFor(() => {
        const nameElement = screen.getByText((content, element) => {
          return element?.textContent === 'Jane Smith';
        });
        fireEvent.click(nameElement);
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });
    });

    it('should handle attachment download', async () => {
      const mockBlob = new Blob(['test'], { type: 'application/pdf' });
      (global.fetch as jest.Mock)
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMessages),
          blob: () => Promise.resolve(new Blob()),
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(mockBlob),
          json: () => Promise.resolve([]),
        }))
        .mockImplementationOnce(() => Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMessages),
          blob: () => Promise.resolve(new Blob()),
        }));
      render(<Page />);
      await waitFor(() => {
        const nameElement = screen.getByText((content, element) => {
          return element?.textContent === 'Jane Smith';
        });
        fireEvent.click(nameElement);
      });
      await waitFor(() => {
        const attachmentLink = screen.getByText('test.pdf');
        fireEvent.click(attachmentLink);
      });
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/messages/1/attachments/1'),
          expect.any(Object)
        );
      });
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    beforeEach(() => {
      // Mock window.alert
      window.alert = jest.fn();
    });

    it('should handle fetch error', async () => {
      // Mock console.error to prevent error output in test
      const originalConsoleError = console.error;
      console.error = jest.fn();

      // Mock fetch to return rejected promises instead of throwing
      (global.fetch as jest.Mock)
        .mockImplementationOnce(() => Promise.reject(new Error('Network error')))
        .mockImplementationOnce(() => Promise.reject(new Error('Network error')));

      // Render should not throw
      render(<Page />);

      // Wait for any async operations and verify component still renders
      await waitFor(() => {
        expect(screen.getByText('My Messages')).toBeInTheDocument();
        expect(screen.getByText('Inbox')).toBeInTheDocument();
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

  // Navigation Tests
  describe('Navigation', () => {
    it('should navigate to researcher dashboard', async () => {
      render(<Page />);
      await waitFor(() => {
        fireEvent.click(screen.getByText('My Projects'));
        expect(mockRouter.push).toHaveBeenCalledWith('/researcher-dashboard');
      });
    });

    it('should navigate to shared projects', async () => {
      render(<Page />);
      await waitFor(() => {
        fireEvent.click(screen.getByText('Shared Projects'));
        expect(mockRouter.push).toHaveBeenCalledWith('/Shared_projects');
      });
    });

    it('should navigate to custom dashboard', async () => {
      render(<Page />);
      await waitFor(() => {
        fireEvent.click(screen.getByText('Custom Dashboard'));
        expect(mockRouter.push).toHaveBeenCalledWith('/custom-dashboard');
      });
    });
  });
}); 