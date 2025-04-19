// src/components/Sidebar/Sidebar.jsx
import React from "react";
import styles from "./sidebar.module.css";

interface Invite {
  invitation_ID: number;
  sender_fname: string;
  sender_sname: string;
  project_title: string;
  current_status: string;
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  invites: Invite[];
  loading?: boolean;
}

const InboxSidebar: React.FC<SidebarProps> = ({ isOpen, onClose, invites, loading }) => {

  const handleResponse = async (invitationId: number, action: "accepted" | "declined") => {
    try {
      const res = await fetch(`http://localhost:5000/api/collaborations/invitation/${invitationId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ status: action }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update invitation");
      }

      alert(`Invitation ${action}`);
      onClose(); // Close sidebar after action (optional)
    } catch (error) {
      console.error("Error updating invitation:", error);
      alert("Error updating invitation.");
    }
  };

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
      <button className={styles.closeButton} onClick={onClose} aria-label="Close Sidebar">
        X
      </button>

      <header>
        <h3>Received Invitations</h3>
      </header>

      {loading ? (
        <p>Loading invitations...</p>
      ) : invites.length === 0 ? (
        <p>No received invites.</p>
      ) : (
        invites.map((invite) => (
          <article key={invite.invitation_ID} className={styles.inviteCard}>
            <p>
              <strong>{invite.sender_fname} {invite.sender_sname}</strong> invited you to{" "}
              <strong>{invite.project_title}</strong> — status:{" "}
              <em>{invite.current_status}</em>
            </p>

            {invite.current_status === "pending" && (
              <div className={styles.buttonGroup}>
                <button
                  className={styles.acceptButton}
                  onClick={() => handleResponse(invite.invitation_ID, "accepted")}
                >
                  Accept
                </button>
                <button
                  className={styles.declineButton}
                  onClick={() => handleResponse(invite.invitation_ID, "declined")}
                >
                  Decline
                </button>
              </div>
            )}
          </article>
        ))
      )}
    </aside>
  );
};

export default InboxSidebar;