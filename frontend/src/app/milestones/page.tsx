"use client";

import React, { useState, useEffect } from "react";

import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

import { useRouter, usePathname } from "next/navigation";

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

  status: string;
  assigned_user_ID: string;
  assigned_user_fname?: string;
  assigned_user_sname?: string;
}

interface Project {
  project_ID: string;
  title: string;
}

export default function MilestonesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusSummary, setStatusSummary] = useState<
    { status: string; count: number; percentage: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Fetch all milestones from mock data
    const fetchMilestones = async () => {
      try {
        // This will be replaced with actual API call later
        const token = localStorage.getItem('jwt');
        const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/milestones`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        // Flatten milestones from all projects and map to the Milestone interface
        const milestones = data.projects.flatMap((project: { milestones: any; project_ID: any; title: any; }) =>
          (project.milestones || []).map((milestone: { milestone_ID: any; title: any; description: any; expected_completion_date: any; assigned_user_ID: any; status: any; assigned_user_fname: any; assigned_user_sname: any; }) => ({
            id: String(milestone.milestone_ID),
            title: milestone.title,
            description: milestone.description,
            projectId: String(project.project_ID),
            projectName: project.title,
            dueDate: milestone.expected_completion_date,
            assigned_user_ID: milestone.assigned_user_ID,
            assigned_user_fname: milestone.assigned_user_fname,
            assigned_user_sname: milestone.assigned_user_sname,
            status: milestone.status,
          }))
        );

        const summary = data.summary;
        setStatusSummary(summary);


        setMilestones(milestones);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        console.error("Error fetching milestones:", err);

        setLoading(false);
      }
    };
    fetchMilestones();

    // Fetch unread messages count
    const fetchUnread = async () => {
      const token = localStorage.getItem('jwt');
      if (!token) return;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/messages/unread`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(Array.isArray(data) ? data.length : 0);
      }
    };
    fetchUnread();
  }, []);

  // Group milestones by project
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

  if (loading) {
    return (
      <main>
        <section>Loading milestones...</section>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <section>Error: {error}</section>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <nav className={styles.sidebar}>
        <h2>ThinkSync</h2>
        <h3>DASHBOARD</h3>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li>
            <button
              type="button"
              onClick={() => router.push("/researcher-dashboard")}
              className={pathname === "/researcher-dashboard" ? styles.activeTab : ""}
            >
              My Projects
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => router.push("/Shared_projects")}
              className={pathname === "/Shared_projects" ? styles.activeTab : ""}
            >
              Shared Projects
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => router.push("/custom-dashboard")}
              className={pathname === "/custom-dashboard" ? styles.activeTab : ""}
            >
              Custom Dashboard
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => router.push("/messager")}
              className={pathname === "/messager" ? styles.activeTab : ""}
            >
              Messager
              {unreadCount > 0 && (
                <mark
                  style={{
                    display: "inline-block",
                    marginLeft: 8,
                    minWidth: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "red",
                    color: "white",
                    fontWeight: 600,
                    fontSize: 12,
                    textAlign: "center",
                    lineHeight: "20px",
                    padding: "0 6px",
                    verticalAlign: "middle",
                  }}
                >
                  {unreadCount > 99 ? "99+" : unreadCount}
                </mark>
              )}
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => router.push("/milestones")}
              className={pathname === "/milestones" ? styles.activeTab : ""}
            >
              Milestones
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => router.push("/funding-dashboard")}
              className={pathname === "/funding-dashboard" ? styles.activeTab : ""}
            >
              Funding
            </button>
          </li>
        </ul>
      </nav>

      <section className={styles.milestonesBg}>
        <section className={styles.maxWidth}>
          <header className={styles.headerRow}>
            <figure style={{ display: "flex", alignItems: "center" }}>
              <Link href="/researcher-dashboard" style={{ marginRight: 12 }}>
                <ArrowLeft size={22} />
              </Link>
              <figcaption className={styles.pageTitle}>Project Milestones</figcaption>
            </figure>

            <nav style={{ display: 'flex', gap: '12px', listStyle: 'none', padding: 0, margin: 0 }}>
              <button
                onClick={async () => {
                  try {
                    const token = localStorage.getItem('jwt');
                    console.log('Attempting to download report...');
                    const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/milestones/report/generate`, {
                      headers: {
                        'Authorization': `Bearer ${token}`
                      }
                    });
                    
                    if (!response.ok) {
                      const errorData = await response.text();
                      console.error('Server response:', response.status, errorData);
                      throw new Error(`Failed to generate report: ${response.status} ${errorData}`);
                    }

                    const blob = await response.blob();
                    console.log('Received blob:', blob.type, blob.size);
                    
                    const url = window.URL.createObjectURL(blob);
                    
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = 'milestones-report.pdf';
                    
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    
                    window.URL.revokeObjectURL(url);
                  } catch (err) {
                    console.error('Error downloading report:', err);
                    alert('Failed to download report. Please try again.');
                  }
                }}
                className={styles.createBtn}
                style={{ backgroundColor: '#4a90e2' }}
              >
                <strong style={{ marginRight: 8, fontStyle: 'normal' }}>📊</strong>
                Download Report
              </button>

              <Link
                href="/milestones/create"
                className={styles.createBtn}
                data-testid="create-milestone-button"
              >
                <strong style={{ fontSize: "1.35em", marginRight: 8, marginTop: -2, fontStyle: 'normal' }}>+</strong>
                Create Milestone
              </Link>
            </nav>
          </header>

          {Object.entries(groupedMilestones).length === 0 ? (
            <article
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
            </article>
          ) : (
            <>
              {Object.entries(groupedMilestones).map(
                ([projectName, projectMilestones]) => (
                  <article key={projectName} className={styles.card}>
                    <h2 className={styles.projectTitle}>{projectName}</h2>
                    <table className={styles.milestoneTable}>
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Description</th>
                          <th>Due Date</th>
                          <th>Assignee</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projectMilestones.map((milestone, idx) => (
                          <tr
                            key={milestone.id}
                            onClick={() =>
                              router.push(`/milestones/${milestone.id}`)
                            }
                            style={{ cursor: "pointer" }}
                          >
                            <td className={styles.milestoneTitle}>
                              {milestone.title}
                            </td>
                            <td>{milestone.description}</td>
                            <td>
                              <time className={styles.dueDate}>
                                <Calendar
                                  size={16}
                                  style={{ marginRight: 4, marginBottom: -2 }}
                                />
                                {new Date(
                                  milestone.dueDate
                                ).toLocaleDateString()}
                              </time>
                            </td>
                            <td>
                              {milestone.assigned_user_fname && milestone.assigned_user_sname
                                ? `${milestone.assigned_user_fname} ${milestone.assigned_user_sname}`
                                : "Not Assigned"}
                            </td>
                            <td
                              className={`${styles.milestoneStatus} ${
                                milestone.status === "Completed"
                                  ? styles.completed
                                  : milestone.status === "In Progress"
                                  ? styles.inProgress
                                  : milestone.status === "Not Started"
                                  ? styles.notStarted
                                  : ""
                              }`}
                            >
                              {milestone.status}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </article>
                )
              )}
            </>
          )}
        </section>
        <aside className={styles.chartContainer}>
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
        </aside>
      </section>
    </main>
  );
}
