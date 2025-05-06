import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import Page from '../page';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock useAuth
jest.mock('../../useAuth', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation((msg) => {
    if (typeof msg === 'string' && msg.includes('Error fetching proposals')) return;
  });
});
afterAll(() => {
  if ((console.error as any).mockRestore) {
    (console.error as any).mockRestore();
  }
});

describe('Review Dashboard Page', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockProposals = [
    {
      project_ID: '1',
      title: 'Test Project 1',
      description: 'Test description 1',
      start_date: '2024-01-01',
      Assigned_at: '2024-01-02',
    },
    {
      project_ID: '2',
      title: 'Test Project 2',
      description: 'Test description 2',
      start_date: '2024-01-03',
      Assigned_at: '2024-01-04',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'jwt') return 'test-token';
      if (key === 'role') return JSON.stringify([{ role_name: 'reviewer' }]);
      return null;
    });
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === `${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/reviewer/proposals`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ proposals: mockProposals }),
        });
      }
      if (url === `${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/messages/unread`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      // Default: return a valid empty response for any other endpoint
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it('renders loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<Page />);
    expect(screen.getByText('Loading proposals...')).toBeInTheDocument();
  });

  it('redirects to login when user is not a reviewer', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'jwt') return 'test-token';
      if (key === 'role') return JSON.stringify([{ role_name: 'researcher' }]);
      return null;
    });

    render(<Page />);
    
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });
  });

  it('renders error state when fetch fails', async () => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === `${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/reviewer/proposals`) {
        return Promise.reject(new Error('Failed to fetch'));
      }
      if (url === `${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/messages/unread`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to fetch|Error/i)).toBeInTheDocument();
    });
  });

  it('renders error state when token is missing', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'jwt') return null;
      return JSON.stringify([{ role_name: 'reviewer' }]);
    });

    render(<Page />);
    
    await waitFor(() => {
      expect(screen.getByText(/Error: No access token found/i)).toBeInTheDocument();
    });
  });

  it('fetches and displays proposals successfully', async () => {
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      expect(screen.getByText('Test Project 2')).toBeInTheDocument();
    });
  });

  it('handles proposal card click', async () => {
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    });
    const projectCard = screen.getByText('Test Project 1').closest('article');
    fireEvent.click(projectCard!);
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(
        expect.stringContaining('/prop-info?projectId=1')
      );
    });
  });

  it('handles API error response', async () => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === `${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/reviewer/proposals`) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Invalid request' })
        });
      }
      if (url === `${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/messages/unread`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText(/Error: An error occurred|Error: Invalid request|Error/i)).toBeInTheDocument();
    });
  });

  it('handles network error', async () => {
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === `${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/reviewer/proposals`) {
        return Promise.reject(new Error('Network error'));
      }
      if (url === `${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/messages/unread`) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText(/Error: Network error|Error/i)).toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching proposals:', expect.any(Error));
    });
    consoleSpy.mockRestore();
  });

  it('handles navigation between tabs', async () => {
    render(<Page />);
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    });
    const myTab = screen.getByText('Assigned proposals');
    fireEvent.click(myTab);
    expect(mockRouter.push).toHaveBeenCalledWith('/review-dash');
  });

  it('redirects to login when role parsing fails', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'jwt') return 'test-token';
      if (key === 'role') return 'invalid-json'; // This will cause JSON.parse to fail
      return null;
    });

    render(<Page />);
    
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/login');
    });
  });
}); 