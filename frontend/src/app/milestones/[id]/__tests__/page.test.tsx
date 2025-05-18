import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MilestoneDetailsPage from '../page';
import '@testing-library/jest-dom';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => ({ get: () => null }),
}));

describe('MilestoneDetailsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn((url) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          milestone: {
            milestone_ID: '1',
            title: 'Test Milestone',
            description: 'Desc',
            project_ID: 'p1',
            project_title: 'Project 1',
            expected_completion_date: '2024-01-01',
            assigned_user_ID: 'u1',
            assigned_user_fname: 'Alice',
            assigned_user_sname: 'Smith',
            status: 'Completed',
          },
          collaborators: [
            { user_ID: 'u1', name: 'Alice Smith' },
          ],
        })
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
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({
        milestone: {
          milestone_ID: '1',
          title: 'Test Milestone',
          description: 'Desc',
          project_ID: 'p1',
          project_title: 'Project 1',
          expected_completion_date: '2024-01-01',
          assigned_user_ID: 'u1',
          assigned_user_fname: 'Alice',
          assigned_user_sname: 'Smith',
          status: 'Completed',
        },
        collaborators: [
          { user_ID: 'u1', name: 'Alice Smith' },
        ],
      }),
      ok: true,
    });
    render(<MilestoneDetailsPage params={{ id: '1' }} />);
    await waitFor(() => {
      expect(screen.getByText('Test Milestone')).toBeInTheDocument();
      expect(screen.getByText(/project: project 1/i)).toBeInTheDocument();
      expect(screen.getByText(/completed/i)).toBeInTheDocument();
    });
  });

  it('handles edit flow', async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          milestone: {
            milestone_ID: '1',
            title: 'Test Milestone',
            description: 'Desc',
            project_ID: 'p1',
            project_title: 'Project 1',
            expected_completion_date: '2024-01-01',
            assigned_user_ID: 'u1',
            assigned_user_fname: 'Alice',
            assigned_user_sname: 'Smith',
            status: 'Completed',
          },
          collaborators: [
            { user_ID: 'u1', name: 'Alice Smith' },
          ],
        })
      } as any))
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          milestone: {
            milestone_ID: '1',
            title: 'Test Milestone',
            description: 'Desc',
            project_ID: 'p1',
            project_title: 'Project 1',
            expected_completion_date: '2024-01-01',
            assigned_user_ID: 'u1',
            assigned_user_fname: 'Alice',
            assigned_user_sname: 'Smith',
            status: 'Completed',
          },
          collaborators: [
            { user_ID: 'u1', name: 'Alice Smith' },
          ],
        })
      } as any));
    const { container } = render(<MilestoneDetailsPage params={{ id: '1' }} />);
    await waitFor(() => {
      expect(screen.getByText('Test Milestone')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/edit/i));
    await waitFor(() => {
      expect(screen.getByText(/edit test milestone/i)).toBeInTheDocument();
    });
    const textboxes = screen.getAllByRole('textbox');
    fireEvent.change(textboxes[0], { target: { value: 'Updated Title' } });
    fireEvent.change(textboxes[1], { target: { value: 'Updated Desc' } });
    const dateInput = container.querySelector('input[type="date"]');
    if (dateInput) fireEvent.change(dateInput, { target: { value: '2024-01-02' } });
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'Completed' } });
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'u1' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('handles delete flow', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({
          milestone: {
            milestone_ID: '1',
            title: 'Test Milestone',
            description: 'Desc',
            project_ID: 'p1',
            project_title: 'Project 1',
            expected_completion_date: '2024-01-01',
            assigned_user_ID: 'u1',
            assigned_user_fname: 'Alice',
            assigned_user_sname: 'Smith',
            status: 'Completed',
          },
          collaborators: [
            { user_ID: 'u1', name: 'Alice Smith' },
          ],
        }),
        ok: true,
      })
      .mockResolvedValueOnce({ ok: true });
    render(<MilestoneDetailsPage params={{ id: '1' }} />);
    await waitFor(() => {
      expect(screen.getByText('Test Milestone')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/delete/i));
    await waitFor(() => {
      expect(screen.getAllByText(/delete milestone/i)[0]).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByText(/delete milestone/i)[1]);
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });
}); 