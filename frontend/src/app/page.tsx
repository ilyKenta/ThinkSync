'use client';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const handleRedirect = () => {
    router.push('/login');
  };

  return (
    <main className={styles.main}>
      <header className={styles.header}>
      <button onClick={() => window.location.href = '/'} className={styles.logo}>ThinkSync</button>
        <nav className={styles.nav}>
          <button className={styles.loginButton} onClick={handleRedirect}>login</button>
          <button className={styles.signupButton} onClick={handleRedirect}>sign up</button>
        </nav>
      </header>

      <section className={styles.hero}>
        <article className={styles.textBlock}>
          <h2>Connect,Collaborate, Manage Resources with Ease</h2>
          <p>A web platform designed to help university researchers find partners, share resources, and track project progress</p>
          <button className={styles.cta} onClick={handleRedirect}>
            Get started
          </button>
        </article>
        <figure className={styles.imageBlock}>
          <figcaption hidden>Decorative Glass Card</figcaption>
          <aside className={styles.glassCard}></aside>
        </figure>
      </section>
    </main>
  );
}
