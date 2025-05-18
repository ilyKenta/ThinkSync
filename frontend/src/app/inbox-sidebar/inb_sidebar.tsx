// src/components/Sidebar/Sidebar.jsx
import React, { useState, useEffect } from "react";
import styles from "./inb_sidebar.module.css";
import ReceivedInvitations from '../components/ReceivedInvitations';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const InboxSidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (isOpen) {
      // Force ReceivedInvitations to remount and refetch when sidebar opens
      setKey(prev => prev + 1);
    }
  }, [isOpen]);

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`} aria-label="Received Invitations">
      <header className={styles.sidebarHeader}>
        <h2>Received Invitations</h2>
        <button 
          onClick={onClose} 
          className={styles.closeButton}
          aria-label="Close sidebar"
        >
          ×
        </button>
      </header>
      <main className={styles.sidebarContent}>
        <section className={styles.invitationsContainer}>
          <nav className={styles.invitationsList} aria-label="Invitations list">
            <ReceivedInvitations key={key} />
          </nav>
        </section>
      </main>
    </aside>
  );
};

export default InboxSidebar;