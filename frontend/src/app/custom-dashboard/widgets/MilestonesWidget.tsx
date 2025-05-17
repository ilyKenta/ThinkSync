'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';
import { WidgetProps, Milestone } from './types';
import { Calendar, Plus } from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { createPortal } from 'react-dom';

interface Project {
    project_ID: number;
    title: string;
    owner_ID: string;
    collaborators: Array<{
        user_ID: string;
        first_name: string;
        last_name: string;
        is_owner: boolean;
    }>;
    milestones: Milestone[];
}

interface MilestoneSummary {
    status: string;
    count: number;
    percentage: number;
}

const STATUS_COLORS = {
    'Completed': '#4CAF50',
    'In Progress': '#2196F3',
    'Not Started': '#FF9800'
};

export default function MilestonesWidget({ onDelete }: WidgetProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentProjectIndex, setCurrentProjectIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<MilestoneSummary[]>([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);
    const [newMilestone, setNewMilestone] = useState({
        title: '',
        description: '',
        dueDate: '',
        status: 'Not Started',
        assigned_user_ID: ''
    });
    const router = useRouter();

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            console.log('Fetching projects...');
            const token = localStorage.getItem('jwt');

            const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/milestones/`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.status === 401) {
                setError('Session expired. Please log in again.');
                setIsLoading(false);
                return;
            }
            
            if (!response.ok) {
                throw new Error(`Failed to fetch projects: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Ensure projects have the correct structure
            const formattedProjects = data.projects.map((project: any) => ({
                ...project,
                milestones: project.milestones || [],
                collaborators: project.collaborators || []
            }));
            
            setProjects(formattedProjects);
            setSummary(data.summary || []);
            setError(null);
        } catch (error) {
            console.error('Error fetching projects:', error);
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

    const handleMilestoneClick = (milestoneId: number) => {
        router.push(`/milestones/${milestoneId}?from=custom-dashboard`);
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setCreateError(null);

        try {
            const token = localStorage.getItem('jwt');
            const currentProject = projects[currentProjectIndex];
            
            const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/milestones/${currentProject.project_ID}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title: newMilestone.title.trim(),
                    description: newMilestone.description.trim(),
                    expected_completion_date: newMilestone.dueDate,
                    assigned_user_ID: newMilestone.assigned_user_ID || null,
                    status: newMilestone.status
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create milestone');
            }

            // Reset form and refresh data
            setNewMilestone({
                title: '',
                description: '',
                dueDate: '',
                status: 'Not Started',
                assigned_user_ID: ''
            });
            setShowCreateForm(false);
            fetchProjects();
        } catch (err) {
            setCreateError(err instanceof Error ? err.message : "Failed to create milestone");
            console.error("Error creating milestone:", err);
        } finally {
            setSubmitting(false);
        }
    };

    // Download report handler
    const handleDownloadReport = async () => {
        try {
            const token = localStorage.getItem('jwt');
            const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/milestones/report/generate`, {
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
            link.download = 'milestones-report.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            alert('Failed to download report. Please try again.');
        }
    };

    if (isLoading) {
        return (
            <article className={styles.widgetContainer}>
                <header className={styles.widgetHeader}>
                    <h2 className={styles.widgetTitle}>Milestones</h2>
                    <button className={styles.deleteButton} onClick={onDelete} aria-label="Delete widget">×</button>
                </header>
                <p className={styles.loading}>Loading milestones...</p>
            </article>
        );
    }

    if (error) {
        return (
            <article className={styles.widgetContainer}>
                <header className={styles.widgetHeader}>
                    <h2 className={styles.widgetTitle}>Milestones</h2>
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
                    <h2 className={styles.widgetTitle}>Milestones</h2>
                    <button className={styles.deleteButton} onClick={onDelete} aria-label="Delete widget">×</button>
                </header>
                <p>No projects found. Create a project to get started.</p>
            </article>
        );
    }

    const currentProject = projects[currentProjectIndex];
    const milestones = currentProject?.milestones || [];

    return (
        <article className={styles.widgetContainer}>
            <header className={styles.widgetHeader}>
                <h2 className={styles.widgetTitle}>Milestones</h2>
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
            
            <section className={styles.milestoneSummary}>
                <h3>Milestone Progress Overview</h3>
                <figure className={styles.pieChartContainer}>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                            <Pie
                                data={summary}
                                dataKey="count"
                                nameKey="status"
                                cx="50%"
                                cy="50%"
                                outerRadius={70}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                labelLine={{ stroke: '#666', strokeWidth: 1 }}
                            >
                                {summary.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || '#CCCCCC'} 
                                    />
                                ))}
                            </Pie>
                            <Tooltip 
                                formatter={(value: number) => [`${value} milestones`, 'Count']}
                                contentStyle={{ 
                                    backgroundColor: 'white',
                                    border: '1px solid #ccc',
                                    borderRadius: '4px',
                                    padding: '8px'
                                }}
                            />
                            <Legend 
                                verticalAlign="bottom" 
                                height={36}
                                formatter={(value) => <em style={{ fontSize: '12px' }}>{value}</em>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </figure>
            </section>

            <section className={styles.projectInfo}>
                <h3>{currentProject.title}</h3>
                {currentProject.collaborators.length > 0 && (
                    <p className={styles.collaborators}>
                        Collaborators: {currentProject.collaborators.map(c => `${c.first_name} ${c.last_name}`).join(', ')}
                    </p>
                )}
            </section>

            {milestones.length > 0 ? (
                <section className={styles.milestoneList}>
                    <table className={styles.milestoneTable}>
                        <thead>
                            <tr>
                                <th scope="col">Title</th>
                                <th scope="col">Due Date</th>
                                <th scope="col">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {milestones.map((milestone) => (
                                <tr 
                                    key={milestone.milestone_ID}
                                    onClick={() => handleMilestoneClick(milestone.milestone_ID)}
                                    className={styles.milestoneRow}
                                >
                                    <td className={styles.milestoneTitle}>{milestone.title}</td>
                                    <td>
                                        <time className={styles.dueDate} dateTime={milestone.expected_completion_date}>
                                            <Calendar size={16} className={styles.calendarIcon} aria-hidden="true" />
                                            {new Date(milestone.expected_completion_date).toLocaleDateString()}
                                        </time>
                                    </td>
                                    <td>
                                        <mark className={`${styles.milestoneStatus} ${
                                            milestone.status === 'Completed' ? styles.completed :
                                            milestone.status === 'In Progress' ? styles.inProgress :
                                            styles.notStarted
                                        }`}>
                                            {milestone.status}
                                        </mark>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            ) : (
                <p className={styles.noMilestones}>No milestones found for this project.</p>
            )}

            <nav className={styles.navigationButtons} aria-label="Project navigation">
                <button onClick={handlePrevProject} disabled={currentProjectIndex === 0}>Previous Project</button>
                <p>{currentProjectIndex + 1} of {projects.length}</p>
                <button onClick={handleNextProject} disabled={currentProjectIndex === projects.length - 1}>Next Project</button>
            </nav>

            <section className={styles.actionButtons}>
                <button className={styles.createButton} onClick={() => setShowCreateForm(true)}>
                    <Plus size={16} />
                    New Milestone
                </button>
            </section>

            {showCreateForm && (
                createPortal(
                    <aside className={styles.overlay}>
                        <article className={styles.modal}>
                            <section className={styles.centerForm}>
                                <form className={styles.cardForm} onSubmit={handleCreateSubmit}>
                                    <h2 className={styles.formTitle}>Create New Milestone</h2>
                                    
                                    {createError && (
                                        <aside className={styles.errorMessage}>
                                            {createError}
                                        </aside>
                                    )}

                                    <label className={styles.label}>Title</label>
                                    <input
                                        type="text"
                                        className={styles.input}
                                        value={newMilestone.title}
                                        onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
                                        placeholder="Milestone title"
                                        required
                                    />

                                    <label className={styles.label}>Description</label>
                                    <textarea
                                        className={styles.textarea}
                                        value={newMilestone.description}
                                        onChange={(e) => setNewMilestone({ ...newMilestone, description: e.target.value })}
                                        placeholder="Describe this milestone"
                                        required
                                    />

                                    <label className={styles.label}>Due Date</label>
                                    <input
                                        type="date"
                                        className={styles.input}
                                        value={newMilestone.dueDate}
                                        onChange={(e) => setNewMilestone({ ...newMilestone, dueDate: e.target.value })}
                                        required
                                    />

                                    <label className={styles.label}>Status</label>
                                    <select
                                        className={styles.input}
                                        value={newMilestone.status}
                                        onChange={(e) => setNewMilestone({ ...newMilestone, status: e.target.value })}
                                        required
                                    >
                                        <option value="Not Started">Not Started</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Completed">Completed</option>
                                    </select>

                                    <label className={styles.label}>Assign To</label>
                                    <select
                                        className={styles.input}
                                        value={newMilestone.assigned_user_ID}
                                        onChange={(e) => setNewMilestone({ ...newMilestone, assigned_user_ID: e.target.value })}
                                    >
                                        <option value="">Not Assigned</option>
                                        {currentProject?.collaborators.map((collab) => (
                                            <option key={collab.user_ID} value={collab.user_ID}>
                                                {`${collab.first_name} ${collab.last_name}`}
                                            </option>
                                        ))}
                                    </select>

                                    <div className={styles.buttonRow}>
                                        <button
                                            type="button"
                                            className={styles.cancelBtn}
                                            onClick={() => setShowCreateForm(false)}
                                            disabled={submitting}
                                        >
                                            Cancel
                                        </button>
                                        <button 
                                            type="submit" 
                                            className={styles.saveBtn}
                                            disabled={submitting}
                                        >
                                            {submitting ? "Creating..." : "Create Milestone"}
                                        </button>
                                    </div>
                                </form>
                            </section>
                        </article>
                    </aside>,
                    document.body
                )
            )}
        </article>
    );
} 
