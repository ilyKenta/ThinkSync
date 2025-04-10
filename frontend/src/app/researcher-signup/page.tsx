'use client';

import styles from './page.module.css';

export default function ResearcherSignupPage() {
  return (
    <main className={styles.signupPage}>
      <h1 className={styles.title}>Researcher Sign Up</h1>
      <form className={styles.signupForm}>
        <input type="text" placeholder="Full Name" required />
        <input type="email" placeholder="Email Address" required />
        <input type="password" placeholder="Password" required />
        <button type="submit">Sign Up</button>
      </form>
    </main>
  );
}
