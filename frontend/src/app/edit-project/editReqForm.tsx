"use client";

import { LocalStorage } from "@azure/msal-browser";
import styles from "../create-req/page.module.css";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export type EditReqFormProps = {
  projectId: string;
  projectData: {
    title: string;
    description: string;
    goals: string;
    research_areas: string;
    start_date: string;
    end_date: string;
    funding_available: boolean;
  };
  requirements: {
    skill_required: string;
    experience_level: string;
    role: string;
    technical_requirements: string;
  }[];
  onClose: () => void;
  onEdit: (updatedProject: any) => void;
};

export default function EditReqForm({
  projectId,
  projectData,
  requirements,
  onClose,
  onEdit,
}: EditReqFormProps) {
  const [skill, setSkill] = useState("");
  const [experience, setExp] = useState("");
  const [reqrole, setRole] = useState("");
  const [techReq, setReq] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.classList.add('modal-open');
    
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  // Initialize form fields with current requirement data
  useEffect(() => {
    if (requirements && requirements.length > 0) {
      const currentReq = requirements[0];
      setSkill(currentReq.skill_required || "");
      setExp(currentReq.experience_level || "");
      setRole(currentReq.role || "");
      setReq(currentReq.technical_requirements || "");
    }
  }, [requirements]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("jwt");
      if (!token) {
        throw new Error('No access token found');
      }

      const payload = {
        project: projectData,
        requirements: [{
          skill_required: skill,
          experience_level: experience.toLowerCase(),
          role: reqrole,
          technical_requirements: techReq,
        }]
      };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/projects/update/${projectId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update project");
      }

      const data = await res.json();
      onEdit(data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  const modalContent = (
    <section className={styles.createModal} data-modal-root>
      <section className={styles.createBox}>
        <button onClick={onClose} className={styles.closeButton}>
          X
        </button>
        <h1 className={styles.title}>Edit Project Requirements</h1>
        <form className={styles.createForm} onSubmit={handleSubmit}>
          <label htmlFor="skillReq">Skill Required</label>
          <input
            type="text"
            id="skillReq"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            required
          />
          <label htmlFor="explvl">Level of experience</label>
          <select
            name="explvl"
            id="explvl"
            className="drop-down"
            value={experience}
            onChange={(e) => setExp(e.target.value)}
          >
            <option value=""></option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="professional">Professional</option>
          </select>
          <label htmlFor="reqrole">Role</label>
          <input
            type="text"
            id="reqrole"
            value={reqrole}
            onChange={(e) => setRole(e.target.value)}
            required
          />
          <label htmlFor="techReq">Technical Requirements</label>
          <input
            type="text"
            id="techReq"
            value={techReq}
            onChange={(e) => setReq(e.target.value)}
            required
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ backgroundColor: 'black', color: 'white', border: 'none', borderRadius: 'var(--button-radius)', fontSize: 20, fontWeight: 600 }}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
          {error && <section style={{ color: "red", marginTop: 8 }}>{error}</section>}
        </form>
      </section>
    </section>
  );

  return createPortal(modalContent, document.body);
}
