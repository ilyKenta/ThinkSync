import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import SharedProjectsPage from '../page';
import '@testing-library/jest-dom';

// Mock components
jest.mock('../../inbox-sidebar/inb_sidebar', () => {
  return function MockInboxSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return isOpen ? <div data-testid="inbox-sidebar">Inbox Sidebar</div> : null;
  };
});

jest.mock('../../sent-sidebar/sidebar', () => {
  return function MockSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    return isOpen ? <div data-testid="sent-sidebar">Sent Sidebar</div> : null;
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

  it('renders the shared projects page correctly', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProjects })
    });

    await act(async () => {
      render(<SharedProjectsPage />);
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading projects...')).not.toBeInTheDocument();
    });

    expect(screen.getByText('ThinkSync')).toBeInTheDocument();
    expect(screen.getByText('DASHBOARD')).toBeInTheDocument();
    
    // Get the button specifically
    const sharedProjectsButton = screen.getByRole('button', { name: 'Shared Projects' });
    expect(sharedProjectsButton).toBeInTheDocument();
  });

  it('toggles sent sidebar', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProjects })
    });

    await act(async () => {
      render(<SharedProjectsPage />);
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
      button.querySelector('path[d*="M476 3.2"]')
    );

    if (!sentButton) {
      throw new Error('Sent button not found');
    }

    await act(async () => {
      fireEvent.click(sentButton);
    });

    expect(screen.getByTestId('sent-sidebar')).toBeInTheDocument();
  });

  it('toggles inbox sidebar', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProjects })
    });

    await act(async () => {
      render(<SharedProjectsPage />);
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading projects...')).not.toBeInTheDocument();
    });

    // Find the inbox button by its SVG content
    const buttons = screen.getAllByRole('button', { name: '' });
    const inboxButton = buttons.find(button => 
      button.classList.contains('iconButton') && 
      button.querySelector('svg[viewBox="0 0 512 512"]') &&
      button.querySelector('path[d*="M502.3 190.8"]')
    );

    if (!inboxButton) {
      throw new Error('Inbox button not found');
    }

    await act(async () => {
      fireEvent.click(inboxButton);
    });

    expect(screen.getByTestId('inbox-sidebar')).toBeInTheDocument();
  });

  it('switches between My Projects and Shared Projects', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProjects })
    });

    await act(async () => {
      render(<SharedProjectsPage />);
    });

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading projects...')).not.toBeInTheDocument();
    });

    // Get buttons by their role and name
    const myProjectsButton = screen.getByRole('button', { name: 'My Projects' });
    const sharedProjectsButton = screen.getByRole('button', { name: 'Shared Projects' });

    expect(sharedProjectsButton).toHaveClass('active');
    expect(myProjectsButton).not.toHaveClass('active');
  });

  it('renders shared projects list', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ projects: mockProjects })
    });

    await act(async () => {
      render(<SharedProjectsPage />);
    });

    await waitFor(() => {
      // Find the specific project card by its title
      const projectCard = screen.getByText('Test Project').closest('.card') as HTMLElement;
      if (!projectCard) {
        throw new Error('Project card not found');
      }

      // Within the specific project card, check for details
      const withinProjectCard = within(projectCard);
      expect(withinProjectCard.getByText('Test Description')).toBeInTheDocument();
      expect(withinProjectCard.getByText(/Start:/i)).toBeInTheDocument();
      expect(withinProjectCard.getByText(/End:/i)).toBeInTheDocument();
      expect(withinProjectCard.getByText('Funding: Available')).toBeInTheDocument();
    });
  });

  it('handles errors when fetching projects', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch projects'));

    await act(async () => {
      render(<SharedProjectsPage />);
    });

    await waitFor(() => {
      expect(screen.getByText('Error: Failed to fetch projects')).toBeInTheDocument();
    });
  });
}); 