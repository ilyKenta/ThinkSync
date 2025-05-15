"use client";

import React, { useState, useEffect } from "react";

import { useRouter } from "next/navigation";

import { Calendar, ArrowLeft } from "lucide-react";
import styles from "./create-milestone.module.css";

import Link from "next/link";

interface Project {
  project_ID: string;
  title: string;
  collaborators: Collaborator[];
}

interface Collaborator {
  user_ID: string;
  name: string;
}

// create milestone page
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
  const [selectedProjectCollaborators, setSelectedProjectCollaborators] = useState<Collaborator[]>([]);

  //  fetch projects
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem('jwt');
        const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/milestones`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        console.log(data);

        // Extract projects with their collaborators
        const projectsList = data.projects.map((project: any) => ({
          project_ID: String(project.project_ID),
          title: project.title,
          collaborators: project.collaborators.map((collab: any) => ({
            user_ID: collab.user_ID,
            name: `${collab.first_name} ${collab.last_name}`
          }))
        }));

        setProjects(projectsList);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching projects:", err);
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  // Update collaborators when project is selected
  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedProjectId = e.target.value;
    setProjectId(selectedProjectId);
    setCollaborators(""); // Reset selected collaborator when project changes
    
    if (selectedProjectId) {
      const selectedProject = projects.find(p => p.project_ID === selectedProjectId);
      if (selectedProject) {
        setSelectedProjectCollaborators(selectedProject.collaborators);
      }
    } else {
      setSelectedProjectCollaborators([]);
    }
  };

  // Handle form submission for creating a milestone
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null); // Clear any previous errors

    try {
      const token = localStorage.getItem('jwt');
      const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/milestones/${projectId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          expected_completion_date: dueDate,
          assigned_user_ID: collaborators || null, // Send null if no collaborator selected
          status: status || 'Not Started' // Default to 'Not Started' if no status selected
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create milestone');
      }

      router.push("/milestones");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create milestone");
      console.error("Error creating milestone:", err);
      setSubmitting(false);
    }
  };

  // Show loading message if data is still being fetched
  if (loading && !error) {
    return (
      <main>
        <article>Loading projects...</article>
      </main>
    );
  }

  // Main create milestone page rendering
  return (
    // Main wrapper for the create milestone page
    <main className={styles.createMilestoneBg}>
      {/* Section to constrain width and center content */}
      <article className="container mx-auto px-4 py-8">
        {/* Header row with back button */}
        <header className={styles.backRow}>
          {/* Link to go back to the milestones list */}
          <Link href="/milestones" className={styles.backArrow}>
            <ArrowLeft size={20} />
          </Link>
          <strong>Back</strong>
        </header>
        {/* Center the form vertically and horizontally */}
        <section className={styles.centerForm}>
          <article className={styles.formCard}>
            <h1 className={styles.formTitle}>Create New Milestone</h1>

            {error && (
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
                {error}
              </aside>
            )}

            <form onSubmit={handleSubmit}>
              <label className={styles.label}>Project</label>
              <select
                className={styles.input}
                value={projectId}
                onChange={handleProjectChange}
                required
              >
                <option value="" disabled>
                  Select a project
                </option>
                {projects.map((project) => (
                  <option key={project.project_ID} value={project.project_ID}>
                    {project.title}
                  </option>
                ))}
              </select>

              <label className={styles.label}>Title</label>
              <input
                type="text"
                className={styles.input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Milestone title"
                required
              />

              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe this milestone"
                required
              />

              <label className={styles.label}>Due Date</label>
              <figure style={{ position: "relative", display: "block" }}>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </figure>

              <label className={styles.label}>Status</label>
              <select
                className={`${styles.status} ${
                  status === "Completed"
                    ? styles.completed
                    : status === "In Progress"
                    ? styles.inProgress
                    : status === "Not Started"
                    ? styles.notStarted
                    : ""
                }`}
                required
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value=""></option>
                <option value="Not Started">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
              </select>

              <label className={styles.label}>Assign Collaborators</label>
              <select
                className={styles.status}
                required
                onChange={(e) => setCollaborators(e.target.value)}
                disabled={!projectId}
              >
                <option value="">Select a collaborator</option>
                {selectedProjectCollaborators.map((collab) => (
                  <option key={collab.user_ID} value={collab.user_ID}>
                    {collab.name}
                  </option>
                ))}
              </select>

              <nav className={styles.buttonRow}>
                <Link href="/milestones" className={styles.cancelBtn}>
                  Cancel
                </Link>
                <button
                  type="submit"
                  className={styles.createBtn}
                  disabled={submitting}
                >
                  {submitting ? "Creating..." : "Create Milestone"}
                </button>
              </nav>
            </form>
          </article>
        </section>
      </article>
    </main>
  );
}
