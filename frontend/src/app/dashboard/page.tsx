"use client";

import React, { useState, useEffect, use } from "react";
import styles from "./page.module.css";
import CreateForm from "../create-project/createForm";
import CreateReqForm from "../create-req/createReqForm";
import EditProjectForm from "../edit-project/editProjectForm";
import { useRouter } from "next/navigation";
import useAuth from "../useAuth";

const Page = () => {
  useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for editing project and requirements
  const [editProject, setEditProject] = useState<any | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  // Fetch projects on component mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem('jwt');
        if (!token) {
          throw new Error('No access token found');
        }

        const response = await fetch('http://localhost:5000/api/projects/owner', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }

        const data = await response.json();
        setProjects(data.projects);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching projects:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleCardClick = (projectId: string) => {
    router.push(`/projectInfo/${projectId}`);
  };

  const handleDelete = async (projectId: string) => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        throw new Error('No access token found');
      }

      const res = await fetch(
        `http://localhost:5000/api/projects/delete/${projectId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete project");
      }

      setProjects((prev) =>
        prev.filter((project) => project.project_ID !== projectId)
      );
    } catch (error) {
      console.error("Delete error:", error);
      alert("Could not delete project.");
    }
  };

  const [showForm, setShowForm] = useState(false);
  const [showRequirementsForm, setShowReqForm] = useState(false);

  const [currentProjectName, setCurrentProjectName] = useState("");
  const [currentprojectDesc, setCurrentprojectDesc] = useState("");
  const [currentgoals, setCurrentGoals] = useState("");
  const [currentresearch_areas, setCurrentResArea] = useState("");
  const [currentstart_date, setCurrentStart] = useState("");
  const [currentend_date, setCurrentEnd] = useState("");
  const [currentfunding_available, setCurrentFunding] = useState<
    boolean | null
  >(null);

  if (loading) {
    return <div className={styles.container}>Loading projects...</div>;
  }

  if (error) {
    return <div className={styles.container}>Error: {error}</div>;
  }

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <h2>ThinkSync</h2>
        <h3>DASHBOARD</h3>
        <ul>
          <li>
            <button type="button" onClick={() => router.push("/dashboard")}>
              Current Projects
            </button>
          </li>
          <li>
            <button type="button" onClick={() => router.push("/dashboard2")}>
              Collaboration
            </button>
          </li>
        </ul>
      </aside>

      <main className={styles.mainContent}>
        <section className={styles.heading}>
          <h2>Current projects</h2>
          <div className={styles.searchContainer}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search projects..."
            />
          </div>
        </section>

        <section className={styles.buttonHeader}>
          <button
            className={styles.createButton}
            onClick={() => setShowForm(true)}
          >
            + Create
          </button>
          {showForm && (
            <CreateForm
              onClose={() => setShowForm(false)}
              onCreate={(
                projectName: string,
                projectDesc: string,
                goals: string,
                setResArea: string,
                setStart: string,
                setEnd: string,
                Funding: boolean | null
              ) => {
                setCurrentProjectName(projectName);
                setCurrentprojectDesc(projectDesc);
                setCurrentGoals(goals);
                setCurrentResArea(setResArea);
                setCurrentStart(setStart);
                setCurrentEnd(setEnd);
                setCurrentFunding(Funding);

                setShowForm(false); // Close the first modal after creating
                setShowReqForm(true); // Open the second modal
              }}
            />
          )}

          {showRequirementsForm && (
            <CreateReqForm
              projectName={currentProjectName}
              projectDesc={currentprojectDesc}
              goals={currentgoals}
              setResArea={currentresearch_areas}
              setStart={currentstart_date}
              setEnd={currentend_date}
              Funding={currentfunding_available}
              onClose={() => setShowReqForm(false)}
              onCreate={(projectName: string) => {
                setShowReqForm(false);
              }}
            />
          )}

          <div className={styles.buttonGroup}>
            <button>Upload</button>
            <button>Create folder</button>
            <button>Record</button>
          </div>
        </section>

        <div className={styles.tabGroup}>
          <button>Recent</button>
          <button>Starred</button>
          <button>Shared</button>
        </div>

        <div className={styles.cardContainer}>
          {projects.map((project) => (
            <div 
              key={project.project_ID} 
              className={styles.card}
              onClick={() => handleCardClick(project.project_ID)}
            >
              <div className={styles.cardContent}>
                <img src="/exampleImg.png" alt="project" />
                <div className={styles.projectInfo}>
                  <h3>{project.title}</h3>
                  <p className={styles.description}>{project.description}</p>
                  <div className={styles.projectDetails}>
                    <span>Start: {new Date(project.start_date).toLocaleDateString()}</span>
                    <span>End: {new Date(project.end_date).toLocaleDateString()}</span>
                    <span>Funding: {project.funding_available ? 'Available' : 'Not Available'}</span>
                  </div>
                </div>
                <section className={styles.cardFooter}>
                  <div className={styles.buttonContainer}>
                    <button
                      className={styles.editButton}
                      title="Edit project"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditProject(project);
                        setShowEditForm(true);
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z" />
                      </svg>
                    </button>
                    <button
                      className={styles.trashButton}
                      title="Delete project"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(project.project_ID);
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </section>
              </div>
            </div>
          ))}
        </div>
        {/* Edit Project Modal */}
        {showEditForm && editProject && (
          <EditProjectForm
            initialValues={editProject}
            onClose={() => {
              setShowEditForm(false);
              setEditProject(null);
            }}
            onEdit={(updatedProject) => {
              // Update the project in the list
              setProjects((prev) =>
                prev.map((p) =>
                  p.project_ID === updatedProject.project_ID
                    ? { ...p, ...updatedProject }
                    : p
                )
              );
              setShowEditForm(false);
              setEditProject(null);
            }}
          />
        )}
      </main>
    </div>
  );
};

export default Page;
