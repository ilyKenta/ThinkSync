import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import ManageUsersPage from '../page';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch
global.fetch = jest.fn();

describe('ManageUsersPage', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockUsers = [
    {
      user_ID: '1',
      fname: 'John',
      sname: 'Doe',
      roles: 'researcher'
    },
    {
      user_ID: '2',
      fname: 'Jane',
      sname: 'Smith',
      roles: 'reviewer'
    }
  ];

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    localStorageMock.getItem.mockClear();
    (global.fetch as jest.Mock).mockClear();
    mockRouter.push.mockClear();

    // Mock fetch responses
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/admin/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: mockUsers }),
        });
      }
      if (url.includes('/api/admin/users/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Role updated successfully' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  it('renders user management page correctly', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'jwt') return 'test-token';
      return null;
    });

    render(<ManageUsersPage />);

    // Wait for users to be loaded
    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('researcher')).toBeInTheDocument();
      expect(screen.getByText('reviewer')).toBeInTheDocument();
    });
  });

  it('handles role editing', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'jwt') return 'test-token';
      return null;
    });

    render(<ManageUsersPage />);

    // Wait for users to be loaded
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Get all Edit buttons and click the first one (for John Doe)
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    // Change role
    const roleSelect = screen.getByRole('combobox');
    fireEvent.change(roleSelect, { target: { value: 'admin' } });

    // Click save
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    // Verify API call was made
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/users/1/role'),
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        }),
        body: JSON.stringify({ newRole: 'admin' }),
      })
    );
  });

  it('handles empty user list', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'jwt') return 'test-token';
      return null;
    });

    // Mock empty user list
    (global.fetch as jest.Mock).mockImplementationOnce((url) => {
      if (url.includes('/api/admin/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: [] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    render(<ManageUsersPage />);

    // Wait for empty state
    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('handles fetch error', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'jwt') return 'test-token';
      return null;
    });

    // Mock fetch to return error
    (global.fetch as jest.Mock).mockImplementationOnce(() => 
      Promise.reject(new Error('Failed to fetch'))
    );

    render(<ManageUsersPage />);

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('User Management')).toBeInTheDocument();
      expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    });
  });

  it('handles role update error', async () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'jwt') return 'test-token';
      return null;
    });

    // Mock role update to fail
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url.includes('/api/admin/users') && !url.includes('/role')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ users: mockUsers }),
        });
      }
      if (url.includes('/api/admin/users/') && url.includes('/role')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Failed to update role' }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    // Mock window.alert
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<ManageUsersPage />);

    // Wait for users to be loaded
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Get all Edit buttons and click the first one (for John Doe)
    const editButtons = screen.getAllByText('Edit');
    fireEvent.click(editButtons[0]);

    // Change role
    const roleSelect = screen.getByRole('combobox');
    fireEvent.change(roleSelect, { target: { value: 'admin' } });

    // Click save
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    // Verify error alert
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to update role');
    }, { timeout: 1500 });

    if (!alertSpy.mock.calls.length) {
      // eslint-disable-next-line no-console
      console.log('window.alert calls:', alertSpy.mock.calls);
    }

    alertSpy.mockRestore();
  });
}); 