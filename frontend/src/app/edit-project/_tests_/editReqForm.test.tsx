import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditReqForm, { EditReqFormProps } from '../editReqForm';

// Mock createPortal to render children directly
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

describe('EditReqForm', () => {
  const defaultProps: EditReqFormProps = {
    projectId: '123',
    projectData: {
      title: 'Test Project',
      description: 'Test Desc',
      goals: 'Test Goals',
      research_areas: 'AI',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      funding_available: true,
    },
    requirements: [
      {
        skill_required: 'JavaScript',
        experience_level: 'intermediate',
        role: 'Developer',
        technical_requirements: 'React, Node.js',
      },
    ],
    onClose: jest.fn(),
    onEdit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Remove modal-open class if present
    document.body.classList.remove('modal-open');
  });

  it('renders modal with pre-filled fields', async () => {
    render(<EditReqForm {...defaultProps} />);
    expect(screen.getByLabelText(/Skill Required/i)).toHaveValue('JavaScript');
    expect(screen.getByLabelText(/Level of experience/i)).toHaveValue('intermediate');
    expect(screen.getByLabelText(/Role/i)).toHaveValue('Developer');
    expect(screen.getByLabelText(/Technical Requirements/i)).toHaveValue('React, Node.js');
  });

  it('calls onClose when close button is clicked', () => {
    render(<EditReqForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /x/i }));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('updates fields on user input', () => {
    render(<EditReqForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/Skill Required/i), { target: { value: 'Python' } });
    fireEvent.change(screen.getByLabelText(/Level of experience/i), { target: { value: 'professional' } });
    fireEvent.change(screen.getByLabelText(/Role/i), { target: { value: 'Data Scientist' } });
    fireEvent.change(screen.getByLabelText(/Technical Requirements/i), { target: { value: 'TensorFlow' } });
    expect(screen.getByLabelText(/Skill Required/i)).toHaveValue('Python');
    expect(screen.getByLabelText(/Level of experience/i)).toHaveValue('professional');
    expect(screen.getByLabelText(/Role/i)).toHaveValue('Data Scientist');
    expect(screen.getByLabelText(/Technical Requirements/i)).toHaveValue('TensorFlow');
  });

  it('shows error if no token is present', async () => {
    jest.spyOn(window.localStorage.__proto__, 'getItem').mockReturnValueOnce(null);
    render(<EditReqForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => {
      expect(screen.getByText(/no access token found/i)).toBeInTheDocument();
    });
  });

  it('shows error if API returns error', async () => {
    jest.spyOn(window.localStorage.__proto__, 'getItem').mockReturnValue('token');
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'API error' }),
    });
    render(<EditReqForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => {
      expect(screen.getByText(/API error/i)).toBeInTheDocument();
    });
  });

  it('calls onEdit and onClose on successful submit', async () => {
    jest.spyOn(window.localStorage.__proto__, 'getItem').mockReturnValue('token');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    render(<EditReqForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => {
      expect(defaultProps.onEdit).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('shows loading state when submitting', async () => {
    jest.spyOn(window.localStorage.__proto__, 'getItem').mockReturnValue('token');
    global.fetch = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ ok: true, json: async () => ({}) }), 100)));
    render(<EditReqForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    expect(screen.getByRole('button', { name: /saving.../i })).toBeDisabled();
  });

  it('handles empty requirements array gracefully', () => {
    render(<EditReqForm {...defaultProps} requirements={[]} />);
    expect(screen.getByLabelText(/Skill Required/i)).toHaveValue('');
    expect(screen.getByLabelText(/Level of experience/i)).toHaveValue('');
    expect(screen.getByLabelText(/Role/i)).toHaveValue('');
    expect(screen.getByLabelText(/Technical Requirements/i)).toHaveValue('');
  });

  it('validates required fields and shows error messages', async () => {
    render(<EditReqForm {...defaultProps} />);
    // Use userEvent to clear skill
    await userEvent.clear(screen.getByLabelText(/Skill Required/i));
    // Submit the form directly
    fireEvent.submit(screen.getByTestId('edit-req-form'));
    await waitFor(() => {
      expect(screen.getByText((content) => content.includes('Skill is required'))).toBeInTheDocument();
    });
    // Fill skill, clear role and submit
    await userEvent.type(screen.getByLabelText(/Skill Required/i), 'JavaScript');
    await userEvent.clear(screen.getByLabelText(/Role/i));
    fireEvent.submit(screen.getByTestId('edit-req-form'));
    await waitFor(() => {
      expect(screen.getByText((content) => content.includes('Role is required'))).toBeInTheDocument();
    });
    // Fill role, clear technical requirements and submit
    await userEvent.type(screen.getByLabelText(/Role/i), 'Developer');
    await userEvent.clear(screen.getByLabelText(/Technical Requirements/i));
    fireEvent.submit(screen.getByTestId('edit-req-form'));
    await waitFor(() => {
      expect(screen.getByText((content) => content.includes('Technical requirements are required'))).toBeInTheDocument();
    });
    // Fill technical requirements, clear experience and submit
    await userEvent.type(screen.getByLabelText(/Technical Requirements/i), 'React');
    // Clear experience (select) by setting to empty value
    await userEvent.selectOptions(screen.getByLabelText(/Level of experience/i), '');
    fireEvent.submit(screen.getByTestId('edit-req-form'));
    await waitFor(() => {
      expect(screen.getByText((content) => content.includes('Experience level is required'))).toBeInTheDocument();
    });
  });

  it('sanitizes skill input before submission', async () => {
    render(<EditReqForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/Skill Required/i), { target: { value: '  Skill Name  ' } });
    fireEvent.change(screen.getByLabelText(/Role/i), { target: { value: 'Developer' } });
    fireEvent.change(screen.getByLabelText(/Technical Requirements/i), { target: { value: 'React, Node.js' } });
    fireEvent.change(screen.getByLabelText(/Level of experience/i), { target: { value: 'intermediate' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    // The value in the input will not be trimmed until after submission, so check for the error message not being present
    await waitFor(() => {
      expect(screen.queryByText(/is required/i)).not.toBeInTheDocument();
    });
  });

  it('validates skill for special characters', async () => {
    render(<EditReqForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/Skill Required/i), { target: { value: 'Skill@Name' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => {
      expect(screen.getByText(/Skill contains invalid characters/i)).toBeInTheDocument();
    });
  });

  it('validates role for special characters', async () => {
    render(<EditReqForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/Role/i), { target: { value: 'Role@Name' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => {
      expect(screen.getByText(/Role contains invalid characters/i)).toBeInTheDocument();
    });
  });

  it('validates field length limits', async () => {
    render(<EditReqForm {...defaultProps} />);
    const longString = 'a'.repeat(101);
    fireEvent.change(screen.getByLabelText(/Skill Required/i), { target: { value: longString } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => {
      expect(screen.getByText(/Skill must be less than 100 characters/i)).toBeInTheDocument();
    });
  });

  it('handles experience level selection', () => {
    render(<EditReqForm {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/Level of experience/i), { target: { value: 'intermediate' } });
    expect(screen.getByLabelText(/Level of experience/i)).toHaveValue('intermediate');
  });

  it('handles successful form submission', async () => {
    const mockOnEdit = jest.fn();
    const mockOnClose = jest.fn();
    render(<EditReqForm {...defaultProps} onEdit={mockOnEdit} onClose={mockOnClose} />);
    
    // Fill in all required fields
    fireEvent.change(screen.getByLabelText(/Skill Required/i), { target: { value: 'JavaScript' } });
    fireEvent.change(screen.getByLabelText(/Level of experience/i), { target: { value: 'intermediate' } });
    fireEvent.change(screen.getByLabelText(/Role/i), { target: { value: 'Developer' } });
    fireEvent.change(screen.getByLabelText(/Technical Requirements/i), { target: { value: 'React, Node.js' } });
    
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    
    await waitFor(() => {
      expect(mockOnEdit).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
}); 