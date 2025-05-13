
"use client";


import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

import { useRouter } from "next/navigation";

import { Calendar, ArrowLeft } from "lucide-react";

import Link from "next/link";

import styles from "./Milestones.module.css";


interface Milestone {
  id: string;
  title: string;
  description: string;
  projectId: string;
  projectName: string;
  dueDate: string;
}


interface Project {
  project_ID: string;
  title: string;
}

export default function MilestonesPage() {
   
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('shared');
  
  const [milestones, setMilestones] = useState<Milestone[]>([]);
   
  const [loading, setLoading] = useState(true);
  const [statusSummary, setStatusSummary] = useState<{ status: string; count: number; percentage: number; }[]>([]);

    
  const [error, setError] = useState<string | null>(null);

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
        // Flatten milestones from all projects and map to the Milestone interface
        const mockMilestones = mockData.projects.flatMap(project =>
          (project.milestones || []).map(milestone => ({
            id: String(milestone.milestone_ID),
            title: milestone.title,
            description: milestone.description,
            projectId: String(project.project_ID),
            projectName: project.title,
            dueDate: milestone.expected_completion_date
          }))
        );
        setMilestones(mockMilestones);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching milestones:', err);
        setLoading(false);
      }
    };

        // async function to fetch milestones
    fetchMilestones();

    const summary = [
      { status: "Completed", count: 3, percentage: 50 },
      { status: "In Progress", count: 2, percentage: 50 },
      { status: "Not Started", count: 5, percentage: 0 },
    ];
    setStatusSummary(summary);
    
  }, []);

  // Group milestones by project
  const groupedMilestones = milestones.reduce<Record<string, Milestone[]>>((acc, milestone) => {
    if (!acc[milestone.projectName]) {
      acc[milestone.projectName] = [];
    }
    acc[milestone.projectName].push(milestone);
    return acc;
  }, {});

  
  if (loading) {
    return <main><section>Loading milestones...</section></main>;
  }

 
  if (error) {
    return <main><section>Error: {error}</section></main>;
  }

 
  return (
    <main className={styles.container}>
      <nav className={styles.sidebar}>
        <h2>ThinkSync</h2>
        <h3>DASHBOARD</h3>

        <ul>
          <li>
            <button
              type="button"
              onClick={() => {
                setActiveTab("my");
                router.push("/milestones");
              }}
              className={activeTab === "my" ? styles.active : ""}
            >
              Milestones
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => {
                setActiveTab("my");
                router.push("/researcher-dashboard");
              }}
              className={activeTab === "my" ? styles.active : ""}
            >
              Dashboard
            </button>
          </li>
          
        </ul>
      </nav>

      <section className={styles.milestonesBg}>
      {/* */}
      <section className={styles.maxWidth}>
        {}
        <header className={styles.headerRow}>
          {}
          <span style={{display:'flex',alignItems:'center'}}>
            {/* Link to go back to the researcher dashboard */}
            <Link href="/researcher-dashboard" style={{marginRight:12}}>
              <ArrowLeft size={22} />
            </Link>
            {}
            <span className={styles.pageTitle}>Project Milestones</span>
          </span>
          {}
          <Link href="/milestones/create" className={styles.createBtn} data-testid="create-milestone-button">
            <span style={{fontSize:'1.35em',marginRight:8,marginTop:-2}}>+</span> Create Milestone
          </Link>
        </header>

        {}
        {Object.entries(groupedMilestones).length === 0 ? (
          <section style={{textAlign:'center',padding:'2rem',border:'1px solid #eee',borderRadius:8}}>
            <p className="text-gray-500">No milestones found. Create your first milestone!</p>
          </section>
        ) : (
          
          <>
            {}
            {Object.entries(groupedMilestones).map(([projectName, projectMilestones]) => (
              
              <section key={projectName} className={styles.card}>
                {}
                <h2 className={styles.projectTitle}>{projectName}</h2>
                {}
                <table className={styles.milestoneTable}>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Description</th>
                      <th>Due Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {}
                    {projectMilestones.map((milestone, idx) => (
                      <tr
                        key={milestone.id} // Unique key for React
                        
                        onClick={() => router.push(`/milestones/${milestone.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        {}
                        <td className={styles.milestoneTitle}>{milestone.title}</td>
                        {}
                        <td>{milestone.description}</td>
                        {}
                        <td>
                          <span className={styles.dueDate}>
                            <Calendar size={16} style={{marginRight:4,marginBottom:-2}} />
                            {new Date(milestone.dueDate).toLocaleDateString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            ))}
          </>
        )}
      </section>

      <section className={styles.chartContainer}>
        <h3 className={styles.chartTitle}>Milestone Progress Overview</h3>
        <PieChart width={400} height={300}>
          <Pie
            data={statusSummary}
            dataKey="count"
            nameKey="status"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label
          >
            {statusSummary.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.status === "Completed"
                    ? "#4CAF50"
                    : entry.status === "In Progress"
                    ? "#2196F3"
                    : "#FF9800"
                }
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </section>

    </section>


    </main>




    
  );
}


