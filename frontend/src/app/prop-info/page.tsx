'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams,useRouter } from 'next/navigation';
import styles from '../Shared_projects/page.module.css'; // reuse your styles

const PropInfoPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');
  const [activeTab, setActiveTab] = useState('shared');  
  const [proposal, setProposal] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

//un comment below
/*
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
*/

  useEffect(() => {
    if (projectId) {
      const dummyProposal = {
        title: "AI for Healthcare",
        description: "A project focused on diagnosing diseases using machine learning models.",
        goals: "Achieve 95% accuracy in detecting diabetic retinopathy.",
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 180).toISOString(), // 6 months later
        funding_available: true,
        researcher_fname: "Alice",
        researcher_sname: "Johnson",
        skill_required: "Machine Learning",
        experience_level: "Intermediate",
        requirement_role: "Data Scientist",
        technical_requirements: "TensorFlow, Python, Pandas",
      };
  
      setTimeout(() => {
        setProposal(dummyProposal);
        setLoading(false);
      }, 500);
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