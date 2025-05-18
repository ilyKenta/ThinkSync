import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MilestonesWidget from '../MilestonesWidget';
import { act } from 'react-dom/test-utils';

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

// Mock environment variables
process.env.NEXT_PUBLIC_AZURE_API_URL = 'http://test-api-url';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}));

describe('MilestonesWidget', () => {
  const mockOnDelete = jest.fn();
  const mockToken = 'mock-token';
  const mockProjects = [
    {
      project_ID: 1,
      title: 'Test Project',
      owner_ID: 'user1',
      collaborators: [
        {
          user_ID: 'user1',
          first_name: 'John',
          last_name: 'Doe',
          is_owner: true
        }
      ],
      milestones: [
        {
          milestone_ID: 1,
          title: 'Milestone 1',
          description: 'Description 1',
          expected_completion_date: '2024-12-31',
          status: 'Not Started',
          assigned_user_ID: null
        },
        {
          milestone_ID: 2,
          title: 'Milestone 2',
          description: 'Description 2',
          expected_completion_date: '2024-12-31',
          status: 'In Progress',
          assigned_user_ID: 'user1'
        }
      ]
    }
  ];

  const mockSummary = [
    { status: 'Not Started', count: 1, percentage: 50 },
    { status: 'In Progress', count: 1, percentage: 50 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(mockToken);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ 
        projects: mockProjects,
        summary: mockSummary
      })
    });
  });

  it('renders loading state initially', () => {
    render(<MilestonesWidget onDelete={mockOnDelete} />);
    expect(screen.getByText('Loading milestones...')).toBeInTheDocument();
  });

  it('renders error state when fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Fetch failed'));
    
    render(<MilestonesWidget onDelete={mockOnDelete} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load projects. Please try again later.')).toBeInTheDocument();
    });
  });

  it('renders no projects message when projects array is empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: [], summary: [] })
    });

    render(<MilestonesWidget onDelete={mockOnDelete} />);
    
    await waitFor(() => {
      expect(screen.getByText('No projects found. Create a project to get started.')).toBeInTheDocument();
    });
  });

  it('renders project and milestone information correctly', async () => {
    render(<MilestonesWidget onDelete={mockOnDelete} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('Milestone 1')).toBeInTheDocument();
      expect(screen.getByText('Milestone 2')).toBeInTheDocument();
      expect(screen.getByText('Not Started')).toBeInTheDocument();
      expect(screen.getByText('In Progress')).toBeInTheDocument();
    });
  });

  it('handles project navigation correctly', async () => {
    const multipleProjects = [
      ...mockProjects,
      {
        project_ID: 2,
        title: 'Second Project',
        owner_ID: 'user1',
        collaborators: [],
        milestones: []
      }
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 
        projects: multipleProjects,
        summary: mockSummary
      })
    });

    render(<MilestonesWidget onDelete={mockOnDelete} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Next Project'));
    
    await waitFor(() => {
      expect(screen.getByText('Second Project')).toBeInTheDocument();
    });
  });

  it('opens create milestone form when create button is clicked', async () => {
    render(<MilestonesWidget onDelete={mockOnDelete} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Milestone'));
    
    await waitFor(() => {
      expect(screen.getByText('Create New Milestone')).toBeInTheDocument();
    });
  });

  it('handles milestone creation correctly', async () => {
    render(<MilestonesWidget onDelete={mockOnDelete} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('New Milestone'));
    
    await waitFor(() => {
      expect(screen.getByText('Create New Milestone')).toBeInTheDocument();
    });

    // Fill in the form
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'New Milestone' } });
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'New Description' } });
    fireEvent.change(screen.getByLabelText('Due Date'), { target: { value: '2024-12-31' } });
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'Not Started' } });

    fireEvent.click(screen.getByText('Create Milestone'));
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api-url/api/milestones/1',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String)
        })
      );
    });
  });

  it('handles milestone click navigation', async () => {
    render(<MilestonesWidget onDelete={mockOnDelete} />);
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Milestone 1'));
    expect(mockPush).toHaveBeenCalledWith(
      '/milestones/1?from=custom-dashboard'
    );
  });

  it('handles report download correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ 
        projects: mockProjects,
        summary: mockSummary
      })
    }).mockResolvedValueOnce({
      ok: true,
      blob: () => Promise.resolve(new Blob())
    });

    render(<MilestonesWidget onDelete={mockOnDelete} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Download Report'));
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api-url/api/milestones/report/generate',
        expect.any(Object)
      );
    });
  });

  it('handles session expiration correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 401,
      ok: false
    });

    render(<MilestonesWidget onDelete={mockOnDelete} />);
    
    await waitFor(() => {
      expect(screen.getByText('Session expired. Please log in again.')).toBeInTheDocument();
    });
  });

  it('renders milestone summary chart correctly', async () => {
    render(<MilestonesWidget onDelete={mockOnDelete} />);
    await waitFor(() => {
      expect(screen.getByText('Milestone Progress Overview')).toBeInTheDocument();
      // Check for the chart container
      expect(document.querySelector('.recharts-responsive-container')).toBeInTheDocument();
      // Check for legend/label elements
      const notStartedLabels = screen.queryAllByText((content) => content.includes('Not Started'));
      const inProgressLabels = screen.queryAllByText((content) => content.includes('In Progress'));
      expect(notStartedLabels.length).toBeGreaterThan(0);
      expect(inProgressLabels.length).toBeGreaterThan(0);
    });
  });

  it('handles milestone status updates correctly', async () => {
    render(<MilestonesWidget onDelete={mockOnDelete} />);
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Milestone 1'));
    expect(mockPush).toHaveBeenCalledWith(
      '/milestones/1?from=custom-dashboard'
    );
  });
}); 