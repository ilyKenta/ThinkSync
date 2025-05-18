import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import FundingWidget from '../FundingWidget';

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
            expect(screen.getByText(/Test Project/)).toBeInTheDocument();
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
        expect(screen.getByText(/2024\/12\/31/)).toBeInTheDocument();
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
            expect(screen.getByRole('heading', { name: 'Test Project' })).toBeInTheDocument();
        });

        const nextButton = screen.getByRole('button', { name: /next project/i });
        fireEvent.click(nextButton);
        
        await waitFor(() => {
            expect(screen.getByRole('heading', { name: 'Second Project' })).toBeInTheDocument();
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
            expect(screen.getByText('Test Project')).toBeInTheDocument();
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
            expect(screen.getAllByText(/New Project/).length).toBeGreaterThan(0);
        });

        const initButton = screen.getByRole('button', { name: /initialize funding/i });
        fireEvent.click(initButton);
        
        await waitFor(() => {
            // There may be multiple, so pick the heading
            const headings = screen.getAllByText(/initialize funding/i);
            expect(headings.length).toBeGreaterThan(0);
            const label = screen.getAllByText(/total awarded/i)[0];
            let input = label.nextElementSibling;
            while (input && input.tagName !== 'INPUT') input = input.nextElementSibling;
            if (!input) throw new Error('Input for Total Awarded not found');
            expect(input!).toBeInTheDocument();
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
            expect(screen.getByText('Test Project')).toBeInTheDocument();
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
        // Mock initial projects fetch
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ projects: [mockProject] })
        });
        
        // Mock successful delete
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({ success: true })
        });
        
        render(<FundingWidget onDelete={mockOnDelete} />);
        
        await waitFor(() => {
            expect(screen.getByText('Test Project')).toBeInTheDocument();
        });

        // Find and click the initial delete button
        const deleteButton = screen.getByRole('button', { name: /delete funding/i });
        fireEvent.click(deleteButton);
        
        // Wait for confirmation modal
        await waitFor(() => {
            expect(screen.getByText(/are you sure you want to delete funding for/i)).toBeInTheDocument();
        });

        // Find and click the confirmation delete button in the modal
        const modals = screen.getAllByRole('article');
        const modal = modals[modals.length - 1];
        const confirmDeleteButton = modal.querySelector('button[type="submit"]');
        expect(confirmDeleteButton).toBeInTheDocument();
        fireEvent.click(confirmDeleteButton!);
        
        // Verify the delete API call
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
}); 