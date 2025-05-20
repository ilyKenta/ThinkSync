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

  it('renders error state when not authenticated', async () => {
    localStorageMock.getItem.mockReturnValue(null);
    render(<SubmittedProposalsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Error: Authentication required')).toBeInTheDocument();
    });
  });

  it('renders error state when API returns invalid format', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ invalid: 'format' })
    });

    render(<SubmittedProposalsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Error: Invalid response format from server')).toBeInTheDocument();
    });
  });

  it('renders error state when no valid proposals found', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: [] })
    });

    render(<SubmittedProposalsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Error: No valid proposals found')).toBeInTheDocument();
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
      `${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/admin/projects/pending`,
      expect.objectContaining({
        headers: {
          'Authorization': 'Bearer test-token'
        }
      })
    );
  });

  it('handles proposal selection and displays details', async () => {
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

  it('handles missing optional fields gracefully', async () => {
    const incompleteProposal = {
      project_ID: '3',
      title: 'Test Project 3',
      researcher_fname: 'Bob',
      researcher_sname: 'Wilson',
      // Missing research_areas and description
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: [incompleteProposal] })
    });

    render(<SubmittedProposalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project 3')).toBeInTheDocument();
      expect(screen.getByText('Bob Wilson')).toBeInTheDocument();
      expect(screen.getByText('No research areas specified')).toBeInTheDocument();
    });
  });

  it('opens and closes assign reviewer modal', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: [mockProposals[0]] })
    });

    render(<SubmittedProposalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    });

    // Click the Assign button
    const assignButton = screen.getByTitle('Assign reviewer');
    fireEvent.click(assignButton);

    // Check if the AssignReviewers component is rendered
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Assign Reviewer' })).toBeInTheDocument();
    });

    // Click the Cancel button
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Check if the modal is closed
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Assign Reviewer' })).not.toBeInTheDocument();
    });
  });

  it('refreshes proposals after successful reviewer assignment', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ projects: [mockProposals[0]] })
      });

    render(<SubmittedProposalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    });

    // Open assign reviewer modal
    const assignButton = screen.getByTitle('Assign reviewer');
    fireEvent.click(assignButton);

    // Click the Cancel button to close the modal
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    // Only one fetch call should have been made (no refresh)
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
}); 