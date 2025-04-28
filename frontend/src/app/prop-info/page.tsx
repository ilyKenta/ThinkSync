'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import styles from '../Shared_projects/page.module.css'; // reuse your styles

const PropInfoPage = () => {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  
  const [proposal, setProposal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProposal = async () => {
      try {
        const token = localStorage.getItem('jwt');
        if (!token) {
          throw new Error('No access token found');
        }

        const response = await fetch(`http://localhost:5000/api/reviewer/proposal/${projectId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch proposal details');
        }

        const data = await response.json();
        setProposal(data.proposal); // <- Expect { proposal: {...} }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        console.error('Error fetching proposal details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      fetchProposal();
    }
  }, [projectId]);

  if (loading) {
    return <main className={styles.container}>Loading proposal...</main>;
  }

  if (error) {
    return <main className={styles.container}>Error: {error}</main>;
  }

  if (!proposal) {
    return <main className={styles.container}>Proposal not found.</main>;
  }

  return (
    <main className={styles.container}>
      <header className={styles.heading}>
        <h2>{proposal.title}</h2>
      </header>

      <section className={styles.mainContent}>
        <section className={styles.card}>
          <section className={styles.cardContent}>
            <img src="/exampleImg.png" alt="project image" />
            <section className={styles.projectInfo}>
              <h3>Description</h3>
              <p>{proposal.description}</p>

              <h3>Goals</h3>
              <p>{proposal.goals}</p>

              <section className={styles.projectDetails}>
                <h4>Project Details</h4>
                <time>
                  Start Date: {new Date(proposal.start_date).toLocaleDateString()}
                </time>
                {proposal.end_date && (
                  <time>
                    End Date: {new Date(proposal.end_date).toLocaleDateString()}
                  </time>
                )}
                {proposal.funding_available !== undefined && (
                  <p>Funding: {proposal.funding_available ? 'Available' : 'Not Available'}</p>
                )}
              </section>

              <section className={styles.projectDetails}>
                <h4>Researcher</h4>
                <p>
                  {proposal.researcher_fname} {proposal.researcher_sname}
                </p>
              </section>

              <section className={styles.projectDetails}>
                <h4>Requirement</h4>
                <p>Skill Required: {proposal.skill_required || 'Not specified'}</p>
                <p>Experience Level: {proposal.experience_level || 'Not specified'}</p>
                <p>Role: {proposal.requirement_role || 'Not specified'}</p>
                <p>Technical Requirements: {proposal.technical_requirements || 'Not specified'}</p>
              </section>
            </section>
          </section>
        </section>
      </section>
    </main>
  );
};

export default PropInfoPage;