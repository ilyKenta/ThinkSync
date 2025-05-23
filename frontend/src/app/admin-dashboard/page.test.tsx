import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminDashboard from './page';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

// Mock child pages
jest.mock('../manage-users/page', () => () => <div>ManageUsersPage</div>);
jest.mock('../submitted-proposals/page', () => () => <div>SubmittedProposalsPage</div>);

// Mock react-icons
jest.mock('react-icons/fa', () => ({
  FaUserCircle: () => <span data-testid="user-icon">UserIcon</span>,
}));

// Helper to mock localStorage
function mockLocalStorage(role: any, jwt = 'token') {
  const store: Record<string, string> = {};
  store['role'] = JSON.stringify(role);
  store['jwt'] = jwt;
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    },
    writable: true,
  });
}

describe('AdminDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => [] });
  });

  it('renders nothing while checking role', () => {
    mockLocalStorage([], 'token');
    // Remove role to simulate loading
    window.localStorage.removeItem('role');
    const { container } = render(<AdminDashboard />);
    expect(container.firstChild).toBeNull();
  });

  it('redirects to /login if not admin', async () => {
    const push = jest.fn();
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({ push });
    mockLocalStorage([{ role_name: 'researcher' }]);
    render(<AdminDashboard />);
    await waitFor(() => {
      expect(push).toHaveBeenCalledWith('/login');
    });
  });

  it('renders dashboard if admin', async () => {
    mockLocalStorage([{ role_name: 'admin' }]);
    // Mock fetch for unread
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [{}, {}], // 2 unread
    });
    render(<AdminDashboard />);
    expect(await screen.findByText('Admin Dashboard')).toBeInTheDocument();
    expect(screen.getByText('ManageUsersPage')).toBeInTheDocument();
    expect(screen.getByTestId('user-icon')).toBeInTheDocument();
    // Unread badge
    expect(await screen.findByText('2')).toBeInTheDocument();
  });

  it('shows 99+ for unread badge if over 99', async () => {
    mockLocalStorage([{ role_name: 'admin' }]);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => Array(120).fill({}),
    });
    render(<AdminDashboard />);
    expect(await screen.findByText('99+')).toBeInTheDocument();
  });

  it('sidebar navigation switches tabs', async () => {
    mockLocalStorage([{ role_name: 'admin' }]);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => [] });
    render(<AdminDashboard />);
    // Should show users tab by default
    expect(screen.getByText('ManageUsersPage')).toBeInTheDocument();
    // Switch to proposals
    fireEvent.click(screen.getByText('Submitted Proposals'));
    expect(await screen.findByText('SubmittedProposalsPage')).toBeInTheDocument();
    // Switch back
    fireEvent.click(screen.getByText('Manage Users'));
    expect(await screen.findByText('ManageUsersPage')).toBeInTheDocument();
  });

  it('messager button navigates to /messager/AdminMessage', async () => {
    const push = jest.fn();
    jest.spyOn(require('next/navigation'), 'useRouter').mockReturnValue({ push });
    mockLocalStorage([{ role_name: 'admin' }]);
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: async () => [] });
    render(<AdminDashboard />);
    fireEvent.click(screen.getByText('Messager'));
    expect(push).toHaveBeenCalledWith('/messager/AdminMessage');
  });
}); 