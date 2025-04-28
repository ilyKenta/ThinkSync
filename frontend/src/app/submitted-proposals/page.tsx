"use client";

import React, { useState, useEffect } from "react";
import styles from "../dashboard/page.module.css";

interface Proposal {
  id: string;
  title: string;
  researcher: string;
  researchAreas: string[];
  summary: string;
}

// Mock data for proposals
const mockProposals: Proposal[] = [
  {
    id: "1",
    title: "AI for Healthcare",
    researcher: "Alice Smith",
    researchAreas: ["AI", "Healthcare"],
    summary: "Exploring AI solutions for patient diagnostics and treatment.",
  },
  {
    id: "2",
    title: "Sustainable Energy Storage",
    researcher: "Bob Jones",
    researchAreas: ["Energy", "Sustainability"],
    summary: "Developing new battery technologies for renewable energy.",
  },
  {
    id: "3",
    title: "Quantum Computing Algorithms",
    researcher: "Carol White",
    researchAreas: ["Quantum Computing", "Algorithms"],
    summary: "Designing efficient algorithms for quantum processors.",
  },
];

const SubmittedProposalsPage = () => {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [selected, setSelected] = useState<Proposal | null>(null);

  useEffect(() => {
    const fetchProposals = async () => {
      try {
        const token = localStorage.getItem('jwt');
        const res = await fetch('/admin/projects/pending', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (res.ok && data.projects) {
          setProposals(data.projects.map((p: any) => ({
            id: p.project_ID.toString(),
            title: p.project_title,
            researcher: `${p.researcher_fname} ${p.researcher_sname}`,
            researchAreas: p.research_areas || [],
            summary: p.summary || '',
          })));
        } else {
          setProposals([]);
        }
      } catch (err) {
        setProposals([]);
      }
    };
    fetchProposals();
  }, []);

  return (
    <main className={styles.container}>
      <aside className={styles.sidebar}>
        <h2 style={{ margin: 0 }}>ThinkSync</h2>
        <h3>Submitted Proposals</h3>
      </aside>
      <section style={{ flex: 1, padding: "40px 60px" }}>
        <h1 style={{ marginBottom: 32 }}>Submitted Proposals</h1>
        {/* Proposals List */}
        <div style={{ display: "flex", gap: 32 }}>
          <table style={{ width: "55%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
            <thead>
              <tr style={{ background: "#f5f5f5" }}>
                <th style={{ textAlign: "left", padding: 12 }}>Title</th>
                <th style={{ textAlign: "left", padding: 12 }}>Researcher</th>
                <th style={{ textAlign: "left", padding: 12 }}>Research Areas</th>
                <th style={{ textAlign: "left", padding: 12 }}></th>
              </tr>
            </thead>
            <tbody>
              {proposals.map(proposal => (
                <tr key={proposal.id} style={{ background: selected?.id === proposal.id ? "#e6f0fa" : undefined }}>
                  <td style={{ padding: 12 }}>{proposal.title}</td>
                  <td style={{ padding: 12 }}>{proposal.researcher}</td>
                  <td style={{ padding: 12 }}>{proposal.researchAreas.join(", ")}</td>
                  <td style={{ padding: 12 }}>
                    <button style={{ background: '#222', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px' }} onClick={() => setSelected(proposal)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Proposal Details */}
          {selected && (
            <section style={{ flex: 1, background: '#f8fafd', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', padding: 24, minWidth: 320 }}>
              <h2>{selected.title}</h2>
              <p><strong>Researcher:</strong> {selected.researcher}</p>
              <p><strong>Research Areas:</strong> {selected.researchAreas.join(', ')}</p>
              <p><strong>Summary:</strong> {selected.summary}</p>
              {/* Add more details as needed */}
            </section>
          )}
        </div>
      </section>
    </main>
  );
};

export default SubmittedProposalsPage;
