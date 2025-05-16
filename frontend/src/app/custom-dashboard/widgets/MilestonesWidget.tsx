'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';
import { WidgetProps, Milestone } from './types';
import { Calendar } from 'lucide-react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';

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
        </article>
    );
} 
