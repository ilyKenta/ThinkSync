import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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
    onAssignSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders modal and form elements', () => {
    render(<AssignReviewer {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /Assign Reviewer/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/search by research area/i)).toBeInTheDocument();
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
    const searchInput = screen.getByPlaceholderText(/search by research area/i);
    fireEvent.change(searchInput, { target: { value: 'AI' } });
    act(() => {
      jest.advanceTimersByTime(300); // Advance past debounce
    });
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
    const searchInput = screen.getByPlaceholderText(/search by research area/i);
    fireEvent.change(searchInput, { target: { value: 'AI' } });
    act(() => {
      jest.advanceTimersByTime(300); // Advance past debounce
    });
    await waitFor(() => {
      expect(screen.getByText(/API error/i)).toBeInTheDocument();
    });
  });

  it('shows reviewers after successful search', async () => {
    window.localStorage.getItem = jest.fn().mockReturnValue('token');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reviewers: [
        { user_ID: 'u1', fname: 'Alice', sname: 'Smith', department: 'CS', acc_role: 'Reviewer', qualification: 'PhD', research_area: 'AI' },
        { user_ID: 'u2', fname: 'Bob', sname: 'Jones', department: 'Math', acc_role: 'Reviewer', research_area: 'AI' },
      ] }),
    });
    render(<AssignReviewer {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/search by research area/i);
    fireEvent.change(searchInput, { target: { value: 'AI' } });
    act(() => {
      jest.advanceTimersByTime(300); // Advance past debounce
    });
    await waitFor(() => {
      expect(screen.getByText(/Alice Smith/)).toBeInTheDocument();
      expect(screen.getByText(/Bob Jones/)).toBeInTheDocument();
      expect(screen.getByText(/PhD/)).toBeInTheDocument();
      // Use getAllByText for multiple elements
      const researchAreas = screen.getAllByText(/Research Area: AI/);
      expect(researchAreas).toHaveLength(2);
    });
  });

  it('enables assign button when reviewer is selected', async () => {
    window.localStorage.getItem = jest.fn().mockReturnValue('token');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ reviewers: [
        { user_ID: 'u1', fname: 'Alice', sname: 'Smith', department: 'CS', acc_role: 'Reviewer' },
      ] }),
    });
    render(<AssignReviewer {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/search by research area/i);
    fireEvent.change(searchInput, { target: { value: 'AI' } });
    act(() => {
      jest.advanceTimersByTime(300); // Advance past debounce
    });
    await waitFor(() => {
      expect(screen.getByText(/Alice Smith/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('radio', { name: /Alice Smith/i }));
    expect(screen.getByRole('button', { name: /assign reviewer/i })).toBeEnabled();
  });

  it('shows error if not authenticated on assign', async () => {
    window.localStorage.getItem = jest.fn().mockReturnValue(null);
    render(<AssignReviewer {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/search by research area/i);
    fireEvent.change(searchInput, { target: { value: 'AI' } });
    act(() => {
      jest.advanceTimersByTime(300); // Advance past debounce
    });
    await waitFor(() => {
      expect(screen.getByText(/not authenticated/i)).toBeInTheDocument();
    });
  });

  it('calls onAssignSuccess and onClose on successful assign', async () => {
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
    const searchInput = screen.getByPlaceholderText(/search by research area/i);
    fireEvent.change(searchInput, { target: { value: 'AI' } });
    act(() => {
      jest.advanceTimersByTime(300); // Advance past debounce
    });
    await waitFor(() => {
      expect(screen.getByText(/Alice Smith/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('radio', { name: /Alice Smith/i }));
    fireEvent.click(screen.getByRole('button', { name: /assign reviewer/i }));
    await waitFor(() => {
      expect(defaultProps.onAssignSuccess).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('shows error message on assign failure', async () => {
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
    const searchInput = screen.getByPlaceholderText(/search by research area/i);
    fireEvent.change(searchInput, { target: { value: 'AI' } });
    act(() => {
      jest.advanceTimersByTime(300); // Advance past debounce
    });
    await waitFor(() => {
      expect(screen.getByText(/Alice Smith/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('radio', { name: /Alice Smith/i }));
    fireEvent.click(screen.getByRole('button', { name: /assign reviewer/i }));
    await waitFor(() => {
      expect(screen.getByText(/Error assigning reviewer: Assign error/i)).toBeInTheDocument();
    });
  });

  it('shows loading state during search', async () => {
    window.localStorage.getItem = jest.fn().mockReturnValue('token');
    global.fetch = jest.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<AssignReviewer {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/search by research area/i);
    fireEvent.change(searchInput, { target: { value: 'AI' } });
    act(() => {
      jest.advanceTimersByTime(300); // Advance past debounce
    });
    expect(screen.getByText(/searching/i)).toBeInTheDocument();
  });

  it('shows loading state during assign', async () => {
    window.localStorage.getItem = jest.fn().mockReturnValue('token');
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ reviewers: [
          { user_ID: 'u1', fname: 'Alice', sname: 'Smith', department: 'CS', acc_role: 'Reviewer' },
        ] }),
      })
      .mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)));
    render(<AssignReviewer {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText(/search by research area/i);
    fireEvent.change(searchInput, { target: { value: 'AI' } });
    act(() => {
      jest.advanceTimersByTime(300); // Advance past debounce
    });
    await waitFor(() => {
      expect(screen.getByText(/Alice Smith/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('radio', { name: /Alice Smith/i }));
    fireEvent.click(screen.getByRole('button', { name: /assign reviewer/i }));
    expect(screen.getByText(/assigning/i)).toBeInTheDocument();
  });
}); 