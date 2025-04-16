"use client";

import React, { useState } from "react";
import styles from "./page.module.css";
import CreateForm from "../create-project/createForm";
import CreateReqForm from "../create-req/createReqForm";
import { useRouter } from "next/navigation";

const Page = () => {
  const router = useRouter();

  const handleCardClick = (name: string) => {
    // Navigate to projectInfo page
    router.push(`/projectInfo`);
  };

  const handleDelete = async (projectId: string) => {
    try {

      /*localStorage.setItem('jwt', accessToken);
      const token = "yourAccessToken"; */// Get your token here
      const res = await fetch(`http://localhost:5000/api/projects/delete/${projectId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`, // Send token for authorization
        },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete project");
      }

      // Remove project from UI
      setProjects(prev => prev.filter(project => project.project_ID !== projectId));
    } catch (error) {
      console.error("Delete error:", error);
      alert("Could not delete project.");
    }
  };

  const [showForm, setShowForm] = useState(false);
  const [showRequirementsForm, setShowRequirementsForm] = useState(false);
  const [projects, setProjects] = useState<any[]>([]); // Projects could be objects, not just strings

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <h2>ThinkSync</h2>
        <h3>DASHBOARD</h3>
        <ul>
          <li>
            <button type="button" onClick={() => router.push("/dashboard1")}>
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
              placeholder="Search files..."
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
              onCreate={(projectName: string) => {
                setProjects((prev) => [
                  ...prev,
                  { project_ID: Date.now(), name: projectName },
                ]);
                setShowForm(false); // Close the first modal after creating
                setShowRequirementsForm(true); // Open the second modal
              }}
            />
         )}

        {showRequirementsForm && (
          <CreateReqForm
            onClose={() => setShowForm(false)}
            onCreate={(projectName: string) => {
              setShowRequirementsForm(false);
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
          {projects.map((project, index) => (
            <button
              key={index}
              className={styles.card}
              onClick={() => handleCardClick(project.name)}
            >
              <div className={styles.cardContent}>
                <img src="/exampleImg.png" alt="project" />
                <span>{project.name}</span>
                <section className={styles.cardFooter}>
                  <button
                    className={styles.trashButton}
                    title="Delete project"
                    onClick={(e) => {
                      e.stopPropagation(); // prevent triggering card click
                      handleDelete(project.project_ID);
                    }}
                  >
                    🗑️
                  </button>
                </section>
              </div>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Page;
