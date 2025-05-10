// This directive tells Next.js to treat this file as a Client Component
"use client";

// Import React and React hooks for state management and side effects
import React, { useState, useEffect } from "react";
// Import useRouter for navigation after form submission
import { useRouter } from "next/navigation";
// Import icon components for UI
import { Calendar, ArrowLeft } from "lucide-react";
// Import CSS module for styling
import styles from "./create-milestone.module.css";
// Import Link for client-side navigation
import Link from "next/link";

// TypeScript interface for a Project object
interface Project {
  project_ID: string;
  title: string;
}

// Main component for the create milestone page
export default function CreateMilestonePage() {
  // Get the router object for navigation after form submission
  const router = useRouter();

  // State for the milestone title input
  const [title, setTitle] = useState("");
  // State for the milestone description input
  const [description, setDescription] = useState("");
  // State for the selected project ID (not used in UI, but could be for multi-project support)
  const [projectId, setProjectId] = useState("");
  // State for the milestone due date input
  const [dueDate, setDueDate] = useState("");
  // State for the list of available projects (not shown in UI, but could be used for a dropdown)
  const [projects, setProjects] = useState<Project[]>([]);
  // State to track if the data is still loading
  const [loading, setLoading] = useState(true);
  // State to track if the form is being submitted
  const [submitting, setSubmitting] = useState(false);
  // State to track any error that occurs
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [collaborators, setCollaborators] = useState("");

  // useEffect runs on mount to fetch projects (not shown in UI)
  useEffect(() => {
    // Fetch all projects from mock data (not used in UI)
    const fetchProjects = async () => {
      try {
        // This will be replaced with actual API call later
        // const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/projects/owner`, {
        //   headers: {
        //     'Authorization': `Bearer ${token}`
        //   }
        // });

        // Mock data for now
        // Mock data simulating a response from an API
        const mockProjects = [
          {
            project_ID: "1",
            title: "Quantum Computing Research",
          },
          {
            project_ID: "2",
            title: "Climate Change Study",
          },
        ];

        setProjects(mockProjects);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching projects:", err);
        setLoading(false);
      }
    };

    // Call the async function to fetch projects
    fetchProjects();
  }, []);

  // Handle form submission for creating a milestone
  const handleSubmit = async (e: React.FormEvent) => {
    // Prevent default form submission behavior
    e.preventDefault();
    // Set submitting state to true to disable the button
    setSubmitting(true);

    try {
      // This will be replaced with actual API call later
      // const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/milestones`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`
      //   },
      //   body: JSON.stringify({ title, description, projectId, dueDate })
      // });

      // Simulate successful API call
      // Simulate a successful API call with a delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Navigate back to milestones page
      // Navigate back to the milestones page after creation
      router.push("/milestones");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create milestone"
      );
      console.error("Error creating milestone:", err);
      setSubmitting(false);
    }
  };

  // Show loading message if data is still being fetched
  // Show loading message if data is still being fetched
  if (loading && !error) {
    return (
      <main>
        <section>Loading projects...</section>
      </main>
    );
  }

  // Main create milestone page rendering
  return (
    // Main wrapper for the create milestone page, applies background styles
    <main className={styles.createMilestoneBg}>
      {/* Section to constrain width and center content */}
      <section className="container mx-auto px-4 py-8">
        {/* Header row with back button */}
        <header className={styles.backRow}>
          {/* Link to go back to the milestones list */}
          <Link href="/milestones" className={styles.backArrow}>
            <ArrowLeft size={20} />
          </Link>
          <span>Back</span>
        </header>
        {/* Center the form vertically and horizontally */}
        <section className={styles.centerForm}>
          {/* Card-like section for the form content */}
          <section className={styles.formCard}>
            {/* Title for the form */}
            <h1 className={styles.formTitle}>Create New Milestone</h1>
            {/* If there is an error, show it above the form */}
            {error && (
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
                {error}
              </section>
            )}
            {/* The milestone creation form */}
            <form onSubmit={handleSubmit}>
              {/* Title input field */}
              <label className={styles.label}>Title</label>
              <input
                type="text"
                className={styles.input}
                value={title} // State for the title
                onChange={(e) => setTitle(e.target.value)} // Update state on change
                placeholder="Milestone title"
                required
              />
              {/* Description textarea field */}
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textarea}
                value={description} // State for the description
                onChange={(e) => setDescription(e.target.value)} // Update state on change
                placeholder="Describe this milestone"
                required
              />
              {/* Due date input field */}
              <label className={styles.label}>Due Date</label>
              <span style={{ position: "relative", display: "block" }}>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={dueDate} // State for the due date
                  onChange={(e) => setDueDate(e.target.value)} // Update state on change
                  required
                />
              </span>
              {/* Choose the status of the project */}
              <label className={styles.label}>Status</label>

              <select
                className={styles.status}
                required
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value=""></option>
                <option value="science">Not Started</option>
                <option value="health-science">In Progress</option>
                <option value="commerce">Completed</option>
              </select>
              {/* Choose the collaborators to work on a milestone */}
              {/* WAITJNG FOR ENDPOINT */}
              <label className={styles.label}>Assign Collaborators</label>

              <select
                className={styles.status}
                required
                onChange={(e) => setCollaborators(e.target.value)}
              >
                <option value=""></option>
                <option value="science">Not Started</option>
                <option value="health-science">In Progress</option>
                <option value="commerce">Completed</option>
              </select>

              {/* Row of action buttons: cancel and submit */}
              <section className={styles.buttonRow}>
                {/* Cancel button navigates back to milestones */}
                <Link href="/milestones" className={styles.cancelBtn}>
                  Cancel
                </Link>
                {/* Submit button creates the milestone; disabled while submitting */}
                <button
                  type="submit"
                  className={styles.createBtn}
                  disabled={submitting}
                >
                  {submitting ? "Creating..." : "Create Milestone"}
                </button>
              </section>
            </form>
          </section>
        </section>
      </section>
    </main>
  );
}
