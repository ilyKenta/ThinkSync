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
    <div className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      <div className={styles.sidebarHeader}>
        <h2>Received Invitations</h2>
        <button onClick={onClose} className={styles.closeButton}>×</button>
      </div>
      <div className={styles.sidebarContent}>
        <div className={styles.invitationsContainer}>
          <div className={styles.invitationsList}>
            <ReceivedInvitations key={key} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InboxSidebar;