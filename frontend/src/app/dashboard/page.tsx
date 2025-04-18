"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";
import CreateForm from "../create-project/createForm";
import CreateReqForm from "../create-req/createReqForm";
import EditProjectForm from "../edit-project/editProjectForm";
import { useRouter } from "next/navigation";
import {
  FaPaperPlane,
  FaEnvelope,
  FaUserCircle,
  FaUserPlus,
} from "react-icons/fa";
import Sidebar from "../sent-sidebar/sidebar";
import InboxSidebar from "../inbox-sidebar/inb_sidebar";

interface Invite {
  recipient_name: string;
  project_name: string;
  status: string;
}

const Page = () => {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editProject, setEditProject] = useState<any | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [isInboxSidebarOpen, setIsInboxSidebarOpen] = useState(false);
  const [receivedInvites, setReceivedInvites] = useState<any[]>([]);

  const togglerSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const toggleInboxSidebar = () => {
    setIsInboxSidebarOpen((prev) => !prev);
  };

  useEffect(() => {
    if (isSidebarOpen) {
      const fetchInvites = async () => {
        setLoading(true);
        try {
          const res = await fetch(
            "http://localhost:5000/api/collaborations/invite",
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );
          if (!res.ok) throw new Error("Failed to fetch invites");

          const data = await res.json();
          setInvites(data);
        } catch (err) {
          setInvites([]);
        } finally {
          setLoading(false);
        }
      };
      fetchInvites();
    }
  }, [isSidebarOpen]);

  useEffect(() => {
    if (isInboxSidebarOpen) {
      const fetchReceivedInvites = async () => {
        setLoading(true);
        try {
          const res = await fetch("http://localhost:5000/api/collaborations/invitations/received", {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          });
          if (!res.ok) throw new Error("Failed to fetch received invites");
  
          const data = await res.json();
          setReceivedInvites(data.invitations);
        } catch (err) {
          setReceivedInvites([]);
        } finally {
          setLoading(false);
        }
      };
      fetchReceivedInvites();
    }
  }, [isInboxSidebarOpen]);

  const handleCardClick = (projectId: string) => {
    router.push(`/projectInfo/${projectId}`);
  };

  const handleDelete = async (projectId: string) => {
    try {
      const token = localStorage.getItem("jwt");
      if (!token) {
        throw new Error("No access token found");
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

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <h2>ThinkSync</h2>
        <h3>DASHBOARD</h3>
        <nav>
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
        </nav>
      </aside>

      <main className={styles.mainContent}>
        <section className={styles.heading}>
          <h2>Current projects</h2>
          <nav className={styles.colabGroup}>
            <button className={styles.iconButton} onClick={togglerSidebar}>
              <FaPaperPlane />
            </button>
            <Sidebar
              isOpen={isSidebarOpen}
              onClose={togglerSidebar}
              invites={invites}
              loading={loading}
            />

            <button className={styles.iconButton} onClick={toggleInboxSidebar}>
              <FaEnvelope />
            </button>
            <InboxSidebar
              isOpen={isInboxSidebarOpen}
              onClose={toggleInboxSidebar}
              invites={receivedInvites}
              loading={loading}
            />

            <button className={styles.iconButton}>
              <FaUserCircle />
            </button>
          </nav>
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

                setProjects((prev) => [
                  ...prev,
                  { project_ID: Date.now(), name: projectName },
                ]);

                setShowForm(false);
                setShowReqForm(true);
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

          <div className={styles.searchContainer}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search projects..."
            />
          </div>
        </section>

        <section className={styles.cardContainer}>
          {projects.map((project) => (
            <article
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
                    <time>
                      Start: {new Date(project.start_date).toLocaleDateString()}
                    </time>
                    <time>
                      End: {new Date(project.end_date).toLocaleDateString()}
                    </time>
                    <span>
                      Funding:{" "}
                      {project.funding_available
                        ? "Available"
                        : "Not Available"}
                    </span>
                  </div>
                </div>
                <footer className={styles.cardFooter}>
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
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z" />
                      </svg>
                    </button>

                    <button className={styles.addButton}>
                      <FaUserPlus />
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
                </footer>
              </div>
            </article>
          ))}
        </section>

        {showEditForm && editProject && (
          <EditProjectForm
            initialValues={editProject}
            onClose={() => {
              setShowEditForm(false);
              setEditProject(null);
            }}
            onEdit={(updatedProject) => {
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



