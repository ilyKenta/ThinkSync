import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SubmittedProposalsPage from '../page';
import '@testing-library/jest-dom';

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

describe('SubmittedProposalsPage', () => {
  const mockProposals = [
    {
      project_ID: '1',
      title: 'Test Project 1',
      researcher_fname: 'John',
      researcher_sname: 'Doe',
      research_areas: 'AI, Machine Learning',
      description: 'Test description 1'
    },
    {
      project_ID: '2',
      title: 'Test Project 2',
      researcher_fname: 'Jane',
      researcher_sname: 'Smith',
      research_areas: 'Data Science',
      description: 'Test description 2'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'jwt') return 'test-token';
      return null;
    });
  });

  it('renders loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    render(<SubmittedProposalsPage />);
    expect(screen.getByText('Loading proposals...')).toBeInTheDocument();
  });

  it('renders error state when fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));
    render(<SubmittedProposalsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch')).toBeInTheDocument();
    });
  });

  it('renders error state when token is missing', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    render(<SubmittedProposalsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Error: No access token found')).toBeInTheDocument();
    });
  });

  it('fetches and displays proposals successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProposals })
    });

    render(<SubmittedProposalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
      expect(screen.getByText('Test Project 2')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('AI, Machine Learning')).toBeInTheDocument();
      expect(screen.getByText('Data Science')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://thinksyncapi.azurewebsites.net/api/admin/projects/pending',
      expect.objectContaining({
        headers: {
          'Authorization': 'Bearer test-token'
        }
      })
    );
  });

  it('handles proposal selection', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProposals })
    });

    render(<SubmittedProposalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    });

    // Click the view button for the first proposal
    const viewButtons = screen.getAllByText('View');
    fireEvent.click(viewButtons[0]);

    // Check if the details panel appears with the correct information
    const detailsPanel = screen.getByTestId('proposal-details');
    expect(detailsPanel).toBeInTheDocument();
    expect(detailsPanel).toHaveTextContent('Test Project 1');
    expect(detailsPanel).toHaveTextContent('John Doe');
    expect(detailsPanel).toHaveTextContent('AI, Machine Learning');
    expect(detailsPanel).toHaveTextContent('Test description 1');
  });

  it('opens and closes assign reviewer modal', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProposals })
    });

    render(<SubmittedProposalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    });

    // Click the assign button for the first proposal
    const assignButtons = screen.getAllByText('Assign');
    fireEvent.click(assignButtons[0]);

    // Check if the AssignReviewers component is rendered with the correct title
    await waitFor(() => {
      // Use more specific selectors to avoid ambiguity
      const modalTitle = screen.getByRole('heading', { name: 'Assign Reviewer' });
      expect(modalTitle).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search by research area')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Search' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Assign Reviewer' })).toBeInTheDocument();
    });

    // Click the cancel button to close the modal
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    // Verify the modal is closed
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Assign Reviewer' })).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Search by research area')).not.toBeInTheDocument();
    });
  });

  it('closes assign reviewer modal when clicking outside', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProposals })
    });

    render(<SubmittedProposalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    });

    // Click the assign button for the first proposal
    const assignButtons = screen.getAllByText('Assign');
    fireEvent.click(assignButtons[0]);

    // Check if the modal is open
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Assign Reviewer' })).toBeInTheDocument();
    });

    // Click the cancel button to close the modal
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    fireEvent.click(cancelButton);

    // Verify the modal is closed
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Assign Reviewer' })).not.toBeInTheDocument();
    });
  });

  it('handles API error response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid request' })
    });

    render(<SubmittedProposalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch proposals')).toBeInTheDocument();
    });
  });

  it('handles network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<SubmittedProposalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Error: Network error')).toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching proposals:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
}); 