"use client";

import styles from "./page.module.css";
//import useAuth from '../useAuth';

const mockProjects = [
  {
    title: "AI for Health",
    progress: 70,
    fundingUsed: 50000,
    fundingTotal: 100000,
  },
  {
    title: "Climate Change Model",
    progress: 40,
    fundingUsed: 30000,
    fundingTotal: 50000,
  },
];

const mockCollabs = [
    {
      title: "Quantum Research",
      progress: 60,
      fundingUsed: 20000,
      fundingTotal: 40000,
      collaborators: [
        { name: "dr.researcher@wits.ac.za", role: "Researcher" },
        { name: "jane.admin@wits.ac.za", role: "Admin" },
        { name: "reviewer@wits.ac.za", role: "Reviewer" },
      ],
    },
    {
      title: "Machine Learning",
      progress: 20,
      fundingUsed: 1000,
      fundingTotal: 9000,
      collaborators: [
        { name: "pano@wits.ac.za", role: "Researcher" },
        { name: "arshia.admin@wits.ac.za", role: "Admin" },
        { name: "reviewer@wits.ac.za", role: "Reviewer" },
      ],
    },
    {
      title: "Big Data Analytics",
      progress: 95,
      fundingUsed: 18000,
      fundingTotal: 15000,
      collaborators: [
        { name: "pano@wits.ac.za", role: "Researcher" },
        { name: "arshia.admin@wits.ac.za", role: "Admin" },
        { name: "reviewer@wits.ac.za", role: "Reviewer" },
      ],
    },
  ];
  

const Dashboard = () => {
 // useAuth(); // Check authentication

  return (
    <main className={styles.dashboardPage}>
      <header className={styles.header}>
        <button onClick={() => window.location.href = '/'} className={styles.logo}>ThinkSync</button>
        <nav className={styles.navButtons}>
          <button className={styles.loginButton} type="button">
            login
          </button>
          <button className={styles.signupButton} type="button">
            sign up
          </button>
        </nav>
      </header>

      <h1 className={styles.title}>Your Dashboard</h1>

      <section className={styles.section}>
        <h2>Current Projects</h2>
        <div className={styles.cardContainer}>
          {mockProjects.map((proj, i) => (
            <div className={styles.card} key={i}>
              <h3>{proj.title}</h3>
              <p>Progress: {proj.progress}%</p>
              <div className={styles.progressBarWrapper}>
                <div className={styles.progressBar} style={{ width: `${proj.progress}%` }} />
              </div>
              <p>Funding: R{proj.fundingUsed} / R{proj.fundingTotal}</p>
              <div className={styles.progressBarWrapper}>
                <div
                  className={styles.fundingBar}
                  style={{ width: `${(proj.fundingUsed / proj.fundingTotal) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2>Collaborations</h2>
        <div className={styles.cardContainer}>
          {mockCollabs.map((collab, i) => (
            <div className={styles.card} key={i}>
              <h3>{collab.title}</h3>
              <p>Progress: {collab.progress}%</p>
              <div className={styles.progressBarWrapper}>
                <div className={styles.progressBar} style={{ width: `${collab.progress}%` }} />
              </div>
              <p>Funding: R{collab.fundingUsed} / R{collab.fundingTotal}</p>
              <div className={styles.progressBarWrapper}>
                <div
                  className={styles.fundingBar}
                  style={{ width: `${(collab.fundingUsed / collab.fundingTotal) * 100}%` }}
                />
              </div>
              <div className={styles.collabList}>
                <strong>Collaborators:</strong>
                <ul>
                  {collab.collaborators.map((person, j) => (
                    <li key={j}>
                      {person.name} <span className={styles.roleTag}>({person.role})</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Dashboard;
