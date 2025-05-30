import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import ResearcherSignupPage from '../page';
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

describe('ResearcherSignupPage', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    localStorage.setItem('jwt', 'test-token');
  });

  it('renders the Researcher signup page correctly', () => {
    render(<ResearcherSignupPage />);

    expect(screen.getByText('ThinkSync')).toBeInTheDocument();
    expect(screen.getByText('Researcher Sign Up')).toBeInTheDocument();
    expect(screen.getByLabelText('Contact number')).toBeInTheDocument();
    expect(screen.getByLabelText('Current Department')).toBeInTheDocument();
    expect(screen.getByLabelText('Current academic role')).toBeInTheDocument();
    expect(screen.getByLabelText('Research area')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Qualifications')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Projects')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'submit information' })).toBeInTheDocument();
  });

  it('handles form input changes correctly', () => {
    render(<ResearcherSignupPage />);

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
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ message: 'Success' }),
    });

    render(<ResearcherSignupPage />);

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
        `${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/auth/researcher`,
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
      expect(mockRouter.push).toHaveBeenCalledWith('/researcher-dashboard');
    });
  });

  it('handles form submission with missing token', async () => {
    localStorage.removeItem('jwt');
    const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

    render(<ResearcherSignupPage />);

    // Fill in the form
    const phoneInput = screen.getByLabelText('Contact number');
    fireEvent.change(phoneInput, { target: { value: '0814366553' } });
    phoneInput.removeAttribute('required');
    screen.getByLabelText('Current Department').removeAttribute('required');
    screen.getByLabelText('Current academic role').removeAttribute('required');
    screen.getByLabelText('Research area').removeAttribute('required');
    screen.getByPlaceholderText('Qualifications').removeAttribute('required');
    screen.getByPlaceholderText('Projects').removeAttribute('required');
    fireEvent.change(screen.getByLabelText('Current Department'), { target: { value: 'science' } });
    fireEvent.change(screen.getByLabelText('Current academic role'), { target: { value: 'lecturer' } });
    fireEvent.change(screen.getByLabelText('Research area'), { target: { value: 'Black holes' } });
    fireEvent.change(screen.getByPlaceholderText('Qualifications'), { target: { value: 'PhD in Physics' } });
    fireEvent.change(screen.getByPlaceholderText('Projects'), { target: { value: 'Current research project' } });

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

    render(<ResearcherSignupPage />);

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

    render(<ResearcherSignupPage />);

    // Fill in the form
    const phoneInput = screen.getByLabelText('Contact number');
    fireEvent.change(phoneInput, { target: { value: '0814366553' } });
    phoneInput.removeAttribute('required');
    screen.getByLabelText('Current Department').removeAttribute('required');
    screen.getByLabelText('Current academic role').removeAttribute('required');
    screen.getByLabelText('Research area').removeAttribute('required');
    screen.getByPlaceholderText('Qualifications').removeAttribute('required');
    screen.getByPlaceholderText('Projects').removeAttribute('required');
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
      expect(alertSpy).toHaveBeenCalledWith('An error occurred during registration. Please try again.');
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    alertSpy.mockRestore();
    consoleSpy.mockRestore();
  });
}); 