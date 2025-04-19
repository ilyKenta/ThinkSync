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
    <div className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      <div className={styles.sidebarHeader}>
        <h2>Sent Invitations</h2>
        <button onClick={onClose} className={styles.closeButton}>×</button>
      </div>
      <div className={styles.sidebarContent}>
        <div className={styles.invitationsContainer}>
          <div className={styles.invitationsList}>
            <SentInvitations key={key} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
