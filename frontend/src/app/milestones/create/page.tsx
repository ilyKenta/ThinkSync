
"use client";


import React, { useState, useEffect } from "react";

import { useRouter } from "next/navigation";

import { Calendar, ArrowLeft } from "lucide-react";
import styles from "./create-milestone.module.css";

import Link from "next/link";


interface Project {
  project_ID: string;
  title: string;
}

// create milestone page
export default function CreateMilestonePage() {
  const router = useRouter();
  
    //  milestone title input
  const [title, setTitle] = useState("");
    // milestone description input
  const [description, setDescription] = useState("");
   
  const [projectId, setProjectId] = useState("");
    
  const [dueDate, setDueDate] = useState("");
   
  const [projects, setProjects] = useState<Project[]>([]);
    // track if the data is still loading
  const [loading, setLoading] = useState(true);
    //  form is being submitted
  const [submitting, setSubmitting] = useState(false);
    
  const [error, setError] = useState<string | null>(null);

    //  fetch projects 
  useEffect(() => {
    const fetchProjects = async () => {
      try {
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
        const mockProjects = mockData.projects.map(p => ({
          project_ID: String(p.project_ID),
          title: p.title
        }));
        setProjects(mockProjects);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching projects:', err);
        setLoading(false);
      }
    };

        // Call the async function to fetch projects
    fetchProjects();
  }, []);

  
  const handleSubmit = async (e: React.FormEvent) => {
     
    e.preventDefault();
   
    setSubmitting(true);
    
    try {

      //  replaced with actual API call later
      // const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/milestones`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`
      //   },
      //   body: JSON.stringify({ title, description, projectId, dueDate })
      // });
      
      // Simulate successful API call
           
      await new Promise(resolve => setTimeout(resolve, 500));
      
    
      router.push('/milestones');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create milestone');
      console.error('Error creating milestone:', err);
      setSubmitting(false);
    }
  };

  
  if (loading && !error) {
    return <main><section>Loading projects...</section></main>;
  }

  // Main create milestone page rendering
  return (
    // Main wrapper for the create milestone page
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
          {}
          <section className={styles.formCard}>
            {}
            <h1 className={styles.formTitle}>Create New Milestone</h1>
            {}
            {error && (
              <section style={{background:'#fdeaea',border:'1px solid #f5c2c7',color:'#b94a48',padding:'0.75rem 1rem',borderRadius:8,marginBottom:18}}>
                {error}
              </section>
            )}
            {}
            <form onSubmit={handleSubmit}>
              {}
              <label className={styles.label}>Project</label>
              <select
                className={styles.input}
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                required
              >
                <option value="" disabled>Select a project</option>
                {projects.map(project => (
                  <option key={project.project_ID} value={project.project_ID}>{project.title}</option>
                ))}
              </select>
              <label className={styles.label}>Title</label>
              <input
                type="text"
                className={styles.input}
                value={title} 
                onChange={(e) => setTitle(e.target.value)} // Update state on change
                placeholder="Milestone title"
                required
              />
              {}
              <label className={styles.label}>Description</label>
              <textarea
                className={styles.textarea}
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Describe this milestone"
                required
              />
              {}
              <label className={styles.label}>Due Date</label>
              <span style={{position:'relative',display:'block'}}>
                <input
                  type="date"
                  className={styles.dateInput}
                  value={dueDate} // State for the due date
                  onChange={(e) => setDueDate(e.target.value)} 
                  required
                  style={{paddingLeft:'2.2rem'}}
                />
                {}
                <Calendar size={16} style={{position:'absolute',left:'0.65rem',top:'50%',transform:'translateY(-50%)',color:'#b1b5bb'}} />
              </span>
              {}
              <section className={styles.buttonRow}>
                {}
                <Link href="/milestones" className={styles.cancelBtn}>Cancel</Link>
                {}
                <button type="submit" className={styles.createBtn} disabled={submitting}>
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


