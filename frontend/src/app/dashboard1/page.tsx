import React from 'react';
import styles from './page.module.css';

export default function DashboardPage() {
  return (
    <div className={styles.appContainer}>
      {/* Sidebar - Fixed width */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <h1>Showpad</h1>
        </div>

        <div className={styles.sidebarMenu}>
          <h2 className={styles.menuTitle}>All content</h2>
          <ul className={styles.menuList}>
            <li className={styles.menuItem}>Presentations</li>
            <li className={styles.menuItem}>
              Analytics
              <ul className={styles.subMenu}>
                <li>COLLECTIONS</li>
              </ul>
            </li>
            <li className={styles.menuItem}>Product Demos</li>
            <li className={styles.menuItem}>Case Studies</li>
            <li className={styles.menuItem}>Sales Collateral</li>
            <li className={styles.menuItem}>Training Materials</li>
          </ul>
        </div>

        <div className={styles.sidebarTools}>
          <div className={styles.searchContainer}>
            <input 
              type="text" 
              placeholder="Search files..." 
              className={styles.searchInput}
            />
          </div>
          <div className={styles.actionButtons}>
            <button className={styles.actionButton}>+ Create</button>
            <button className={styles.actionButton}>Upload</button>
          </div>
        </div>

        <div className={styles.sidebarSection}>
          <h3 className={styles.sectionTitle}>Recent</h3>
          <h3 className={styles.sectionTitle}>Starred</h3>
          <h3 className={styles.sectionTitle}>Shared</h3>
        </div>

        <div className={styles.recentItems}>
          <div className={styles.recentItem}>
            <h4>Q4 Sales Deck</h4>
            <p className={styles.itemMeta}>Shared folder · 8 presentations</p>
          </div>
          <div className={styles.recentItem}>
            <h4>Product Videos</h4>
            <p className={styles.itemMeta}>Shared folder · 5 videos</p>
          </div>
          <div className={styles.recentItem}>
            <h4>ROI Calculator</h4>
            <p className={styles.itemMeta}>Shared file · 1 Excel</p>
          </div>
        </div>
      </div>

      {/* Main Content - Flexible area */}
      <main className={styles.mainContent}>
        <div className={styles.contentHeader}>
          <h2>Content Library</h2>
          <div className={styles.contentControls}>
            <button className={styles.controlButton}>Filter</button>
            <button className={styles.controlButton}>Sort</button>
            <button className={styles.primaryButton}>Upload New</button>
          </div>
        </div>

        <div className={styles.contentGrid}>
          {/* Empty state - replace with your actual content components */}
          <div className={styles.emptyState}>
            <div className={styles.emptyIllustration}>
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
            </div>
            <h3>No content selected</h3>
            <p>Choose an item from the sidebar or upload new files</p>
          </div>
        </div>
      </main>
    </div>
  );
}