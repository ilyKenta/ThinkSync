import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import PropInfoContent from '../page';
import { useSearchParams, useRouter } from 'next/navigation';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock fetch
global.fetch = jest.fn();

// Mock window.alert
global.alert = jest.fn();

describe('PropInfoContent', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockProjectData = {
    title: 'Test Project',
    description: 'Test Description',
    goals: 'Test Goals',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    funding_available: true,
    researcher_fname: 'John',
    researcher_sname: 'Doe',
    skill_required: 'JavaScript',
    experience_level: 'Senior',
    technical_requirements: 'React, Node.js',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockClear();
    (global.fetch as jest.Mock).mockClear();
    mockRouter.push.mockClear();
    (global.alert as jest.Mock).mockClear();

    // Mock useRouter and useSearchParams
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams({
      projectId: '123',
      projectData: encodeURIComponent(JSON.stringify(mockProjectData))
    }));

    // Mock localStorage
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'jwt') return 'mock-token';
      return null;
    });
  });

  it('renders loading state initially', () => {
    render(<PropInfoContent />);
    expect(screen.getByText('Loading proposal...')).toBeInTheDocument();
  });

  it('renders error state when project data is missing', async () => {
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
    
    await act(async () => {
      render(<PropInfoContent />);
    });

    await waitFor(() => {
      expect(screen.getByText('Error: No project data available')).toBeInTheDocument();
    });
  });

  it('renders project details when data is loaded', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ review: { outcome: 'PENDING' } })
    });

    await act(async () => {
      render(<PropInfoContent />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Test Goals')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      // Check for requirement fields by label and value
      expect(screen.getByText((content, element) =>
        element?.textContent === 'Skill Required: JavaScript')).toBeInTheDocument();
      expect(screen.getByText((content, element) =>
        element?.textContent === 'Experience Level: Senior')).toBeInTheDocument();
      expect(screen.getByText((content, element) =>
        element?.textContent === 'Technical Requirements: React, Node.js')).toBeInTheDocument();
    });
  });

  it('handles project review submission successfully', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ review: { outcome: 'PENDING' } })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ message: 'Review submitted successfully' })
      });

    await act(async () => {
      render(<PropInfoContent />);
    });

    // Wait for the form to be rendered
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter your feedback...')).toBeInTheDocument();
    });

    // Fill out the form
    const feedbackTextarea = screen.getByPlaceholderText('Enter your feedback...');
    const outcomeSelect = screen.getByRole('combobox');
    const submitButton = screen.getByText('Submit Evaluation');

    await act(async () => {
      fireEvent.change(feedbackTextarea, { target: { value: 'Great proposal!' } });
      fireEvent.change(outcomeSelect, { target: { value: 'approved' } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/reviewer/proposals/123/review`,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          },
          body: JSON.stringify({
            feedback: 'Great proposal!',
            outcome: 'approved'
          })
        })
      );
    });
  });

  it('handles review submission errors', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ review: { outcome: 'PENDING' } })
      })
      .mockRejectedValueOnce(new Error('Failed to submit review'));

    await act(async () => {
      render(<PropInfoContent />);
    });

    // Wait for the form to be rendered
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter your feedback...')).toBeInTheDocument();
    });

    // Fill out and submit the form
    const feedbackTextarea = screen.getByPlaceholderText('Enter your feedback...');
    const submitButton = screen.getByText('Submit Evaluation');

    await act(async () => {
      fireEvent.change(feedbackTextarea, { target: { value: 'Great proposal!' } });
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith('Error: Failed to submit review');
    });
  });

  it('handles navigation to review dashboard', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ review: { outcome: 'PENDING' } })
    });

    await act(async () => {
      render(<PropInfoContent />);
    });

    const dashboardButton = screen.getByText('Assigned proposals');
    await act(async () => {
      fireEvent.click(dashboardButton);
    });

    expect(mockRouter.push).toHaveBeenCalledWith('/review-dash');
  });

  it('does not show evaluation form when status is not PENDING', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ review: { outcome: 'approved' } })
    });

    await act(async () => {
      render(<PropInfoContent />);
    });

    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Enter your feedback...')).not.toBeInTheDocument();
      expect(screen.queryByText('Submit Evaluation')).not.toBeInTheDocument();
    });
  });

  it('handles missing optional fields gracefully', async () => {
    const incompleteProjectData = {
      ...mockProjectData,
      end_date: undefined,
      funding_available: undefined,
      skill_required: undefined,
      experience_level: undefined,
      technical_requirements: undefined
    };

    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams({
      projectId: '123',
      projectData: encodeURIComponent(JSON.stringify(incompleteProjectData))
    }));

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ review: { outcome: 'PENDING' } })
    });

    await act(async () => {
      render(<PropInfoContent />);
    });

    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
      // Check for all three 'Not specified' fields
      expect(screen.getByText((content, element) =>
        element?.textContent === 'Skill Required: Not specified')).toBeInTheDocument();
      expect(screen.getByText((content, element) =>
        element?.textContent === 'Experience Level: Not specified')).toBeInTheDocument();
      expect(screen.getByText((content, element) =>
        element?.textContent === 'Technical Requirements: Not specified')).toBeInTheDocument();
    });
  });
}); 