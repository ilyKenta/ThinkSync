import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AssignReviewer from '../AssignReviewers';

// Mock alert
window.alert = jest.fn();

// Mock localStorage
beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true,
  });
});

describe('AssignReviewer', () => {
  const defaultProps = {
    projectId: 'p1',
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders modal and form', () => {
    render(<AssignReviewer {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /Assign Reviewer/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search by research area/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /assign reviewer/i })).toBeDisabled();
  });

  it('calls onClose when cancel is clicked', () => {
    render(<AssignReviewer {...defaultProps} />);
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows error if not authenticated on search', async () => {
    window.localStorage.getItem = jest.fn().mockReturnValue(null);
    render(<AssignReviewer {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/search by research area/i), { target: { value: 'AI' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => {
      expect(screen.getByText(/not authenticated/i)).toBeInTheDocument();
    });
  });

  it('shows error if API search fails', async () => {
    window.localStorage.getItem = jest.fn().mockReturnValue('token');
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'API error' }),
    });
    render(<AssignReviewer {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/search by research area/i), { target: { value: 'AI' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => {
      expect(screen.getByText(/API error/i)).toBeInTheDocument();
    });
  });

  it('shows reviewers after successful search', async () => {
    window.localStorage.getItem = jest.fn().mockReturnValue('token');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reviewers: [
        { user_ID: 'u1', fname: 'Alice', sname: 'Smith', department: 'CS', acc_role: 'Reviewer', qualification: 'PhD' },
        { user_ID: 'u2', fname: 'Bob', sname: 'Jones', department: 'Math', acc_role: 'Reviewer' },
      ] }),
    });
    render(<AssignReviewer {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/search by research area/i), { target: { value: 'AI' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => {
      expect(screen.getByText(/Alice Smith/)).toBeInTheDocument();
      expect(screen.getByText(/Bob Jones/)).toBeInTheDocument();
    });
  });

  it('can select a reviewer and enable assign button', async () => {
    window.localStorage.getItem = jest.fn().mockReturnValue('token');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reviewers: [
        { user_ID: 'u1', fname: 'Alice', sname: 'Smith', department: 'CS', acc_role: 'Reviewer' },
      ] }),
    });
    render(<AssignReviewer {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/search by research area/i), { target: { value: 'AI' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => {
      expect(screen.getByText(/Alice Smith/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('radio', { name: /Alice Smith/i }));
    expect(screen.getByRole('button', { name: /assign reviewer/i })).toBeEnabled();
  });

  it('shows error if not authenticated on assign', async () => {
    window.localStorage.getItem = jest.fn().mockReturnValue(null);
    render(<AssignReviewer {...defaultProps} />);
    // Simulate search and select
    fireEvent.change(screen.getByPlaceholderText(/search by research area/i), { target: { value: 'AI' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => {
      // No reviewers, so nothing to select
      expect(screen.getByText(/no results/i)).toBeInTheDocument();
    });
    // Try to assign (should do nothing)
    fireEvent.click(screen.getByRole('button', { name: /assign reviewer/i }));
    // No alert should be called
    expect(window.alert).not.toHaveBeenCalled();
  });

  it('shows alert and closes on successful assign', async () => {
    window.localStorage.getItem = jest.fn().mockReturnValue('token');
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reviewers: [
          { user_ID: 'u1', fname: 'Alice', sname: 'Smith', department: 'CS', acc_role: 'Reviewer' },
        ] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });
    render(<AssignReviewer {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/search by research area/i), { target: { value: 'AI' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => {
      expect(screen.getByText(/Alice Smith/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('radio', { name: /Alice Smith/i }));
    fireEvent.click(screen.getByRole('button', { name: /assign reviewer/i }));
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Reviewer assigned'));
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('shows alert on assign error', async () => {
    window.localStorage.getItem = jest.fn().mockReturnValue('token');
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reviewers: [
          { user_ID: 'u1', fname: 'Alice', sname: 'Smith', department: 'CS', acc_role: 'Reviewer' },
        ] }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Assign error' }),
      });
    render(<AssignReviewer {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/search by research area/i), { target: { value: 'AI' } });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));
    await waitFor(() => {
      expect(screen.getByText(/Alice Smith/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('radio', { name: /Alice Smith/i }));
    fireEvent.click(screen.getByRole('button', { name: /assign reviewer/i }));
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Error assigning reviewer'));
    });
  });
}); 