"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import {
  FaPaperPlane,
  FaEnvelope,
  FaUserCircle,
} from "react-icons/fa";
import Sidebar from "../sent-sidebar/sidebar";
import InboxSidebar from "../inbox-sidebar/inb_sidebar";

const Page = () => {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInboxSidebarOpen, setIsInboxSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('shared');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem('jwt');
        if (!token) {
          throw new Error('No access token found');
        }

        const response = await fetch('http://localhost:5000/api/projects/collaborator', {
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

  const togglerSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const toggleInboxSidebar = () => {
    setIsInboxSidebarOpen((prev) => !prev);
  };

  const handleCardClick = (projectId: string) => {
    //router.push(`/projectInfo/${projectId}`);
  };

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
            <button 
              type="button" 
              onClick={() => {
                setActiveTab('my');
                router.push("/dashboard");
              }}
              className={activeTab === 'my' ? styles.active : ''}
            >
              My Projects
            </button>
          </li>
          <li>
            <button 
              type="button" 
              onClick={() => {
                setActiveTab('shared');
                router.push("/Shared_projects");
              }}
              className={activeTab === 'shared' ? styles.active : ''}
            >
              Shared Projects
            </button>
          </li>
        </ul>
      </aside>

      <main className={styles.mainContent}>
        <section className={styles.heading}>
          <h2>Shared Projects</h2>
          <nav className={styles.colabGroup}>
            <section className={styles.sidebarSection}>
              <button className={styles.iconButton} onClick={togglerSidebar}>
                <FaPaperPlane />
              </button>
              <Sidebar
                isOpen={isSidebarOpen}
                onClose={togglerSidebar}
              />
            </section>

            <section className={styles.sidebarSection}>
              <button className={styles.iconButton} onClick={toggleInboxSidebar}>
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
        </section>

        <section className={styles.buttonHeader}>
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
                      Funding: {project.funding_available ? "Available" : "Not Available"}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Page;
