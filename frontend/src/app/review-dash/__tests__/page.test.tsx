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
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));
    render(<Page />);
    
    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to fetch/i)).toBeInTheDocument();
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
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ proposals: mockProposals })
    });

    render(<Page />);

    await waitFor(() => {
      // Check for project titles
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      expect(screen.getByText('Test Project 2')).toBeInTheDocument();
      
      // Check for descriptions
      expect(screen.getByText('Test description 1')).toBeInTheDocument();
      expect(screen.getByText('Test description 2')).toBeInTheDocument();
      
      // Check for dates using getAllByText since there are multiple elements
      const startDates = screen.getAllByText(/Start:/i);
      expect(startDates[0]).toHaveTextContent(/2024\/01\/01/);
      expect(startDates[1]).toHaveTextContent(/2024\/01\/03/);
      
      const assignedDates = screen.getAllByText(/Assigned to you at:/i);
      expect(assignedDates[0]).toHaveTextContent(/2024\/01\/02/);
      expect(assignedDates[1]).toHaveTextContent(/2024\/01\/04/);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://thinksyncapi.azurewebsites.net/api/reviewer/proposals',
      expect.objectContaining({
        headers: {
          'Authorization': 'Bearer test-token'
        }
      })
    );
  });

  it('handles proposal card click', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ proposals: mockProposals })
    });

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

  it('handles search functionality', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ proposals: mockProposals })
    });

    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      expect(screen.getByText('Test Project 2')).toBeInTheDocument();
    });

    // The search functionality is not implemented in the component yet
    // This test should be skipped or marked as pending
    // TODO: Implement search functionality in the component
  });

  it('handles API error response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid request' })
    });

    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to fetch proposals/i)).toBeInTheDocument();
    });
  });

  it('handles network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<Page />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Network error/i)).toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching proposals:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('handles navigation between tabs', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ proposals: mockProposals })
    });

    render(<Page />);

    // Wait for the proposals to be loaded
    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    });

    // Click the tab
    const myTab = screen.getByText('Assigned proposals');
    fireEvent.click(myTab);

    // Verify navigation
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