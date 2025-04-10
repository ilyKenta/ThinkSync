'use client';

import styles from "./page.module.css";



export default function LoginPage() {
  return (
    <main className={styles.loginPage}>
      <header className={styles.header}>
        <div className={styles.logo}>ThinkSync</div>
        <nav className={styles.navButtons}>
          <button className={styles.loginButton} type="button">login</button>
          <button className={styles.signupButton} type="button">sign up</button>
        </nav>
      </header>

      <section className={styles.loginBox}>
        <h1 className={styles.title}>Login</h1>
        <form className={styles.loginForm}>
          
          <button type="submit">Continue →</button>
        </form>
      </section>
    </main>
  );
}
