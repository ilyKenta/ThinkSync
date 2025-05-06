"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";
import { useRouter } from "next/navigation";
import useAuth from "../useAuth";

const Page = () => {
  useAuth();
  const router = useRouter();
  const [hasReviewerRole, setHasReviewerRole] = useState<boolean | null>(null);
  const [proposal, setProp] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('shared');
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    //setHasReviewerRole(true);
    const roleString = typeof window !== "undefined" ? localStorage.getItem('role') : null;
    let reviewer = false;
    if (roleString) {
      try {
        const roles = JSON.parse(roleString);
        reviewer = Array.isArray(roles) && roles.some((r: { role_name: string; }) => r.role_name === 'reviewer');
      } catch (e) {
        reviewer = false;
      }
    }
    setHasReviewerRole(reviewer);
    if (!reviewer) {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (hasReviewerRole) {
      const fetchProposals = async () => {
        try {
          const token = localStorage.getItem('jwt');
          if (!token) {
            throw new Error('No access token found');
          }
    
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/reviewer/proposals`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
    
          if (!response.ok) {
            throw new Error('Failed to fetch proposals');
          }
    
          const data = await response.json();
          setProp(data.proposals); 
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An error occurred');
          console.error('Error fetching proposals:', err);
        } finally {
          setLoading(false);
        }
      };
      fetchProposals();
    }
  }, [hasReviewerRole]);

  useEffect(() => {
    const fetchUnread = async () => {
      const token = localStorage.getItem('jwt');
      if (!token) return;
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/messages/unread`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(Array.isArray(data) ? data.length : 0);
      }
    };
    fetchUnread();
  }, []);

  if (hasReviewerRole === null) {
    // Still checking role, render nothing or a spinner
    return null;
  }
  if (!hasReviewerRole) {
    // Redirecting, render nothing
    return null;
  }

  // useEffect(() => {
  //   // Simulate API delay with dummy data
  //   const dummyProposals = [
  //     {
  //       project_ID: "123",
  //       title: "AI for Healthcare",
  //       description: "Improving diagnostics with machine learning.",
  //       start_date: new Date().toISOString(),
  //       Assigned_at: new Date().toISOString(),
  //     },
  //     {
  //       project_ID: "456",
  //       title: "Sustainable Agriculture",
  //       description: "Using IoT for precision farming.",
  //       start_date: new Date().toISOString(),
  //       Assigned_at: new Date().toISOString(),
  //     },
  //   ];
  //   setTimeout(() => {
  //     setProp(dummyProposals);
  //     setLoading(false);
  //   }, 500); // simulate delay
  // }, []);

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
              {unreadCount > 0 && (
                <span style={{
                  display: 'inline-block',
                  marginLeft: 8,
                  minWidth: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'red',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: 12,
                  textAlign: 'center',
                  lineHeight: '20px',
                  padding: '0 6px',
                  verticalAlign: 'middle',
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
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
