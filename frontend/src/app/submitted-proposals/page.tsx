"use client";

import React, { useState, useEffect } from "react";
import styles from "../researcher-dashboard/page.module.css";
import AssignReviewers from "../components/AssignReviewers";
import { useRouter } from "next/navigation";

interface Proposal {
  id: string;
  title: string;
  researcher: string;
  researchAreas: string;
  summary: string;
  project_ID: string;
}

// Validation schema for API response
interface ProjectData {
  project_ID: string;
  title: string;
  researcher_fname: string;
  researcher_sname: string;
  research_areas?: string;
  description?: string;
}

const SubmittedProposalsPage = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);
  const [showAssignReviewer, setShowAssignReviewer] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Validate project data structure
  const validateProjectData = (project: any): project is ProjectData => {
    return (
      typeof project === 'object' &&
      project !== null &&
      typeof project.project_ID === 'string' &&
      typeof project.title === 'string' &&
      typeof project.researcher_fname === 'string' &&
      typeof project.researcher_sname === 'string' &&
      (!project.research_areas || typeof project.research_areas === 'string') &&
      (!project.description || typeof project.description === 'string')
    );
  };

  // Validate mapped proposal data
  const validateProposal = (proposal: any): proposal is Proposal => {
    return (
      typeof proposal === 'object' &&
      proposal !== null &&
      typeof proposal.id === 'string' &&
      typeof proposal.title === 'string' &&
      typeof proposal.researcher === 'string' &&
      typeof proposal.researchAreas === 'string' &&
      typeof proposal.summary === 'string' &&
      typeof proposal.project_ID === 'string'
    );
  };

  const fetchProposals = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('jwt');
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/admin/projects/pending`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data || !Array.isArray(data.projects)) {
        throw new Error('Invalid response format from server');
      }

      // Validate and map the projects data
      const mappedProposals = data.projects
        .filter((project: any) => validateProjectData(project))
        .map((project: ProjectData) => ({
          id: project.project_ID,
          title: project.title.trim(),
          researcher: `${project.researcher_fname.trim()} ${project.researcher_sname.trim()}`,
          researchAreas: project.research_areas?.trim() || "No research areas specified",
          summary: project.description?.trim() || '',
          project_ID: project.project_ID
        }))
        .filter(validateProposal);

      if (mappedProposals.length === 0) {
        throw new Error('No valid proposals found');
      }

      setProposals(mappedProposals);
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching proposals');
      setProposals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleAssignReviewer = (proposalId: string) => {
    if (!proposalId || typeof proposalId !== 'string') {
      setError('Invalid proposal ID');
      return;
    }
    setSelectedProposal(proposalId);
    setShowAssignReviewer(true);
  };

  const handleAssignSuccess = () => {
    fetchProposals();
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
                      selectedProposal === proposal.id ? "#e6f0fa" : undefined,
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
                      onClick={() => handleAssignReviewer(proposal.id)}
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
                      onClick={() => handleAssignReviewer(proposal.id)}
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
          {selectedProposal && (
            <section
              data-testid="proposal-details"
              style={{
                flex: 1,
                background: "#f8fafd",
                borderRadius: 8,
                boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                padding: 24,
                minWidth: 320,
              }}
            >
              <h2>{proposals.find(p => p.id === selectedProposal)?.title}</h2>
              <p>
                <strong>Researcher:</strong> {proposals.find(p => p.id === selectedProposal)?.researcher}
              </p>
              <p>
                <strong>Research Areas:</strong>{" "}
                {proposals.find(p => p.id === selectedProposal)?.researchAreas}
              </p>
              <p>
                <strong>Summary:</strong> {proposals.find(p => p.id === selectedProposal)?.summary}
              </p>
              {/* Add more details as needed */}
            </section>
          )}
        </section>
      </section>
      {showAssignReviewer && selectedProposal && (
        <AssignReviewers
          projectId={selectedProposal}
          onClose={() => {
            setShowAssignReviewer(false);
            setSelectedProposal(null);
          }}
          onAssignSuccess={handleAssignSuccess}
        />
      )}
    </main>
  );
};

export default SubmittedProposalsPage;
