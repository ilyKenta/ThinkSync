"use client";

import styles from "./page.module.css";

export default function ReviewerSignupPage() {
  return (
    <main className={styles.signupPage}>
      <header className={styles.header}>
        <div className={styles.logo}>ThinkSync</div>
        <nav className={styles.navButtons}>
          <button className={styles.loginButton} type="button">
            login
          </button>
          <button className={styles.signupButton} type="button">
            sign up
          </button>
        </nav>
      </header>
      <div className={styles.signupBox}>
        <h1 className={styles.title}>Reviewer Sign Up</h1>
        <form className={styles.signupForm}>
          <label htmlFor="number">contact number</label>
          <input
            type="text"
            id="number"
            placeholder="Contact number"
            required
          />

          <label htmlFor="department">department</label>
          <input
            type="text"
            id="department"
            placeholder="Department"
            required
          />

          <label htmlFor="academicRole">academic role</label>
          <input
            type="text"
            id="academicRole"
            placeholder="Academic Role"
            required
          />

          <label htmlFor="researchArea">research area</label>
          <input
            type="text"
            id="researchArea"
            placeholder="Research area"
            required
          />

          <label htmlFor="researchExp">research experience</label>
          <input
            type="text"
            id="qualifications"
            placeholder="Qualifications"
            required
          />
          <input type="text" id="projects" placeholder="Projects" required />

          <button type="submit">Continue →</button>
        </form>
      </div>
    </main>
  );
}
