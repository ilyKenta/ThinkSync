import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import MilestoneDetailsPage from '../page';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  useSearchParams: jest.fn(() => ({ get: jest.fn() })),
}));

// Mock environment variable
process.env.NEXT_PUBLIC_AZURE_API_URL = 'http://localhost:3000';

describe('MilestoneDetailsPage', () => {
  const mockMilestoneData = {
    milestone: {
      milestone_ID: '1',
      title: 'Test Milestone',
      description: 'Test Description',
      project_ID: 'p1',
      project_title: 'Project 1',
      expected_completion_date: '2024-01-01',
      assigned_user_ID: 'u1',
      assigned_user_fname: 'Alice',
      assigned_user_sname: 'Smith',
      status: 'Not Started',
    },
    collaborators: [
      { user_ID: 'u1', name: 'Alice Smith' },
      { user_ID: 'u2', name: 'Bob Jones' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn((url) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockMilestoneData)
      } as any);
    });
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: jest.fn(() => 'mock-token') },
      writable: true,
    });
  });

  it('renders loading state', () => {
    render(<MilestoneDetailsPage params={{ id: '1' }} />);
    expect(screen.getByText(/loading milestone details/i)).toBeInTheDocument();
  });

  it('renders error state', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Fetch failed'));
    render(<MilestoneDetailsPage params={{ id: '1' }} />);
    await waitFor(() => {
      expect(screen.getByText(/fetch failed/i)).toBeInTheDocument();
    });
  });

  it('renders milestone details', async () => {
    render(<MilestoneDetailsPage params={{ id: '1' }} />);
    await waitFor(() => {
      expect(screen.getByText('Test Milestone')).toBeInTheDocument();
      expect(screen.getByText(/project: project 1/i)).toBeInTheDocument();
      expect(screen.getByText(/not started/i)).toBeInTheDocument();
      expect(screen.getByText(/alice smith/i)).toBeInTheDocument();
      expect(screen.getByText(/test description/i)).toBeInTheDocument();
    });
  });

  it('handles delete flow', async () => {
    const mockRouter = { push: jest.fn() };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    render(<MilestoneDetailsPage params={{ id: '1' }} />);
    await waitFor(() => {
      expect(screen.getByText('Test Milestone')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /delete milestone/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /delete milestone/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/milestones/p1/1'),
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  it('handles back navigation', async () => {
    const mockRouter = { push: jest.fn() };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    render(<MilestoneDetailsPage params={{ id: '1' }} />);
    await waitFor(() => {
      expect(screen.getByText('Test Milestone')).toBeInTheDocument();
    });

    const backButton = screen.getAllByRole('button')[0];
    fireEvent.click(backButton);
    expect(mockRouter.push).toHaveBeenCalledWith('/milestones');
  });

  it('handles custom dashboard navigation', async () => {
    const mockRouter = { push: jest.fn() };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useSearchParams as jest.Mock).mockReturnValue({ get: () => 'custom-dashboard' });

    render(<MilestoneDetailsPage params={{ id: '1' }} />);
    await waitFor(() => {
      expect(screen.getByText('Test Milestone')).toBeInTheDocument();
    });

    const backButton = screen.getAllByRole('button')[0];
    fireEvent.click(backButton);
    expect(mockRouter.push).toHaveBeenCalledWith('/custom-dashboard');
  });

  it('opens and closes edit form', async () => {
    render(<MilestoneDetailsPage params={{ id: '1' }} />);
    await waitFor(() => {
      expect(screen.getByText('Test Milestone')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    expect(screen.getByRole('heading', { name: /edit test milestone/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('heading', { name: /edit test milestone/i })).not.toBeInTheDocument();
  });

  it('handles successful milestone update', async () => {
    const updatedMilestone = {
      ...mockMilestoneData,
      milestone: {
        ...mockMilestoneData.milestone,
        title: 'Updated Title',
        description: 'Updated Description',
        status: 'In Progress',
      },
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockMilestoneData) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updatedMilestone) });

    render(<MilestoneDetailsPage params={{ id: '1' }} />);
    await waitFor(() => {
      expect(screen.getByText('Test Milestone')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    
    const textboxes = screen.getAllByRole('textbox');
    const titleInput = textboxes[0];
    const descriptionInput = textboxes[1];
    const comboboxes = screen.getAllByRole('combobox');
    const statusSelect = comboboxes[0];

    await userEvent.clear(titleInput);
    await userEvent.type(titleInput, 'Updated Title');
    await userEvent.clear(descriptionInput);
    await userEvent.type(descriptionInput, 'Updated Description');
    await userEvent.selectOptions(statusSelect, 'In Progress');

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getAllByText('Updated Title').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Updated Description').length).toBeGreaterThan(0);
      expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);
    });
  });

  it('handles delete error', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockMilestoneData) })
      .mockRejectedValueOnce(new Error('Delete failed'));

    render(<MilestoneDetailsPage params={{ id: '1' }} />);
    await waitFor(() => {
      expect(screen.getByText('Test Milestone')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    fireEvent.click(screen.getByRole('button', { name: /delete milestone/i }));

    await waitFor(() => {
      expect(screen.getByText('Delete failed')).toBeInTheDocument();
    });
  });

  it('handles collaborator assignment', async () => {
    const updatedMilestone = {
      ...mockMilestoneData,
      milestone: {
        ...mockMilestoneData.milestone,
        assigned_user_ID: 'u2',
        assigned_user_fname: 'Bob',
        assigned_user_sname: 'Jones'
      }
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockMilestoneData) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(updatedMilestone) });

    render(<MilestoneDetailsPage params={{ id: '1' }} />);
    await waitFor(() => {
      expect(screen.getByText('Test Milestone')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    
    const comboboxes = screen.getAllByRole('combobox');
    const assignSelect = comboboxes[1];
    await userEvent.selectOptions(assignSelect, 'u2');
    fireEvent.blur(assignSelect);
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/bob jones/i)).toBeInTheDocument();
    });
  });
}); 