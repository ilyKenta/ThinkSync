'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';
import { WidgetProps, Project } from './types';
import CreateForm from '../../create-project/createForm';
import CreateReqForm from '../../create-req/createReqForm';
import EditProjectForm from '../../edit-project/editProjectForm';
import InviteCollaborators from '../../components/InviteCollaborators';
import { FaUserPlus } from 'react-icons/fa';

// ProjectsWidget component that displays and manages user's projects
export default function ProjectsWidget({ onDelete }: WidgetProps) {
    // State management for projects and UI
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [showReqForm, setShowReqForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);
    const [editProject, setEditProject] = useState<Project | null>(null);
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [inviteProject, setInviteProject] = useState<Project | null>(null);
    const [currentProjectData, setCurrentProjectData] = useState({
        projectName: '',
        projectDesc: '',
        goals: '',
        setResArea: '',
        setStart: '',
        setEnd: '',
        Funding: null as boolean | null
    });
    const router = useRouter();

    // Fetch projects on component mount
    useEffect(() => {
        fetchProjects();
    }, []);

    // Fetch projects from the API
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
            console.log('Projects data:', data);
            setProjects(data.projects || []);
            setError(null);
        } catch (error) {
            console.error('Error fetching projects:', error);
            setError('Failed to load projects. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    // Navigation handlers for project list
    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % projects.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + projects.length) % projects.length);
    };

    // Handle project creation
    const handleCreate = (
        projectName: string,
        projectDesc: string,
        goals: string,
        setResArea: string,
        setStart: string,
        setEnd: string,
        Funding: boolean | null
    ) => {
        setCurrentProjectData({
            projectName,
            projectDesc,
            goals,
            setResArea,
            setStart,
            setEnd,
            Funding
        });
        setShowCreateForm(false);
        setShowReqForm(true);
    };

    // Handle project editing
    const handleEdit = (updatedProject: Project) => {
        setProjects((prev) =>
            prev.map((p) =>
                p.project_ID === updatedProject.project_ID
                    ? { ...p, ...updatedProject }
                    : p
            )
        );
        setShowEditForm(false);
        setEditProject(null);
    };

    // Handle project deletion
    const handleDelete = async (projectId: string) => {
        try {
            const token = localStorage.getItem('jwt');
            if (!token) {
                throw new Error('No access token found');
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/projects/delete/${projectId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to delete project');
            }

            setProjects((prev) => {
                const newProjects = prev.filter((project) => project.project_ID !== projectId);
                if (newProjects.length === 0) {
                    setCurrentIndex(0);
                } else if (currentIndex >= newProjects.length) {
                    setCurrentIndex(newProjects.length - 1);
                }
                return newProjects;
            });
        } catch (error) {
            console.error('Delete error:', error);
            alert('Could not delete project.');
        }
    };

    // Handle collaborator invitation
    const handleInviteClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        setInviteProject(currentProject);
        setInviteModalOpen(true);
    };

    // Loading state
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

    // Error state
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

    // Empty state
    if (projects.length === 0) {
        return (
            <article className={styles.widgetContainer}>
                <header className={styles.widgetHeader}>
                    <h2 className={styles.widgetTitle}>My Projects</h2>
                    <button className={styles.deleteButton} onClick={onDelete} aria-label="Delete widget">×</button>
                </header>
                <p>No projects found. Create a new project to get started.</p>
                <button className={styles.createButton} onClick={() => setShowCreateForm(true)}>
                    + Create Project
                </button>
            </article>
        );
    }

    const currentProject = projects[currentIndex];

    // Main render
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
                                    ? currentProject.collaborators.map(c => `${c.fname} ${c.sname}${c.department ? ` (${c.department})` : ''}${c.role ? ` - ${c.role}` : ''}`).join(', ')
                                    : 'None'}
                            </dd>
                        </dl>

                        {/* Display latest review if available */}
                        {currentProject.reviews && currentProject.reviews.length > 0 && (
                            <section className={styles.reviewList}>
                                <h4 className={styles.reviewListTitle}>Latest Review</h4>
                                <section className={styles.reviewItem}>
                                    <strong className={styles.reviewTitle}>{currentProject.reviews[0].outcome ? 'Outcome: ' + currentProject.reviews[0].outcome : 'No review yet'}</strong>
                                    <p className={styles.reviewFeedback}>{currentProject.reviews[0].feedback || 'No feedback'}</p>
                                    <p className={styles.reviewDate}>{currentProject.reviews[0].reviewed_at ? 'Reviewed on: ' + new Date(currentProject.reviews[0].reviewed_at).toLocaleDateString() : 'Not reviewed yet'}</p>
                                </section>
                            </section>
                        )}
                    </section>
                </footer>
            </section>

            {/* Navigation controls */}
            <nav className={styles.navigationButtons} aria-label="Project navigation">
                <button onClick={handlePrev} disabled={currentIndex === 0}>Previous</button>
                <p>{currentIndex + 1} of {projects.length}</p>
                <button onClick={handleNext} disabled={currentIndex === projects.length - 1}>Next</button>
            </nav>

            {/* Action buttons */}
            <section className={styles.actionButtons}>
                <button className={styles.createButton} onClick={() => setShowCreateForm(true)}>
                    + Create Project
                </button>
                <button 
                    className={styles.editButton}
                    onClick={() => {
                        setEditProject(currentProject);
                        setShowEditForm(true);
                    }}
                >
                    Edit Project
                </button>
                <button
                    className={styles.inviteButton}
                    title="Invite Collaborators"
                    onClick={handleInviteClick}
                >
                    <FaUserPlus />
                </button>
                <button
                    className={styles.trashButton}
                    title="Delete project"
                    onClick={() => {
                        if (window.confirm('Are you sure you want to delete this project?')) {
                            handleDelete(currentProject.project_ID);
                        }
                    }}
                >
                    🗑️
                </button>
            </section>

            {/* Modal forms */}
            {showCreateForm && (
                <CreateForm
                    onClose={() => {
                        setShowCreateForm(false);
                        setShowReqForm(false);
                    }}
                    onCreate={handleCreate}
                />
            )}
            {showReqForm && (
                <CreateReqForm
                    projectName={currentProjectData.projectName}
                    projectDesc={currentProjectData.projectDesc}
                    goals={currentProjectData.goals}
                    setResArea={currentProjectData.setResArea}
                    setStart={currentProjectData.setStart}
                    setEnd={currentProjectData.setEnd}
                    Funding={currentProjectData.Funding}
                    onClose={() => {
                        setShowReqForm(false);
                        setShowCreateForm(false);
                    }}
                    onCreate={() => {
                        setShowReqForm(false);
                        setShowCreateForm(false);
                        fetchProjects();
                    }}
                />
            )}
            {showEditForm && editProject && (
                <EditProjectForm
                    initialValues={editProject}
                    onClose={() => {
                        setShowEditForm(false);
                        setEditProject(null);
                    }}
                    onEdit={handleEdit}
                />
            )}
            {inviteModalOpen && inviteProject && (
                <InviteCollaborators
                    projectId={inviteProject.project_ID}
                    projectTitle={inviteProject.title || ""}
                    projectDescription={inviteProject.description || ""}
                    onClose={() => {
                        setInviteModalOpen(false);
                        setInviteProject(null);
                    }}
                />
            )}
        </article>
    );
} 