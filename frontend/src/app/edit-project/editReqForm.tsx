"use client";

import styles from "../create-req/page.module.css";
import { useState } from "react";
import { useRouter } from "next/navigation";

// Props for editing requirements
export type EditReqFormProps = {
  projectId: string;
  requirements: {
    skill: string;
    experience: string;
    reqrole: string;
    techReq: string;
  };
  onClose: () => void;
  onEdit: (updatedRequirements: any) => void;
};

export default function EditReqForm({
  projectId,
  requirements,
  onClose,
  onEdit,
}: EditReqFormProps) {
  const router = useRouter();
  const [skill, setSkill] = useState(requirements.skill || "");
  const [experience, setExp] = useState(requirements.experience || "");
  const [reqrole, setRole] = useState(requirements.reqrole || "");
  const [techReq, setReq] = useState(requirements.techReq || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Add API call to update requirements for this project
    const updated = { skill, experience, reqrole, techReq };
    onEdit(updated);
    onClose();
  };

  return (
    <div className={styles.overlay}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <h2>Edit Project Requirements</h2>
        <label>Skill:</label>
        <input value={skill} onChange={e => setSkill(e.target.value)} />
        <label>Experience:</label>
        <input value={experience} onChange={e => setExp(e.target.value)} />
        <label>Role:</label>
        <input value={reqrole} onChange={e => setRole(e.target.value)} />
        <label>Technical Requirements:</label>
        <input value={techReq} onChange={e => setReq(e.target.value)} />
        <div className={styles.buttonRow}>
          <button type="submit">Save</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
