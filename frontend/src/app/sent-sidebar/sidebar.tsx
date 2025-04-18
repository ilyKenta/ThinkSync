// src/components/Sidebar/Sidebar.jsx
import React from "react";
import styles from "./sidebar.module.css";

interface Invite {
  recipient_name: string;
  project_name: string;
  status: string;
  invitation_ID: string;
  current_status: string;
}
interface SidebarProps {
  isOpen: Boolean;
  onClose: () => void;
  invites: Invite[];
  loading?: Boolean;
  cancelInvite: (invitationId: string) => void;
  children?: React.ReactNode;
}
const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  invites,
  loading,
  cancelInvite,
  children,
}) => {
  return (
    <div className={`${styles.sidebar} ${isOpen ? styles.open : ""}`}>
      <button className={styles.closeButton} onClick={onClose}>
        X
      </button>

      <h3> Sent Invitations</h3>

      {loading ? (
        <p> Loading invites...</p>
      ) : invites.length === 0 ? (
        <p>You have sent no invites.</p>
      ) : (
        invites.map((invite) => (
          <section key={invite.invitation_ID} className={styles.inviteCard}>
            <p>
              You've invited <strong>{invite.recipient_name}</strong> to{" "}
              <strong>{invite.project_name}</strong>, invite request{" "}
              <em>{invite.status}</em>.
            </p>
            {invite.current_status === "pending" && (
              <button
                className="mt-2 px-3 py-1 bg-red-600 text-white rounded"
                onClick={() => cancelInvite(invite.invitation_ID)}
              >
                {" "}
                Cancel{" "}
              </button>
            )}
          </section>
        ))
      )}
      {children && (
        <section className={styles.extraContent}>{children}</section>
      )}
    </div>
  );
};

export default Sidebar;
