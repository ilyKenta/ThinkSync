"use client";

import styles from "../create-project/page.module.css";
import { useState } from "react";

export type EditProjectFormProps = {
  onClose: () => void;
  initialValues: {
    projectId: string;
    title?: string;
    description?: string;
    goals?: string;
    research_areas?: string;
    start_date?: string;
    end_date?: string;
    funding_available?: string;
    // requirements?: any[]
  };
  onEdit: (updatedProject: any) => void;
};

export default function EditProjectForm({ onClose, onEdit, initialValues }: EditProjectFormProps) {
  const [title, setTitle] = useState(initialValues.title || "");
  const [description, setDescription] = useState(initialValues.description || "");
  const [goals, setGoals] = useState(initialValues.goals || "");
  const [research_areas, setResArea] = useState(initialValues.research_areas || "");
  const [start_date, setStart] = useState(initialValues.start_date || "");
  const [end_date, setEnd] = useState(initialValues.end_date || "");
  const [funding_available, setFunding] = useState(initialValues.funding_available || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    const payload = {
      title,
      description,
      goals,
      research_areas,
      start_date,
      end_date,
      funding_available,
    };
    console.log("[EditProjectForm] Submitting update for projectId:", initialValues.projectId);
    console.log("[EditProjectForm] Payload:", payload);
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(`http://localhost:5000/api/project/update/${initialValues.projectId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            project: payload,
            requirements: [] // Add requirements if needed
          })
        }
      );
      const data = await res.json();
      console.log("[EditProjectForm] API response:", data);
      if (res.ok) {
        setSuccess(true);
        onEdit({ projectId: initialValues.projectId, ...payload });
        console.log("[EditProjectForm] Closing form after successful edit.");
        onClose();
      } else {
        setError(data.error || "Unknown error");
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
      console.error("[EditProjectForm] Submission error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.createModal}>
      <section className={styles.createBox}>
        <button onClick={onClose} className={styles.closeButton}>
          X
        </button>
        <h1 className={styles.title}>Edit Project</h1>
        <form className={styles.createForm} onSubmit={handleSubmit}>
          <label htmlFor="projectName">Project name</label>
          <input
            type="text"
            id="projName"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <label htmlFor="projectDesc">Project Description</label>
          <input
            id="projectDesc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <label htmlFor="goals">Goals</label>
          <input
            type="text"
            id="goals"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            required
          />
          <label htmlFor="setResArea">Research Area</label>
          <input
            type="text"
            id="setResArea"
            value={research_areas}
            onChange={(e) => setResArea(e.target.value)}
            required
          />

          <label htmlFor="setStart">Start Date</label>
          <input
            type="date"
            id="setStart"
            value={start_date}
            onChange={(e) => setStart(e.target.value)}
            required
          />

          <label htmlFor="setEnd">End Date</label>
          <input
            type="date"
            id="setEnd"
            value={end_date}
            onChange={(e) => setEnd(e.target.value)}
            required
          />
          <label htmlFor="setFunding">Fundings</label>
          <input
            type="number"
            id="setFunding"
            value={funding_available}
            onChange={(e) => setFunding(e.target.value)}
            required
          />

          <button type="submit" aria-label="submit information" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </button>
          {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
          {success && <div style={{ color: 'green', marginTop: 8 }}>Project updated successfully!</div>}
        </form>
      </section>
    </main>
  );
}
