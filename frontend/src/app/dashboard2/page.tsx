"use client";

import React from "react";
import styles from "./page.module.css";
import Image from "next/image";
import CreateForm from "../create-project/createForm";
import { useState } from "react";
import { useRouter } from "next/navigation";

const Page = () => {

  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <h2>ThinkSync</h2>

        <h3>COLLECTIONS</h3>
        <ul>
          <li> <button type="button" onClick={() => router.push("/dashboard1")}> Current Projects</button></li>
          <li> <button type="button" onClick={() => router.push("/dashboard2")}> Collaboration</button></li>
        </ul>
      </aside>

      <main className={styles.mainContent}>
        <section className={styles.heading}>
          <h2>Collaborations</h2>
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
            {showForm && <CreateForm onClose={() => setShowForm(false)} />}

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
          <div className={styles.card}>
            <div className={styles.cardContent}>
              <img src="/exampleImg.png" alt="search" />
              <span>Q4 Sales Deck</span>
              <section className={styles.cardFooter}>
                <p>Shared folder • 8 presentations</p>
                <button className={styles.trashButton} title="Delete project">🗑️</button>
              </section>
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardContent}>
              <img src="/exampleImg.png" alt="search" />
              <span>Product Videos</span>
              <section className={styles.cardFooter}>
                <p>Shared folder • 5 videos</p>
                <button className={styles.trashButton} title="Delete project">🗑️</button>
              </section>
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardContent}>
              <img src="/exampleImg.png" alt="search" />
              <span>ROI Calculator</span>
              <section className={styles.cardFooter}>
                <p>Shared file • 1 Excel</p>
                <button className={styles.trashButton} title="Delete project">🗑️</button>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Page;
