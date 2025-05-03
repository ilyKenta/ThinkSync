import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import ResearcherDashboard from '../page';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock SentInvitations component
jest.mock('../../components/SentInvitations', () => {
  return function MockSentInvitations() {
    return <div data-testid="mock-sent-invitations">Mock Sent Invitations</div>;
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch
global.fetch = jest.fn();

// Mock console.error and console.log
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

// Mock useAuth
jest.mock('../../useAuth', () => {
  return {
    __esModule: true,
    default: () => ({
      isAuthenticated: true,
      user: { role: 'researcher' },
      token: 'mock-token'
    })
  };
});

describe('ResearcherDashboard', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    localStorageMock.getItem.mockClear();
    (global.fetch as jest.Mock).mockClear();
    mockRouter.push.mockClear();
    
    // Mock console methods
    console.error = jest.fn();
    console.log = jest.fn();

    // Mock fetch responses
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('projects/owner')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ projects: [] }),
        });
      }
      if (url.includes('delete')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Project deleted successfully' }),
        });
      }
      if (url.includes('api/auth')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ token: 'mock-token', role: 'researcher' }),
        });
      }
      if (url.includes('invitations')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ invitations: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  afterEach(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  it('redirects to login when user is not a researcher', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'role') return JSON.stringify([{ role_name: 'user' }]);
      return null;
    });

    await act(async () => {
      render(<ResearcherDashboard />);
    });
    
    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });

  it('renders loading state initially', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'role') return JSON.stringify([{ role_name: 'researcher' }]);
      if (key === 'jwt') return 'mock-token';
      return null;
    });

    // Mock fetch to return a pending promise to ensure loading state
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    await act(async () => {
      render(<ResearcherDashboard />);
    });
    
    // Wait for the loading state to appear
    await waitFor(() => {
      // Check for loading text in the received invitations section
      expect(screen.getByText('Loading invitations...')).toBeInTheDocument();
    });
  });

  it('fetches and displays projects', async () => {
    const mockProjects = [
      {
        project_ID: '1',
        title: 'Test Project',
        description: 'Test Description',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        funding_available: true,
      },
    ];

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'role') return JSON.stringify([{ role_name: 'researcher' }]);
      if (key === 'jwt') return 'mock-token';
      return null;
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProjects }),
    });

    await act(async () => {
      render(<ResearcherDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });
  });

  it('handles project deletion', async () => {
    const mockProjects = [
      {
        project_ID: '1',
        title: 'Test Project',
        description: 'Test Description',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        funding_available: true,
      },
    ];

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'role') return JSON.stringify([{ role_name: 'researcher' }]);
      if (key === 'jwt') return 'mock-token';
      return null;
    });

    // Mock the fetch for projects
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('projects/owner')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ projects: mockProjects }),
        });
      }
      if (url.includes('delete')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Project deleted successfully' }),
        });
      }
      return Promise.reject(new Error('Not found'));
    });

    // Mock window.confirm
    window.confirm = jest.fn(() => true);

    await act(async () => {
      render(<ResearcherDashboard />);
    });

    // Wait for project to be loaded
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getByTitle('Delete project');
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    // Verify confirmation dialog
    expect(window.confirm).toHaveBeenCalled();

    // Verify delete request was made
    expect(global.fetch).toHaveBeenCalledWith(
      'https://thinksyncapi.azurewebsites.net/api/projects/delete/1',
      {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer mock-token'
        }
      }
    );

    // Verify project is removed from UI
    await waitFor(() => {
      expect(screen.queryByText('Test Project')).not.toBeInTheDocument();
    });
  });

  it('opens and closes the create project form', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'role') return JSON.stringify([{ role_name: 'researcher' }]);
      if (key === 'jwt') return 'mock-token';
      return null;
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: [] }),
    });

    await act(async () => {
      render(<ResearcherDashboard />);
    });

    const createButton = screen.getByText('+ Create');
    await act(async () => {
      fireEvent.click(createButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Project Information')).toBeInTheDocument();
      expect(screen.getByLabelText('Project name')).toBeInTheDocument();
      expect(screen.getByLabelText('Project Description')).toBeInTheDocument();
      expect(screen.getByText('Next →')).toBeInTheDocument();
    });
  });

  it('toggles sidebar visibility', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'role') return JSON.stringify([{ role_name: 'researcher' }]);
      if (key === 'jwt') return 'mock-token';
      return null;
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: [] }),
    });

    await act(async () => {
      render(<ResearcherDashboard />);
    });

    const sidebarButton = screen.getByTestId('sidebar-toggle');
    await act(async () => {
      fireEvent.click(sidebarButton);
    });

    await waitFor(() => {
      const sidebar = screen.getByText('Sent Invitations').closest('.sidebar');
      expect(sidebar).toHaveClass('open');
    });
  });

  it('handles project editing', async () => {
    const mockProjects = [
      {
        project_ID: '1',
        title: 'Test Project',
        description: 'Test Description',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        funding_available: true,
      },
    ];

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'role') return JSON.stringify([{ role_name: 'researcher' }]);
      if (key === 'jwt') return 'mock-token';
      return null;
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProjects }),
    });

    await act(async () => {
      render(<ResearcherDashboard />);
    });

    // Wait for project to be loaded
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Click edit button
    const editButton = screen.getByTestId('edit-project-button');
    await act(async () => {
      fireEvent.click(editButton);
    });

    // Verify edit form is shown
    await waitFor(() => {
      expect(screen.getByText('Edit Project')).toBeInTheDocument();
      expect(screen.getByLabelText('Project name')).toBeInTheDocument();
      expect(screen.getByLabelText('Project Description')).toBeInTheDocument();
      expect(screen.getByText('Next: Edit Requirements')).toBeInTheDocument();
    });

    // Close the form
    const closeButton = screen.getByText('X');
    await act(async () => {
      fireEvent.click(closeButton);
    });

    // Verify form is closed
    await waitFor(() => {
      expect(screen.queryByText('Edit Project')).not.toBeInTheDocument();
    });
  });

  it('handles invite collaborator modal', async () => {
    const mockProjects = [
      {
        project_ID: '1',
        title: 'Test Project',
        description: 'Test Description',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        funding_available: true,
      },
    ];

    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'role') return JSON.stringify([{ role_name: 'researcher' }]);
      if (key === 'jwt') return 'mock-token';
      return null;
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProjects }),
    });

    await act(async () => {
      render(<ResearcherDashboard />);
    });

    // Wait for project to be loaded
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Click invite button
    const inviteButton = screen.getByTitle('Invite Collaborators');
    await act(async () => {
      fireEvent.click(inviteButton);
    });

    // Verify invite modal is shown
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Invite Collaborators')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search by name')).toBeInTheDocument();
      expect(screen.getByText('Send Invitation')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    // Close the modal
    const closeButton = screen.getByText('Cancel');
    await act(async () => {
      fireEvent.click(closeButton);
    });

    // Verify modal is closed
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('handles error state when fetching projects fails', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'role') return JSON.stringify([{ role_name: 'researcher' }]);
      if (key === 'jwt') return 'mock-token';
      return null;
    });

    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));

    await act(async () => {
      render(<ResearcherDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch')).toBeInTheDocument();
    });
  });

  it('handles tab switching', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'role') return JSON.stringify([{ role_name: 'researcher' }]);
      if (key === 'jwt') return 'mock-token';
      return null;
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: [] }),
    });

    await act(async () => {
      render(<ResearcherDashboard />);
    });

    const sharedTab = screen.getByText('Shared Projects');
    await act(async () => {
      fireEvent.click(sharedTab);
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/Shared_projects');
  });

  it('handles project creation flow', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'role') return JSON.stringify([{ role_name: 'researcher' }]);
      if (key === 'jwt') return 'mock-token';
      return null;
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: [] }),
    });

    await act(async () => {
      render(<ResearcherDashboard />);
    });

    // Click create button
    const createButton = screen.getByText('+ Create');
    await act(async () => {
      fireEvent.click(createButton);
    });

    // Verify create form is shown
    await waitFor(() => {
      expect(screen.getByText('Project Information')).toBeInTheDocument();
      expect(screen.getByLabelText('Project name')).toBeInTheDocument();
      expect(screen.getByLabelText('Project Description')).toBeInTheDocument();
      expect(screen.getByText('Next →')).toBeInTheDocument();
    });

    // Fill out project details
    const projectName = 'New Test Project';
    const projectDesc = 'Test Description';
    const goals = 'Test Goals';
    const researchArea = 'Test Area';
    const startDate = '2024-01-01';
    const endDate = '2024-12-31';
    const funding = true;

    // Fill in the form fields
    await act(async () => {
      fireEvent.change(screen.getByLabelText('Project name'), { target: { value: projectName } });
      fireEvent.change(screen.getByLabelText('Project Description'), { target: { value: projectDesc } });
      fireEvent.change(screen.getByLabelText('Goals'), { target: { value: goals } });
      fireEvent.change(screen.getByLabelText('Research Area'), { target: { value: researchArea } });
      fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: startDate } });
      fireEvent.change(screen.getByLabelText('End Date'), { target: { value: endDate } });
      fireEvent.click(screen.getByLabelText('Yes'));
    });

    // Submit the form
    const nextButton = screen.getByText('Next →');
    await act(async () => {
      fireEvent.click(nextButton);
    });

    // Verify the form is closed and requirements form is shown
    await waitFor(() => {
      expect(screen.queryByText('Project Information')).not.toBeInTheDocument();
      expect(screen.getByText('Project Requirements')).toBeInTheDocument();
    });
  });

  it('handles inbox sidebar toggling', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'role') return JSON.stringify([{ role_name: 'researcher' }]);
      if (key === 'jwt') return 'mock-token';
      return null;
    });

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: [] }),
    });

    await act(async () => {
      render(<ResearcherDashboard />);
    });

    // Get all icon buttons and select the second one (inbox button)
    const iconButtons = screen.getAllByRole('button').filter(button => 
      button.classList.contains('iconButton')
    );
    const inboxButton = iconButtons[1]; // Second button is the inbox button
    
    await act(async () => {
      fireEvent.click(inboxButton);
    });

    // Verify inbox sidebar is open
    await waitFor(() => {
      const inboxSidebar = screen.getByText('Received Invitations').closest('.sidebar');
      expect(inboxSidebar).toHaveClass('open');
    });

    // Toggle again
    await act(async () => {
      fireEvent.click(inboxButton);
    });

    // Verify inbox sidebar is closed
    await waitFor(() => {
      const inboxSidebar = screen.getByText('Received Invitations').closest('.sidebar');
      expect(inboxSidebar).not.toHaveClass('open');
    });
  });

  it('handles search functionality with no results', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'role') return JSON.stringify([{ role_name: 'researcher' }]);
      if (key === 'jwt') return 'mock-token';
      return null;
    });

    const mockProjects = [{
      project_ID: '1',
      title: 'Test Project',
      description: 'Test Description',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      funding_available: true
    }];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProjects }),
    });

    await act(async () => {
      render(<ResearcherDashboard />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search projects...');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Non-existent Project' } });
    });

    await waitFor(() => {
      expect(screen.queryByText('Test Project')).not.toBeInTheDocument();
    });
  });

  it('handles search functionality with matching results', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'role') return JSON.stringify([{ role_name: 'researcher' }]);
      if (key === 'jwt') return 'mock-token';
      return null;
    });

    const mockProjects = [
      {
        project_ID: '1',
        title: 'Test Project',
        description: 'Test Description',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        funding_available: true
      },
      {
        project_ID: '2',
        title: 'Another Project',
        description: 'Another Description',
        start_date: '2024-01-01',
        end_date: '2024-12-31',
        funding_available: false
      }
    ];

    // Mock the fetch response
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('projects/owner')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ projects: mockProjects }),
        });
      }
      return Promise.reject(new Error('Not found'));
    });

    await act(async () => {
      render(<ResearcherDashboard />);
    });

    // Wait for projects to be loaded
    await waitFor(() => {
      const projectCards = screen.getAllByRole('article');
      expect(projectCards).toHaveLength(2);
    });

    // Get the search input and simulate typing
    const searchInput = screen.getByPlaceholderText('Search projects...');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Test' } });
    });

    // Wait for the filtered results
    await waitFor(() => {
      const projectCards = screen.getAllByRole('article');
      expect(projectCards).toHaveLength(1);
      
      const projectTitle = screen.getByText('Test Project');
      expect(projectTitle).toBeInTheDocument();
      
      const otherProject = screen.queryByText('Another Project');
      expect(otherProject).not.toBeInTheDocument();
    });

    // Test clearing the search
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: '' } });
    });

    // Wait for all projects to be shown again
    await waitFor(() => {
      const projectCards = screen.getAllByRole('article');
      expect(projectCards).toHaveLength(2);
    });
  });
}); 