"use client";

import styles from "./page.module.css";
import { useState } from "react";

export default function ResearcherSignupPage() {
  const user_ID = "example_id";

  const [phone_number, setPhoneNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [acc_role, setAccRole] = useState("");
  const [res_area, setResArea] = useState("");
  const [qualification, setQualification] = useState("");
  const [current_proj, setCurrentProj] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      user_ID,
      phone_number,
      department,
      acc_role,
      res_area,
      qualification,
      current_proj,
    };

    try {
      const res = await fetch("http://localhost:5000/researcher", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Researcher info submitted!");
        console.log(data);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error("Submission error:", err);
      alert("An error occurred");
    }
  };

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
        <h1 className={styles.title}>Researcher Sign Up</h1>
        <form className={styles.signupForm} onSubmit={handleSubmit}>
          <label htmlFor="number">contact number</label>
          <input
            type="text"
            id="number"
            placeholder="Contact number"
            value={phone_number}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
          />

          <label htmlFor="department">department</label>
          <input
            type="text"
            id="department"
            placeholder="Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            required
          />

          <label htmlFor="academicRole">academic role</label>
          <input
            type="text"
            id="academicRole"
            placeholder="Academic Role"
            value={acc_role}
            onChange={(e) => setAccRole(e.target.value)}
            required
          />

          <label htmlFor="researchArea">research area</label>
          <input
            type="text"
            id="researchArea"
            placeholder="Research area"
            value={res_area}
            onChange={(e) => setResArea(e.target.value)}
            required
          />

          <label htmlFor="researchExp">research experience</label>
          <input
            type="text"
            id="qualifications"
            placeholder="Qualifications"
            value={qualification}
            onChange={(e) => setQualification(e.target.value)}
            required
          />
          <input
            type="text"
            id="projects"
            placeholder="Projects"
            value={current_proj}
            onChange={(e) => setCurrentProj(e.target.value)}
            required
          />

          <button type="submit">Continue →</button>
        </form>
      </div>
    </main>
  );
}
