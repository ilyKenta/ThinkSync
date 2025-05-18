import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectsWidget from '../ProjectsWidget';
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
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn()
  })
}));

describe('ProjectsWidget', () => {
  const mockOnDelete = jest.fn();
  const mockToken = 'mock-token';
  const mockProjects = [
    {
      project_ID: 1,
      title: 'Test Project',
      description: 'Test Description',
      created_at: '2024-01-01',
      collaborators: [
        {
          user_ID: 'user1',
          fname: 'John',
          sname: 'Doe',
          department: 'Research',
          role: 'Lead'
        }
      ],
      reviews: [
        {
          outcome: 'Approved',
          feedback: 'Great work',
          reviewed_at: '2024-01-15'
        }
      ]
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(mockToken);
    (global.fetch as jest.Mock).mockImplementation((url, options) => {
      if (url.includes('/api/projects/create')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Project created successfully' })
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ projects: mockProjects })
      });
    });
  });

  it('renders loading state initially', () => {
    render(<ProjectsWidget onDelete={mockOnDelete} />);
    expect(screen.getByText('Loading projects...')).toBeInTheDocument();
  });

  it('renders error state when fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Fetch failed'));
    
    render(<ProjectsWidget onDelete={mockOnDelete} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load projects. Please try again later.')).toBeInTheDocument();
    });
  });

  it('renders no projects message when projects array is empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: [] })
    });

    render(<ProjectsWidget onDelete={mockOnDelete} />);
    
    await waitFor(() => {
      expect(screen.getByText('No projects found. Create a new project to get started.')).toBeInTheDocument();
    });
  });

  it('renders project information correctly', async () => {
    render(<ProjectsWidget onDelete={mockOnDelete} />);
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Created:')).toBeInTheDocument();
      // Accept both date formats
      expect(
        screen.getByText((text) =>
          text === '1/1/2024' || text === '2024/01/01' || text === '2024-01-01'
        )
      ).toBeInTheDocument();
      expect(screen.getByText('John Doe (Research) - Lead')).toBeInTheDocument();
      expect(screen.getByText('Outcome: Approved')).toBeInTheDocument();
      expect(screen.getByText('Great work')).toBeInTheDocument();
    });
  });

  it('handles project navigation correctly', async () => {
    const multipleProjects = [
      ...mockProjects,
      {
        project_ID: 2,
        title: 'Second Project',
        description: 'Second Description',
        created_at: '2024-01-02',
        collaborators: [],
        reviews: []
      }
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: multipleProjects })
    });

    render(<ProjectsWidget onDelete={mockOnDelete} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Next'));
    
    await waitFor(() => {
      expect(screen.getByText('Second Project')).toBeInTheDocument();
    });
  });

  it('opens create project form when create button is clicked', async () => {
    render(<ProjectsWidget onDelete={mockOnDelete} />);
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('+ Create Project'));
    await waitFor(() => {
      expect(screen.getByText('Project Information')).toBeInTheDocument();
    });
  });

  it('opens edit project form when edit button is clicked', async () => {
    render(<ProjectsWidget onDelete={mockOnDelete} />);
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Edit Project'));
    await waitFor(() => {
      // Look for a heading with 'Edit Project'
      const headings = screen.getAllByText('Edit Project');
      expect(headings.some(h => h.tagName === 'H1' || h.tagName === 'h1')).toBe(true);
    });
  });

  it('opens invite collaborators modal when invite button is clicked', async () => {
    render(<ProjectsWidget onDelete={mockOnDelete} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTitle('Invite Collaborators'));
    
    await waitFor(() => {
      expect(screen.getByText('Invite Collaborators')).toBeInTheDocument();
    });
  });

  it('handles project deletion correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProjects })
    }).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Project deleted successfully' })
    });

    render(<ProjectsWidget onDelete={mockOnDelete} />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Mock window.confirm
    window.confirm = jest.fn(() => true);

    fireEvent.click(screen.getByTitle('Delete project'));
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api-url/api/projects/delete/1',
        expect.objectContaining({
          method: 'DELETE'
        })
      );
    });
  });

  it('handles session expiration correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      status: 401,
      ok: false
    });

    render(<ProjectsWidget onDelete={mockOnDelete} />);
    
    await waitFor(() => {
      expect(screen.getByText('Session expired. Please log in again.')).toBeInTheDocument();
    });
  });
}); 