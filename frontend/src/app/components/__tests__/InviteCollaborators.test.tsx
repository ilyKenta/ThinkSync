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
      json: () => Promise.resolve({ collaborators: mockUsers })
    });

      render(<InviteCollaborators {...mockProps} />);

    const searchInput = screen.getByPlaceholderText('Search by name');
    const searchButton = screen.getByRole('button', { name: /search/i });

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'John' } });
      fireEvent.submit(searchButton.closest('form')!);
    });

    await waitFor(() => {
      // Find the user info section
      const userSection = screen.getByTestId('user-section');
      expect(userSection).toBeInTheDocument();
      
      // Check for the checkbox
      const checkbox = userSection.querySelector('input[type="checkbox"]');
      expect(checkbox).toBeInTheDocument();
      
      // Check for the user info text
      const userInfo = userSection.querySelector('p');
      expect(userInfo).toBeInTheDocument();
      
      // Get the text content and normalize whitespace
      const textContent = userInfo?.textContent?.replace(/\s+/g, ' ').trim();
      expect(textContent).toContain('John Doe');
      expect(textContent).toContain('researcher');
      expect(textContent).toContain('AI');
      expect(textContent).toContain('PhD');
    });
  });

  it('handles search errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Search failed'));

      render(<InviteCollaborators {...mockProps} />);

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
        json: () => Promise.resolve({ collaborators: mockUsers })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Invitations sent successfully' })
      });

      render(<InviteCollaborators {...mockProps} />);

    const searchInput = screen.getByPlaceholderText('Search by name');
    const searchButton = screen.getByRole('button', { name: /search/i });

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'John' } });
      fireEvent.submit(searchButton.closest('form')!);
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
      expect(global.alert).toHaveBeenCalledWith(
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
    const searchButton = screen.getByRole('button', { name: /search/i });

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'John' } });
      fireEvent.submit(searchButton.closest('form')!);
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
      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('Error sending invitations')
      );
    });
  });
}); 