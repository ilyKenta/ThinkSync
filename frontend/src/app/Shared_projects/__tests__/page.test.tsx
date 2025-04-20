import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SharedProjectsPage from '../page';
import '@testing-library/jest-dom';

// Mock components
jest.mock('../../inbox-sidebar/inb_sidebar', () => {
  return function MockInboxSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return isOpen ? <div data-testid="inbox-sidebar">Inbox Sidebar</div> : null;
  };
});

// Mock fetch
global.fetch = jest.fn();

describe('SharedProjectsPage', () => {
  const mockProjects = [
    {
      project_ID: '1',
      title: 'Test Project',
      description: 'Test Description',
      status: 'active',
      funding_amount: 10000,
      start_date: '2024-03-20',
      end_date: '2024-12-31',
      owner_ID: 'user1',
      owner_fname: 'John',
      owner_sname: 'Doe',
      role: 'collaborator'
    },
    {
      project_ID: '2',
      title: 'Another Project',
      description: 'Another Description',
      status: 'completed',
      funding_amount: 5000,
      start_date: '2024-01-01',
      end_date: '2024-03-31',
      owner_ID: 'user2',
      owner_fname: 'Jane',
      owner_sname: 'Smith',
      role: 'researcher'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('jwt', 'test-token');
  });

  it('renders the shared projects page correctly', () => {
    render(<SharedProjectsPage />);
    
    expect(screen.getByText('My Projects')).toBeInTheDocument();
    expect(screen.getByText('Shared Projects')).toBeInTheDocument();
  });

  it('toggles sidebar', () => {
    render(<SharedProjectsPage />);
    
    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Shared Projects')).toBeInTheDocument();
    expect(screen.getByText('Logout')).toBeInTheDocument();
  });

  it('toggles inbox sidebar', () => {
    render(<SharedProjectsPage />);
    
    const inboxButton = screen.getByRole('button', { name: /inbox/i });
    fireEvent.click(inboxButton);

    expect(screen.getByTestId('inbox-sidebar')).toBeInTheDocument();
  });

  it('switches between My Projects and Shared Projects', () => {
    render(<SharedProjectsPage />);
    
    const myProjectsButton = screen.getByText('My Projects');
    fireEvent.click(myProjectsButton);

    expect(myProjectsButton).toHaveClass('active');
    expect(screen.getByText('Shared Projects')).not.toHaveClass('active');
  });

  it('renders shared projects list', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProjects })
    });

    render(<SharedProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Owner: John Doe')).toBeInTheDocument();
      expect(screen.getByText('Role: collaborator')).toBeInTheDocument();
      expect(screen.getByText('Another Project')).toBeInTheDocument();
      expect(screen.getByText('Another Description')).toBeInTheDocument();
      expect(screen.getByText('Owner: Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Role: researcher')).toBeInTheDocument();
    });
  });

  it('handles project navigation', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: [mockProjects[0]] })
    });

    render(<SharedProjectsPage />);

    await waitFor(() => {
      const projectLink = screen.getByText('Test Project');
      fireEvent.click(projectLink);

      expect(window.location.pathname).toBe('/project/1');
    });
  });

  it('handles errors when fetching projects', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch projects'));

    render(<SharedProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch projects')).toBeInTheDocument();
    });
  });

  it('handles empty projects list', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: [] })
    });

    render(<SharedProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('No shared projects found.')).toBeInTheDocument();
    });
  });

  it('handles logout', () => {
    render(<SharedProjectsPage />);
    
    const menuButton = screen.getByRole('button', { name: /menu/i });
    fireEvent.click(menuButton);

    const logoutButton = screen.getByText('Logout');
    fireEvent.click(logoutButton);

    expect(localStorage.getItem('jwt')).toBeNull();
  });

  it('displays correct project status', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProjects })
    });

    render(<SharedProjectsPage />);

    await waitFor(() => {
      const activeStatus = screen.getByText('active');
      const completedStatus = screen.getByText('completed');

      expect(activeStatus).toHaveStyle({ backgroundColor: '#4CAF50' });
      expect(completedStatus).toHaveStyle({ backgroundColor: '#9e9e9e' });
    });
  });
}); 