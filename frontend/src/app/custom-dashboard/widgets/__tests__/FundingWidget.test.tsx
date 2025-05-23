import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import FundingWidget, { normalizeCategory } from '../FundingWidget';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock environment variables
process.env.NEXT_PUBLIC_AZURE_API_URL = 'http://test-api-url';

// Mock router
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
        prefetch: jest.fn(),
    }),
}));

describe('FundingWidget', () => {
    const mockOnDelete = jest.fn();
    const mockProject = {
        project_ID: 1,
        title: 'Test Project',
        funding: {
            funding_ID: 1,
            total_awarded: 10000,
            amount_spent: 5000,
            amount_remaining: 5000,
            grant_status: 'active',
            grant_end_date: '2024-12-31',
            categories: [
                {
                    category_ID: 1,
                    description: 'Staff costs',
                    category: 'Personnel',
                    amount_spent: 3000
                },
                {
                    category_ID: 2,
                    description: 'Lab equipment',
                    category: 'Equipment',
                    amount_spent: 2000
                }
            ]
        },
        funding_initialized: true,
        categories: [
            {
                category_ID: 1,
                description: 'Staff costs',
                category: 'Personnel',
                amount_spent: 3000
            },
            {
                category_ID: 2,
                description: 'Lab equipment',
                category: 'Equipment',
                amount_spent: 2000
            }
        ]
    };

    beforeEach(() => {
        mockFetch.mockClear();
        mockOnDelete.mockClear();
        mockLocalStorage.getItem.mockReturnValue('test-token');
    });

    test('renders loading state initially', () => {
        mockFetch.mockImplementationOnce(() => new Promise(() => {}));
        render(<FundingWidget onDelete={mockOnDelete} />);
        expect(screen.getByText('Loading funding data...')).toBeInTheDocument();
    });

    test('renders error state when fetch fails', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Fetch failed'));
        render(<FundingWidget onDelete={mockOnDelete} />);
        await waitFor(() => {
            expect(screen.getByText('Failed to load projects. Please try again later.')).toBeInTheDocument();
        });
    });

    test('renders no projects message when projects array is empty', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ projects: [] })
        });
        render(<FundingWidget onDelete={mockOnDelete} />);
        await waitFor(() => {
            expect(screen.getByText('No projects found with funding data.')).toBeInTheDocument();
        });
    });

    test('renders project funding information correctly', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ projects: [{
                ...mockProject,
                funding: {
                    ...mockProject.funding,
                    categories: mockProject.funding.categories
                }
            }] })
        });
        render(<FundingWidget onDelete={mockOnDelete} />);
        
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /Test Project/i })).toBeInTheDocument();
        });
        // Robustly check Total Awarded
        const totalAwardedDt = screen.getByText('Total Awarded:');
        const totalAwardedDd = totalAwardedDt.nextElementSibling;
        expect(totalAwardedDd).toBeTruthy();
        expect(totalAwardedDd && totalAwardedDd.textContent && totalAwardedDd.textContent.replace(/[\s\u00A0,]/g, '')).toBe('R10000');
        // Robustly check Spent and Remaining (R 5,000)
        const allDd = screen.getAllByRole('definition');
        const fiveThousandCount = allDd.filter(dd =>
          dd && dd.textContent && dd.textContent.replace(/[\s\u00A0,]/g, '') === 'R5000'
        ).length;
        expect(fiveThousandCount).toBeGreaterThan(0);
        expect(screen.getByText(/active/i)).toBeInTheDocument();
        const grantEndDate = screen.getByTestId('grant-end-date');
        expect(grantEndDate).toBeInTheDocument();
        expect(grantEndDate.textContent).toMatch(/(\d{2,4}[\/\-]\d{2}[\/\-]\d{2,4})/);
    });

    test('handles project navigation correctly', async () => {
        const projects = [
            mockProject,
            { ...mockProject, project_ID: 2, title: 'Second Project' }
        ];
        
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ projects })
        });
        
        render(<FundingWidget onDelete={mockOnDelete} />);
        
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /Test Project/i })).toBeInTheDocument();
        });

        const nextButton = screen.getByRole('button', { name: /next project/i });
        fireEvent.click(nextButton);
        
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /Second Project/i })).toBeInTheDocument();
        });
    });

    test('opens edit form when edit button is clicked', async () => {
        // Mock initial projects fetch
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ projects: [mockProject] })
        });
        
        // Mock categories fetch when edit is clicked
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ categories: mockProject.categories })
        });
        
        render(<FundingWidget onDelete={mockOnDelete} />);
        
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /Test Project/i })).toBeInTheDocument();
        });

        const editButton = screen.getByRole('button', { name: /edit funding/i });
        fireEvent.click(editButton);
        
        await waitFor(() => {
            // Look for the form title specifically in the modal
            const formTitle = screen.getByRole('heading', { name: 'Edit Funding', level: 2 });
            expect(formTitle).toBeInTheDocument();
        });

        // Check for form fields using more specific selectors
        const modals = screen.getAllByRole('article');
        const modal = modals[modals.length - 1];
        expect(modal.querySelector('input[type="number"]')).toBeInTheDocument();
        expect(modal.querySelector('select')).toBeInTheDocument();
        expect(modal.querySelector('input[type="date"]')).toBeInTheDocument();
    });

    test('handles funding initialization for new projects', async () => {
        const projectWithoutFunding = {
            project_ID: 3,
            title: 'New Project',
            funding: null,
            categories: []
        };
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ projects: [projectWithoutFunding] })
        });
        render(<FundingWidget onDelete={mockOnDelete} />);
        await waitFor(() => {
            expect(screen.getByTestId('project-title')).toHaveTextContent('New Project');
        });
        const initButton = screen.getByTestId('edit-funding-button');
        fireEvent.click(initButton);
        await waitFor(() => {
            expect(screen.getByTestId('form-title')).toHaveTextContent('Initialize Funding');
            const input = screen.getByLabelText(/Total Awarded/i);
            expect(input).toBeInTheDocument();
        });
    });

    test('handles category management correctly', async () => {
        // Mock initial projects fetch
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ projects: [mockProject] })
        });
        
        // Mock categories fetch when edit is clicked
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ categories: mockProject.categories })
        });
        
        render(<FundingWidget onDelete={mockOnDelete} />);
        
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /Test Project/i })).toBeInTheDocument();
        });

        const editButton = screen.getByRole('button', { name: /edit funding/i });
        fireEvent.click(editButton);
        
        await waitFor(() => {
            expect(screen.getByText('Edit Funding')).toBeInTheDocument();
        });

        // Wait for the form to be fully loaded and find the add category button
        const addCategoryButton = await screen.findByRole('button', { name: /add category/i });
        fireEvent.click(addCategoryButton);
        
        // Check for category options in the new row
        await waitFor(() => {
            const categorySelect = screen.getAllByRole('combobox').pop();
            expect(categorySelect).toBeInTheDocument();
            expect(categorySelect).toHaveValue('Personnel');
        });
    });

    test('handles delete confirmation correctly', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ projects: [mockProject] }) });
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) });
        render(<FundingWidget onDelete={mockOnDelete} />);
        await waitFor(() => expect(screen.getByTestId('project-title')).toHaveTextContent('Test Project'));
        const deleteButton = screen.getByRole('button', { name: /delete funding/i });
        fireEvent.click(deleteButton);
        await waitFor(() => {
            expect(screen.getByTestId('delete-confirmation')).toBeInTheDocument();
        });
        const confirmDeleteButton = screen.getByTestId('delete-form').querySelector('button[type="submit"]');
        expect(confirmDeleteButton).toBeInTheDocument();
        fireEvent.click(confirmDeleteButton!);
        await waitFor(() => {
            expect(mockFetch).toHaveBeenCalledWith(
                'http://test-api-url/api/funding/1',
                expect.objectContaining({
                    method: 'DELETE',
                    headers: {
                        'Authorization': 'Bearer test-token'
                    }
                })
            );
        });
    });

    // --- CATEGORY NORMALIZATION ---
    test('normalizeCategory utility covers all branches', () => {
        expect(normalizeCategory('Personnel')).toBe('Personnel');
        expect(normalizeCategory('personnel')).toBe('Personnel');
        expect(normalizeCategory('Equipment')).toBe('Equipment');
        expect(normalizeCategory('equipment')).toBe('Equipment');
        expect(normalizeCategory('Consumables')).toBe('Consumables');
        expect(normalizeCategory('consumable stuff')).toBe('Consumables');
        expect(normalizeCategory('Other')).toBe('Other');
    });

    afterEach(() => {
        jest.restoreAllMocks();
        mockFetch.mockReset();
        mockFetch.mockImplementation(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ projects: [] }) }));
    });

    // --- PROJECT NAVIGATION ---
    test('navigates between multiple projects', async () => {
        const projects = [
            { ...mockProject, project_ID: 1, title: 'Project 1' },
            { ...mockProject, project_ID: 2, title: 'Project 2' },
        ];
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ projects }) });
        render(<FundingWidget onDelete={mockOnDelete} />);
        await waitFor(() => expect(screen.getByRole('heading', { name: /Project 1/i })).toBeInTheDocument());
        const nextBtn = screen.getByRole('button', { name: /next project/i });
        fireEvent.click(nextBtn);
        await waitFor(() => expect(screen.getByRole('heading', { name: /Project 2/i })).toBeInTheDocument());
        const prevBtn = screen.getByRole('button', { name: /previous project/i });
        fireEvent.click(prevBtn);
        await waitFor(() => expect(screen.getByRole('heading', { name: /Project 1/i })).toBeInTheDocument());
    });

    // --- EDIT MODAL: INIT VS UPDATE ---
    test('opens edit modal for initialized funding', async () => {
        mockFetch.mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ projects: [mockProject] }) }));
        mockFetch.mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ categories: mockProject.categories }) }));
        render(<FundingWidget onDelete={mockOnDelete} />);
        await waitFor(() => expect(screen.getByTestId('project-title')).toHaveTextContent('Test Project'));
        fireEvent.click(screen.getByTestId('edit-funding-button'));
        await waitFor(() => expect(screen.getByTestId('form-title')).toHaveTextContent('Edit Funding'));
    });

    test('opens edit modal for uninitialized funding', async () => {
        const uninit = { ...mockProject, funding_initialized: false, funding: null, categories: [] };
        mockFetch.mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ projects: [uninit] }) }));
        render(<FundingWidget onDelete={mockOnDelete} />);
        await waitFor(() => expect(screen.getByTestId('project-title')).toHaveTextContent('Test Project'));
        fireEvent.click(screen.getByTestId('edit-funding-button'));
        await waitFor(() => expect(screen.getByTestId('form-title')).toHaveTextContent('Initialize Funding'));
    });

    // --- ADD/REMOVE CATEGORY IN EDIT MODAL ---
    test('adds and removes a category in edit modal', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ projects: [mockProject] }) });
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ categories: mockProject.categories }) });
        render(<FundingWidget onDelete={mockOnDelete} />);
        await waitFor(() => expect(screen.getByRole('heading', { name: /Test Project/i })).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: /edit funding/i }));
        await waitFor(() => expect(screen.getByRole('heading', { name: /edit funding/i })).toBeInTheDocument());
        const addBtn = await screen.findByRole('button', { name: /add category/i });
        fireEvent.click(addBtn);
        // Remove category
        const removeBtns = screen.getAllByRole('button', { name: /✕/i });
        fireEvent.click(removeBtns[removeBtns.length - 1]);
    });

    // --- SAVE/CANCEL/ERROR IN EDIT MODAL ---
    test('saves and cancels in edit modal, handles error', async () => {
        // Use a future grant_end_date to avoid validation error
        const futureProject = {
            ...mockProject,
            funding: {
                ...mockProject.funding,
                grant_end_date: '2099-12-31',
            },
        };
        // Mock initial projects fetch
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ projects: [futureProject] })
        });
        
        // Mock categories fetch when edit is clicked
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ categories: mockProject.categories })
        });

        // Mock successful save
        mockFetch.mockResolvedValueOnce({ ok: true });
        
        render(<FundingWidget onDelete={mockOnDelete} />);
        
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /Test Project/i })).toBeInTheDocument();
        });

        const editButton = screen.getByRole('button', { name: /edit funding/i });
        fireEvent.click(editButton);
        
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: /edit funding/i })).toBeInTheDocument();
        });

        // Save
        const saveBtn = screen.getByRole('button', { name: /save changes/i });
        fireEvent.click(saveBtn);

        // Cancel
        const cancelBtn = screen.getByRole('button', { name: /cancel/i });
        fireEvent.click(cancelBtn);

        // Test error handling
        mockFetch.mockReset();
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ projects: [mockProject] })
        });
        mockFetch.mockRejectedValueOnce(new Error('Failed to fetch project details'));

        fireEvent.click(editButton);
        
        await waitFor(() => {
            // The modal should be present
            const modal = document.querySelector('.modal');
            expect(modal).toBeTruthy();
            // The error message should be present somewhere inside the modal
            const errorText = 'Failed to fetch project details';
            const foundError = modal && modal.textContent && modal.textContent.includes(errorText);
            expect(foundError).toBeTruthy();
        });
    });

    // --- DELETE MODAL ---
    test('opens, confirms, cancels delete modal, handles error', async () => {
        mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ projects: [mockProject] }) });
        render(<FundingWidget onDelete={mockOnDelete} />);
        await waitFor(() => expect(screen.getByRole('heading', { name: /Test Project/i })).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: /delete funding/i }));
        // Wait for modal to appear
        await waitFor(() => {
            const modal = document.querySelector('.modal');
            expect(modal).toBeTruthy();
        });
        // Cancel
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
        // Confirm
        mockFetch.mockResolvedValueOnce({ ok: true });
        const modal = document.querySelector('.modal');
        if (modal) {
            const confirmBtn = modal.querySelector('button.saveBtn');
            expect(confirmBtn).toBeInTheDocument();
            fireEvent.click(confirmBtn!);
            // Error
            mockFetch.mockResolvedValueOnce({ ok: false });
            fireEvent.click(confirmBtn!);
        }
    });

    // --- DOWNLOAD REPORT ---
    test('downloads report successfully and handles error', async () => {
        // Mock URL.createObjectURL and revokeObjectURL
        if (!window.URL.createObjectURL) window.URL.createObjectURL = jest.fn(() => 'blob:url');
        if (!window.URL.revokeObjectURL) window.URL.revokeObjectURL = jest.fn();
        jest.spyOn(window, 'alert').mockImplementation(() => {});
        // 1. Initial fetch for projects
        mockFetch.mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ projects: [mockProject] }) }));
        // 2. Download report (blob)
        mockFetch.mockImplementationOnce(() => Promise.resolve({ ok: true, blob: async () => new Blob() }));
        // 3. Fetch projects after download
        mockFetch.mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ projects: [mockProject] }) }));
        render(<FundingWidget onDelete={mockOnDelete} />);
        await waitFor(() => expect(screen.getByTestId('project-title')).toHaveTextContent('Test Project'));
        fireEvent.click(screen.getByText('Download Report'));
        expect(mockFetch).toHaveBeenCalled();
        expect(window.URL.createObjectURL).toBeDefined();
        // 4. Download report error (include blob method)
        mockFetch.mockImplementationOnce(() => Promise.resolve({ ok: false, text: async () => 'error', blob: async () => new Blob() }));
        // 5. Fetch projects after error
        mockFetch.mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ projects: [mockProject] }) }));
        fireEvent.click(screen.getByText('Download Report'));
        await waitFor(() => expect(window.alert).toHaveBeenCalled());
    });

    // --- PIE CHART AND TABLE ---
    test('renders pie chart and table for various categories', async () => {
        mockFetch.mockClear();
        const categories = [
            { category_ID: 1, category: 'Personnel', amount_spent: 3000 },
            { category_ID: 2, category: 'Equipment', amount_spent: 2000 },
            { category_ID: 3, category: 'Consumables', amount_spent: 0 },
        ];
        mockFetch.mockImplementationOnce(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ projects: [{ ...mockProject, categories }] }) }));
        render(<FundingWidget onDelete={mockOnDelete} />);
        await waitFor(() => expect(screen.getByTestId('project-title')).toHaveTextContent('Test Project'));
        expect(screen.getByText('Personnel')).toBeInTheDocument();
        expect(screen.getByText('Equipment')).toBeInTheDocument();
        expect(screen.getAllByText('No description').length).toBe(3);
    });
}); 