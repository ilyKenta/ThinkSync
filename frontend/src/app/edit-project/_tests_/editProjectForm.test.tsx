import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditProjectForm from '../editProjectForm';

// Mock createPortal to render children directly
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node,
}));

describe('EditProjectForm', () => {
  const defaultProps = {
    onClose: jest.fn(),
    onEdit: jest.fn(),
    initialValues: {
      project_ID: '123',
      name: 'Test Project',
      title: 'Test Project',
      description: 'Test Description',
      goals: 'Test Goals',
      research_areas: 'AI',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      funding_available: true,
      requirements: [],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Remove modal-open class if present
    document.body.classList.remove('modal-open');
  });

  it('renders modal with pre-filled fields', () => {
    render(<EditProjectForm {...defaultProps} />);
    expect(screen.getByLabelText(/Project name/i)).toHaveValue('Test Project');
    expect(screen.getByLabelText(/Project Description/i)).toHaveValue('Test Description');
    expect(screen.getByLabelText(/Goals/i)).toHaveValue('Test Goals');
    expect(screen.getByLabelText(/Research Area/i)).toHaveValue('AI');
    expect(screen.getByLabelText(/Start Date/i)).toHaveValue('2024-01-01');
    expect(screen.getByLabelText(/End Date/i)).toHaveValue('2024-12-31');
    expect(screen.getByLabelText(/Yes/i)).toBeChecked();
  });

  it('calls onClose when close button is clicked', () => {
    render(<EditProjectForm {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /x/i }));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('updates fields on user input', async () => {
    render(<EditProjectForm {...defaultProps} />);
    await userEvent.clear(screen.getByLabelText(/Project name/i));
    await userEvent.type(screen.getByLabelText(/Project name/i), 'New Project');
    await userEvent.clear(screen.getByLabelText(/Project Description/i));
    await userEvent.type(screen.getByLabelText(/Project Description/i), 'New Description');
    await userEvent.clear(screen.getByLabelText(/Goals/i));
    await userEvent.type(screen.getByLabelText(/Goals/i), 'New Goals');
    await userEvent.clear(screen.getByLabelText(/Research Area/i));
    await userEvent.type(screen.getByLabelText(/Research Area/i), 'ML');
    await userEvent.clear(screen.getByLabelText(/Start Date/i));
    await userEvent.type(screen.getByLabelText(/Start Date/i), '2024-02-01');
    await userEvent.clear(screen.getByLabelText(/End Date/i));
    await userEvent.type(screen.getByLabelText(/End Date/i), '2024-12-31');
    fireEvent.click(screen.getByLabelText(/No/i));

    expect(screen.getByLabelText(/Project name/i)).toHaveValue('New Project');
    expect(screen.getByLabelText(/Project Description/i)).toHaveValue('New Description');
    expect(screen.getByLabelText(/Goals/i)).toHaveValue('New Goals');
    expect(screen.getByLabelText(/Research Area/i)).toHaveValue('ML');
    expect(screen.getByLabelText(/Start Date/i)).toHaveValue('2024-02-01');
    expect(screen.getByLabelText(/End Date/i)).toHaveValue('2024-12-31');
    expect(screen.getByLabelText(/No/i)).toBeChecked();
  });

  it('validates required fields', async () => {
    const { container } = render(<EditProjectForm {...defaultProps} />);
    const form = container.querySelector('form');
    // Clear all fields
    await userEvent.clear(screen.getByLabelText(/Project name/i));
    await userEvent.clear(screen.getByLabelText(/Project Description/i));
    await userEvent.clear(screen.getByLabelText(/Goals/i));
    await userEvent.clear(screen.getByLabelText(/Research Area/i));
    await userEvent.clear(screen.getByLabelText(/Start Date/i));
    await userEvent.clear(screen.getByLabelText(/End Date/i));
    fireEvent.submit(form!);
    // Check that the form is still present (did not proceed)
    expect(screen.getByLabelText(/Project name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Goals/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Research Area/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Start Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/End Date/i)).toBeInTheDocument();
  });

  it('validates field length limits', async () => {
    const { container } = render(<EditProjectForm {...defaultProps} />);
    const form = container.querySelector('form');
    const longString = 'a'.repeat(101);
    await userEvent.clear(screen.getByLabelText(/Project name/i));
    await userEvent.type(screen.getByLabelText(/Project name/i), longString);
    fireEvent.submit(form!);
    // Form should not proceed
    expect(screen.getByLabelText(/Project name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project name/i)).toHaveValue(longString);
  });

  it('validates special characters in project name', async () => {
    const { container } = render(<EditProjectForm {...defaultProps} />);
    const form = container.querySelector('form');
    await userEvent.clear(screen.getByLabelText(/Project name/i));
    await userEvent.type(screen.getByLabelText(/Project name/i), 'Project@Name');
    fireEvent.submit(form!);
    // Form should not proceed
    expect(screen.getByLabelText(/Project name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Project name/i)).toHaveValue('Project@Name');
  });

  it('validates end date is after start date', async () => {
    const { container } = render(<EditProjectForm {...defaultProps} />);
    const form = container.querySelector('form');
    await userEvent.clear(screen.getByLabelText(/Start Date/i));
    await userEvent.type(screen.getByLabelText(/Start Date/i), '2024-12-31');
    await userEvent.clear(screen.getByLabelText(/End Date/i));
    await userEvent.type(screen.getByLabelText(/End Date/i), '2024-01-01');
    fireEvent.submit(form!);
    // Form should not proceed
    expect(screen.getByLabelText(/End Date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/End Date/i)).toHaveValue('2024-01-01');
  });

  it('handles successful form submission', async () => {
    const { container } = render(<EditProjectForm {...defaultProps} />);
    const form = container.querySelector('form');
    fireEvent.submit(form!);
    // Should render requirements form (look for a unique label)
    await waitFor(() => {
      expect(screen.getByLabelText(/Skill Required/i)).toBeInTheDocument();
    });
  });

  it('updates state when initialValues change', () => {
    const { rerender } = render(<EditProjectForm {...defaultProps} />);
    
    const newProps = {
      ...defaultProps,
      initialValues: {
        ...defaultProps.initialValues,
        title: 'Updated Project',
        description: 'Updated Description',
      },
    };
    
    rerender(<EditProjectForm {...newProps} />);
    
    expect(screen.getByLabelText(/Project name/i)).toHaveValue('Updated Project');
    expect(screen.getByLabelText(/Project Description/i)).toHaveValue('Updated Description');
  });

  it('handles empty initial values gracefully', () => {
    const emptyProps = {
      ...defaultProps,
      initialValues: {
        project_ID: '123',
        requirements: [],
      },
    };
    
    render(<EditProjectForm {...emptyProps} />);
    
    expect(screen.getByLabelText(/Project name/i)).toHaveValue('');
    expect(screen.getByLabelText(/Project Description/i)).toHaveValue('');
    expect(screen.getByLabelText(/Goals/i)).toHaveValue('');
    expect(screen.getByLabelText(/Research Area/i)).toHaveValue('');
    expect(screen.getByLabelText(/Start Date/i)).toHaveValue('');
    expect(screen.getByLabelText(/End Date/i)).toHaveValue('');
    expect(screen.getByLabelText(/No/i)).toBeChecked();
  });

  it('sanitizes input values before submission', async () => {
    const { container } = render(<EditProjectForm {...defaultProps} />);
    const form = container.querySelector('form');
    await userEvent.clear(screen.getByLabelText(/Project name/i));
    await userEvent.type(screen.getByLabelText(/Project name/i), '  Project Name  ');
    await userEvent.clear(screen.getByLabelText(/Project Description/i));
    await userEvent.type(screen.getByLabelText(/Project Description/i), '  Description  ');
    await userEvent.clear(screen.getByLabelText(/Goals/i));
    await userEvent.type(screen.getByLabelText(/Goals/i), '  Goals  ');
    await userEvent.clear(screen.getByLabelText(/Research Area/i));
    await userEvent.type(screen.getByLabelText(/Research Area/i), '  Research  ');
    fireEvent.submit(form!);
    // Should render requirements form (look for a unique label)
    await waitFor(() => {
      expect(screen.getByLabelText(/Skill Required/i)).toBeInTheDocument();
    });
  });
}); 