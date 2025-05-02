"use client";

import React, { useState, useEffect } from "react";
import styles from "../Shared_projects/page.module.css";
import { useRouter } from "next/navigation";
import { FaPaperPlane, FaEnvelope, FaUserCircle } from "react-icons/fa";
import Sidebar from "../sent-sidebar/sidebar";
import InboxSidebar from "../inbox-sidebar/inb_sidebar";

const Page = () => {
  const router = useRouter();
  const [proposal, setProp] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInboxSidebarOpen, setIsInboxSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("shared");

  //un comment actual api call bellow

  // useEffect(() => {
  //   const fetchProposals = async () => {
  //     try {
  //       const token = localStorage.getItem("jwt");
  //       if (!token) {
  //         throw new Error("No access token found");
  //       }

  //       const response = await fetch(
  //         "http://localhost:5000/api/reviewer/proposals",
  //         {
  //           headers: {
  //             Authorization: `Bearer ${token}`,
  //           },
  //         }
  //       );

  //       if (!response.ok) {
  //         throw new Error("Failed to fetch proposals");
  //       }

  //       const data = await response.json();
  //       setProp(data.proposals);
  //     } catch (err) {
  //       setError(err instanceof Error ? err.message : "An error occurred");
  //       console.error("Error fetching proposals:", err);
  //     } finally {
  //       setLoading(false);
  //     }
  //   };

  //   fetchProposals();
  // }, []);

  useEffect(() => {
    // Simulate API delay with dummy data
    const dummyProposals = [
      {
        project_ID: "123",
        title: "AI for Healthcare",
        description: "Improving diagnostics with machine learning.",
        start_date: new Date().toISOString(),
        Assigned_at: new Date().toISOString(),
      },
      {
        project_ID: "456",
        title: "Sustainable Agriculture",
        description: "Using IoT for precision farming.",
        start_date: new Date().toISOString(),
        Assigned_at: new Date().toISOString(),
      },
    ];
    setTimeout(() => {
      setProp(dummyProposals);
      setLoading(false);
    }, 500); // simulate delay
  }, []);

  const togglerSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const toggleInboxSidebar = () => {
    setIsInboxSidebarOpen((prev) => !prev);
  };

  const handleCardClick = (projectId: string) => {
    // Find the selected project from the proposals array
    const selectedProject = proposal.find((p) => p.project_ID === projectId);
    if (selectedProject) {
      // Convert the project data to a URL-safe string
      const projectData = encodeURIComponent(JSON.stringify(selectedProject));
      router.push(
        `/prop-info?projectId=${projectId}&projectData=${projectData}`
      );
    }
  };

  if (loading) {
    return <main className={styles.container}>Loading proposals...</main>;
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
                router.push("/review-dash");
              }}
              className={activeTab === "my" ? styles.active : ""}
            >
              Assigned proposals
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                setActiveTab("messager");
                router.push("/messager/RevMessage");
              }}
              className={activeTab === "messager" ? styles.active : ""}
            >
              Messager
            </button>
          </li>
          {/*<li>
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
          </li>*/}
        </ul>
      </nav>

      <section className={styles.mainContent}>
        <header className={styles.heading}>
          <h2>Assigned Proposals</h2>
          <nav className={styles.colabGroup}>
            <section className={styles.sidebarSection}>
              <button className={styles.iconButton} onClick={togglerSidebar}>
                <FaPaperPlane />
              </button>
              <Sidebar isOpen={isSidebarOpen} onClose={togglerSidebar} />
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
          <section className={styles.searchContainer}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search proposals..."
            />
          </section>
        </section>

        <section className={styles.cardContainer}>
          {proposal.map((prop) => (
            <article
              key={prop.project_ID}
              className={styles.card}
              onClick={() => handleCardClick(prop.project_ID)}
            >
              <section className={styles.cardContent}>
                <img src="/exampleImg.png" alt="project" />
                <section className={styles.projectInfo}>
                  <h3>{prop.title}</h3>
                  <p className={styles.description}>{prop.description}</p>
                  <section className={styles.projectDetails}>
                    <time>
                      Start: {new Date(prop.start_date).toLocaleDateString()}
                    </time>
                    <p>
                      Assigned to you at:{" "}
                      {new Date(prop.Assigned_at).toLocaleDateString()}
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
