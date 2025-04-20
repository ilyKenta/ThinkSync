import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import InviteCollaborators from '../InviteCollaborators';
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = jest.fn();

// Mock window.alert
global.alert = jest.fn();

describe('InviteCollaborators', () => {
  const mockUsers = [
    {
      user_ID: '1',
      fname: 'John',
      sname: 'Doe',
      skills: ['CS', 'AI'],
      position: 'researcher',
      education: 'PhD'
    }
  ];

  const mockProps = {
    projectId: '1',
    projectTitle: 'Test Project',
    projectDescription: 'Test Description',
    onClose: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('jwt', 'test-token');
  });

  it('renders modal with search form', () => {
    render(<InviteCollaborators {...mockProps} />);
    
    expect(screen.getByText('Invite Collaborators')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
  });

  it('handles search by name', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ results: mockUsers })
    });

    await act(async () => {
      render(<InviteCollaborators {...mockProps} />);
    });

    const searchInput = screen.getByPlaceholderText('Search by name');
    const searchButton = screen.getByRole('button', { name: /search/i });

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'John' } });
      fireEvent.submit(searchButton.closest('form')!);
    });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('researcher')).toBeInTheDocument();
      expect(screen.getByText('PhD')).toBeInTheDocument();
    });
  });

  it('handles search errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Search failed'));

    await act(async () => {
      render(<InviteCollaborators {...mockProps} />);
    });

    const searchInput = screen.getByPlaceholderText('Search by name');
    const searchButton = screen.getByRole('button', { name: /search/i });

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'John' } });
      fireEvent.submit(searchButton.closest('form')!);
    });

    await waitFor(() => {
      expect(screen.getByText('Search failed')).toBeInTheDocument();
    });
  });

  it('handles sending invitations', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: mockUsers })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Invitations sent successfully' })
      });

    await act(async () => {
      render(<InviteCollaborators {...mockProps} />);
    });

    const searchInput = screen.getByPlaceholderText('Search by name');
    const searchButton = screen.getByRole('button', { name: /search/i });

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'John' } });
      fireEvent.submit(searchButton.closest('form')!);
    });

    await waitFor(() => {
      const userCard = screen.getByText('John Doe').closest('div');
      const checkbox = userCard?.querySelector('input[type="checkbox"]');
      if (checkbox) {
        fireEvent.click(checkbox);
      }
    });

    const sendButton = screen.getByRole('button', { name: /send invitation/i });
    await act(async () => {
      fireEvent.click(sendButton);
    });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Invitations sent to: John Doe'));
      expect(mockProps.onClose).toHaveBeenCalled();
    });
  });

  it('handles invitation sending errors', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: mockUsers })
      })
      .mockRejectedValueOnce(new Error('Failed to send invitations'));

    await act(async () => {
      render(<InviteCollaborators {...mockProps} />);
    });

    const searchInput = screen.getByPlaceholderText('Search by name');
    const searchButton = screen.getByRole('button', { name: /search/i });

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'John' } });
      fireEvent.submit(searchButton.closest('form')!);
    });

    await waitFor(() => {
      const userCard = screen.getByText('John Doe').closest('div');
      const checkbox = userCard?.querySelector('input[type="checkbox"]');
      if (checkbox) {
        fireEvent.click(checkbox);
      }
    });

    const sendButton = screen.getByRole('button', { name: /send invitation/i });
    await act(async () => {
      fireEvent.click(sendButton);
    });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining('Error sending invitations'));
    });
  });
}); 