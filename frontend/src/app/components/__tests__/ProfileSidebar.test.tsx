import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileSidebar from '../ProfileSidebar';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock environment variables
process.env.NEXT_PUBLIC_AZURE_API_URL = 'http://test-api-url';

describe('ProfileSidebar', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockUserDetails = {
    fname: 'John',
    sname: 'Doe',
    department: 'Computer Science',
    role_name: 'Professor',
    acc_role: 'Senior Lecturer',
    phone_number: '1234567890',
    res_area: 'AI',
    qualification: 'PhD',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    localStorage.clear();
    // Mock console.error to prevent test output pollution
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = render(<ProfileSidebar isOpen={false} onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows loading state initially', async () => {
    // Mock a delayed response to ensure loading state is visible
    (global.fetch as jest.Mock).mockImplementationOnce(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => mockUserDetails,
      }), 100))
    );

    localStorage.setItem('jwt', 'test-token');
    render(<ProfileSidebar isOpen={true} onClose={() => {}} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    // Wait for the loading state to disappear
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });

  it('fetches and displays user details successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockUserDetails,
    });

    localStorage.setItem('jwt', 'test-token');

    render(<ProfileSidebar isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Profile Details')).toBeInTheDocument();
      expect(screen.getByText('Name:')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Department:')).toBeInTheDocument();
      expect(screen.getByText('Computer Science')).toBeInTheDocument();
      expect(screen.getByText('Role:')).toBeInTheDocument();
      expect(screen.getByText('Professor')).toBeInTheDocument();
      expect(screen.getByText('Academic Role:')).toBeInTheDocument();
      expect(screen.getByText('Senior Lecturer')).toBeInTheDocument();
      expect(screen.getByText('Phone Number:')).toBeInTheDocument();
      expect(screen.getByText('1234567890')).toBeInTheDocument();
      expect(screen.getByText('Research Area:')).toBeInTheDocument();
      expect(screen.getByText('AI')).toBeInTheDocument();
      expect(screen.getByText('Qualification:')).toBeInTheDocument();
      expect(screen.getByText('PhD')).toBeInTheDocument();
    });
  });

  it('handles missing optional fields gracefully', async () => {
    const partialUserDetails = {
      fname: 'John',
      sname: 'Doe',
      department: 'Computer Science',
      role_name: 'Professor',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => partialUserDetails,
    });

    localStorage.setItem('jwt', 'test-token');

    render(<ProfileSidebar isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Name:')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Department:')).toBeInTheDocument();
      expect(screen.getByText('Computer Science')).toBeInTheDocument();
      expect(screen.getByText('Role:')).toBeInTheDocument();
      expect(screen.getByText('Professor')).toBeInTheDocument();
      expect(screen.queryByText('Academic Role:')).not.toBeInTheDocument();
      expect(screen.queryByText('Phone Number:')).not.toBeInTheDocument();
      expect(screen.queryByText('Research Area:')).not.toBeInTheDocument();
      expect(screen.queryByText('Qualification:')).not.toBeInTheDocument();
    });
  });

  it('shows error message when API call fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('API Error'));

    localStorage.setItem('jwt', 'test-token');

    render(<ProfileSidebar isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(screen.getByText('Error loading profile details')).toBeInTheDocument();
    });
  });

  it('calls onClose when clicking the close button', async () => {
    const onClose = jest.fn();
    render(<ProfileSidebar isOpen={true} onClose={onClose} />);
    
    const closeButton = screen.getByRole('button', { name: /close profile sidebar/i });
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking the overlay', async () => {
    const onClose = jest.fn();
    render(<ProfileSidebar isOpen={true} onClose={onClose} />);
    
    const overlay = screen.getByRole('dialog');
    fireEvent.click(overlay);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('handles logout correctly', async () => {
    localStorage.setItem('jwt', 'test-token');
    localStorage.setItem('role', 'professor');

    render(<ProfileSidebar isOpen={true} onClose={() => {}} />);
    
    const logoutButton = screen.getByRole('button', { name: /logout from account/i });
    fireEvent.click(logoutButton);
    
    expect(localStorage.getItem('jwt')).toBeNull();
    expect(localStorage.getItem('role')).toBeNull();
    expect(mockRouter.push).toHaveBeenCalledWith('/');
  });

  it('does not fetch user details when no token is present', async () => {
    render(<ProfileSidebar isOpen={true} onClose={() => {}} />);

    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('stops event propagation when clicking sidebar content', async () => {
    const onClose = jest.fn();
    render(<ProfileSidebar isOpen={true} onClose={onClose} />);
    
    const sidebar = screen.getByRole('dialog').querySelector('section');
    const clickEvent = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(clickEvent, 'stopPropagation', { value: jest.fn() });
    
    fireEvent(sidebar!, clickEvent);
    
    expect(onClose).not.toHaveBeenCalled();
  });
}); 