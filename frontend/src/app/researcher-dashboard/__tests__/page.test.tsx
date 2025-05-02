import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import ResearcherDashboard from '../page';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

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

describe('ResearcherDashboard', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    localStorageMock.getItem.mockClear();
    (global.fetch as jest.Mock).mockClear();
    mockRouter.push.mockClear();
  });

  it('redirects to login when user is not a researcher', () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'role') return JSON.stringify([{ role_name: 'user' }]);
      return null;
    });

    render(<ResearcherDashboard />);
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

    render(<ResearcherDashboard />);
    
    // Wait for the loading state to appear
    await waitFor(() => {
      // Check for any loading text
      const loadingElements = screen.getAllByText(/Loading/i);
      expect(loadingElements.length).toBeGreaterThan(0);
      
      // Check for the specific loading text that appears in the component
      expect(screen.getByText('Loading sent invitations...')).toBeInTheDocument();
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

    render(<ResearcherDashboard />);

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
          json: () => Promise.resolve({}),
        });
      }
      return Promise.reject(new Error('Not found'));
    });

    // Mock window.confirm
    window.confirm = jest.fn(() => true);

    render(<ResearcherDashboard />);

    // Wait for project to be loaded
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Click delete button
    const deleteButton = screen.getByTitle('Delete project');
    fireEvent.click(deleteButton);

    // Verify confirmation dialog
    expect(window.confirm).toHaveBeenCalled();

    // Verify delete request was made
    expect(global.fetch).toHaveBeenCalledWith(
      'https://thinksyncapi.azurewebsites.net/api/projects/delete/1',
      expect.any(Object)
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

    render(<ResearcherDashboard />);

    const createButton = screen.getByText('+ Create');
    fireEvent.click(createButton);

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

    render(<ResearcherDashboard />);

    const sidebarButton = screen.getByTestId('sidebar-toggle');
    fireEvent.click(sidebarButton);

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

    render(<ResearcherDashboard />);

    // Wait for project to be loaded
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Click edit button
    const editButton = screen.getByTestId('edit-project-button');
    fireEvent.click(editButton);

    // Verify edit form is shown
    await waitFor(() => {
      expect(screen.getByText('Edit Project')).toBeInTheDocument();
      expect(screen.getByLabelText('Project name')).toBeInTheDocument();
      expect(screen.getByLabelText('Project Description')).toBeInTheDocument();
      expect(screen.getByText('Next: Edit Requirements')).toBeInTheDocument();
    });

    // Close the form
    const closeButton = screen.getByText('X');
    fireEvent.click(closeButton);

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

    render(<ResearcherDashboard />);

    // Wait for project to be loaded
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    // Click invite button
    const inviteButton = screen.getByTitle('Invite Collaborators');
    fireEvent.click(inviteButton);

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
    fireEvent.click(closeButton);

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

    render(<ResearcherDashboard />);

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

    render(<ResearcherDashboard />);

    const sharedTab = screen.getByText('Shared Projects');
    fireEvent.click(sharedTab);

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

    render(<ResearcherDashboard />);

    // Click create button
    const createButton = screen.getByText('+ Create');
    fireEvent.click(createButton);

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
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: projectName } });
    fireEvent.change(screen.getByLabelText('Project Description'), { target: { value: projectDesc } });
    fireEvent.change(screen.getByLabelText('Goals'), { target: { value: goals } });
    fireEvent.change(screen.getByLabelText('Research Area'), { target: { value: researchArea } });
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: startDate } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: endDate } });
    fireEvent.click(screen.getByLabelText('Yes'));

    // Submit the form
    const nextButton = screen.getByText('Next →');
    fireEvent.click(nextButton);

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

    render(<ResearcherDashboard />);

    // Get all icon buttons and select the second one (inbox button)
    const iconButtons = screen.getAllByRole('button').filter(button => 
      button.classList.contains('iconButton')
    );
    const inboxButton = iconButtons[1]; // Second button is the inbox button
    fireEvent.click(inboxButton);

    // Verify inbox sidebar is open
    await waitFor(() => {
      const inboxSidebar = screen.getByText('Received Invitations').closest('.sidebar');
      expect(inboxSidebar).toHaveClass('open');
    });

    // Toggle again
    fireEvent.click(inboxButton);

    // Verify inbox sidebar is closed
    await waitFor(() => {
      const inboxSidebar = screen.getByText('Received Invitations').closest('.sidebar');
      expect(inboxSidebar).not.toHaveClass('open');
    });
  });

//   it('handles project card click navigation', async () => {
//     const mockRouter = {
//       push: jest.fn()
//     };
//     jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue(mockRouter);

//     localStorageMock.getItem.mockImplementation((key) => {
//       if (key === 'role') return JSON.stringify([{ role_name: 'researcher' }]);
//       if (key === 'jwt') return 'mock-token';
//       return null;
//     });

//     const mockProjects = [
//       {
//         project_ID: '1',
//         title: 'Test Project',
//         description: 'Test Description',
//         start_date: '2024-01-01',
//         end_date: '2024-12-31',
//         funding_available: true
//       }
//     ];

//     (global.fetch as jest.Mock).mockImplementation((url) => {
//       if (url.includes('projects/owner')) {
//         return Promise.resolve({
//           ok: true,
//           json: () => Promise.resolve({ projects: mockProjects })
//         });
//       }
//       return Promise.reject(new Error('Not found'));
//     });

//     render(<ResearcherDashboard />);

//     await waitFor(() => {
//       expect(screen.getByText('Test Project')).toBeInTheDocument();
//     });

//     const projectCard = screen.getByRole('article');
//     fireEvent.click(projectCard);

//     expect(mockRouter.push).toHaveBeenCalledWith('/projectInfo/1');
//   });

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

    render(<ResearcherDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search projects...');
    fireEvent.change(searchInput, { target: { value: 'Non-existent Project' } });

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

    render(<ResearcherDashboard />);

    // Wait for projects to be loaded
    await waitFor(() => {
      const projectCards = screen.getAllByRole('article');
      expect(projectCards).toHaveLength(2);
    });

    // Get the search input and simulate typing
    const searchInput = screen.getByPlaceholderText('Search projects...');
    fireEvent.change(searchInput, { target: { value: 'Test' } });

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
    fireEvent.change(searchInput, { target: { value: '' } });

    // Wait for all projects to be shown again
    await waitFor(() => {
      const projectCards = screen.getAllByRole('article');
      expect(projectCards).toHaveLength(2);
    });
  });
}); 