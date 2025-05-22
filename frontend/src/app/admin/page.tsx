"use client";

import styles from "./page.module.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useAuth from '../useAuth';

export default function AdminSignupPage() {
  useAuth(); // Check authentication

  const router = useRouter();

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

    // Validate phone number format
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.number)) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }

    // Validate department and role
    if (!formData.department || !formData.role) {
      alert("Please fill in all required fields");
      return;
    }

    const token = localStorage.getItem("jwt");
    if (!token) {
      alert("Authentication token is missing. Please log in again.");
      return;
    }

    const payload = {
      token,
      phone_number: formData.number,
      department: formData.department,
      acc_role: formData.role
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/auth/admin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (response.ok) {
        router.push('/admin-dashboard');
      } else {
        alert("Error: " + result.error);
      }
    } catch (error) {
      console.error("Error during registration:", error);
      alert("An error occurred during registration. Please try again.");
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
        <form className={styles.signupForm} onSubmit={handleSubmit}>
          <label htmlFor="number">Contact Number</label>
          <input 
            type="tel" 
            id="number" 
            name="number" 
            required 
            pattern="[0-9]{10}"
            title="Please enter a valid 10-digit phone number" 
            value={formData.number} 
            onChange={handleChange} 
          />

          <label htmlFor="department">Current Department</label>
          <select 
            name="department" 
            id="department" 
            className="drop-down" 
            required 
            value={formData.department} 
            onChange={handleChange}
          >
            <option value=""></option>
            <option value="science">Science</option>
            <option value="health-science">Health Science</option>
            <option value="commerce">Commerce</option>
            <option value="engineering">Engineering</option>
            <option value="humanities">Humanities</option>
          </select>

          <label htmlFor="role">Current Academic Role</label>
          <select 
            name="role" 
            id="role" 
            className="drop-down" 
            required 
            value={formData.role} 
            onChange={handleChange}
          >
            <option value=""></option>
            <option value="lecturer">Lecturer</option>
            <option value="student">Student</option>
            <option value="professor">Professor</option>
            <option value="dean">Dean</option>
            <option value="librarian">Librarian</option>
            <option value="reasearcher">Reasearcher</option>
          </select>

          <button type="submit" aria-label="submit information">Continue →</button>
        </form>
      </section>
    </main>
  );
}