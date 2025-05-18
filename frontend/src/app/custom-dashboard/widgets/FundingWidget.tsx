'use client';

import { useState, useEffect } from 'react';
import styles from '../page.module.css';
import { WidgetProps } from './types';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { createPortal } from 'react-dom';

const CATEGORY_COLORS: Record<string, string> = {
    Personnel: "#0088FE",    // Blue
    Equipment: "#00C49F",    // Teal
    Consumables: "#FFBB28",  // Yellow
    Remaining: "#FF4C4C"     // Red
};

interface Category {
    category_ID: number;
    category: string;
    description?: string;
    amount_spent: number;
    amount_allocated: number;
    type: "Personnel" | "Equipment" | "Consumables";
}

interface Funding {
    funding_ID: number;
    total_awarded: number;
    amount_spent: number;
    amount_remaining: number;
    grant_status: string;
    grant_end_date: string;
}

interface Project {
    project_ID: number;
    title: string;
    funding: Funding | null;
    funding_initialized: boolean;
    categories: Category[];
}

export const normalizeCategory = (category: string): string => {
    const normalized = category.toLowerCase();
    if (normalized.includes('personnel')) return 'Personnel';
    if (normalized.includes('equipment')) return 'Equipment';
    if (normalized.includes('consumable')) return 'Consumables';
    return category;
};

