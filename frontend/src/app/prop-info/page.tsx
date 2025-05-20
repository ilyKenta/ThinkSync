'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from '../Shared_projects/page.module.css'; // reuse your styles

// Define interfaces for type safety
interface ProjectData {
  project_ID: string;
  title: string;
  description: string;
  goals: string;
  start_date: string;
  end_date?: string;
  funding_available: boolean;
  researcher_fname: string;
  researcher_sname: string;
  skill_required?: string;
  experience_level?: string;
  technical_requirements?: string;
}

interface ReviewData {
  outcome: string;
  feedback?: string;
}

const PropInfoContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const projectDataParam = searchParams.get('projectData');
  const [activeTab, setActiveTab] = useState('shared');  
  const [proposal, setProposal] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>('PENDING');

  const [feedback, setFeedback] = useState('');
  const [outcome, setOutcome] = useState('approved');
  const [validationErrors, setValidationErrors] = useState<{
    feedback?: string;
    outcome?: string;
  }>({});

  // Validate form submission
  const validateForm = (): boolean => {
    const errors: typeof validationErrors = {};
    let isValid = true;

    if (!feedback.trim()) {
      errors.feedback = 'Feedback is required';
      isValid = false;
    } else if (feedback.trim().length > 1000) {
      errors.feedback = 'Feedback must not exceed 1000 characters';
      isValid = false;
    }

    if (!['approved', 'revise', 'rejected'].includes(outcome)) {
      errors.outcome = 'Invalid outcome selected';
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!projectId) {
        setError('Project ID is required');
        setLoading(false);
        return;
      }

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
    if (!validateForm()) {
      return;
    }

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
          feedback: feedback.trim(),
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
      setValidationErrors({});
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
                border: validationErrors.feedback ? '1px solid red' : '1px solid #ccc',
              }}
              value={feedback}
              onChange={(e) => {
                setFeedback(e.target.value);
                setValidationErrors(prev => ({ ...prev, feedback: undefined }));
              }}
              maxLength={1000}
            />
            {validationErrors.feedback && (
              <p style={{ color: 'red', marginBottom: '10px' }}>{validationErrors.feedback}</p>
            )}

            <section style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
              <select
                value={outcome}
                onChange={(e) => {
                  setOutcome(e.target.value);
                  setValidationErrors(prev => ({ ...prev, outcome: undefined }));
                }}
                style={{
                  padding: '8px',
                  fontSize: '1rem',
                  flex: 1,
                  border: validationErrors.outcome ? '1px solid red' : '1px solid #ccc',
                }}
              >
                <option value="approved">Approve</option>
                <option value="revise">Revise</option>
                <option value="rejected">Reject</option>
              </select>
              {validationErrors.outcome && (
                <p style={{ color: 'red' }}>{validationErrors.outcome}</p>
              )}

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
