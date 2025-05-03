import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ManageUsersPage from '../page';
import { useRouter } from 'next/navigation';

jest.mock('../researcher-dashboard/page.module.css', () => new Proxy({}, { get: (target, prop) => prop }));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('ManageUsersPage', () => {
  let mockPush: jest.Mock;
  let mockFetch: jest.Mock;

  beforeEach(() => {
    mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-token'),
        setItem: jest.fn(),
        clear: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
    jest.clearAllMocks();
  });

  it('renders and loads users', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ users: [
        { user_ID: 1, fname: 'Alice', sname: 'Smith', roles: 'researcher' },
        { user_ID: 2, fname: 'Bob', sname: 'Jones', roles: 'admin' },
      ] }),
    });
    render(<ManageUsersPage />);
    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
      expect(screen.getByText('researcher')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
    });
  });

  it('handles edit and save role', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ users: [
        { user_ID: 1, fname: 'Alice', sname: 'Smith', roles: 'researcher' },
      ] }),
    });
    render(<ManageUsersPage />);
    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Edit'));
    const select = screen.getByDisplayValue('researcher');
    fireEvent.change(select, { target: { value: 'admin' } });
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument();
    });
  });

  it('shows alert on save error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ users: [
        { user_ID: 1, fname: 'Alice', sname: 'Smith', roles: 'researcher' },
      ] }),
    });
    window.alert = jest.fn();
    render(<ManageUsersPage />);
    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Edit'));
    const select = screen.getByDisplayValue('researcher');
    fireEvent.change(select, { target: { value: 'admin' } });
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to update role');
    });
  });

  it('shows alert on fetch error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ users: [
        { user_ID: 1, fname: 'Alice', sname: 'Smith', roles: 'researcher' },
      ] }),
    });
    window.alert = jest.fn();
    render(<ManageUsersPage />);
    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Edit'));
    const select = screen.getByDisplayValue('researcher');
    fireEvent.change(select, { target: { value: 'admin' } });
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Error updating user role');
    });
  });

  it('handles sidebar navigation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ users: [] }),
    });
    render(<ManageUsersPage />);
    fireEvent.click(screen.getByText('Submitted Proposals'));
    expect(mockPush).toHaveBeenCalledWith('/submitted-proposals');
    fireEvent.click(screen.getByText('Messager'));
    expect(mockPush).toHaveBeenCalledWith('/messager/AdminMessage');
    fireEvent.click(screen.getByText('Manage Users'));
    expect(mockPush).toHaveBeenCalledWith('/manage-users');
  });
}); 