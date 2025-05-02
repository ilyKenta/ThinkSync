"use client";
import React from "react";
import styles from "./page.module.css";

export default function ScrollIndicator() {
  // We'll animate this with CSS for simplicity
  return (
    <div className={styles.scrollIndicatorWrapper}>
      <span className={styles.scrollIndicator}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
      </span>
    </div>
  );
}
