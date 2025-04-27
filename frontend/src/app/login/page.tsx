'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './page.module.css';
import { Configuration, PublicClientApplication, AuthenticationResult } from '@azure/msal-browser';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [msalInstance, setMsalInstance] = useState<PublicClientApplication | null>(null);
  const [initializationError, setInitializationError] = useState<Error | null>(null);
  const router = useRouter();

  useEffect(() => {
    const initializeMsal = async () => {
      try {
        const msalConfig = {
          auth: {
            clientId: process.env.NEXT_PUBLIC_AZURE_CLIENT_ID!,
            authority: `https://login.microsoftonline.com/${process.env.NEXT_PUBLIC_AZURE_TENANT_ID}`,
            redirectUri: 'http://localhost:3000/login',
            postLogoutRedirectUri: '/',
            navigateToLoginRequestUrl: true
          },
          cache: {
            cacheLocation: 'sessionStorage',
            storeAuthStateInCookie: false
          }
        };


        const instance = new PublicClientApplication(msalConfig);
        await instance.initialize();
        setMsalInstance(instance);
      } catch (error) {
        console.error('MSAL initialization error:', error);
        setInitializationError(error as Error);
      }
    };

    initializeMsal();
  }, []);

  const loginRequest = {
    scopes: ['api://0929980d-f253-4a7a-9c14-b09d7586807f/acess_as_user'],
  };

  const handleMicrosoftLogin = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!msalInstance) {
      console.error('MSAL instance not initialized');
      return;
    }
    
    setLoading(true);
    try {
      const loginResponse: AuthenticationResult = await msalInstance.loginPopup(loginRequest);
      console.log('Login response:', loginResponse);
      
      const accessToken = loginResponse.accessToken;
      localStorage.setItem('jwt', accessToken);

      const response = await fetch('http://localhost:5000/api/auth/microsoft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ token: accessToken }),
      });

      console.log('API response status:', response.status);
      const data = await response.json();
      console.log('API response data:', data);
      
      if (data.message === 'User authenticated successfully') {
        router.push('/dashboard');
      }
      else if(data.message === 'User registered successfully') {
        localStorage.setItem('user_ID', data.user_ID);
        router.push('/role');
      }
      else {
        console.error('Authentication error:', data);
        alert('Error: ' + (data.error || 'Authentication failed'));
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Login failed. Please check the console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.loginPage}>
      <header className={styles.header}>
        <button 
          onClick={(e) => {
            e.preventDefault();
            window.location.href = '/';
          }} 
          className={styles.logo}
        >
          ThinkSync
        </button>
        <nav className={styles.navButtons}>
          <button className={styles.loginButton} type="button">login</button>
          <button className={styles.signupButton} type="button">sign up</button>
        </nav>
      </header>

      <section className={styles.loginBox}>
        <h1 className={styles.title}>Login</h1>
        <form className={styles.loginForm} onSubmit={(e) => e.preventDefault()}>
          <button 
            className={styles.loginButton} 
            onClick={handleMicrosoftLogin} 
            disabled={loading || !msalInstance || !!initializationError} 
            type="button"
            aria-label="Sign in with Microsoft"
          >
            {loading ? 'Logging in...' : 'Sign in with Microsoft'}
            <Image 
              src="/microsoft-logocurve.png"
              alt="Microsoft Logo"
              width={24}
              height={24}
              className={styles.mircoLogo}
              unoptimized={true}
            />
          </button>
        </form>
      </section>
    </main>
  );
}
