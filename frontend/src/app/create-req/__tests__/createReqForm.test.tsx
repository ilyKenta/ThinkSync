import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateReqForm from '../createReqForm';

jest.mock('../page.module.css', () => new Proxy({}, { get: (target, prop) => prop }));

describe('CreateReqForm', () => {
  let onClose: jest.Mock;
  let onCreate: jest.Mock;
  const baseProps = {
    projectName: 'Test Project',
    projectDesc: 'A description',
    goals: 'Some goals',
    setResArea: 'AI',
    setStart: '2024-01-01',
    setEnd: '2024-12-31',
    Funding: true,
  };

  beforeEach(() => {
    onClose = jest.fn();
    onCreate = jest.fn();
    jest.clearAllMocks();
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-token'),
        setItem: jest.fn(),
        clear: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });
    // Mock fetch
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true })
    })) as any;
    // Mock alert
    global.alert = jest.fn();
  });

  it('renders all fields and buttons', () => {
    render(<CreateReqForm {...baseProps} onClose={onClose} onCreate={onCreate} />);
    expect(screen.getByLabelText('Skill Required')).toBeInTheDocument();
    expect(screen.getByLabelText('Level of experience')).toBeInTheDocument();
    expect(screen.getByLabelText('Role', { selector: '#reqrole' })).toBeInTheDocument();
    expect(screen.getByLabelText('Technical Requirements')).toBeInTheDocument();
    expect(screen.getByLabelText('submit information')).toBeInTheDocument();
    expect(screen.getByText('X')).toBeInTheDocument();
  });

  it('handles input changes for all fields', () => {
    render(<CreateReqForm {...baseProps} onClose={onClose} onCreate={onCreate} />);
    const skillInput = screen.getByLabelText('Skill Required');
    fireEvent.change(skillInput, { target: { value: 'Python' } });
    expect(skillInput).toHaveValue('Python');
    const expSelect = screen.getByLabelText('Level of experience');
    fireEvent.change(expSelect, { target: { value: 'professional' } });
    expect(expSelect).toHaveValue('professional');
    const roleInput = screen.getByLabelText('Role', { selector: '#reqrole' });
    fireEvent.change(roleInput, { target: { value: 'Lead' } });
    expect(roleInput).toHaveValue('Lead');
    const techInput = screen.getByLabelText('Technical Requirements');
    fireEvent.change(techInput, { target: { value: 'React' } });
    expect(techInput).toHaveValue('React');
  });

  it('calls onClose when close button is clicked', () => {
    render(<CreateReqForm {...baseProps} onClose={onClose} onCreate={onCreate} />);
    fireEvent.click(screen.getByText('X'));
    expect(onClose).toHaveBeenCalled();
  });

  it('submits form and calls onCreate/onClose with valid input and token', async () => {
    render(<CreateReqForm {...baseProps} onClose={onClose} onCreate={onCreate} />);
    fireEvent.change(screen.getByLabelText('Skill Required'), { target: { value: 'Python' } });
    fireEvent.change(screen.getByLabelText('Level of experience'), { target: { value: 'professional' } });
    fireEvent.change(screen.getByLabelText('Role', { selector: '#reqrole' }), { target: { value: 'Lead' } });
    fireEvent.change(screen.getByLabelText('Technical Requirements'), { target: { value: 'React' } });
    fireEvent.click(screen.getByLabelText('submit information'));
    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith('Python');
      expect(onClose).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('shows alert and does not submit if no token', async () => {
    (window.localStorage.getItem as jest.Mock).mockReturnValueOnce(null);
    render(<CreateReqForm {...baseProps} onClose={onClose} onCreate={onCreate} />);
    fireEvent.change(screen.getByLabelText('Skill Required'), { target: { value: 'Python' } });
    fireEvent.change(screen.getByLabelText('Level of experience'), { target: { value: 'professional' } });
    fireEvent.change(screen.getByLabelText('Role', { selector: '#reqrole' }), { target: { value: 'Lead' } });
    fireEvent.change(screen.getByLabelText('Technical Requirements'), { target: { value: 'React' } });
    fireEvent.click(screen.getByLabelText('submit information'));
    await waitFor(() => {
      expect(screen.getByText('User not logged in')).toBeInTheDocument();
      expect(onCreate).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  it('shows alert on API error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'API error' })
    });
    render(<CreateReqForm {...baseProps} onClose={onClose} onCreate={onCreate} />);
    fireEvent.change(screen.getByLabelText('Skill Required'), { target: { value: 'Python' } });
    fireEvent.change(screen.getByLabelText('Level of experience'), { target: { value: 'professional' } });
    fireEvent.change(screen.getByLabelText('Role', { selector: '#reqrole' }), { target: { value: 'Lead' } });
    fireEvent.change(screen.getByLabelText('Technical Requirements'), { target: { value: 'React' } });
    fireEvent.click(screen.getByLabelText('submit information'));
    await waitFor(() => {
      expect(screen.getByText('API error')).toBeInTheDocument();
    });
  });

  it('shows alert on fetch/network error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
    render(<CreateReqForm {...baseProps} onClose={onClose} onCreate={onCreate} />);
    fireEvent.change(screen.getByLabelText('Skill Required'), { target: { value: 'Python' } });
    fireEvent.change(screen.getByLabelText('Level of experience'), { target: { value: 'professional' } });
    fireEvent.change(screen.getByLabelText('Role', { selector: '#reqrole' }), { target: { value: 'Lead' } });
    fireEvent.change(screen.getByLabelText('Technical Requirements'), { target: { value: 'React' } });
    fireEvent.click(screen.getByLabelText('submit information'));
    await waitFor(() => {
      expect(screen.getByText('An error occurred while creating the project')).toBeInTheDocument();
    });
  });
}); 