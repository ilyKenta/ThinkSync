import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateMilestonePage from '../page';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

describe('CreateMilestonePage', () => {
  const mockProjects = {
    projects: [
      { 
        project_ID: '1', 
        title: 'Project 1', 
        collaborators: [
          { user_ID: 'u1', first_name: 'Alice', last_name: 'Smith' },
          { user_ID: 'u2', first_name: 'Bob', last_name: 'Jones' }
        ] 
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn((url) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockProjects)
      } as any);
    });
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: jest.fn(() => 'mock-token') },
      writable: true,
    });
  });

  it('renders loading state', () => {
    render(<CreateMilestonePage />);
    expect(screen.getByText(/loading projects/i)).toBeInTheDocument();
  });

  it('renders form after loading', async () => {
    render(<CreateMilestonePage />);
    await waitFor(() => {
      expect(screen.getByTestId('create-milestone-form')).toBeInTheDocument();
      expect(screen.getByTestId('project-select')).toBeInTheDocument();
    });
  });

  it('handles project selection and collaborator updates', async () => {
    render(<CreateMilestonePage />);
    await waitFor(() => {
      expect(screen.getByTestId('create-milestone-form')).toBeInTheDocument();
    });

    const projectSelect = screen.getByTestId('project-select');
    const collaboratorSelect = screen.getByTestId('collaborator-select');

    // Initially collaborator select should be disabled
    expect(collaboratorSelect).toHaveAttribute('disabled');

    // Select a project
    fireEvent.change(projectSelect, { target: { value: '1' } });
    
    // Now collaborator select should be enabled
    expect(collaboratorSelect).not.toHaveAttribute('disabled');
  });
}); 