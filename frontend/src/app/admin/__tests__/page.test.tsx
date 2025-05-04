import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import AdminSignupPage from '../page';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock useAuth
jest.mock('../../useAuth', () => ({
  __esModule: true,
  default: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('AdminSignupPage', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    localStorage.setItem('jwt', 'test-token');
  });

  it('renders the admin signup page correctly', () => {
    render(<AdminSignupPage />);

    // Check for header elements
    expect(screen.getByText('ThinkSync')).toBeInTheDocument();
    expect(screen.getByText('Admin Sign Up')).toBeInTheDocument();
    expect(screen.getByText('login')).toBeInTheDocument();
    expect(screen.getByText('sign up')).toBeInTheDocument();

    // Check for form elements
    expect(screen.getByLabelText('Contact Number')).toBeInTheDocument();
    expect(screen.getByLabelText('Current Department')).toBeInTheDocument();
    expect(screen.getByLabelText('Current Academic Role')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'submit information' })).toBeInTheDocument();
  });

  it('handles form input changes correctly', () => {
    render(<AdminSignupPage />);

    // Test phone number input
    const phoneInput = screen.getByLabelText('Contact Number');
    fireEvent.change(phoneInput, { target: { name: 'number', value: '0814366553' } });
    expect(phoneInput).toHaveValue('0814366553');

    // Test department selection
    const deptSelect = screen.getByLabelText('Current Department');
    fireEvent.change(deptSelect, { target: { name: 'department', value: 'science' } });
    expect(deptSelect).toHaveValue('science');

    // Test academic role selection
    const roleSelect = screen.getByLabelText('Current Academic Role');
    fireEvent.change(roleSelect, { target: { name: 'role', value: 'lecturer' } });
    expect(roleSelect).toHaveValue('lecturer');
  });

  it('handles form submission successfully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Success' }),
    });

    render(<AdminSignupPage />);

    // Fill in the form
    fireEvent.change(screen.getByLabelText('Contact Number'), { 
      target: { name: 'number', value: '0814366553' } 
    });
    fireEvent.change(screen.getByLabelText('Current Department'), { 
      target: { name: 'department', value: 'science' } 
    });
    fireEvent.change(screen.getByLabelText('Current Academic Role'), { 
      target: { name: 'role', value: 'lecturer' } 
    });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'submit information' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://thinksyncapi.azurewebsites.net/api/auth/admin',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: 'test-token',
            phone_number: '0814366553',
            department: 'science',
            acc_role: 'lecturer',
          }),
        })
      );
      expect(mockRouter.push).toHaveBeenCalledWith('/admin-dashboard');
    });
  });

  it('handles form submission with missing token', async () => {
    localStorage.removeItem('jwt');
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<AdminSignupPage />);

    // Fill in the form
    fireEvent.change(screen.getByLabelText('Contact Number'), { 
      target: { name: 'number', value: '0814366553' } 
    });
    fireEvent.change(screen.getByLabelText('Current Department'), { 
      target: { name: 'department', value: 'science' } 
    });
    fireEvent.change(screen.getByLabelText('Current Academic Role'), { 
      target: { name: 'role', value: 'lecturer' } 
    });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'submit information' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('User ID is missing.');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });

  it('handles form submission with API error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Invalid data' }),
    });
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<AdminSignupPage />);

    // Fill in the form
    fireEvent.change(screen.getByLabelText('Contact Number'), { 
      target: { name: 'number', value: '0814366553' } 
    });
    fireEvent.change(screen.getByLabelText('Current Department'), { 
      target: { name: 'department', value: 'science' } 
    });
    fireEvent.change(screen.getByLabelText('Current Academic Role'), { 
      target: { name: 'role', value: 'lecturer' } 
    });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'submit information' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Error: Invalid data');
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });

  it('handles form submission with network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<AdminSignupPage />);

    // Fill in the form
    fireEvent.change(screen.getByLabelText('Contact Number'), { 
      target: { name: 'number', value: '0814366553' } 
    });
    fireEvent.change(screen.getByLabelText('Current Department'), { 
      target: { name: 'department', value: 'science' } 
    });
    fireEvent.change(screen.getByLabelText('Current Academic Role'), { 
      target: { name: 'role', value: 'lecturer' } 
    });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'submit information' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error during registration:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });

  it('handles navigation button clicks', () => {
    render(<AdminSignupPage />);

    // Test login button
    fireEvent.click(screen.getByText('login'));
    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });
}); 