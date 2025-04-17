"use client";

import styles from "../create-project/page.module.css";
import { useState, useEffect } from "react";
import EditReqForm from "./editReqForm";

export type EditProjectFormProps = {
  onClose: () => void;
  initialValues: {
    project_ID: string;
    title: string;
    description: string;
    goals: string;
    research_areas: string;
    start_date: string;
    end_date: string;
    funding_available: boolean;
    requirements?: any[];
  };
  onEdit: (updatedProject: any) => void;
};

export default function EditProjectForm({
  onClose,
  onEdit,
  initialValues,
}: EditProjectFormProps) {
  const [title, setTitle] = useState(initialValues.title);
  const [description, setDescription] = useState(initialValues.description);
  const [goals, setGoals] = useState(initialValues.goals);
  const [research_areas, setResArea] = useState(initialValues.research_areas);
  const [start_date, setStart] = useState(initialValues.start_date);
  const [end_date, setEnd] = useState(initialValues.end_date);
  const [funding_available, setFunding] = useState(initialValues.funding_available);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showRequirementsForm, setShowRequirementsForm] = useState(false);
  const [requirements, setRequirements] = useState(initialValues.requirements || []);

  // Update state when initialValues change
  useEffect(() => {
    setTitle(initialValues.title);
    setDescription(initialValues.description);
    setGoals(initialValues.goals);
    setResArea(initialValues.research_areas);
    setStart(initialValues.start_date);
    setEnd(initialValues.end_date);
    setFunding(initialValues.funding_available);
    setRequirements(initialValues.requirements || []);
  }, [initialValues]);

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Show the requirements form
    setShowRequirementsForm(true);
  };

  // Format date for input field
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  if (showRequirementsForm) {
    const projectData = {
      title,
      description,
      goals,
      research_areas,
      start_date: new Date(start_date).toISOString().split('T')[0],
      end_date: new Date(end_date).toISOString().split('T')[0],
      funding_available
    };

    return (
      <EditReqForm
        projectId={initialValues.project_ID}
        projectData={projectData}
        requirements={requirements}
        onClose={() => {
          setShowRequirementsForm(false);
          onClose();
        }}
        onEdit={onEdit}
      />
    );
  }

  return (
    <main className={styles.createModal}>
      <section className={styles.createBox}>
        <button onClick={onClose} className={styles.closeButton}>
          X
        </button>
        <h1 className={styles.title}>Edit Project</h1>
        <form className={styles.createForm} onSubmit={handleProjectSubmit}>
          <label htmlFor="projName">Project name</label>
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
            value={formatDateForInput(start_date)}
            onChange={(e) => setStart(e.target.value)}
            required
          />

          <label htmlFor="setEnd">End Date</label>
          <input
            type="date"
            id="setEnd"
            value={formatDateForInput(end_date)}
            onChange={(e) => setEnd(e.target.value)}
            required
          />

          <section className={styles.radioContainer}>
            <label htmlFor="Funding">Funding Available *</label>
            <label>
              <input
                type="radio"
                name="funding"
                value="true"
                className={styles.radioInput}
                checked={funding_available === true}
                onChange={() => setFunding(true)}
                required
              />
              Yes
            </label>
            <label>
              <input
                type="radio"
                name="funding"
                value="false"
                className={styles.radioInput}
                checked={funding_available === false}
                onChange={() => setFunding(false)}
              />
              No
            </label>
          </section>

          <button
            type="submit"
            aria-label="submit information"
            disabled={loading}
            style={{ backgroundColor: 'black', color: 'white', border: 'none', borderRadius: 'var(--button-radius)', fontSize: 20, fontWeight: 600 }}
          >
            Next: Edit Requirements
          </button>
          {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
          {success && (
            <div style={{ color: "green", marginTop: 8 }}>
              Project updated successfully!
            </div>
          )}
        </form>
      </section>
    </main>
  );
}
