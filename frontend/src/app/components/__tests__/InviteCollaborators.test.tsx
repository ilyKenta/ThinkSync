import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import InviteCollaborators from '../InviteCollaborators';
import '@testing-library/jest-dom';

// Mock fetch
beforeAll(() => {
  global.fetch = jest.fn();
});

describe('InviteCollaborators', () => {
  const mockUsers = [
    {
      user_ID: '1',
      fname: 'John',
      sname: 'Doe',
      department: 'Computer Science',
      acc_role: 'researcher',
      res_area: 'AI',
      qualification: 'PhD'
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
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders modal with search form and search type select', () => {
    render(<InviteCollaborators {...mockProps} />);
    expect(screen.getByText('Invite Collaborators')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by name')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('handles search by name (debounced)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ collaborators: mockUsers })
    });
    render(<InviteCollaborators {...mockProps} />);
    const searchInput = screen.getByPlaceholderText('Search by name');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'John' } });
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => {
      const userSection = screen.getByTestId('user-section');
      expect(userSection).toBeInTheDocument();
      const userInfo = screen.getByTestId('user-info');
      expect(userInfo).toHaveTextContent('John Doe');
      expect(userInfo).toHaveTextContent('researcher');
      expect(userInfo).toHaveTextContent('AI');
      expect(userInfo).toHaveTextContent('PhD');
    });
  });

  it('handles search by skill', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ collaborators: mockUsers })
    });
    render(<InviteCollaborators {...mockProps} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'skill' } });
    const searchInput = screen.getByPlaceholderText('Search by skill');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'AI' } });
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => {
      expect(screen.getByTestId('user-section')).toBeInTheDocument();
    });
  });

  it('shows validation error for invalid search input', async () => {
    render(<InviteCollaborators {...mockProps} />);
    const searchInput = screen.getByPlaceholderText('Search by name');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: '!' } });
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid name/i)).toBeInTheDocument();
    });
  });

  it('handles search errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Search failed'));
    render(<InviteCollaborators {...mockProps} />);
    const searchInput = screen.getByPlaceholderText('Search by name');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'John' } });
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => {
      expect(screen.getByText('Search failed')).toBeInTheDocument();
    });
  });

  it('handles sending invitations', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ collaborators: mockUsers })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Invitations sent successfully' })
      });
    window.alert = jest.fn();
    render(<InviteCollaborators {...mockProps} />);
    const searchInput = screen.getByPlaceholderText('Search by name');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'John' } });
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => {
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
    });
    const sendButton = screen.getByRole('button', { name: /send invitation/i });
    await act(async () => {
      fireEvent.click(sendButton);
    });
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining('Invitations sent to: John Doe')
      );
      expect(mockProps.onClose).toHaveBeenCalled();
    });
  });

  it('handles invitation sending errors', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ collaborators: mockUsers })
      })
      .mockRejectedValueOnce(new Error('Failed to send invitations'));
    render(<InviteCollaborators {...mockProps} />);
    const searchInput = screen.getByPlaceholderText('Search by name');
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'John' } });
      jest.advanceTimersByTime(300);
    });
    await waitFor(() => {
      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);
    });
    const sendButton = screen.getByRole('button', { name: /send invitation/i });
    await act(async () => {
      fireEvent.click(sendButton);
    });
    await waitFor(() => {
      expect(screen.getByText(/Error sending invitations: Failed to send invitations/i)).toBeInTheDocument();
    });
  });
}); 