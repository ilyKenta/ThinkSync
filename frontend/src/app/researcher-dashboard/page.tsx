"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";
import InviteCollaborators from "../components/InviteCollaborators";
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
import useAuth from "../useAuth";

const ResearcherDashboard = () => {
  useAuth();
  const router = useRouter();
  const [hasResearcherRole, setHasResearcherRole] = useState<boolean | null>(
    null
  );
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInboxSidebarOpen, setIsInboxSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("my");
  const [editProject, setEditProject] = useState<any | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteProject, setInviteProject] = useState<any | null>(null);
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const roleString =
      typeof window !== "undefined" ? localStorage.getItem("role") : null;
    let researcher = false;
    if (roleString) {
      try {
        const roles = JSON.parse(roleString);
        researcher =
          Array.isArray(roles) &&
          roles.some(
            (r: { role_name: string }) => r.role_name === "researcher"
          );
      } catch (e) {
        researcher = false;
      }
    }
    setHasResearcherRole(researcher);
    if (!researcher) {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    if (hasResearcherRole) {
      fetchProjects();
      setLoading(false);
    }
  }, [hasResearcherRole]);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredProjects(projects);
    } else {
      const filtered = projects.filter(
        (project) =>
          project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          project.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProjects(filtered);
    }
  }, [searchQuery, projects]);

  useEffect(() => {
    const fetchUnread = async () => {
      const token = localStorage.getItem("jwt");
      if (!token) return;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/messages/unread`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(Array.isArray(data) ? data.length : 0);
      }
    };
    fetchUnread();
  }, []);

  if (hasResearcherRole === null) {
    // Still checking role, render nothing or a spinner
    return null;
  }
  if (!hasResearcherRole) {
    // Redirecting, render nothing
    return null;
  }

  // Move fetchProjects to top-level so it can be called after project creation
  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("jwt");
      if (!token) {
        throw new Error("No access token found");
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/projects/owner`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }

      const data = await response.json();
      setProjects(data.projects || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      console.error("Error fetching projects:", err);
    } finally {
      setLoading(false);
    }
  };

  const togglerSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const toggleInboxSidebar = () => {
    setIsInboxSidebarOpen((prev) => !prev);
  };

  const handleCardClick = (projectId: string) => {
    //router.push(`/projectInfo/${projectId}`);
  };

  const handleDelete = async (projectId: string) => {
    try {
      const token = localStorage.getItem("jwt");
      if (!token) {
        throw new Error("No access token found");
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/projects/delete/${projectId}`,
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

  const handleInviteClick = (e: React.MouseEvent, project: any) => {
    e.stopPropagation();
    setInviteProject(project);
    setInviteModalOpen(true);
  };

  if (loading) {
    return <main className={styles.container}>Loading projects...</main>;
  }

  if (error) {
    return <main className={styles.container}>Error: {error}</main>;
  }

  return (
    <main className={styles.container}>
      <nav className={styles.sidebar}>
        <h2>ThinkSync</h2>
        <h3>DASHBOARD</h3>

        <ul>
          <li>
            <button
              type="button"
              onClick={() => {
                setActiveTab("my");
                router.push("/researcher-dashboard");
              }}
              className={activeTab === "my" ? styles.activeTab : ""}
            >
              My Projects
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                setActiveTab("shared");
                router.push("/Shared_projects");
              }}
              className={activeTab === "shared" ? styles.activeTab : ""}
            >
              Shared Projects
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                setActiveTab("messager");
                router.push("/messager");
              }}
              className={activeTab === "messager" ? styles.activeTab : ""}
            >
              Messager
              {unreadCount > 0 && (
                <span
                  style={{
                    display: "inline-block",
                    marginLeft: 8,
                    minWidth: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "red",
                    color: "white",
                    fontWeight: 600,
                    fontSize: 12,
                    textAlign: "center",
                    lineHeight: "20px",
                    padding: "0 6px",
                    verticalAlign: "middle",
                  }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
          </li>
        </ul>
      </nav>

      <section className={styles.mainContent}>
        <header className={styles.heading}>
          <h2>My Projects</h2>
          <nav className={styles.colabGroup}>
            <section className={styles.sidebarSection}>
              <button
                className={styles.iconButton}
                onClick={togglerSidebar}
                data-testid="sidebar-toggle"
              >
                <FaPaperPlane />
              </button>
              <Sidebar
                isOpen={isSidebarOpen}
                onClose={togglerSidebar}
                data-testid="sidebar"
              />
            </section>

            <section className={styles.sidebarSection}>
              <button
                className={styles.iconButton}
                onClick={toggleInboxSidebar}
              >
                <FaEnvelope />
              </button>
              <InboxSidebar
                isOpen={isInboxSidebarOpen}
                onClose={toggleInboxSidebar}
              />
            </section>

            <button className={styles.iconButton}>
              <FaUserCircle />
            </button>
          </nav>
        </header>

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
                setShowForm(false);
                setShowReqForm(true);
                fetchProjects();
              }}
              data-testid="create-form"
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
              onCreate={() => {
                setShowReqForm(false);
                console.log(
                  "Requirements form submitted, reloading page to refresh projects"
                );
                setTimeout(() => {
                  window.location.reload();
                }, 400); // Delay reload to allow fetch to complete
              }}
            />
          )}

          <section className={styles.searchContainer}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </section>
        </section>

        <section className={styles.cardContainer}>
          {filteredProjects.map((project) => (
            <article
              key={project.project_ID}
              className={styles.card}
              onClick={() => handleCardClick(project.project_ID)}
            >
              <section className={styles.cardContent}>
                <img src="/exampleImg.png" alt="project" />
                <section className={styles.projectInfo}>
                  <h3>{project.title}</h3>
                  <p className={styles.description}>{project.description}</p>
                  <section className={styles.projectDetails}>
                    <time>
                      Start: {new Date(project.start_date).toLocaleDateString()}
                    </time>
                    <time>
                      End: {new Date(project.end_date).toLocaleDateString()}
                    </time>
                    <p>
                      Funding:{" "}
                      {project.funding_available
                        ? "Available"
                        : "Not Available"}
                    </p>
                  </section>
                </section>
                <footer className={styles.cardFooter}>
                  <section className={styles.buttonContainer}>
                    <button
                      className={styles.editButton}
                      title="Edit project"
                      data-testid="edit-project-button"
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
                    <button
                      className={styles.addButton}
                      onClick={(e) => handleInviteClick(e, project)}
                      title="Invite Collaborators"
                    >
                      <FaUserPlus />
                    </button>
                    <button
                      className={styles.trashButton}
                      title="Delete project"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (
                          window.confirm(
                            "Are you sure you want to delete this project?"
                          )
                        ) {
                          handleDelete(project.project_ID);
                        }
                      }}
                    >
                      🗑️
                    </button>
                  </section>
                </footer>
              </section>
            </article>
          ))}
        </section>
        {inviteModalOpen && inviteProject && (
          <InviteCollaborators
            projectId={inviteProject.project_ID}
            projectTitle={inviteProject.title || ""}
            projectDescription={inviteProject.description || ""}
            onClose={() => {
              setInviteModalOpen(false);
              setInviteProject(null);
            }}
            data-testid="invite-modal"
          />
        )}

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
            data-testid="edit-form"
          />
        )}
      </section>
    </main>
  );
};

export default ResearcherDashboard;
