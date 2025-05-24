"use client";

import styles from "./page.module.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useAuth from "../useAuth";

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

    // Validate phone number format
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone_number)) {
      alert("Please enter a valid 10-digit phone number");
      return;
    }

    // Validate required fields
    if (!department || !acc_role || !res_area || !qualification || !current_proj) {
      alert("Please fill in all required fields");
      return;
    }

    // Validate research area length
    if (res_area.length < 3) {
      alert("Research area must be at least 3 characters long");
      return;
    }

    // Validate qualifications and projects length
    if (qualification.length < 2 || current_proj.length < 5) {
      alert("Please provide more detailed information for qualifications and projects");
      return;
    }

    const token = localStorage.getItem("jwt");
    if (!token) {
      alert("Authentication token is missing. Please log in again.");
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

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/auth/researcher`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (res.ok) {
        router.push("/researcher-dashboard");
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error("Submission error:", err);
      alert("An error occurred during registration. Please try again.");
    }
  };

  return (
    <main className={styles.signupPage}>
      <header className={styles.header}>
        <h1 className={styles.logo}>ThinkSync</h1>
      </header>
      <section className={styles.signupBox}>
        <h1 className={styles.title}>Researcher Sign Up</h1>
        <form className={styles.signupForm} onSubmit={handleSubmit}>
          <label htmlFor="number">Contact number</label>
          <input
            type="text"
            id="number"

            value={phone_number}
            onChange={(e) => setPhoneNumber(e.target.value)}
            required
            pattern="[0-9]{10}"
            title="Please enter a valid 10-digit phone number"
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
          <select
            name="academicRole"
            id="academicRole"
            className="drop-down"
            required
            onChange={(e) => handleChangeRole(e.target.value)}
          >
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
            minLength={3}
            title="Research area must be at least 3 characters long"
          />

          <label htmlFor="researchExp">Research experience</label>
          <input
            type="text"
            id="qualifications"
            placeholder="Qualifications"
            value={qualification}
            onChange={(e) => setQualification(e.target.value)}
            required
            minLength={2}
            title="Please provide detailed qualifications"
          />
          <input
            type="text"
            id="projects"
            placeholder="Projects"
            value={current_proj}
            onChange={(e) => setCurrentProj(e.target.value)}
            required
            minLength={5}
            title="Please provide detailed project information"
          />

          <button type="submit" aria-label="submit information">
            Continue →
          </button>
        </form>
      </section>
    </main>
  );
}