export default function FundingWidget({ onDelete }: WidgetProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showEditForm, setShowEditForm] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [editData, setEditData] = useState<Project | null>(null);

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const token = localStorage.getItem('jwt');
            const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch projects: ${response.status}`);
            }
            const data = await response.json();
            setProjects(data.projects || []);
        } catch (error) {
            console.error('Error in fetchProjects:', error);
            setError('Failed to load projects. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNextProject = () => {
        setCurrentProjectIndex((prev) => (prev + 1) % projects.length);
    };

    const handlePrevProject = () => {
        setCurrentProjectIndex((prev) => (prev - 1 + projects.length) % projects.length);
    };

    const handleEdit = async () => {
        const selected = projects[currentProjectIndex];
        if (!selected) return;

        try {
            const token = localStorage.getItem('jwt');
            
            if (selected.funding_initialized) {
                // If funding is already initialized, fetch categories
                const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding/${selected.project_ID}/categories`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch project details');
                }
                const data = await response.json();
                setEditData({
                    ...selected,
                    categories: data.categories,
                    funding: {
                        ...selected.funding!,
                        grant_end_date: selected.funding?.grant_end_date ? new Date(selected.funding.grant_end_date).toISOString().split('T')[0] : ''
                    }
                });
            } else {
                // If funding is not initialized, create new funding data structure
                setEditData({
                    ...selected,
                    funding: {
                        funding_ID: 0,
                        total_awarded: 0,
                        amount_spent: 0,
                        amount_remaining: 0,
                        grant_status: 'active',
                        grant_end_date: new Date().toISOString().split('T')[0]
                    },
                    categories: [],
                    funding_initialized: false
                });
            }
            setShowEditForm(true);
        } catch (err) {
            console.error('Error in handleEdit:', err);
            setError(err instanceof Error ? err.message : 'An error occurred');
        }
    };

    const handleConfirmEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editData) return;

        setSubmitting(true);
        setEditError(null);

        try {
            const token = localStorage.getItem('jwt');
            const project = projects[currentProjectIndex];

            if (!editData.funding_initialized) {
                // Initialize funding
                const initResponse = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding/${project.project_ID}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        total_awarded: editData.funding?.total_awarded || 0,
                        grant_status: editData.funding?.grant_status || 'active',
                        grant_end_date: editData.funding?.grant_end_date
                    })
                });

                if (!initResponse.ok) {
                    throw new Error('Failed to initialize funding');
                }
            } else {
                // Update existing funding
                const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding/${project.project_ID}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        total_awarded: editData.funding?.total_awarded || 0,
                        grant_status: editData.funding?.grant_status || 'active',
                        grant_end_date: editData.funding?.grant_end_date
                    })
                });

                if (!updateResponse.ok) {
                    throw new Error('Failed to update funding');
                }
            }

            // Update categories
            for (const category of editData.categories) {
                if (category.category_ID) {
                    // Update existing category
                    const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding/${project.project_ID}/categories/${category.category_ID}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            category: category.category,
                            description: category.description || '',
                            amount_spent: category.amount_spent
                        })
                    });
                    if (!response.ok) {
                        throw new Error('Failed to update category');
                    }
                } else {
                    // Add new category
                    const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding/${project.project_ID}/categories`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            category: category.category,
                            description: category.description || '',
                            amount_spent: category.amount_spent
                        })
                    });
                    if (!response.ok) {
                        throw new Error('Failed to add category');
                    }
                }
            }

            await fetchProjects();
            setShowEditForm(false);
            setEditData(null);
        } catch (err) {
            console.error('Error in handleConfirmEdit:', err);
            setEditError(err instanceof Error ? err.message : 'Failed to update funding');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!projects[currentProjectIndex]) return;

        try {
            const token = localStorage.getItem('jwt');
            const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding/${projects[currentProjectIndex].project_ID}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete funding');
            }

            await fetchProjects();
            setShowDeleteConfirm(false);
        } catch (err) {
            console.error('Error in handleDelete:', err);
            setError(err instanceof Error ? err.message : 'Failed to delete funding');
        }
    };

    const handleAddCategory = () => {
        if (!editData) return;
        setEditData({
            ...editData,
            categories: [
                ...editData.categories,
                {
                    category_ID: 0,
                    category: 'Personnel',
                    description: '',
                    amount_spent: 0,
                    amount_allocated: 0,
                    type: 'Personnel'
                }
            ]
        });
    };

    const handleDeleteCategory = async (categoryId: number) => {
        if (!editData) return;

        try {
            const token = localStorage.getItem('jwt');
            const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding/${editData.project_ID}/categories/${categoryId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to delete category');
            }

            setEditData({
                ...editData,
                categories: editData.categories.filter(cat => cat.category_ID !== categoryId)
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to delete category');
            console.error('Error deleting category:', err);
        }
    };

    // Download report handler
    const handleDownloadReport = async () => {
        try {
            const token = localStorage.getItem('jwt');
            const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding/report`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`Failed to generate report: ${response.status} ${errorData}`);
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'funding-report.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Error in handleDownloadReport:', err);
            alert('Failed to download report. Please try again.');
        }
    };

    if (isLoading) {
        return (
            <article className={styles.widgetContainer}>
                <header className={styles.widgetHeader}>
                    <h2 className={styles.widgetTitle}>Funding</h2>
                    <button className={styles.deleteButton} onClick={onDelete} aria-label="Delete widget">×</button>
                </header>
                <p className={styles.loading}>Loading funding data...</p>
            </article>
        );
    }

    if (error) {
        return (
            <article className={styles.widgetContainer}>
                <header className={styles.widgetHeader}>
                    <h2 className={styles.widgetTitle}>Funding</h2>
                    <button className={styles.deleteButton} onClick={onDelete} aria-label="Delete widget">×</button>
                </header>
                <p className={styles.error}>{error}</p>
            </article>
        );
    }

    if (projects.length === 0) {
        return (
            <article className={styles.widgetContainer}>
                <header className={styles.widgetHeader}>
                    <h2 className={styles.widgetTitle}>Funding</h2>
                    <button className={styles.deleteButton} onClick={onDelete} aria-label="Delete widget">×</button>
                </header>
                <p>No projects found with funding data.</p>
            </article>
        );
    }

    const currentProject = projects[currentProjectIndex];

    // Prepare data for pie chart
    const categoryTotals: Record<string, number> = {};
    currentProject.categories.forEach(cat => {
        if (!categoryTotals[cat.category]) categoryTotals[cat.category] = 0;
        categoryTotals[cat.category] += cat.amount_spent;
    });

    const pieData = [
        ...Object.entries(categoryTotals)
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({
                name: normalizeCategory(name),
                value,
                normalizedName: normalizeCategory(name)
            })),
        {
            name: "Remaining",
            value: currentProject.funding?.amount_remaining || 0,
            normalizedName: "Remaining"
        }
    ];

    return (
        <article className={styles.widgetContainer}>
            <header className={styles.widgetHeader}>
                <h2 className={styles.widgetTitle}>Funding</h2>
                <button className={styles.deleteButton} onClick={onDelete} aria-label="Delete widget">×</button>
            </header>
            <button
                className={styles.createBtn}
                style={{ 
                    backgroundColor: '#4a90e2', 
                    display: 'flex', 
                    alignItems: 'center', 
                    marginBottom: 16,
                    padding: '8px 18px',
                    borderRadius: '12px',
                    fontSize: '1.1em'
                }}
                onClick={handleDownloadReport}
            >
                <strong style={{ marginRight: 8, fontStyle: 'normal' }}>📊</strong>
                Download Report
            </button>

            <section className={styles.projectInfo}>
                <h3 data-testid="project-title">{currentProject.title}</h3>
            </section>

            {currentProject.funding ? (
                <>
                    <section className={styles.fundingSummary}>
                        <dl>
                            <dt>Total Awarded:</dt>
                            <dd>R{currentProject.funding.total_awarded.toLocaleString()}</dd>
                            
                            <dt>Spent:</dt>
                            <dd>R{currentProject.funding.amount_spent.toLocaleString()}</dd>
                            
                            <dt>Remaining:</dt>
                            <dd>R{currentProject.funding.amount_remaining.toLocaleString()}</dd>
                            
                            <dt>Status:</dt>
                            <dd><em className={styles[`status${currentProject.funding.grant_status}`]}>{currentProject.funding.grant_status}</em></dd>
                            
                            <dt>Grant Ends:</dt>
                            <dd data-testid="grant-end-date">{currentProject.funding.grant_end_date ? new Date(currentProject.funding.grant_end_date).toLocaleDateString() : 'N/A'}</dd>
                        </dl>
                    </section>

                    <figure className={styles.pieChartContainer}>
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <Pie
                                    data={pieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={70}
                                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={CATEGORY_COLORS[entry.name]} 
                                        />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => [`R${value.toLocaleString()}`, 'Amount']} />
                            </PieChart>
                        </ResponsiveContainer>
                    </figure>

                    <table className={styles.breakdownTable}>
                        <caption>Category Breakdown</caption>
                        <thead>
                            <tr>
                                <th scope="col">Description</th>
                                <th scope="col">Category</th>
                                <th scope="col">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentProject.categories.map((cat) => (
                                <tr key={cat.category_ID}>
                                    <td>{cat.description || 'No description'}</td>
                                    <td>{cat.category}</td>
                                    <td>R{cat.amount_spent.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            ) : (
                <p>No funding data available for this project.</p>
            )}

            <nav className={styles.navigationButtons} aria-label="Project navigation">
                <button onClick={handlePrevProject} disabled={currentProjectIndex === 0}>Previous Project</button>
                <p>{currentProjectIndex + 1} of {projects.length}</p>
                <button onClick={handleNextProject} disabled={currentProjectIndex === projects.length - 1}>Next Project</button>
            </nav>

            <section className={styles.actionButtons}>
                <button className={styles.editButton} onClick={handleEdit} data-testid="edit-funding-button">
                    <Edit2 size={16} />
                    {currentProject.funding ? 'Edit Funding' : 'Initialize Funding'}
                </button>
                {currentProject.funding && (
                    <button className={styles.deleteButton} onClick={() => setShowDeleteConfirm(true)}>
                        <Trash2 size={16} />
                        Delete Funding
                    </button>
                )}
            </section>

            {showEditForm && editData && (
                createPortal(
                    <aside className={styles.overlay}>
                        <article className={styles.modal}>
                            <section className={styles.centerForm}>
                                <form className={styles.cardForm} onSubmit={handleConfirmEdit} data-testid="funding-form">
                                    <h2 className={styles.formTitle} data-testid="form-title">
                                        {editData.funding_initialized ? 'Edit Funding' : 'Initialize Funding'}
                                    </h2>

                                    {editError && (
                                        <aside className={styles.errorMessage}>
                                            {editError}
                                        </aside>
                                    )}

                                    <label className={styles.label} htmlFor="total-awarded">Total Awarded</label>
                                    <input
                                        id="total-awarded"
                                        type="number"
                                        className={styles.input}
                                        value={editData.funding?.total_awarded || 0}
                                        onChange={(e) => setEditData({
                                            ...editData,
                                            funding: {
                                                ...editData.funding!,
                                                total_awarded: parseFloat(e.target.value) || 0
                                            }
                                        })}
                                        required
                                    />

                                    <label className={styles.label}>Grant Status</label>
                                    <select
                                        className={styles.input}
                                        value={editData.funding?.grant_status || 'active'}
                                        onChange={(e) => setEditData({
                                            ...editData,
                                            funding: {
                                                ...editData.funding!,
                                                grant_status: e.target.value
                                            }
                                        })}
                                    >
                                        <option value="active">Active</option>
                                        <option value="completed">Completed</option>
                                        <option value="expired">Expired</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>

                                    <label className={styles.label}>Grant End Date</label>
                                    <input
                                        type="date"
                                        className={styles.input}
                                        value={editData.funding?.grant_end_date || ''}
                                        onChange={(e) => setEditData({
                                            ...editData,
                                            funding: {
                                                ...editData.funding!,
                                                grant_end_date: e.target.value
                                            }
                                        })}
                                    />

                                    {editData.funding_initialized && (
                                        <fieldset className={styles.formFieldset}>
                                            <legend className={styles.formLegend}>Funding Categories</legend>
                                            <table className={styles.breakdownTable}>
                                                <caption>Category Details</caption>
                                                <thead>
                                                    <tr>
                                                        <th scope="col">Description</th>
                                                        <th scope="col">Category</th>
                                                        <th scope="col">Amount Spent</th>
                                                        <th scope="col">Remove</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {(editData.categories || []).map((cat, idx) => (
                                                        <tr key={cat.category_ID || idx}>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    value={cat.description || ''}
                                                                    onChange={(e) => {
                                                                        const updated = [...editData.categories];
                                                                        updated[idx].description = e.target.value;
                                                                        setEditData({ ...editData, categories: updated });
                                                                    }}
                                                                    placeholder="Enter description"
                                                                />
                                                            </td>
                                                            <td>
                                                                <select
                                                                    value={cat.category}
                                                                    onChange={(e) => {
                                                                        const updated = [...editData.categories];
                                                                        updated[idx].category = e.target.value;
                                                                        updated[idx].type = e.target.value as Category["type"];
                                                                        setEditData({ ...editData, categories: updated });
                                                                    }}
                                                                >
                                                                    <option value="Personnel">Personnel</option>
                                                                    <option value="Equipment">Equipment</option>
                                                                    <option value="Consumables">Consumables</option>
                                                                </select>
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="number"
                                                                    value={cat.amount_spent}
                                                                    onChange={(e) => {
                                                                        const updated = [...editData.categories];
                                                                        updated[idx].amount_spent = parseFloat(e.target.value) || 0;
                                                                        setEditData({ ...editData, categories: updated });
                                                                    }}
                                                                />
                                                            </td>
                                                            <td>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDeleteCategory(cat.category_ID)}
                                                                    disabled={!cat.category_ID}
                                                                >
                                                                    ✕
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                            <button type="button" className={styles.addButton} onClick={handleAddCategory}>
                                                <Plus size={16} />
                                                Add Category
                                            </button>
                                        </fieldset>
                                    )}

                                    <section className={styles.buttonRow}>
                                        <button
                                            type="button"
                                            className={styles.cancelBtn}
                                            onClick={() => {
                                                setShowEditForm(false);
                                                setEditData(null);
                                            }}
                                            disabled={submitting}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className={styles.saveBtn}
                                            disabled={submitting}
                                        >
                                            {submitting ? "Saving..." : "Save Changes"}
                                        </button>
                                    </section>
                                </form>
                            </section>
                        </article>
                    </aside>,
                    document.body
                )
            )}

            {showDeleteConfirm && (
                <aside className={styles.overlay}>
                    <article className={styles.modal}>
                        <section className={styles.centerForm}>
                            <form
                                className={styles.cardForm}
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleDelete();
                                }}
                                data-testid="delete-form"
                            >
                                <h2 className={styles.formTitle} data-testid="delete-title">Delete Funding</h2>
                                <p style={{ marginBottom: '1.5rem', textAlign: 'center' }} data-testid="delete-confirmation">
                                    Are you sure you want to delete funding for <strong>{currentProject.title}</strong>? This action cannot be undone.
                                </p>

                                <nav className={styles.buttonRow}>
                                    <button
                                        type="button"
                                        className={styles.cancelBtn}
                                        onClick={() => setShowDeleteConfirm(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className={styles.saveBtn}
                                        style={{ backgroundColor: '#dc3545' }}
                                    >
                                        Delete Funding
                                    </button>
                                </nav>
                            </form>
                        </section>
                    </article>
                </aside>
            )}
        </article>
    );
} 