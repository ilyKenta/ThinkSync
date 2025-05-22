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
        `${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/auth/admin`,
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

  it('validates phone number format', async () => {
    render(<AdminSignupPage />);

    // Fill in the form with invalid phone number
    const phoneInput = screen.getByLabelText('Contact Number');
    fireEvent.change(phoneInput, { target: { name: 'number', value: '123' } });
    
    // Check HTML5 validation attributes
    expect(phoneInput).toHaveAttribute('pattern', '[0-9]{10}');
    expect(phoneInput).toHaveAttribute('title', 'Please enter a valid 10-digit phone number');
    expect(phoneInput).toHaveAttribute('required');

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'submit information' });
    fireEvent.click(submitButton);

    // The form should not submit due to HTML5 validation
    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('validates required fields', async () => {
    render(<AdminSignupPage />);

    // Check that all required fields have the required attribute
    const phoneInput = screen.getByLabelText('Contact Number');
    const departmentSelect = screen.getByLabelText('Current Department');
    const roleSelect = screen.getByLabelText('Current Academic Role');

    expect(phoneInput).toHaveAttribute('required');
    expect(departmentSelect).toHaveAttribute('required');
    expect(roleSelect).toHaveAttribute('required');

    // Submit the form without filling required fields
    const submitButton = screen.getByRole('button', { name: 'submit information' });
    fireEvent.click(submitButton);

    // The form should not submit due to HTML5 validation
    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('handles form submission with missing token', async () => {
    localStorage.removeItem('jwt');
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<AdminSignupPage />);

    // Fill in the form with valid data
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
      expect(alertSpy).toHaveBeenCalledWith('Authentication token is missing. Please log in again.');
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

    // Fill in the form with valid data
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
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<AdminSignupPage />);

    // Fill in the form with valid data
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
      expect(alertSpy).toHaveBeenCalledWith('An error occurred during registration. Please try again.');
    });

    consoleSpy.mockRestore();
    alertSpy.mockRestore();
  });

  it('handles navigation button clicks', () => {
    render(<AdminSignupPage />);

    // Test login button
    fireEvent.click(screen.getByText('login'));
    expect(mockRouter.push).toHaveBeenCalledWith('/login');
  });
}); 