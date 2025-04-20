import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ReceivedInvitations from '../ReceivedInvitations';
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = jest.fn();

describe('ReceivedInvitations', () => {
  const mockInvitations = [
    {
      invitation_ID: '1',
      project_ID: '1',
      project_title: 'Test Project',
      sender_fname: 'John',
      sender_sname: 'Doe',
      proposed_role: 'researcher',
      status: 'pending',
      current_status: 'pending',
      sent_at: '2024-03-20T12:00:00Z'
    },
    {
      invitation_ID: '2',
      project_ID: '2',
      project_title: 'Another Project',
      sender_fname: 'Jane',
      sender_sname: 'Smith',
      proposed_role: 'developer',
      status: 'accepted',
      current_status: 'accepted',
      sent_at: '2024-03-19T12:00:00Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem('jwt', 'test-token');
  });

  it('renders loading state', () => {
    render(<ReceivedInvitations />);
    expect(screen.getByText('Loading invitations...')).toBeInTheDocument();
  });

  it('renders error state', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch invitations'));

    await act(async () => {
      render(<ReceivedInvitations />);
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch invitations')).toBeInTheDocument();
    });
  });

  it('renders empty state', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ invitations: [] })
    });

    await act(async () => {
      render(<ReceivedInvitations />);
    });

    await waitFor(() => {
      expect(screen.getByText('No invitations received.')).toBeInTheDocument();
    });
  });

  it('renders invitations list', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ invitations: mockInvitations })
    });

    await act(async () => {
      render(<ReceivedInvitations />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('From: John Doe')).toBeInTheDocument();
      expect(screen.getByText('researcher')).toBeInTheDocument();
      expect(screen.getByText('20 Mar 2024')).toBeInTheDocument();
    });
  });

  it('handles accepting invitation', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invitations: [mockInvitations[0]] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Invitation accepted' })
      });

    await act(async () => {
      render(<ReceivedInvitations />);
    });

    await waitFor(() => {
      const acceptButton = screen.getByRole('button', { name: /accept/i });
      fireEvent.click(acceptButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Accepted')).toBeInTheDocument();
    });
  });

  it('handles declining invitation', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invitations: [mockInvitations[0]] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Invitation declined' })
      });

    await act(async () => {
      render(<ReceivedInvitations />);
    });

    await waitFor(() => {
      const declineButton = screen.getByRole('button', { name: /decline/i });
      fireEvent.click(declineButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Declined')).toBeInTheDocument();
    });
  });

  it('handles invitation response errors', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invitations: [mockInvitations[0]] })
      })
      .mockRejectedValueOnce(new Error('Failed to update invitation'));

    await act(async () => {
      render(<ReceivedInvitations />);
    });

    await waitFor(() => {
      const acceptButton = screen.getByRole('button', { name: /accept/i });
      fireEvent.click(acceptButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to update invitation')).toBeInTheDocument();
    });
  });

  it('displays correct status colors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ invitations: mockInvitations })
    });

    await act(async () => {
      render(<ReceivedInvitations />);
    });

    await waitFor(() => {
      const pendingStatus = screen.getByText('Pending');
      const acceptedStatus = screen.getByText('Accepted');

      expect(pendingStatus).toHaveStyle({ backgroundColor: '#2196F3' });
      expect(acceptedStatus).toHaveStyle({ backgroundColor: '#4CAF50' });
    });
  });
}); 