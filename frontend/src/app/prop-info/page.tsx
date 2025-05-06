'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from '../Shared_projects/page.module.css'; // reuse your styles

const PropInfoContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const projectDataParam = searchParams.get('projectData');
  const [activeTab, setActiveTab] = useState('shared');  
  const [proposal, setProposal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('PENDING');

  const [feedback, setFeedback] = useState('');
  const [outcome, setOutcome] = useState('approved');

  useEffect(() => {
    const fetchInitialData = async () => {
      if (projectDataParam) {
        try {
          const decodedData = decodeURIComponent(projectDataParam);
          const projectData = JSON.parse(decodedData);
          setProposal(projectData);
          
          // Fetch the current review status
          const token = localStorage.getItem('jwt');
          if (!token) {
            throw new Error('No access token found');
          }

          const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/reviewer/proposals/${projectId}/review`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            setCurrentStatus(data.review?.outcome || 'PENDING');
          }
        } catch (err) {
          setError('Failed to load project data');
          console.error('Error loading data:', err);
        } finally {
          setLoading(false);
        }
      } else {
        setError('No project data available');
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [projectId, projectDataParam]);

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        alert('No access token found');
        return;
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/reviewer/proposals/${projectId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          feedback,
          outcome
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to submit review');
      }

      alert('Evaluation submitted successfully!');
      setCurrentStatus(outcome);
      setFeedback('');
      setOutcome('approved');
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

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
      <nav className={styles.sidebar}>
        <h2>ThinkSync</h2>
        <h3>DASHBOARD</h3>

        <ul>
          <li>
            <button 
              type="button" 
              onClick={() => {
                setActiveTab('my');
                router.push("/review-dash");
              }}
              className={activeTab === 'my' ? styles.active : ''}
            >
              Assigned proposals
            </button>
          </li>
          {/*<li>
            <button 
              type="button" 
              onClick={() => {
                setActiveTab('shared');
                router.push("/Shared_projects");
              }}
              className={activeTab === 'shared' ? styles.active : ''}
            >
              Shared Projects
            </button>
          </li>*/}
        </ul>
      </nav>

      <section className={styles.mainContent}>
        <header className={styles.heading}>
         <h2>{proposal.title}</h2>
        </header>

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
                <p>Technical Requirements: {proposal.technical_requirements || 'Not specified'}</p>
              </section>

              <section className={styles.projectDetails}>
                <h4>Current Status</h4>
                <p>{currentStatus}</p>
              </section>
            </section>
          </section>
        </section>

        {/* Only show evaluation section if status is PENDING */}
        {currentStatus === 'PENDING' && (
          <section className={styles.card}>
            <h3>Evaluate Proposal</h3>

            <textarea
              placeholder="Enter your feedback..."
              style={{
                width: '100%',
                minHeight: '100px',
                marginBottom: '10px',
                padding: '8px',
                fontSize: '1rem',
              }}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />

            <section style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                style={{
                  padding: '8px',
                  fontSize: '1rem',
                  flex: 1,
                }}
              >
                <option value="approved">Approve</option>
                <option value="revise">Revise</option>
                <option value="rejected">Reject</option>
              </select>

              <button
                onClick={handleSubmit}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#0070f3',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                }}
              >
                Submit Evaluation
              </button>
            </section>
          </section>
        )}
      </section>
    </main>
  );
};

const PropInfoPage = () => {
  return (
    <Suspense fallback={<main className={styles.container}>Loading...</main>}>
      <PropInfoContent />
    </Suspense>
  );
};

export default PropInfoPage;
