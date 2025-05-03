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

        const response = await fetch('https://thinksyncapi.azurewebsites.net/api/projects/collaborator', {
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
                setActiveTab('my');
                router.push("/researcher-dashboard");
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
          <li>
            <button 
              type="button" 
              onClick={() => {
                setActiveTab('messager');
                router.push("/messager");
              }}
              className={activeTab === 'messager' ? styles.active : ''}
            >
              Messager
            </button>
          </li>
        </ul>
      </nav>

      <section className={styles.mainContent}>
        <header className={styles.heading}>
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
        </header>

        <section className={styles.buttonHeader}>
          <section className={styles.searchContainer}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search projects..."
            />
          </section>
        </section>

        <section className={styles.cardContainer}>
          {projects.map((project) => (
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
                      Funding: {project.funding_available ? "Available" : "Not Available"}
                    </p>
                  </section>
                </section>
              </section>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
};

export default Page;
