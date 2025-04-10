"use client";

import styles from "./page.module.css";

export default function AdminSignupPage() {
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
        <h1 className={styles.title}>Admin Sign Up</h1>
        <form className={styles.signupForm}>
        <label htmlFor="name">Name</label>
      <input 
        type="text" 
        id="name" 
        name="name" 
        required 
        placeholder="john" 
      />
      
      <label htmlFor="surname">Surname</label>
      <input 
        type="text" 
        id="surname" 
        name="surname" 
        required 
        placeholder="smith" 
      />

      <label htmlFor="email">Email</label>
      <input 
        type="email" 
        id="email" 
        name="email" 
        required 
        placeholder="john@gmail.com" 
      />

      <label htmlFor="contact">Contact Number</label>
      <input 
        type="tel" 
        id="number" 
        name="number" 
        required 
        placeholder="+27814366553" 
      />

      <label htmlFor="department">Current Department</label>
      <select 
        name="department" 
        id="department" 
        className="drop-down" 
        required
      >
        <option value="science">Science</option>
        <option value="commerce">Commerce</option>
        <option value="engineering">Engineering</option>
      </select> 

      <label htmlFor="role">Current Academic Role</label>
      <input 
        type="text" 
        id="role" 
        name="role" 
        required 
        placeholder="Lecturer" 
      />

      <label htmlFor="password">Password</label>
      <input 
        type="password" 
        id="password" 
        name="password" 
        required 
        placeholder="********" 
      />

          <button type="submit">Continue →</button>
        </form>
      </div>
    </main>
  );
}