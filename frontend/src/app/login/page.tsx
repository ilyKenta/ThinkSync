'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Function to handle Microsoft login
  const handleMicrosoftLogin = async () => {
    setLoading(true);

    try {
      // 1. Redirect user to Microsoft login
      const microsoftAuthUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
      const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID;
      const redirectUri = process.env.NEXT_PUBLIC_MICROSOFT_REDIRECT_URI;

      // Build OAuth URL
      const url = `${microsoftAuthUrl}?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=openid profile email`;

      // Open the authentication window
      const authWindow = window.open(url, '_blank', 'width=500,height=700');

      if (!authWindow) {
        setLoading(false);
        alert("Please enable popups for this site.");
        return;
      }

      // Wait for the user to authorize and close the window
      const interval = setInterval(async() => {
        if (authWindow.closed) {
          clearInterval(interval);
          const code = new URLSearchParams(window.location.search).get('code');

          if (code) {
            // 2. Exchange the code for an access token (you may need to send this code to your backend)
            const response = await fetch('/api/auth/microsoft', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ code }),
            });

            const data = await response.json();
            if (data.token) {
              // 3. Store the JWT and handle user redirection
              localStorage.setItem('jwt', data.token); // or store in a global state
              router.push('/login'); // or wherever you want to redirect
            } else {
              alert('Error: ' + data.error);
            }
          }
        }
      }, 1000);

    } catch (error) {
      setLoading(false);
      console.error('Error during login:', error);
    }
  };
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
          
        <button className={styles.loginButton} onClick={handleMicrosoftLogin} disabled={loading}>
            {loading ? 'Logging in...' : 'Sign in with Microsoft'}
          </button>
        </form>
      </section>
    </main>
  );
}
