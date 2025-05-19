"use client";

import styles from "../create-project/page.module.css";
import { useState, useEffect } from "react";
import EditReqForm from "./editReqForm";
import { createPortal } from "react-dom";

export type EditProjectFormProps = {
  onClose: () => void;
  initialValues: {
    project_ID: string;
    name?: string;
    title?: string;
    description?: string;
    goals?: string;
    research_areas?: string;
    start_date?: string;
    end_date?: string;
    funding_available?: boolean;
    requirements?: any[];
  };
  onEdit: (updatedProject: any) => void;
};

export default function EditProjectForm({
  onClose,
  onEdit,
  initialValues,
}: EditProjectFormProps) {
  // setting up all the variables we need to store the form data
  // we use the || operator to provide a fallback value in case the initial value is missing
  const [title, setTitle] = useState(
    initialValues.title || initialValues.name || ""
  );
  const [description, setDescription] = useState(
    initialValues.description || ""
  );
  const [goals, setGoals] = useState(initialValues.goals || "");
  const [research_areas, setResArea] = useState(
    initialValues.research_areas || ""
  );
  const [start_date, setStart] = useState(initialValues.start_date || "");
  const [end_date, setEnd] = useState(initialValues.end_date || "");
  // this is a bit tricky - we check if funding_available exists before using it
  // if it doesn't exist, we default to false
  const [funding_available, setFunding] = useState(
    initialValues.funding_available !== undefined
      ? initialValues.funding_available
      : false
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showRequirementsForm, setShowRequirementsForm] = useState(false);
  const [requirements, setRequirements] = useState(
    initialValues.requirements || []
  );
  const [mounted, setMounted] = useState(false);

  // this runs when the component first appears
  // it adds a class to the body to prevent scrolling while the modal is open
  // and then removes it when the component is closed
  useEffect(() => {
    setMounted(true);
    document.body.classList.add('modal-open');
    
    // cleanup function that runs when component is removed
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  // Update state when initialValues change - this is important if props change without component remounting
  // for example if we edit a different project without closing the modal
  useEffect(() => {
    setTitle(initialValues.title || initialValues.name || "");
    setDescription(initialValues.description || "");
    setGoals(initialValues.goals || "");
    setResArea(initialValues.research_areas || "");
    setStart(initialValues.start_date || "");
    setEnd(initialValues.end_date || "");
    setFunding(
      initialValues.funding_available !== undefined
        ? initialValues.funding_available
        : false
    );
    setRequirements(initialValues.requirements || []);
  }, [initialValues]);

  // this function runs when the user submits the form
  // instead of actually saving right away, we just move to the requirements part
  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // stops the page from refreshing when form is submitted
    setError(null);
    setSuccess(false);

    // Show the requirements form - we don't save yet, just move to next part
    setShowRequirementsForm(true);
  };

  // Helper function to format date for the date input field
  // Dates in HTML inputs need to be in YYYY-MM-DD format
  // this converts whatever date format we have to that format
  const formatDateForInput = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toISOString().split("T")[0]; // gets the date part only, removes the time
  };

  // If we're showing the requirements form, return that instead of this form
  // We do this conditional rendering so we can switch between both forms
  if (showRequirementsForm) {
    // Package up all our project data to pass to the requirements form
    const projectData = {
      title,
      description,
      goals,
      research_areas,
      // Format dates in YYYY-MM-DD format for the API
      start_date: new Date(start_date).toISOString().split("T")[0],
      end_date: new Date(end_date).toISOString().split("T")[0],
      funding_available,
    };

    return (
      <EditReqForm
        projectId={initialValues.project_ID}
        projectData={projectData}
        requirements={requirements}
        onClose={() => {
          setShowRequirementsForm(false); // reset the form state if closed
          onClose();
        }}
        onEdit={onEdit}
      />
    );
  }

  if (!mounted) return null;

  const modalContent = (
    <main className={styles.createModal} data-modal-root>
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

          <section className={styles.radioGroup}>
            <label htmlFor="Funding">Funding Available *</label>
            <section className={styles.radioOptions}>
              <label className={styles.radioContainer}>
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

              <label className={styles.radioContainer}>
                <input
                  type="radio"
                  name="funding"
                  value="false"
                  className={styles.radioInput}
                  checked={funding_available === false}
                  onChange={() => setFunding(false)}
                  required
                />
                No
              </label>
            </section>
          </section>

          <button
            type="submit"
            aria-label="submit information"
            disabled={loading}
            style={{
              backgroundColor: "black",
              color: "white",
              border: "none",
              borderRadius: "var(--button-radius)",
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            Next: Edit Requirements
          </button>
          {error && <section style={{ color: "red", marginTop: 8 }}>{error}</section>}
          {success && (
            <section style={{ color: "green", marginTop: 8 }}>
              Project updated successfully!
            </section>
          )}
        </form>
      </section>
    </main>
  );

  // Use createPortal to render the modal outside the normal DOM hierarchy
  // This helps with z-index and styling so the modal appears on top of everything
  return createPortal(modalContent, document.body);
}
