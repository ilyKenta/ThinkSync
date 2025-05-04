import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import ReviewerSignupPage from '../page';
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

describe('ReviewerSignupPage', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    localStorage.setItem('jwt', 'test-token');
  });

  it('renders the reviewer signup page correctly', () => {
    render(<ReviewerSignupPage />);

    expect(screen.getByText('ThinkSync')).toBeInTheDocument();
    expect(screen.getByText('Reviewer Sign Up')).toBeInTheDocument();
    expect(screen.getByText('login')).toBeInTheDocument();
    expect(screen.getByText('sign up')).toBeInTheDocument();
    expect(screen.getByLabelText('Contact number')).toBeInTheDocument();
    expect(screen.getByLabelText('Current Department')).toBeInTheDocument();
    expect(screen.getByLabelText('Current academic role')).toBeInTheDocument();
    expect(screen.getByLabelText('Research area')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Qualifications')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Projects')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'submit information' })).toBeInTheDocument();
  });

  it('handles form input changes correctly', () => {
    render(<ReviewerSignupPage />);

    // Test phone number input
    const phoneInput = screen.getByLabelText('Contact number');
    fireEvent.change(phoneInput, { target: { value: '0814366553' } });
    expect(phoneInput).toHaveValue('0814366553');

    // Test department selection
    const deptSelect = screen.getByLabelText('Current Department');
    fireEvent.change(deptSelect, { target: { value: 'science' } });
    expect(deptSelect).toHaveValue('science');

    // Test academic role selection
    const roleSelect = screen.getByLabelText('Current academic role');
    fireEvent.change(roleSelect, { target: { value: 'lecturer' } });
    expect(roleSelect).toHaveValue('lecturer');

    // Test research area input
    const researchInput = screen.getByLabelText('Research area');
    fireEvent.change(researchInput, { target: { value: 'Black holes' } });
    expect(researchInput).toHaveValue('Black holes');

    // Test qualifications input
    const qualInput = screen.getByPlaceholderText('Qualifications');
    fireEvent.change(qualInput, { target: { value: 'PhD in Physics' } });
    expect(qualInput).toHaveValue('PhD in Physics');

    // Test projects input
    const projectsInput = screen.getByPlaceholderText('Projects');
    fireEvent.change(projectsInput, { target: { value: 'Current research project' } });
    expect(projectsInput).toHaveValue('Current research project');
  });

  it('handles form submission successfully', async () => {
    // Mock the fetch call with the correct URL
    (global.fetch as jest.Mock).mockImplementation((url) => {
      if (url === 'https://thinksyncapi.azurewebsites.net/api/auth/reviewer') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Success' }),
        });
      }
      return Promise.reject(new Error('Not found'));
    });

    render(<ReviewerSignupPage />);

    // Fill in the form
    fireEvent.change(screen.getByLabelText('Contact number'), { target: { value: '0814366553' } });
    fireEvent.change(screen.getByLabelText('Current Department'), { target: { value: 'science' } });
    fireEvent.change(screen.getByLabelText('Current academic role'), { target: { value: 'lecturer' } });
    fireEvent.change(screen.getByLabelText('Research area'), { target: { value: 'Black holes' } });
    fireEvent.change(screen.getByPlaceholderText('Qualifications'), { target: { value: 'PhD in Physics' } });
    fireEvent.change(screen.getByPlaceholderText('Projects'), { target: { value: 'Current research project' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'submit information' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'https://thinksyncapi.azurewebsites.net/api/auth/reviewer',
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
            res_area: 'Black holes',
            qualification: 'PhD in Physics',
            current_proj: 'Current research project',
          }),
        })
      );
      expect(mockRouter.push).toHaveBeenCalledWith('/review-dash');
    });
  });

  it('handles form submission with missing token', async () => {
    localStorage.removeItem('jwt');
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<ReviewerSignupPage />);

    // Fill in the form
    fireEvent.change(screen.getByLabelText('Contact number'), { target: { value: '0814366553' } });
    fireEvent.change(screen.getByLabelText('Current Department'), { target: { value: 'science' } });
    fireEvent.change(screen.getByLabelText('Current academic role'), { target: { value: 'lecturer' } });
    fireEvent.change(screen.getByLabelText('Research area'), { target: { value: 'Black holes' } });
    fireEvent.change(screen.getByPlaceholderText('Qualifications'), { target: { value: 'PhD in Physics' } });
    fireEvent.change(screen.getByPlaceholderText('Projects'), { target: { value: 'Current research project' } });

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

    render(<ReviewerSignupPage />);

    // Fill in the form
    fireEvent.change(screen.getByLabelText('Contact number'), { target: { value: '0814366553' } });
    fireEvent.change(screen.getByLabelText('Current Department'), { target: { value: 'science' } });
    fireEvent.change(screen.getByLabelText('Current academic role'), { target: { value: 'lecturer' } });
    fireEvent.change(screen.getByLabelText('Research area'), { target: { value: 'Black holes' } });
    fireEvent.change(screen.getByPlaceholderText('Qualifications'), { target: { value: 'PhD in Physics' } });
    fireEvent.change(screen.getByPlaceholderText('Projects'), { target: { value: 'Current research project' } });

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

    render(<ReviewerSignupPage />);

    // Fill in the form
    fireEvent.change(screen.getByLabelText('Contact number'), { target: { value: '0814366553' } });
    fireEvent.change(screen.getByLabelText('Current Department'), { target: { value: 'science' } });
    fireEvent.change(screen.getByLabelText('Current academic role'), { target: { value: 'lecturer' } });
    fireEvent.change(screen.getByLabelText('Research area'), { target: { value: 'Black holes' } });
    fireEvent.change(screen.getByPlaceholderText('Qualifications'), { target: { value: 'PhD in Physics' } });
    fireEvent.change(screen.getByPlaceholderText('Projects'), { target: { value: 'Current research project' } });

    // Submit the form
    const submitButton = screen.getByRole('button', { name: 'submit information' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Submission error:', expect.any(Error));
      expect(alertSpy).toHaveBeenCalledWith('An error occurred');
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    alertSpy.mockRestore();
    consoleSpy.mockRestore();
  });

  it('handles navigation button clicks', () => {
    render(<ReviewerSignupPage />);

    // Test login button
    fireEvent.click(screen.getByText('login'));
    expect(mockRouter.push).toHaveBeenCalledWith('/login');

    // Test sign up button
    fireEvent.click(screen.getByText('sign up'));
    expect(mockRouter.push).toHaveBeenCalledWith('/roles');
  });
}); 