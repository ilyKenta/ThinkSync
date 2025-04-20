import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardPage from '../page';
import '@testing-library/jest-dom';

// Mock components
jest.mock('../../components/InboxSidebar', () => {
  return function MockInboxSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return isOpen ? <div data-testid="inbox-sidebar">Inbox Sidebar</div> : null;
  };
});

// Mock fetch
global.fetch = jest.fn();

describe('DashboardPage', () => {
  const mockProjects = [
    {
      project_ID: '1',
      title: 'Test Project',
      description: 'Test Description',
      status: 'active',
      funding_amount: 10000,
      start_date: '2024-03-20',
      end_date: '2024-12-31',
      owner_ID: 'user1'
    },
    {
      project_ID: '2',
      title: 'Another Project',
      description: 'Another Description',
      status: 'completed',
      funding_amount: 5000,
      start_date: '2024-01-01',
      end_date: '2024-03-31',
      owner_ID: 'user1'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('jwt', 'test-token');
  });

  it('renders the dashboard correctly', () => {
    render(<DashboardPage />);
    
    expect(screen.getByText('My Projects')).toBeInTheDocument();
    expect(screen.getByText('Shared Projects')).toBeInTheDocument();
    expect(screen.getByText('Create New Project')).toBeInTheDocument();
  });

  it('toggles sidebar', () => {
    render(<DashboardPage />);
    
    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Shared Projects')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('toggles inbox sidebar', () => {
    render(<DashboardPage />);
    
    const inboxButton = screen.getByRole('button', { name: /inbox/i });
    fireEvent.click(inboxButton);

    expect(screen.getByTestId('inbox-sidebar')).toBeInTheDocument();
  });

  it('switches between My Projects and Shared Projects', () => {
    render(<DashboardPage />);
    
    const sharedProjectsButton = screen.getByText('Shared Projects');
    fireEvent.click(sharedProjectsButton);

    expect(sharedProjectsButton).toHaveClass('active');
    expect(screen.getByText('My Projects')).not.toHaveClass('active');
  });

  it('renders projects list', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProjects })
    });

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Another Project')).toBeInTheDocument();
      expect(screen.getByText('Another Description')).toBeInTheDocument();
    });
  });

  it('handles project creation', async () => {
    render(<DashboardPage />);
    
    const createButton = screen.getByText('Create New Project');
    fireEvent.click(createButton);

    expect(screen.getByText('Create New Project')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Project Title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Project Description')).toBeInTheDocument();
  });

  it('handles project deletion', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ projects: [mockProjects[0]] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Project deleted successfully' })
      });

    render(<DashboardPage />);

    await waitFor(async () => {
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);

      expect(screen.queryByText('Test Project')).not.toBeInTheDocument();
    });
  });

  it('handles project editing', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ projects: [mockProjects[0]] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Project updated successfully' })
      });

    render(<DashboardPage />);

    await waitFor(async () => {
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);

      expect(screen.getByText('Edit Project')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Project')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
    });
  });

  it('handles errors when fetching projects', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch projects'));

    render(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch projects')).toBeInTheDocument();
    });
  });

  it('handles logout', () => {
    render(<DashboardPage />);
    
    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);

    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    expect(localStorage.getItem('jwt')).toBeNull();
  });
}); 