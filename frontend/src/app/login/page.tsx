'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Function to handle Microsoft login
  const handleMicrosoftLogin = () => {
    try{
    const clientId = process.env.NEXT_PUBLIC_AZURE_AZURE_CLIENT_ID!;
    const tenantId = process.env.NEXT_PUBLIC_AZURE_AZURE_TENANT_ID!;
    const redirectUri = process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI!;
    const scope = 'openid profile email offline_access User.Read';
    console.log("Redirect URI:", process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI);
  
    const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize` +
      `?client_id=${clientId}` +
      `&response_type=token` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&response_mode=fragment`;
  
    const authWindow = window.open(authUrl, '_blank', 'width=600,height=700');
  


      if (!authWindow) {
        setLoading(false);
        alert("Please enable popups for this site.");
        return;
      }

      // Wait for the user to authorize and close the window
      const interval = setInterval(async() => {
        if (authWindow.closed) {
          clearInterval(interval);
          /*const code = new URLSearchParams(window.location.search).get('code');*/
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const token = hashParams.get('access_token');

          if (token) {
            // 2. Exchange the code for an access token (you may need to send this code to your backend)
            const response = await fetch('/api/auth/microsoft', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ token }),
            });

            const data = await response.json();
            if (data.token) {
              // 3. Store the JWT and handle user redirection
              localStorage.setItem('jwt', data.token); 
              router.push('/login'); 
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
  }
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
