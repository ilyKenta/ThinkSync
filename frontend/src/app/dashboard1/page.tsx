"use client";

import React from "react";
import styles from "./page.module.css";
import Image from "next/image";
import CreateForm from "../create-project/createForm";
import { useState } from "react";

const Page = () => {
  const [showForm, setShowForm] = useState(false);
  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <h2>ThinkSync</h2>

        <h3>COLLECTIONS</h3>
        <ul>
          <li>Product Demos</li>
          <li>Case Studies</li>
          <li>Sales Collateral</li>
          <li>Training Materials</li>
        </ul>
      </aside>

      <main className={styles.mainContent}>
        <div className={styles.searchContainer}>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="  Search files..."
          />
        </div>

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
        <div className={styles.tabGroup}>
          <button>Recent</button>
          <button>Starred</button>
          <button>Shared</button>
        </div>

        <div className={styles.cardContainer}>
          <div className={styles.card}>
            <div className={styles.cardContent}>
              <span>Q4 Sales Deck</span>
              <p>Shared folder • 8 presentations</p>
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardContent}>
              <span>Product Videos</span>
              <p>Shared folder • 5 videos</p>
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.cardContent}>
              <span>ROI Calculator</span>
              <p>Shared file • 1 Excel</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Page;
