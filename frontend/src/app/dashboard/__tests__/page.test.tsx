import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import DashboardPage from '../page';
import '@testing-library/jest-dom';

// Mock components
jest.mock('../../inbox-sidebar/inb_sidebar', () => {
  return function MockInboxSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return isOpen ? (
      <div data-testid="inbox-sidebar">
        <div>Inbox Sidebar</div>
      </div>
    ) : null;
  };
});

jest.mock('../../sent-sidebar/sidebar', () => {
  return function MockSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return isOpen ? <div data-testid="sent-sidebar">Sent Sidebar</div> : null;
  };
});

jest.mock('../../create-project/createForm', () => {
  return function MockCreateForm({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, desc: string, goals: string, resArea: string, start: string, end: string, funding: boolean | null) => void }) {
    return <div data-testid="create-form">Create Form</div>;
  };
});

jest.mock('../../create-req/createReqForm', () => {
  return function MockCreateReqForm({ onClose, onCreate, projectName, projectDesc, goals, setResArea, setStart, setEnd, Funding }: any) {
    return <div data-testid="create-req-form">Create Requirements Form</div>;
  };
});

jest.mock('../../edit-project/editProjectForm', () => {
  return function MockEditProjectForm({ onClose, onEdit, initialValues }: any) {
    return <div data-testid="edit-project-form">Edit Project Form</div>;
  };
});

jest.mock('../../components/InviteCollaborators', () => {
  return function MockInviteCollaborators({ onClose, projectId, projectTitle, projectDescription }: any) {
    return <div data-testid="invite-collaborators">Invite Collaborators</div>;
  };
});

// Mock useAuth hook
jest.mock('../../useAuth', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('DashboardPage', () => {
  const mockProjects = [
    {
      project_ID: '1',
      title: 'Test Project',
      description: 'Test Description',
      start_date: '2024-03-20',
      end_date: '2024-12-31',
      funding_available: true
    },
    {
      project_ID: '2',
      title: 'Another Project',
      description: 'Another Description',
      start_date: '2024-01-01',
      end_date: '2024-03-31',
      funding_available: false
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('jwt', 'test-token');
  });

  it('renders the dashboard correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProjects })
    });

    await act(async () => {
      render(<DashboardPage />);
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading projects...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('ThinkSync')).toBeInTheDocument();
    expect(screen.getByText('DASHBOARD')).toBeInTheDocument();
    
    // Use getAllByText and check for specific elements
    const myProjectsElements = screen.getAllByText('My Projects');
    expect(myProjectsElements.length).toBe(2); // One in the sidebar, one in the header
    expect(myProjectsElements[0]).toHaveClass('active'); // Check the sidebar button is active
    
    expect(screen.getByText('Shared Projects')).toBeInTheDocument();
  });

  it('toggles sent sidebar', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProjects })
    });

    await act(async () => {
      render(<DashboardPage />);
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading projects...')).not.toBeInTheDocument();
    });

    // Find the sent button by its SVG content
    const buttons = screen.getAllByRole('button', { name: '' });
    const sentButton = buttons.find(button => 
      button.classList.contains('iconButton') && 
      button.querySelector('svg[viewBox="0 0 512 512"]') &&
      button.querySelector('path[d*="M476 3.2"]') // More specific SVG path check
    );

    if (!sentButton) {
      throw new Error('Sent button not found');
    }

    await act(async () => {
      fireEvent.click(sentButton);
    });

    // Wait for the sidebar to appear
    await waitFor(() => {
      expect(screen.getByTestId('sent-sidebar')).toBeInTheDocument();
    });
  });

  it('toggles inbox sidebar', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProjects })
    });

    await act(async () => {
      render(<DashboardPage />);
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading projects...')).not.toBeInTheDocument();
    });

    // Find the button by its class name and SVG content
    const buttons = screen.getAllByRole('button', { name: '' });
    const inboxButton = buttons.find(button => 
      button.classList.contains('iconButton') && 
      button.querySelector('svg[viewBox="0 0 512 512"]') &&
      button.querySelector('path[d*="M502.3 190.8"]') // More specific SVG path check
    );

    if (!inboxButton) {
      throw new Error('Inbox button not found');
    }

    // Click the button and wait for state update
    await act(async () => {
      fireEvent.click(inboxButton);
    });

    // Wait for the sidebar to appear with a longer timeout
    await waitFor(() => {
      const sidebar = screen.getByTestId('inbox-sidebar');
      expect(sidebar).toBeInTheDocument();
      expect(sidebar).toBeVisible();
    }, { timeout: 5000 });
  });

  it('opens create project form', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProjects })
    });

    await act(async () => {
      render(<DashboardPage />);
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading projects...')).not.toBeInTheDocument();
    });

    const createButton = screen.getByText('+ Create');
    await act(async () => {
      fireEvent.click(createButton);
    });

    expect(screen.getByTestId('create-form')).toBeInTheDocument();
  });

  it('handles project deletion', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ projects: mockProjects })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Project deleted successfully' })
      });

    await act(async () => {
      render(<DashboardPage />);
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading projects...')).not.toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByRole('button', { name: /🗑️/i });
    await act(async () => {
      fireEvent.click(deleteButtons[0]);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      'https://thinksyncapi.azurewebsites.net/api/projects/delete/1',
      expect.any(Object)
    );
  });

  it('handles project editing', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProjects })
    });

    await act(async () => {
      render(<DashboardPage />);
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading projects...')).not.toBeInTheDocument();
    });

    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    await act(async () => {
      fireEvent.click(editButtons[0]);
    });

    expect(screen.getByTestId('edit-project-form')).toBeInTheDocument();
  });

  it('handles invite collaborators', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProjects })
    });

    await act(async () => {
      render(<DashboardPage />);
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading projects...')).not.toBeInTheDocument();
    });

    const inviteButtons = screen.getAllByRole('button', { name: /invite/i });
    await act(async () => {
      fireEvent.click(inviteButtons[0]);
    });

    expect(screen.getByTestId('invite-collaborators')).toBeInTheDocument();
  });

  it('handles errors when fetching projects', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch projects'));

    await act(async () => {
      render(<DashboardPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch projects')).toBeInTheDocument();
    });
  });
}); 