// This directive tells Next.js to treat this file as a Client Component
"use client";

// Import React and React hooks for state management and side effects
import React, { useState, useEffect } from "react";
// Import useRouter for navigation (not used directly here, but available)
import { useRouter } from "next/navigation";
// Import icon components for UI
import { Calendar, ArrowLeft } from "lucide-react";
// Import CSS module for styling
import styles from "./milestone-details.module.css";
// Import Link for client-side navigation
import Link from "next/link";

// TypeScript interface for a Milestone object
interface Milestone {
  id: string;
  title: string;
  description: string;
  projectId: string;
  projectName: string;
  dueDate: string;

  status: string;
  assigned_user_ID: string | null;
  assigned_user_fname?: string;
  assigned_user_sname?: string;
}
interface Collaborator {
  user_ID: string;
  name: string;
}

// Main component for the milestone details page
export default function MilestoneDetailsPage({
  params,
}: {
  params: { id: string };
}) {
  // Get the router object for navigation (not used in this page, but available)
  const router = useRouter();
  // Get the milestone ID from the URL params
  const { id } = params;

  // State to hold the milestone details (null until loaded)
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  // State to track if the data is still loading
  const [loading, setLoading] = useState(true);
  // State to track any error that occurs
  const [error, setError] = useState<string | null>(null);
  //sstate to open the edit form
  const [showEditForm, setShowEditForm] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // useEffect runs on mount and when the id changes
  useEffect(() => {
    const fetchMilestoneDetails = async () => {
      try {
        const token = localStorage.getItem('jwt');
        const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/milestones/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();
        console.log(data);

        // Transform the single milestone data to match our interface
        const milestoneData = {
          id: String(data.milestone.milestone_ID),
          title: data.milestone.title,
          description: data.milestone.description,
          projectId: String(data.milestone.project_ID),
          projectName: data.milestone.project_title || 'Unknown Project',
          dueDate: data.milestone.expected_completion_date,
          assigned_user_ID: data.milestone.assigned_user_ID,
          assigned_user_fname: data.milestone.assigned_user_fname,
          assigned_user_sname: data.milestone.assigned_user_sname,
          status: data.milestone.status,
        };

        setMilestone(milestoneData);
        setCollaborators(data.collaborators || []);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching milestone details:", err);
        setLoading(false);
      }
    };

    fetchMilestoneDetails();
  }, [id]);

  // Handle form submission for updating milestone
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestone) return;
    
    setSubmitting(true);
    setEditError(null);

    try {
      const token = localStorage.getItem('jwt');
      const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/milestones/${milestone.projectId}/${milestone.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: milestone.title.trim(),
          description: milestone.description.trim(),
          expected_completion_date: milestone.dueDate.split('T')[0],
          assigned_user_ID: milestone.assigned_user_ID || null,
          status: milestone.status || 'Not Started'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update milestone');
      }

      // Refresh the milestone data
      const updatedResponse = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/milestones/${milestone.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const updatedData = await updatedResponse.json();
      const updatedMilestone = {
        id: String(updatedData.milestone.milestone_ID),
        title: updatedData.milestone.title,
        description: updatedData.milestone.description,
        projectId: String(updatedData.milestone.project_ID),
        projectName: updatedData.milestone.project_title || 'Unknown Project',
        dueDate: updatedData.milestone.expected_completion_date,
        assigned_user_ID: updatedData.milestone.assigned_user_ID,
        assigned_user_fname: updatedData.milestone.assigned_user_fname,
        assigned_user_sname: updatedData.milestone.assigned_user_sname,
        status: updatedData.milestone.status,
      };

      setMilestone(updatedMilestone);
      setShowEditForm(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update milestone");
      console.error("Error updating milestone:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading message if data is still being fetched
  if (loading) {
    // If milestone data is still loading, show a loading message

    return (
      <main>
        <section>Loading milestone details...</section>
      </main>
    );
  }

  // Show error message if there was an error or milestone not found
  if (error || !milestone) {
    // If there is an error or the milestone is not found, show an error message and back button
    return (
      <main>
        <section style={{ padding: "2rem" }}>
          {/* Header with back button to milestones list */}
          <header style={{ marginBottom: "1.5rem" }}>
            <Link
              href="/milestones"
              style={{
                display: "flex",
                alignItems: "center",
                color: "#555",
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={20} style={{ marginRight: 8 }} />
              <span>Back to Milestones</span>
            </Link>
          </header>
          {/* Error message section */}

          <section
            style={{
              background: "#fdeaea",
              border: "1px solid #f5c2c7",
              color: "#b94a48",
              padding: "0.75rem 1rem",
              borderRadius: 8,
            }}
          >
            {error || "Milestone not found"}
          </section>
        </section>
      </main>
    );
  }

  // Main milestone details page rendering
  return (
    // Main wrapper for the milestone details page, applies background styles
    <main className={styles.milestoneDetailsBg}>
      {/* Section to constrain width and center content */}
      <section className="container mx-auto px-4 py-8">
        {/* Header row with back button and title */}
        <header className={styles.headerRow}>
          {/* Link to go back to the milestones list */}
          <Link href="/milestones" className={styles.backArrow}>
            <ArrowLeft size={22} />
          </Link>
          <span>Milestone Details</span>
        </header>
        {/* Centered card for milestone details */}
        <section className={styles.centerCard}>
          {/* Card-like section for milestone info */}
          <section className={styles.card}>
            {/* Milestone title as heading */}
            <h1 className={styles.title}>{milestone.title}</h1>

            <h2 className={styles.projectName}>
              Project: {milestone.projectName}
            </h2>
            <h2 className={styles.projectName}>
              Assigned To: {milestone.assigned_user_fname && milestone.assigned_user_sname 
                ? `${milestone.assigned_user_fname} ${milestone.assigned_user_sname}`
                : "Not Assigned"}
            </h2>
            {/* Description label and text */}
            <label className={styles.label}>Description</label>
            <section className={styles.description}>
              {milestone.description}
            </section>
            {/* Due date row with icon and formatted date */}
            <section className={styles.dueDateRow}>
              <span className={styles.label}>Due Date</span>
              <Calendar size={18} className={styles.dueDateIcon} />
              <span>{new Date(milestone.dueDate).toLocaleDateString()}</span>
            </section>
            {/* Status of the project with background changing depending on the status */}
            <section
              className={`${styles.status} ${
                milestone.status === "Completed"
                  ? styles.completed
                  : milestone.status === "In Progress"
                  ? styles.inProgress
                  : milestone.status === "notStarted"
                  ? styles.notStarted
                  : styles.missing
              }`}
            >
              {milestone.status || "Missing Status"}
            </section>
            <button
              onClick={() => setShowEditForm(true)}
              className={styles.editButton}
            >
              Edit
            </button>
          </section>
        </section>
      </section>
      {/* edit form */}
      {showEditForm && (
        <section className={styles.overlay}>
          <section className={styles.modal}>
            <section className={styles.centerForm}>
              <form
                className={styles.cardForm}
                onSubmit={handleEditSubmit}
              >
                <h1 className={styles.formTitle}>Edit {milestone.title}</h1>
                {editError && (
                  <section
                    style={{
                      background: "#fdeaea",
                      border: "1px solid #f5c2c7",
                      color: "#b94a48",
                      padding: "0.75rem 1rem",
                      borderRadius: 8,
                      marginBottom: 18,
                    }}
                  >
                    {editError}
                  </section>
                )}
                <label className={styles.label}>Title</label>
                <input
                  type="text"
                  className={styles.input}
                  value={milestone.title}
                  onChange={(e) =>
                    setMilestone({ ...milestone, title: e.target.value })
                  }
                  required
                />

                <label className={styles.label}>Description</label>
                <textarea
                  className={styles.input}
                  value={milestone.description}
                  onChange={(e) =>
                    setMilestone({ ...milestone, description: e.target.value })
                  }
                  required
                />

                <label className={styles.label}>Due Date</label>
                <input
                  type="date"
                  className={styles.input}
                  value={milestone.dueDate.split('T')[0]}
                  onChange={(e) =>
                    setMilestone({ ...milestone, dueDate: e.target.value })
                  }
                  required
                />

                <label className={styles.label}>Status</label>
                <select
                  className={styles.input}
                  value={milestone.status}
                  onChange={(e) =>
                    setMilestone({ ...milestone, status: e.target.value })
                  }
                  required
                >
                  <option value="Not Started">Not Started</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>

                <label className={styles.label}>Assign To</label>
                <select
                  className={styles.input}
                  value={milestone.assigned_user_ID || ""}
                  onChange={(e) =>
                    setMilestone({ ...milestone, assigned_user_ID: e.target.value || null })
                  }
                >
                  <option value="">Not Assigned</option>
                  {collaborators.map((collab) => (
                    <option key={collab.user_ID} value={collab.user_ID}>
                      {collab.name}
                    </option>
                  ))}
                </select>

                <div className={styles.buttonRow}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setShowEditForm(false)}
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={styles.saveBtn}
                    disabled={submitting}
                  >
                    {submitting ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </section>
          </section>
        </section>
      )}
    </main>
  );
}
