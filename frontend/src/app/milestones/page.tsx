// This directive tells Next.js to treat this file as a Client Component
"use client";

// Import React and React hooks for state management and side effects
import React, { useState, useEffect } from "react";
// Import useRouter for navigation to milestone detail pages
import { useRouter } from "next/navigation";
// Import icon components for UI
import { Calendar, ArrowLeft } from "lucide-react";
// Import Link for client-side navigation
import Link from "next/link";
// Import CSS module for styling
import styles from "./Milestones.module.css";

// TypeScript interface for a Milestone object
interface Milestone {
  id: string;
  title: string;
  description: string;
  projectId: string;
  projectName: string;
  dueDate: string;
  status: string;
  assigned_user_ID: string;
}

// TypeScript interface for a Project object
interface Project {
  project_ID: string;
  title: string;
}

// Main component for the milestones page
export default function MilestonesPage() {
  // Get the router object for navigation
  const router = useRouter();
  // State to hold the list of all milestones
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  // State to track if the data is still loading
  const [loading, setLoading] = useState(true);
  // State to track any error that occurs
  const [error, setError] = useState<string | null>(null);

  // useEffect runs on mount to fetch milestones
  useEffect(() => {
    // Fetch all milestones from mock data
    const fetchMilestones = async () => {
      try {
        // This will be replaced with actual API call later
        // const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/milestones`, {
        //   headers: {
        //     'Authorization': `Bearer ${token}`
        //   }
        // });

        // Mock data for now (from user)
        // Mock data simulating a response from an API
        const mockData = {
          projects: [
            {
              project_ID: 1,
              title: "AI for Healthcare",
              milestones: [
                {
                  milestone_ID: 10,
                  project_ID: 1,
                  title: "Literature Review",
                  description: "Review existing AI models.",
                  expected_completion_date: "2024-07-01",
                  assigned_user_ID: "user123",
                  status: "Completed",
                  created_at: "2024-05-01T10:00:00.000Z",
                  updated_at: "2024-06-01T10:00:00.000Z",
                },
                {
                  milestone_ID: 11,
                  project_ID: 1,
                  title: "Data Collection",
                  description: "Collect patient data.",
                  expected_completion_date: "2024-08-01",
                  assigned_user_ID: "user124",
                  status: "In Progress",
                  created_at: "2024-06-01T10:00:00.000Z",
                  updated_at: "2024-06-15T10:00:00.000Z",
                },
              ],
            },
            {
              project_ID: 2,
              title: "Robotics Lab",
              milestones: [],
            },
          ],
        };
        // Flatten milestones from all projects and map to the Milestone interface
        const mockMilestones = mockData.projects.flatMap((project) =>
          (project.milestones || []).map((milestone) => ({
            id: String(milestone.milestone_ID),
            title: milestone.title,
            description: milestone.description,
            projectId: String(project.project_ID),
            projectName: project.title,
            dueDate: milestone.expected_completion_date,
            assignCollab: milestone.assigned_user_ID,
            currentStatus: milestone.status,
            assigned_user_ID: "user123",
            status: "Completed",
          }))
        );
        setMilestones(mockMilestones);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching milestones:", err);
        setLoading(false);
      }
    };

    // Call the async function to fetch milestones
    fetchMilestones();
  }, []);

  // Group milestones by project
  // Group milestones by their project name for display
  const groupedMilestones = milestones.reduce<Record<string, Milestone[]>>(
    (acc, milestone) => {
      if (!acc[milestone.projectName]) {
        acc[milestone.projectName] = [];
      }
      acc[milestone.projectName].push(milestone);
      return acc;
    },
    {}
  );

  // Show loading message if data is still being fetched
  // Show loading message if data is still being fetched
  if (loading) {
    return (
      <main>
        <section>Loading milestones...</section>
      </main>
    );
  }

  // Show error message if there was an error fetching data
  // Show error message if there was an error fetching data
  if (error) {
    return (
      <main>
        <section>Error: {error}</section>
      </main>
    );
  }

  // Main milestones page rendering
  return (
    // Main wrapper for the milestones page, applies background styles
    <main className={styles.milestonesBg}>
      {/* Section to constrain width and center content */}
      <section className={styles.maxWidth}>
        {/* Header row containing the back button, page title, and create milestone button */}
        <header className={styles.headerRow}>
          {/* Flex row: back arrow and page title */}
          <span style={{ display: "flex", alignItems: "center" }}>
            {/* Link to go back to the researcher dashboard */}
            <Link href="/researcher-dashboard" style={{ marginRight: 12 }}>
              <ArrowLeft size={22} />
            </Link>
            {/* Main page title */}
            <span className={styles.pageTitle}>Project Milestones</span>
          </span>
          {/* Button to navigate to the create milestone page */}
          <Link
            href="/milestones/create"
            className={styles.createBtn}
            data-testid="create-milestone-button"
          >
            <span style={{ fontSize: "1.35em", marginRight: 8, marginTop: -2 }}>
              +
            </span>{" "}
            Create Milestone
          </Link>
        </header>

        {/* If there are no milestones, show a friendly empty state message */}
        {Object.entries(groupedMilestones).length === 0 ? (
          <section
            style={{
              textAlign: "center",
              padding: "2rem",
              border: "1px solid #eee",
              borderRadius: 8,
            }}
          >
            <p className="text-gray-500">
              No milestones found. Create your first milestone!
            </p>
          </section>
        ) : (
          // Otherwise, render each project's milestones as a card containing a table
          <>
            {/* Iterate over each project group */}
            {Object.entries(groupedMilestones).map(
              ([projectName, projectMilestones]) => (
                // Card section for each project
                <section key={projectName} className={styles.card}>
                  {/* Project name as a heading */}
                  <h2 className={styles.projectTitle}>{projectName}</h2>
                  {/* Table of milestones for this project */}
                  <table className={styles.milestoneTable}>
                    <thead>
                      <tr>
                        <th>Title</th>
                        <th>Description</th>
                        <th>Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Render each milestone as a clickable row */}
                      {projectMilestones.map((milestone, idx) => (
                        <tr
                          key={milestone.id} // Unique key for React
                          // When row is clicked, navigate to the milestone details page
                          onClick={() =>
                            router.push(`/milestones/${milestone.id}`)
                          }
                          style={{ cursor: "pointer" }}
                        >
                          {/* Milestone title */}
                          <td className={styles.milestoneTitle}>
                            {milestone.title}
                          </td>
                          {/* Milestone description */}
                          <td>{milestone.description}</td>
                          {/* Due date with calendar icon */}
                          <td>
                            <span className={styles.dueDate}>
                              <Calendar
                                size={16}
                                style={{ marginRight: 4, marginBottom: -2 }}
                              />
                              {new Date(milestone.dueDate).toLocaleDateString()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </section>
              )
            )}
          </>
        )}
      </section>
    </main>
  );
}
