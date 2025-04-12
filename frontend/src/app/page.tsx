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
        <h1 className={styles.logo}>ThinkSync</h1>
        <nav className={styles.nav}>
          <button className={styles.loginButton} onClick={handleRedirect}>login</button>
          <button className={styles.signupButton} onClick={handleRedirect}>sign up</button>
        </nav>
      </header>

      <section className={styles.hero}>
        <article className={styles.textBlock}>
          <h2>Connect,Collaborate, Manage Resources with Ease</h2>
          <p>some description text</p>
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
