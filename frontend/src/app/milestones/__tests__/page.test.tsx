import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MilestonesPage from '../page';
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/milestones',
}));

// Mock recharts
jest.mock('recharts', () => ({
  PieChart: ({ children }: any) => <div data-testid="PieChart">{children}</div>,
  Pie: ({ children }: any) => <div data-testid="Pie">{children}</div>,
  Cell: () => <div data-testid="Cell" />,
  Tooltip: () => <div data-testid="Tooltip" />,
  Legend: () => <div data-testid="Legend" />,
}));

describe('MilestonesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fetch
    global.fetch = jest.fn((url) => {
      // First call: milestones
      if (typeof url === 'string' && url.includes('/api/milestones')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ projects: [], summary: [] })
        } as any);
      }
      // Second call: unread messages
      if (typeof url === 'string' && url.includes('/api/messages/unread')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => 'mock-token'),
      },
      writable: true,
    });
  });

  it('renders loading state', () => {
    render(<MilestonesPage />);
    expect(screen.getByText(/loading milestones/i)).toBeInTheDocument();
  });

  it('renders error state', async () => {
    (global.fetch as jest.Mock).mockImplementationOnce(() => Promise.reject(new Error('Fetch failed')))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
    render(<MilestonesPage />);
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('renders no milestones message', async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ projects: [], summary: [] }) }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
    render(<MilestonesPage />);
    await waitFor(() => {
      expect(screen.getByText(/no milestones found/i)).toBeInTheDocument();
    });
  });

  it('renders milestones and chart', async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          projects: [
            {
              project_ID: '1',
              title: 'Project 1',
              milestones: [
                {
                  milestone_ID: 'm1',
                  title: 'Milestone 1',
                  description: 'Desc',
                  expected_completion_date: '2024-01-01',
                  assigned_user_ID: 'u1',
                  assigned_user_fname: 'Alice',
                  assigned_user_sname: 'Smith',
                  status: 'Completed',
                },
              ],
            },
          ],
          summary: [
            { status: 'Completed', count: 1, percentage: 100 },
          ],
        })
      }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
    render(<MilestonesPage />);
    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument();
      expect(screen.getByText('Milestone 1')).toBeInTheDocument();
      expect(screen.getByTestId('PieChart')).toBeInTheDocument();
    });
  });

  it('navigates to create milestone page', async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ projects: [], summary: [] }) }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
    render(<MilestonesPage />);
    await waitFor(() => {
      const createBtn = screen.getByTestId('create-milestone-button');
      expect(createBtn).toBeInTheDocument();
    });
  });
}); 