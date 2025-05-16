'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';
import { WidgetProps, Project } from './types';

export default function ProjectsWidget({ onDelete }: WidgetProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            console.log('Fetching projects...');
            const token = localStorage.getItem('jwt');

            const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/projects/owner`, {
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
            setProjects(data.projects || []);
            setError(null);
        } catch (error) {
            console.error('Error fetching projects:', error);
            setError('Failed to load projects. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % projects.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + projects.length) % projects.length);
    };

    

    if (isLoading) {
        return (
            <article className={styles.widgetContainer}>
                <header className={styles.widgetHeader}>
                    <h2 className={styles.widgetTitle}>My Projects</h2>
                    <button className={styles.deleteButton} onClick={onDelete} aria-label="Delete widget">×</button>
                </header>
                <p className={styles.loading}>Loading projects...</p>
            </article>
        );
    }

    if (error) {
        return (
            <article className={styles.widgetContainer}>
                <header className={styles.widgetHeader}>
                    <h2 className={styles.widgetTitle}>My Projects</h2>
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
                    <h2 className={styles.widgetTitle}>My Projects</h2>
                    <button className={styles.deleteButton} onClick={onDelete} aria-label="Delete widget">×</button>
                </header>
                <p>No projects found. Create a new project to get started.</p>
            </article>
        );
    }

    const currentProject = projects[currentIndex];

    return (
        <article className={styles.widgetContainer}>
            <header className={styles.widgetHeader}>
                <h2 className={styles.widgetTitle}>My Projects</h2>
                <button className={styles.deleteButton} onClick={onDelete} aria-label="Delete widget">×</button>
            </header>
            <section className={styles.projectCard}>
                <h3>{currentProject.title}</h3>
                {currentProject.description && <p>{currentProject.description}</p>}
                <footer className={styles.projectMeta}>
                    <section className={styles.projectDetails}>
                        <dl className={styles.detailList}>

                            <dt className={styles.detailLabel}>Created:</dt>
                            <dd className={styles.detailValue}>
                                {currentProject.created_at ? new Date(currentProject.created_at).toLocaleDateString() : 'Not Set'}
                            </dd>

                            <dt className={styles.detailLabel}>Collaborators:</dt>
                            <dd className={styles.detailValue}>
                                {currentProject.collaborators && currentProject.collaborators.length > 0 
                                    ? currentProject.collaborators.map(c => `${c.first_name} ${c.last_name}`).join(', ')
                                    : 'None'}
                            </dd>

                        </dl>

                        {currentProject.milestones && currentProject.milestones.length > 0 && (
                            <section className={styles.milestoneList}>
                                <h4 className={styles.milestoneListTitle}>Milestone Details</h4>
                                <ul className={styles.milestoneItems}>
                                    {currentProject.milestones.map((milestone) => (
                                        <li key={milestone.milestone_ID} className={styles.milestoneItem}>
                                            <strong className={styles.milestoneTitle}>{milestone.title}</strong>
                                            <mark className={`${styles.milestoneStatus} ${
                                                milestone.status === 'Completed' ? styles.completed :
                                                milestone.status === 'In Progress' ? styles.inProgress :
                                                styles.notStarted
                                            }`}>
                                                {milestone.status}
                                            </mark>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </section>
                </footer>
            </section>
            <nav className={styles.navigationButtons} aria-label="Project navigation">
                <button onClick={handlePrev} disabled={currentIndex === 0}>Previous</button>
                <p>{currentIndex + 1} of {projects.length}</p>
                <button onClick={handleNext} disabled={currentIndex === projects.length - 1}>Next</button>
            </nav>
        </article>
    );
} 