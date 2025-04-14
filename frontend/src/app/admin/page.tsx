"use client";

import styles from "./page.module.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useAuth from '../useAuth';

export default function AdminSignupPage() {
  useAuth(); // Check authentication
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    number: "",
    department: "",
    role: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const token = localStorage.getItem("jwt");
    if (!token) {
      setError("Authentication token is missing. Please log in again.");
      setLoading(false);
      return;
    }

    const payload = {
      token,
      phone_number: formData.number,
      department: formData.department,
      acc_role: formData.role
    };

    try {
      const response = await fetch("http://localhost:5000/api/auth/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register as admin');
      }

      const result = await response.json();
      router.push('/dashboard');
    } catch (error) {
      console.error("Error during registration:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError("Failed to connect to the server. Please make sure the backend server is running.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.signupPage}>
      <header className={styles.header}>
        <h1 className={styles.logo}>ThinkSync</h1>
        <nav className={styles.navButtons}>
          <button className={styles.loginButton} type="button" onClick={() => router.push("/login")}>
            login
          </button>
          <button className={styles.signupButton} type="button">
            sign up
          </button>
        </nav>
      </header>
      <section className={styles.signupBox}>
        <h1 className={styles.title}>Admin Sign Up</h1>
        {error && <div className={styles.error}>{error}</div>}
        <form className={styles.signupForm} onSubmit={handleSubmit}>
          <label htmlFor="number">Contact Number</label>
          <input type="tel" id="number" name="number" required placeholder="0814366553" value={formData.number} onChange={handleChange} />

          <label htmlFor="department">Current Department</label>
          <select name="department" id="department" className="drop-down" required value={formData.department} onChange={handleChange}>
            <option value=""></option>
            <option value="science">Science</option>
            <option value="health-science">Health Science</option>
            <option value="commerce">Commerce</option>
            <option value="engineering">Engineering</option>
            <option value="humanities">Humanities</option>
          </select>

          <label htmlFor="role">Current Academic Role</label>
          <select name="role" id="role" className="drop-down" required value={formData.role} onChange={handleChange}>
            <option value=""></option>
            <option value="lecturer">Lecturer</option>
            <option value="student">Student</option>
            <option value="professor">Professor</option>
            <option value="dean">Dean</option>
            <option value="librarian">Librarian</option>
            <option value="reasearcher">Reasearcher</option>
          </select>

          <button type="submit" disabled={loading} aria-label="submit information">
            {loading ? 'Submitting...' : 'Continue →'}
          </button>
        </form>
      </section>
    </main>
  );
}