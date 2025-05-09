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
}

// Main component for the milestone details page
export default function MilestoneDetailsPage({ params }: { params: { id: string } }) {
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

    // useEffect runs on mount and when the id changes
  useEffect(() => {
        // Fetch milestone details from mock data
    const fetchMilestoneDetails = async () => {
      try {

        // This will be replaced with actual API call later
        // const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/milestones/${id}`, {
        //   headers: {
        //     'Authorization': `Bearer ${token}`
        //   }
        // });
        
        // Mock data for now (from user)
                // Mock data simulating a response from an API
        const mockData = {
          "projects": [
            {
              "project_ID": 1,
              "title": "AI for Healthcare",
              "milestones": [
                {
                  "milestone_ID": 10,
                  "project_ID": 1,
                  "title": "Literature Review",
                  "description": "Review existing AI models.",
                  "expected_completion_date": "2024-07-01",
                  "assigned_user_ID": "user123",
                  "status": "Completed",
                  "created_at": "2024-05-01T10:00:00.000Z",
                  "updated_at": "2024-06-01T10:00:00.000Z"
                },
                {
                  "milestone_ID": 11,
                  "project_ID": 1,
                  "title": "Data Collection",
                  "description": "Collect patient data.",
                  "expected_completion_date": "2024-08-01",
                  "assigned_user_ID": "user124",
                  "status": "In Progress",
                  "created_at": "2024-06-01T10:00:00.000Z",
                  "updated_at": "2024-06-15T10:00:00.000Z"
                }
              ]
            },
            {
              "project_ID": 2,
              "title": "Robotics Lab",
              "milestones": []
            }
          ]
        };
        // Flatten milestones from all projects into a single array of milestone objects
        const allMilestones = mockData.projects.flatMap(project =>
          // For each project, map its milestones to a common format
          (project.milestones || []).map(milestone => ({
            id: String(milestone.milestone_ID), // Convert milestone ID to string
            title: milestone.title, // Milestone title
            description: milestone.description, // Milestone description
            projectId: String(project.project_ID), // Project ID as string
            projectName: project.title, // Project name
            dueDate: milestone.expected_completion_date // Due date in YYYY-MM-DD
          }))
        );
        // Find the milestone object that matches the ID from the URL params
        const found = allMilestones.find(m => m.id === id);
        // If no milestone is found, throw an error to show 'Milestone not found'
        if (!found) {
          throw new Error('Milestone not found');
        }
        // Set the found milestone object in state so it can be rendered
        setMilestone(found);
        // Set loading to false to indicate data is ready
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching milestone details:', err);
        setLoading(false);
      }
    };

        // Call the async function to fetch milestone details
    fetchMilestoneDetails();
  }, [id]);

  // Show loading message if data is still being fetched
  if (loading) {
    // If milestone data is still loading, show a loading message
    return <main><section>Loading milestone details...</section></main>;
  }

  // Show error message if there was an error or milestone not found
  if (error || !milestone) {
    // If there is an error or the milestone is not found, show an error message and back button
    return (
      <main>
        <section style={{padding:'2rem'}}>
          {/* Header with back button to milestones list */}
          <header style={{marginBottom:'1.5rem'}}>
            <Link href="/milestones" style={{display:'flex',alignItems:'center',color:'#555',textDecoration:'none'}}>
              <ArrowLeft size={20} style={{marginRight:8}} />
              <span>Back to Milestones</span>
            </Link>
          </header>
          {/* Error message section */}
          <section style={{background:'#fdeaea',border:'1px solid #f5c2c7',color:'#b94a48',padding:'0.75rem 1rem',borderRadius:8}}>
            {error || 'Milestone not found'}
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
            {/* Project name as subheading */}
            <h2 className={styles.projectName}>Project: {milestone.projectName}</h2>
            {/* Description label and text */}
            <label className={styles.label}>Description</label>
            <section className={styles.description}>{milestone.description}</section>
            {/* Due date row with icon and formatted date */}
            <section className={styles.dueDateRow}>
              <span className={styles.dueDateLabel}>Due Date</span>
              <Calendar size={18} className={styles.dueDateIcon} />
              <span>{new Date(milestone.dueDate).toLocaleDateString()}</span>
            </section>
          </section>
        </section>
      </section>
    </main>
  );
}


