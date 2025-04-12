"use client";

import styles from "./page.module.css";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ReviewerSignupPage() {
  const router = useRouter();

  const [phone_number, setPhoneNumber] = useState("");
  const [department, handleChange] = useState("");
  const [acc_role, setAccRole] = useState("");
  const [res_area, setResArea] = useState("");
  const [qualification, setQualification] = useState("");
  const [current_proj, setCurrentProj] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user_ID = localStorage.getItem("user_ID");
    if (!user_ID) {
      alert("User ID is missing.");
      return;
    }
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
        <h1 className={styles.logo}>ThinkSync</h1>
        <nav className={styles.navButtons}>
          <button
            className={styles.loginButton}
            type="button"
            onClick={() => router.push("/login")}
          >
            login
          </button>
          <button className={styles.signupButton} type="button">
            sign up
          </button>
        </nav>
      </header>
      <section className={styles.signupBox}>
        <h1 className={styles.title}>Reviewer Sign Up</h1>
        <form className={styles.signupForm} onSubmit={handleSubmit}>
          <label htmlFor="number">Contact number</label>
          <input
            type="text"
            id="number"
            placeholder="+27 814366553"
            value={phone_number}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
          />

          <label htmlFor="department">Current Department</label>
          <select
            name="department"
            id="department"
            className="drop-down"
            onChange={(e) => handleChange(e.target.value)}
            required
          >
            <option value="science">Science</option>
            <option value="health-science">Health Science</option>
            <option value="commerce">Commerce</option>
            <option value="engineering">Engineering</option>
            <option value="humanities">Humanities</option>
          </select>

          <label htmlFor="academicRole">Current academic role</label>
          <input
            type="text"
            id="academicRole"
            placeholder="Lecturer"
            value={acc_role}
            onChange={(e) => setAccRole(e.target.value)}
            required
          />

          <label htmlFor="researchArea">Research area</label>
          <input
            type="text"
            id="researchArea"
            placeholder="Black holes"
            value={res_area}
            onChange={(e) => setResArea(e.target.value)}
            required
          />

          <label htmlFor="researchExp">Research experience</label>
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

          <button type="submit" aria-label="submit information">
            Continue →
          </button>
        </form>
      </section>
    </main>
  );
}
