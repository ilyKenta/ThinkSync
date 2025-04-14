"use client";

import styles from "./page.module.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useAuth from '../useAuth';

export default function ResearcherSignupPage() {
  const router = useRouter();
  useAuth(); // Check authentication

  const [phone_number, setPhoneNumber] = useState("");
  const [department, handleChangeDept] = useState("");
  const [acc_role, handleChangeRole] = useState("");
  const [res_area, setResArea] = useState("");
  const [qualification, setQualification] = useState("");
  const [current_proj, setCurrentProj] = useState("");


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("jwt");
    if (!token) {
      alert("User ID is missing.");
      return;
    }
    const payload = {
      token,
      phone_number,
      department,
      acc_role,
      res_area,
      qualification,
      current_proj,
    };

    console.log(payload);

    try {
      const res = await fetch("http://localhost:5000/api/auth/researcher", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        router.push('/dashboard');
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
          <button
            className={styles.signupButton}
            type="button"
            onClick={() => router.push("/roles")}
          >
            sign up
          </button>
        </nav>
      </header>
      <section className={styles.signupBox}>
        <h1 className={styles.title}>Researcher Sign Up</h1>
        <form className={styles.signupForm} onSubmit={handleSubmit}>
          <label htmlFor="number">Contact number</label>
          <input
            type="text"
            id="number"
            placeholder="0814366553"
            value={phone_number}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
          />

          <label htmlFor="department">Current Department</label>
          <select
            name="department"
            id="department"
            className="drop-down"
            onChange={(e) => handleChangeDept(e.target.value)}
            required
          >
            <option value=""></option>
            <option value="science">Science</option>
            <option value="health-science">Health Science</option>
            <option value="commerce">Commerce</option>
            <option value="engineering">Engineering</option>
            <option value="humanities">Humanities</option>
          </select>

          <label htmlFor="academicRole">Current academic role</label>
          <select name="academicRole" id="academicRole" className="drop-down" required onChange={(e) => handleChangeRole(e.target.value)}>
            <option value=""></option>
            <option value="lecturer">Lecturer</option>
            <option value="student">Student</option>
            <option value="professor">Professor</option>
            <option value="dean">Dean</option>
            <option value="librarian">Librarian</option>
            <option value="reasearcher">Reasearcher</option>
          </select>

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
