"use client";

import React, { useState, useEffect } from "react";
import styles from "../researcher-dashboard/page.module.css";
import AssignReviewers from "../components/AssignReviewers";

interface Proposal {
  id: string;
  title: string;
  researcher: string;
  researchAreas: string;
  summary: string;
  project_ID: string;
}

const SubmittedProposalsPage = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selected, setSelected] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  //assigning projects (Arika)
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignProject, setAssignProject] = useState<any | null>(null);

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        const token = localStorage.getItem('jwt');
        if (!token) {
          throw new Error('No access token found');
        }

        const response = await fetch('http://localhost:5000/api/admin/projects/pending', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch proposals');
        }

        const data = await response.json();
        setProposals(data.projects.map((project: any) => ({
          id: project.project_ID,
          title: project.title,
          researcher: `${project.researcher_fname} ${project.researcher_sname}`,
          researchAreas: project.research_areas || "No research areas specified",
          summary: project.description || '',
          project_ID: project.project_ID
        })));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching proposals:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProposals();
  }, []);

  const handleAssignClick = (e: React.MouseEvent, proposal: any) => {
    e.stopPropagation();
    setAssignProject(proposal);
    setAssignModalOpen(true);
  };

  if (loading) {
    return <main className={styles.container}>Loading proposals...</main>;
  }

  if (error) {
    return <main className={styles.container}>Error: {error}</main>;
  }

  return (
    <main className={styles.container}>
      <section style={{ flex: 1, padding: "40px 60px" }}>
        <h1 style={{ marginBottom: 32 }}>Submitted Proposals</h1>
        {/* Proposals List */}
        <section style={{ display: "flex", gap: 32 }}>
          <table
            style={{
              width: "55%",
              borderCollapse: "collapse",
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
          >
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={{ textAlign: "left", padding: 12 }}>Title</th>
                <th style={{ textAlign: "left", padding: 12 }}>Researcher</th>
                <th style={{ textAlign: "left", padding: 12 }}>
                  Research Areas
                </th>
                <th style={{ textAlign: "left", padding: 12 }}></th>
              </tr>
            </thead>
            <tbody>
              {proposals.map((proposal) => (
                <tr
                  key={proposal.id}
                  style={{
                    background:
                      selected?.id === proposal.id ? "#e6f0fa" : undefined,
                  }}
                >
                  <td style={{ padding: 12 }}>{proposal.title}</td>
                  <td style={{ padding: 12 }}>{proposal.researcher}</td>
                  <td style={{ padding: 12 }}>
                    {proposal.researchAreas}
                  </td>
                  <td style={{ padding: 12 }}>
                    <button
                      style={{
                        background: "#222",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "6px 16px",
                      }}
                      onClick={() => setSelected(proposal)}
                    >
                      View
                    </button>
                  </td>
                  {/* Assign reviewer button */}
                  <td style={{ padding: 12 }}>
                    <button
                      style={{
                        background: "#222",
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "6px 16px",
                      }}
                      onClick={(e) => handleAssignClick(e, proposal)}
                      title="Assign reviewer"
                    >
                      Assign
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Proposal Details */}
          {selected && (
            <section
              style={{
                flex: 1,
                background: "#f8fafd",
                borderRadius: 8,
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                padding: 24,
                minWidth: 320,
              }}
            >
              <h2>{selected.title}</h2>
              <p>
                <strong>Researcher:</strong> {selected.researcher}
              </p>
              <p>
                <strong>Research Areas:</strong>{" "}
                {selected.researchAreas}
              </p>
              <p>
                <strong>Summary:</strong> {selected.summary}
              </p>
              {/* Add more details as needed */}
            </section>
          )}
        </section>
      </section>
      {assignModalOpen && assignProject && (
        <AssignReviewers
          projectId={assignProject.project_ID}
          onClose={() => {
            setAssignModalOpen(false);
            setAssignProject(null);
          }}
        />
      )}
    </main>
  );
};

export default SubmittedProposalsPage;
