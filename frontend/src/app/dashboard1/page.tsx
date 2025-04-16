"use client";

import React, { useEffect } from "react";
import styles from "./page.module.css";
import Image from "next/image";
import CreateForm from "../create-project/createForm";
import { useState } from "react";
import { useRouter } from "next/navigation";

const Page = () => {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [projects, setProjects] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <h2>ThinkSync</h2>

        <h3>DASHBOARD</h3>
        <ul>
          <li>
            {" "}
            <button type="button" onClick={() => router.push("/dashboard1")}>
              {" "}
              Current Projects
            </button>
          </li>
          <li>
            {" "}
            <button type="button" onClick={() => router.push("/dashboard2")}>
              {" "}
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
              placeholder="  Search files..."
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
          {isMounted && showForm && (
            <CreateForm
              onClose={() => setShowForm(false)}
              onCreate={(projectName: string) => {
                setProjects((prev) => [...prev, projectName]);
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
          {projects.map((name, index) => (
            <div key={index} className={styles.card}>
              <div className={styles.cardContent}>
                <img src="/exampleImg.png" alt="project" />
                <span>{name}</span>
                <section className={styles.cardFooter}>
                  <button className={styles.trashButton} title="Delete project">
                    🗑️
                  </button>
                </section>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Page;
