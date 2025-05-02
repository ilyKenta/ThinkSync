import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import SentInvitations from '../SentInvitations';
import '@testing-library/jest-dom';

// Mock fetch
global.fetch = jest.fn();

describe('SentInvitations', () => {
  const mockInvitations = [
    {
      invitation_ID: '1',
      project_ID: '1',
      project_title: 'Test Project',
      recipient_fname: 'John',
      recipient_sname: 'Doe',
      proposed_role: 'researcher',
      status: 'pending',
      current_status: 'pending',
      sent_at: '2024-03-20T12:00:00Z'
    },
    {
      invitation_ID: '2',
      project_ID: '2',
      project_title: 'Another Project',
      recipient_fname: 'Jane',
      recipient_sname: 'Smith',
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

  it('renders loading state', async () => {
    // Mock fetch to return a promise that doesn't resolve immediately
    (global.fetch as jest.Mock).mockImplementationOnce(() => new Promise(() => {}));

    await act(async () => {
    render(<SentInvitations />);
    });

    expect(screen.getByText('Loading sent invitations...')).toBeInTheDocument();
  });

  it('renders error state', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch invitations'));

    await act(async () => {
      render(<SentInvitations />);
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
      render(<SentInvitations />);
    });

    await waitFor(() => {
      expect(screen.getByText('No invitations sent.')).toBeInTheDocument();
    });
  });

  it('renders invitations list', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ invitations: mockInvitations })
    });

    await act(async () => {
      render(<SentInvitations />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('To: John Doe')).toBeInTheDocument();
      expect(screen.getByText('researcher')).toBeInTheDocument();
      expect(screen.getByText('20 Mar 2024')).toBeInTheDocument();
    });
  });

  it('handles canceling invitation', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invitations: [mockInvitations[0]] })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Invitation cancelled' })
      });

    await act(async () => {
      render(<SentInvitations />);
    });

    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: /cancel invitation/i });
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Cancelled')).toBeInTheDocument();
    });
  });

  it('handles invitation cancellation errors', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invitations: [mockInvitations[0]] })
      })
      .mockRejectedValueOnce(new Error('Failed to cancel invitation'));

    await act(async () => {
      render(<SentInvitations />);
    });

    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: /cancel invitation/i });
      fireEvent.click(cancelButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to cancel invitation')).toBeInTheDocument();
    });
  });

  it('displays correct status colors', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ invitations: mockInvitations })
    });

    await act(async () => {
      render(<SentInvitations />);
    });

    await waitFor(() => {
      const pendingStatus = screen.getByText('Pending');
      const acceptedStatus = screen.getByText('Accepted');

      expect(pendingStatus).toHaveStyle({ backgroundColor: '#2196F3' });
      expect(acceptedStatus).toHaveStyle({ backgroundColor: '#4CAF50' });
    });
  });

  it('shows cancel button only for pending invitations', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ invitations: mockInvitations })
    });

    await act(async () => {
      render(<SentInvitations />);
    });

    await waitFor(() => {
      const cancelButtons = screen.getAllByRole('button', { name: /cancel invitation/i });
      expect(cancelButtons).toHaveLength(1); // Only one pending invitation
    });
  });
}); 