import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateMilestonePage from '../page';
import '@testing-library/jest-dom';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

describe('CreateMilestonePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn((url) => {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          projects: [
            { project_ID: '1', title: 'Project 1', collaborators: [{ user_ID: 'u1', fname: 'Alice', sname: 'Smith' }] },
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
    render(<CreateMilestonePage />);
    expect(screen.getByText(/loading projects/i)).toBeInTheDocument();
  });

  it('renders form after loading', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      json: () => Promise.resolve({
        projects: [
          { project_ID: '1', title: 'Project 1', collaborators: [{ user_ID: 'u1', fname: 'Alice', sname: 'Smith' }] },
        ],
      }),
      ok: true,
    });
    render(<CreateMilestonePage />);
    await waitFor(() => {
      expect(screen.getByText(/create new milestone/i)).toBeInTheDocument();
      expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument();
    });
  });

  it('shows error on fetch failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Fetch failed'));
    render(<CreateMilestonePage />);
    await waitFor(() => {
      expect(screen.getByText(/fetch failed/i)).toBeInTheDocument();
    });
  });
}); 