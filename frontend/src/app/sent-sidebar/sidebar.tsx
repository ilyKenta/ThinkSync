// src/components/Sidebar/Sidebar.jsx
import React, { useEffect, useState } from "react";
import styles from "./sidebar.module.css";
import SentInvitations from '../components/SentInvitations';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const [key, setKey] = useState(0);

  useEffect(() => {
    if (isOpen) {
      // Force SentInvitations to remount and refetch when sidebar opens
      setKey(prev => prev + 1);
    }
  }, [isOpen]);

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`} aria-label="Sent Invitations">
      <header className={styles.sidebarHeader}>
        <h2>Sent Invitations</h2>
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
            <SentInvitations key={key} />
          </nav>
        </section>
      </main>
    </aside>
  );
};

export default Sidebar;
