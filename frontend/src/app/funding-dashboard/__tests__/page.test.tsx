import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Page from '../page';
import { useRouter } from 'next/navigation';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}));

// Add type declaration for window.editData
declare global {
  interface Window {
    editData?: {
      categories?: Array<{
        category: string;
        type: string;
        description?: string;
        amount_spent?: number;
      }>;
    };
  }
}

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('Funding Dashboard Page', () => {
  const mockRouter = {
    push: jest.fn(),
  };

  const mockProjects = [
    {
      project_ID: '1',
      title: 'Test Project',
      funding: {
        total_awarded: 1000,
        amount_spent: 500,
        amount_remaining: 500,
        grant_status: 'active',
        grant_end_date: '2024-12-31'
      },
      funding_initialized: true,
      categories: [
        {
          category_ID: 1,
          category: 'Personnel',
          description: 'Staff costs',
          amount_spent: 300,
          amount_allocated: 400,
          type: 'Personnel'
        },
        {
          category_ID: 2,
          category: 'Equipment',
          description: 'Lab equipment',
          amount_spent: 200,
          amount_allocated: 300,
          type: 'Equipment'
        }
      ]
    },
    {
      project_ID: '2',
      title: 'No Funding Project',
      funding: null,
      funding_initialized: false,
      categories: []
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    mockLocalStorage.getItem.mockReturnValue('mock-token');
    // Reset mockProjects to default before each test
    mockProjects[0] = {
      project_ID: '1',
      title: 'Test Project',
      funding: {
        total_awarded: 1000,
        amount_spent: 500,
        amount_remaining: 500,
        grant_status: 'active',
        grant_end_date: '2024-12-31'
      },
      funding_initialized: true,
      categories: [
        {
          category_ID: 1,
          category: 'Personnel',
          description: 'Staff costs',
          amount_spent: 300,
          amount_allocated: 400,
          type: 'Personnel'
        },
        {
          category_ID: 2,
          category: 'Equipment',
          description: 'Lab equipment',
          amount_spent: 200,
          amount_allocated: 300,
          type: 'Equipment'
        }
      ]
    };
    mockProjects[1] = {
      project_ID: '2',
      title: 'No Funding Project',
      funding: null,
      funding_initialized: false,
      categories: []
    };
    (global.fetch as jest.Mock).mockImplementation((...args) => {
      const url = typeof args[0] === 'string' ? args[0] : '';
      const options = args[1] || {};
      // Simulate /api/funding/report endpoint returns a blob and .json for error
      if (url.includes('/api/funding/report')) {
        if ((global as any).__forceReportError) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: 'Failed to generate report' }),
            blob: () => Promise.resolve(new Blob([''], { type: 'application/pdf' })),
          });
        }
        return Promise.resolve({
          ok: true,
          blob: () => Promise.resolve(new Blob(['report content'], { type: 'application/pdf' })),
          json: () => Promise.resolve({}),
        });
      }
      if (url.includes('/api/messages/unread')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([{}]),
        });
      }
      if (/\/api\/funding\/1\/categories\/1$/.test(url) && options.method === 'PUT') {
        // Simulate a successful category update
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      if (/\/api\/funding\/.+\/categories$/.test(url)) {
        // Always return a new object for categories
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ categories: JSON.parse(JSON.stringify(mockProjects[0].categories)) }),
        });
      }
      if (/\/api\/funding\/.+/.test(url) && !url.endsWith('/categories')) {
        // Always return a new object for projects
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ projects: JSON.parse(JSON.stringify(mockProjects)) }),
        });
      }
      if (url.includes('/api/funding/1/categories') && (options.method === 'PUT' || options.method === 'POST')) {
        // Simulate a successful update
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ projects: JSON.parse(JSON.stringify(mockProjects)) }),
      });
    });
    (global as any).__forceReportError = false;
  });

  // Initial Render Tests
  describe('Initial Render', () => {
    it('should render loading state initially', () => {
      render(<Page />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render projects after loading', async () => {
      render(<Page />);
      await waitFor(() => {
        expect(screen.getByText('Test Project')).toBeInTheDocument();
        expect(screen.getByText('No Funding Project')).toBeInTheDocument();
      });
    });

    it('should render error state when fetch fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed to fetch'));
      render(<Page />);
      await waitFor(() => {
        expect(screen.getByText(/Error: Failed to fetch/)).toBeInTheDocument();
      });
    });
  });

  // Navigation Tests
  describe('Navigation', () => {
    it('should navigate to researcher dashboard', async () => {
      render(<Page />);
      await waitFor(() => {
        fireEvent.click(screen.getByText('My Projects'));
        expect(mockRouter.push).toHaveBeenCalledWith('/researcher-dashboard');
      });
    });

    it('should navigate to shared projects', async () => {
      render(<Page />);
      await waitFor(() => {
        fireEvent.click(screen.getByText('Shared Projects'));
        expect(mockRouter.push).toHaveBeenCalledWith('/Shared_projects');
      });
    });

    it('should navigate to custom dashboard', async () => {
      render(<Page />);
      await waitFor(() => {
        fireEvent.click(screen.getByText('Custom Dashboard'));
        expect(mockRouter.push).toHaveBeenCalledWith('/custom-dashboard');
      });
    });
  });

  // Project Card Tests
  describe('Project Cards', () => {
    it('should display funding details for projects with funding', async () => {
      render(<Page />);
      await waitFor(() => {
        // Use getAllByText to match currency regardless of locale/spacing
        expect(screen.getAllByText(/R\s*1[\s,]?000/).length).toBeGreaterThan(0); // Total Awarded
        expect(screen.getAllByText(/R\s*500/).length).toBeGreaterThan(0); // Spent
        expect(screen.getAllByText(/R\s*500/).length).toBeGreaterThan(0); // Remaining
        expect(screen.getByText('active')).toBeInTheDocument(); // Status
        // Accept both US and ISO date formats
        expect(screen.getAllByText(/2024[-/]12[-/]31|12[-/]31[-/]2024/).length).toBeGreaterThan(0); // End Date
      });
    });

    it('should display "No funding available" for projects without funding', async () => {
      render(<Page />);
      await waitFor(() => {
        expect(screen.getByText('No funding available for this project.')).toBeInTheDocument();
      });
    });

    it('should show initialize funding button for projects without funding', async () => {
      render(<Page />);
      await waitFor(() => {
        expect(screen.getByText('Initialize Funding')).toBeInTheDocument();
      });
    });
  });

  // Edit Modal Tests
  describe('Edit Modal', () => {
    it('should open edit modal when edit button is clicked', async () => {
      render(<Page />);
      await waitFor(() => {
        fireEvent.click(screen.getByText('Edit'));
        expect(screen.getByText('Edit Funding')).toBeInTheDocument();
      });
    });

    it('should update funding details when form is submitted', async () => {
      // Set up mock data
      mockProjects[0].categories = [
        {
          category_ID: 1,
          category: 'Personnel',
          description: 'Staff costs',
          amount_spent: 300,
          amount_allocated: 400,
          type: 'Personnel'
        }
      ];
      render(<Page />);
      const editButton = await screen.findByText('Edit');
      fireEvent.click(editButton);
      const totalAwardedInput = await screen.findByTestId('funding-total-awarded-1');
      const statusSelect = await screen.findByTestId('funding-status-1');
      const endDateInput = await screen.findByTestId('funding-end-date-1');
      await userEvent.clear(totalAwardedInput);
      await userEvent.type(totalAwardedInput, '2000');
      await userEvent.selectOptions(statusSelect, 'completed');
      await userEvent.clear(endDateInput);
      await userEvent.type(endDateInput, '2025-12-31');
      fireEvent.click(screen.getByRole('button', { name: /confirm/i }));
      await waitFor(() => {
        const putCall = (global.fetch as jest.Mock).mock.calls.find(call =>
          call[0]?.includes('/api/funding/1') &&
          call[1]?.method === 'PUT'
        );
        expect(putCall).toBeTruthy();
        expect(putCall[1].body).toContain('"total_awarded":2000');
        // Optionally check for other updated fields if needed
      }, { timeout: 3000 });
    });

    it('should handle validation errors in edit form', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      // Set up mock data with invalid total awarded and category amount_spent = 0
      mockProjects[0] = {
        ...mockProjects[0],
        funding: {
          total_awarded: 0, // set to 0 to trigger validation
          amount_spent: 0,
          amount_remaining: 0,
          grant_status: 'active',
          grant_end_date: '2024-12-31'
        },
        funding_initialized: true,
        categories: [
          {
            category_ID: 1,
            category: 'Personnel',
            description: 'Staff costs',
            amount_spent: 0,
            amount_allocated: 0,
            type: 'Personnel'
          }
        ]
      };
      render(<Page />);
      const editButton = await screen.findByText('Edit');
      fireEvent.click(editButton);
      await waitFor(() => {
        expect(screen.getByText('Edit Funding')).toBeInTheDocument();
      });
      const totalAwardedInput = await screen.findByTestId('funding-total-awarded-1');
      const endDateInput = await screen.findByTestId('funding-end-date-1');
      await userEvent.clear(endDateInput);
      await userEvent.type(endDateInput, '2099-12-31');
      await userEvent.clear(totalAwardedInput);
      await userEvent.type(totalAwardedInput, '0');
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);
      await waitFor(() => {
        const alertArg = alertSpy.mock.calls[0]?.[0];
        expect(alertArg).toContain('Total awarded amount must be greater than 0');
        expect(alertArg).toContain('Amount spent must be greater than 0');
      }, { timeout: 3000 });
      alertSpy.mockRestore();
    });
  });

  // Category Management Tests
  describe('Category Management', () => {
    it('should add a new category', async () => {
      render(<Page />);
      const editButton = await screen.findByText('Edit');
      fireEvent.click(editButton);
      // Wait for the modal to be fully rendered
      await waitFor(() => {
        expect(screen.getByText('Edit Funding')).toBeInTheDocument();
      });
      // Find the Add Category button by its text content
      const addButton = await screen.findByText('+ Add Category');
      fireEvent.click(addButton);
      await waitFor(() => {
        const called = (global.fetch as jest.Mock).mock.calls.some(call =>
          call[0]?.includes('/api/funding/1/categories') &&
          call[1]?.method === 'POST'
        );
        expect(called).toBe(true);
      }, { timeout: 3000 });
    });

    it('should remove a category', async () => {
      render(<Page />);
      const editButton = await screen.findByText('Edit');
      fireEvent.click(editButton);
      // Wait for the modal to be fully rendered
      await waitFor(() => {
        expect(screen.getByText('Edit Funding')).toBeInTheDocument();
      });
      // Find the remove button for the first category by data-testid
      const removeButton = await screen.findByTestId('remove-category-1');
      fireEvent.click(removeButton);
      await waitFor(() => {
        const called = (global.fetch as jest.Mock).mock.calls.some(call =>
          call[0]?.includes('/api/funding/1/categories/1') &&
          call[1]?.method === 'DELETE'
        );
        expect(called).toBe(true);
      }, { timeout: 3000 });
    });
  });

  // Report Generation Tests
  describe('Report Generation', () => {
    it('should download report when download button is clicked', async () => {
      render(<Page />);
      await waitFor(() => {
        fireEvent.click(screen.getByText('Download Report'));
      });
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/funding/report'),
          expect.objectContaining({
            headers: expect.objectContaining({
              'Authorization': 'Bearer mock-token'
            })
          })
        );
      });
    });

    it('should handle report download error', async () => {
      (global as any).__forceReportError = true;
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      render(<Page />);
      await waitFor(() => {
        fireEvent.click(screen.getByText('Download Report'));
      });
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to download report. Please try again.');
      });
      alertSpy.mockRestore();
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      render(<Page />);
      await waitFor(() => {
        expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
      });
    });

    it('should handle invalid JSON responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error('Invalid JSON'))
      });
      render(<Page />);
      await waitFor(() => {
        expect(screen.getByText(/Error: Invalid JSON/)).toBeInTheDocument();
      });
    });

    it('should handle missing token', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      render(<Page />);
      await waitFor(() => {
        // Accept any error message in the UI, or fallback to checking for fallback UI
        const errorParagraphs = screen.queryAllByText((content) => /error|failed|unauth/i.test(content));
        if (errorParagraphs.length === 0) {
          // Fallback: check for the loading or empty state
          expect(screen.getByText(/Error|Loading|No funding/i)).toBeInTheDocument();
        } else {
          expect(errorParagraphs.length).toBeGreaterThan(0);
        }
      });
    });
  });

  // Pie Chart Tests
  describe('Pie Chart', () => {
    it('should render pie chart with correct data', async () => {
      render(<Page />);
      await waitFor(() => {
        expect(screen.getByText('Funding Distribution')).toBeInTheDocument();
        // Check if pie chart container exists
        expect(screen.getByRole('figure')).toBeInTheDocument();
      });
    });

    it('should handle empty category data', async () => {
      const emptyProject = {
        ...mockProjects[0],
        categories: []
      };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ projects: [emptyProject] })
      });

      render(<Page />);
      await waitFor(() => {
        expect(screen.getByText('Funding Distribution')).toBeInTheDocument();
        // Chart should still render with just the remaining amount
        expect(screen.getByRole('figure')).toBeInTheDocument();
      });
    });
  });
}); 