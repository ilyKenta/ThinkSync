import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
}); 