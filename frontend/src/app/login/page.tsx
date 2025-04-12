'use client';

import { useState, useEffect} from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { Configuration, PublicClientApplication, AuthenticationResult } from '@azure/msal-browser';

let msalInstance: PublicClientApplication | null = null;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const msalConfig: Configuration = {
      auth: {
        clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID!,
        authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
        redirectUri: process.env.NEXT_PUBLIC_AZURE_REDIRECT_URI!,
      },
    };

    msalInstance = new PublicClientApplication(msalConfig);
    msalInstance.initialize();
  }, []);

  const loginRequest = {
    scopes: ['User.Read'],
  };

  const handleMicrosoftLogin = async () => {
    if (!msalInstance) return;
    setLoading(true);
    try {
      const loginResponse: AuthenticationResult = await msalInstance.loginPopup(loginRequest);
      const accessToken = loginResponse.accessToken;
      localStorage.setItem('jwt', accessToken);
      setToken(accessToken);

      const response = await fetch('http://localhost:5000/api/auth/microsoft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ token: accessToken }),
      });

      const data = await response.json();
      console.log(data);
      if (data.message === 'User authenticated successfully') {
        router.push('/dashboard');
      }
      else if(data.message === 'User registered successfully')
      {
        router.push('/role');
      }
      else{
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className={styles.loginPage}>
      <header className={styles.header}>
        <a className={styles.logo} href='/'>ThinkSync</a>
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
