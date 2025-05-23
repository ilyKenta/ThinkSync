import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MilestonesPage from '../page';
import '@testing-library/jest-dom';
import { useRouter } from 'next/navigation';

// Mock next/navigation
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
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
  const mockMilestonesData = {
    projects: [
      {
        project_ID: '1',
        title: 'Project 1',
        milestones: [
          {
            milestone_ID: 'm1',
            title: 'Milestone 1',
            description: 'Description 1',
            expected_completion_date: '2024-01-01',
            assigned_user_ID: 'u1',
            assigned_user_fname: 'Alice',
            assigned_user_sname: 'Smith',
            status: 'Completed',
          },
          {
            milestone_ID: 'm2',
            title: 'Milestone 2',
            description: 'Description 2',
            expected_completion_date: '2024-02-01',
            assigned_user_ID: 'u2',
            assigned_user_fname: 'Bob',
            assigned_user_sname: 'Jones',
            status: 'In Progress',
          },
        ],
      },
      {
        project_ID: '2',
        title: 'Project 2',
        milestones: [
          {
            milestone_ID: 'm3',
            title: 'Milestone 3',
            description: 'Description 3',
            expected_completion_date: '2024-03-01',
            assigned_user_ID: 'u3',
            status: 'Not Started',
          },
        ],
      },
    ],
    summary: [
      { status: 'Completed', count: 1, percentage: 33 },
      { status: 'In Progress', count: 1, percentage: 33 },
      { status: 'Not Started', count: 1, percentage: 34 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockReset();
    // Mock fetch
    global.fetch = jest.fn((url) => {
      if (typeof url === 'string' && url.includes('/api/milestones')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMilestonesData)
        } as any);
      }
      if (typeof url === 'string' && url.includes('/api/messages/unread')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{ id: 1 }, { id: 2 }])
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

  it('renders no milestones message when no projects exist', async () => {
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ projects: [], summary: [] }) }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
    render(<MilestonesPage />);
    await waitFor(() => {
      expect(screen.getByText(/no milestones found/i)).toBeInTheDocument();
    });
  });

  it('renders milestones grouped by project', async () => {
    render(<MilestonesPage />);
    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument();
      expect(screen.getByText('Project 2')).toBeInTheDocument();
      expect(screen.getByText('Milestone 1')).toBeInTheDocument();
      expect(screen.getByText('Milestone 2')).toBeInTheDocument();
      expect(screen.getByText('Milestone 3')).toBeInTheDocument();
    });
  });

  it('displays milestone details correctly', async () => {
    render(<MilestonesPage />);
    await waitFor(() => {
      expect(screen.getByText('Description 1')).toBeInTheDocument();
      expect(screen.getByText('Description 2')).toBeInTheDocument();
      expect(screen.getByText('Description 3')).toBeInTheDocument();
      expect(screen.getByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Jones')).toBeInTheDocument();
      expect(screen.getByText('Not Assigned')).toBeInTheDocument();
    });
  });

  it('displays milestone status with correct styling', async () => {
    render(<MilestonesPage />);
    await waitFor(() => {
      const completedStatus = screen.getByText('Completed');
      const inProgressStatus = screen.getByText('In Progress');
      const notStartedStatus = screen.getByText('Not Started');
      
      expect(completedStatus).toHaveClass('completed');
      expect(inProgressStatus).toHaveClass('inProgress');
      expect(notStartedStatus).toHaveClass('notStarted');
    });
  });

  it('renders pie chart with correct data', async () => {
    render(<MilestonesPage />);
    await waitFor(() => {
      expect(screen.getByTestId('PieChart')).toBeInTheDocument();
      expect(screen.getByTestId('Pie')).toBeInTheDocument();
      expect(screen.getByTestId('Tooltip')).toBeInTheDocument();
      expect(screen.getByTestId('Legend')).toBeInTheDocument();
    });
  });

  it('displays unread message count', async () => {
    render(<MilestonesPage />);
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('handles download report functionality', async () => {
    const mockBlob = new Blob(['test'], { type: 'application/pdf' });
    (global.fetch as jest.Mock)
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve(mockMilestonesData) }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }))
      .mockImplementationOnce(() => Promise.resolve({ ok: true, blob: () => Promise.resolve(mockBlob) }));

    render(<MilestonesPage />);
    
    await waitFor(() => {
      const downloadButton = screen.getByText('Download Report');
      expect(downloadButton).toBeInTheDocument();
    });

    // Mock URL.createObjectURL and document.createElement
    const mockCreateObjectURL = jest.fn();
    const mockRevokeObjectURL = jest.fn();
    const mockAppendChild = jest.fn();
    const mockRemoveChild = jest.fn();
    
    window.URL.createObjectURL = mockCreateObjectURL;
    window.URL.revokeObjectURL = mockRevokeObjectURL;
    document.body.appendChild = mockAppendChild;
    document.body.removeChild = mockRemoveChild;
    
    // Mock click event
    const clickEvent = new MouseEvent('click');
    Object.defineProperty(clickEvent, 'click', { value: jest.fn() });
    
    fireEvent.click(screen.getByText('Download Report'));
    
    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled();
    });
  });
}); 