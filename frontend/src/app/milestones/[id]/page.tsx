// This directive tells Next.js to treat this file as a Client Component
"use client";

// Import React and React hooks for state management and side effects
import React, { useState, useEffect } from "react";
// Import useRouter for navigation (not used directly here, but available)
import { useRouter, useSearchParams } from "next/navigation";
// Import icon components for UI
import { Calendar, ArrowLeft } from "lucide-react";
// Import CSS module for styling
import styles from "./milestone-details.module.css";

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
  const searchParams = useSearchParams();
  // Get the milestone ID from the URL params
  const { id } = params;
  const fromCustomDashboard = searchParams.get('from') === 'custom-dashboard';

  // State to hold the milestone details (null until loaded)
  const [milestone, setMilestone] = useState<Milestone | null>(null);
  // State to track if the data is still loading
  const [loading, setLoading] = useState(true);
  // State to track any error that occurs
  const [error, setError] = useState<string | null>(null);
  //sstate to open the edit form
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Add validation state
  const [validationErrors, setValidationErrors] = useState<{
    title?: string;
    description?: string;
    dueDate?: string;
    status?: string;
    assigned_user_ID?: string;
  }>({});

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

  // Validate form inputs
  const validateForm = () => {
    if (!milestone) return false;
    
    const errors: typeof validationErrors = {};
    let isValid = true;

    // Validate title
    if (!milestone.title.trim()) {
      errors.title = "Title is required";
      isValid = false;
    } else if (milestone.title.length > 100) {
      errors.title = "Title must be less than 100 characters";
      isValid = false;
    } else if (!/^[a-zA-Z0-9\s\-_.,&()]+$/.test(milestone.title)) {
      errors.title = "Title contains invalid characters. Only letters, numbers, spaces, and basic punctuation are allowed";
      isValid = false;
    }

    // Validate description
    if (!milestone.description.trim()) {
      errors.description = "Description is required";
      isValid = false;
    } else if (milestone.description.length > 500) {
      errors.description = "Description must be less than 500 characters";
      isValid = false;
    }

    // Validate due date
    if (!milestone.dueDate) {
      errors.dueDate = "Due date is required";
      isValid = false;
    } else {
      const selectedDate = new Date(milestone.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        errors.dueDate = "Due date cannot be in the past";
        isValid = false;
      }
    }

    // Validate status
    if (!milestone.status) {
      errors.status = "Status is required";
      isValid = false;
    } else if (!["Not Started", "In Progress", "Completed"].includes(milestone.status)) {
      errors.status = "Invalid status selected";
      isValid = false;
    }

    // Validate assigned user (optional)
    if (milestone.assigned_user_ID && !collaborators.some(c => c.user_ID === milestone.assigned_user_ID)) {
      errors.assigned_user_ID = "Invalid collaborator selected";
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  // Handle form submission for updating milestone
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!milestone) return;
    
    setSubmitting(true);
    setEditError(null);
    setValidationErrors({});

    // Validate form before submission
    if (!validateForm()) {
      setSubmitting(false);
      return;
    }

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
          status: milestone.status
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

  // Handle milestone deletion
  const handleDelete = async () => {
    if (!milestone) return;
    
    setDeleting(true);
    setDeleteError(null);

    try {
      const token = localStorage.getItem('jwt');
      const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/milestones/${milestone.projectId}/${milestone.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete milestone');
      }

      if (fromCustomDashboard) {
        router.push('/custom-dashboard');
      } else {
        router.push('/milestones');
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete milestone");
      console.error("Error deleting milestone:", err);
    } finally {
      setDeleting(false);
    }
  };

  const handleBack = () => {
    if (fromCustomDashboard) {
      router.push('/custom-dashboard');
    } else {
      router.push('/milestones');
    }
  };

  // Show loading message if data is still being fetched
  if (loading) {
    return (
      <main>
        <article>Loading milestone details...</article>
      </main>
    );
  }

  // Show error message if there was an error or milestone not found
  if (error || !milestone) {
    return (
      <main>
        <article style={{ padding: "2rem" }}>
          <header style={{ marginBottom: "1.5rem" }}>
            <button
              onClick={handleBack}
              style={{
                display: "flex",
                alignItems: "center",
                color: "#555",
                textDecoration: "none",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <ArrowLeft size={20} style={{ marginRight: 8 }} />
              <strong>Back</strong>
            </button>
          </header>

          <aside
            style={{
              background: "#fdeaea",
              border: "1px solid #f5c2c7",
              color: "#b94a48",
              padding: "0.75rem 1rem",
              borderRadius: 8,
            }}
          >
            {error || "Milestone not found"}
          </aside>
        </article>
      </main>
    );
  }

  return (
    <main className={styles.milestoneDetailsBg}>
      <article className="container mx-auto px-4 py-8">
        <header className={styles.headerRow}>
          <button onClick={handleBack} className={styles.backArrow}>
            <ArrowLeft size={22} />
          </button>
          <h1>Milestone Details</h1>
        </header>

        <section className={styles.centerCard}>
          <article className={styles.card}>
            <h2 className={styles.title}>{milestone.title}</h2>

            <h3 className={styles.projectName}>
              Project: {milestone.projectName}
            </h3>
            <h3 className={styles.projectName}>
              Assigned To: {milestone.assigned_user_fname && milestone.assigned_user_sname 
                ? `${milestone.assigned_user_fname} ${milestone.assigned_user_sname}`
                : "Not Assigned"}
            </h3>

            <label className={styles.label}>Description</label>
            <article className={styles.description}>
              {milestone.description}
            </article>

            <article className={styles.dueDateRow}>
              <strong className={styles.label}>Due Date</strong>
              <Calendar size={18} className={styles.dueDateIcon} />
              <time>{new Date(milestone.dueDate).toLocaleDateString()}</time>
            </article>

            <aside
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
            </aside>

            <nav className={styles.buttonRow} style={{ marginTop: '1.5rem', gap: '1rem', justifyContent: 'flex-start' }}>
              <button
                onClick={() => setShowEditForm(true)}
                className={styles.editButton}
              >
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className={styles.editButton}
                style={{ backgroundColor: '#dc3545' }}
              >
                Delete
              </button>
            </nav>
          </article>
        </section>
      </article>

      {showEditForm && (
        <aside className={styles.overlay}>
          <article className={styles.modal}>
            <section className={styles.centerForm}>
              <form
                className={styles.cardForm}
                onSubmit={handleEditSubmit}
              >
                <h2 className={styles.formTitle}>Edit {milestone.title}</h2>
                {editError && (
                  <aside
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
                  </aside>
                )}

                <label className={styles.label}>Title</label>
                <input
                  type="text"
                  className={`${styles.input} ${validationErrors.title ? styles.inputError : ''}`}
                  value={milestone.title}
                  onChange={(e) =>
                    setMilestone({ ...milestone, title: e.target.value })
                  }
                  maxLength={100}
                  required
                />
                {validationErrors.title && (
                  <p className={styles.errorMessage}>{validationErrors.title}</p>
                )}

                <label className={styles.label}>Description</label>
                <textarea
                  className={`${styles.input} ${validationErrors.description ? styles.inputError : ''}`}
                  value={milestone.description}
                  onChange={(e) =>
                    setMilestone({ ...milestone, description: e.target.value })
                  }
                  maxLength={500}
                  required
                />
                {validationErrors.description && (
                  <p className={styles.errorMessage}>{validationErrors.description}</p>
                )}

                <label className={styles.label}>Due Date</label>
                <input
                  type="date"
                  className={`${styles.input} ${validationErrors.dueDate ? styles.inputError : ''}`}
                  value={milestone.dueDate.split('T')[0]}
                  onChange={(e) =>
                    setMilestone({ ...milestone, dueDate: e.target.value })
                  }
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
                {validationErrors.dueDate && (
                  <p className={styles.errorMessage}>{validationErrors.dueDate}</p>
                )}

                <label className={styles.label}>Status</label>
                <select
                  className={`${styles.input} ${validationErrors.status ? styles.inputError : ''}`}
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
                {validationErrors.status && (
                  <p className={styles.errorMessage}>{validationErrors.status}</p>
                )}

                <label className={styles.label}>Assign To</label>
                <select
                  className={`${styles.input} ${validationErrors.assigned_user_ID ? styles.inputError : ''}`}
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
                {validationErrors.assigned_user_ID && (
                  <p className={styles.errorMessage}>{validationErrors.assigned_user_ID}</p>
                )}

                <nav className={styles.buttonRow}>
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
                </nav>
              </form>
            </section>
          </article>
        </aside>
      )}

      {showDeleteConfirm && (
        <aside className={styles.overlay}>
          <article className={styles.modal}>
            <section className={styles.centerForm}>
              <form
                className={styles.cardForm}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleDelete();
                }}
              >
                <h2 className={styles.formTitle}>Delete Milestone</h2>
                {deleteError && (
                  <aside
                    style={{
                      background: "#fdeaea",
                      border: "1px solid #f5c2c7",
                      color: "#b94a48",
                      padding: "0.75rem 1rem",
                      borderRadius: 8,
                      marginBottom: 18,
                    }}
                  >
                    {deleteError}
                  </aside>
                )}

                <p style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
                  Are you sure you want to delete this milestone? This action cannot be undone.
                </p>

                <nav className={styles.buttonRow}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className={styles.saveBtn}
                    style={{ backgroundColor: '#dc3545' }}
                    disabled={deleting}
                  >
                    {deleting ? "Deleting..." : "Delete Milestone"}
                  </button>
                </nav>
              </form>
            </section>
          </article>
        </aside>
      )}
    </main>
  );
}
