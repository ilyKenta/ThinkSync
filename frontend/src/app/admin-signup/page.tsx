"use client";

import styles from "./page.module.css";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminSignupPage() {

  const router = useRouter();

  const [formData, setFormData] = useState({

    number: "",
    department: "science",
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

    // Assuming user_ID is retrieved from elsewhere like localStorage or session
    /*const user_ID = localStorage.getItem("user_ID");
    if (!user_ID) {
      alert("User ID is missing.");
      return;
    }*/

    const payload = {
      //user_ID,
      phone_number: formData.number,
      department: formData.department,
      acc_role: formData.role
    };

    try {
      const response = await fetch("http://localhost:5000/api/auth/register/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (response.ok) {
        alert("Admin registered successfully!");
      } else {
        alert("Error: " + result.error);
      }
    } catch (error) {
      console.error("Error during registration:", error);
    }
  };



  return (
    <main className={styles.signupPage}>
      <header className={styles.header}>
        <h1 className={styles.logo}>ThinkSync</h1>
        <nav className={styles.navButtons}>
          <button className={styles.loginButton} type="button"  onClick= {() => router.push("/login")}>
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
          <input type="tel" id="number" name="number" required placeholder="+27 814366553" value={formData.number} onChange={handleChange} />

          <label htmlFor="department">Current Department</label>
          <select name="department" id="department" className="drop-down" required value={formData.department} onChange={handleChange}>
            <option value="science">Science</option>
            <option value="health-science">Health Science</option>
            <option value="commerce">Commerce</option>
            <option value="engineering">Engineering</option>
            <option value="humanities">Humanities</option>
          </select>

          <label htmlFor="role">Current Academic Role</label>
          <input type="text" id="role" name="role" required placeholder="Lecturer" value={formData.role} onChange={handleChange} />


          <button type="submit" aria-label="submit information" /*onClick= {() => router.push("/login")}*/>Continue →
          </button>
        </form>
      </section>
    </main>
  );
}