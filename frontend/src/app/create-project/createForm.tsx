"use client";

import styles from "./page.module.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
//import useAuth from "../useAuth";

export type CreateFormProps = {
  onClose: () => void;
  onCreate: (
    projectName: string,
    projectDesc: string,
    goals: string,
    setResArea: string,
    setStart: string,
    setEnd: string,
    Funding: boolean | null
  ) => void;
};

export default function CreateForm({ onClose, onCreate }: CreateFormProps) {
  const router = useRouter();
  // useAuth(); // Check authentication

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goals, setGoals] = useState("");
  const [research_areas, setResArea] = useState("");
  const [start_date, setStart] = useState("");
  const [end_date, setEnd] = useState("");
  const [funding_available, setFunding] = useState<boolean | null>(null);
  const [requirementsData, setRequirementsData] = useState([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    /*const token = localStorage.getItem("jwt");
    if (!token) {
      alert("User ID is missing.");
      return;
    }*/
    
    // Check if funding is selected
    if (funding_available === null) {
      const fundingInputs = document.getElementsByName('funding');
      (fundingInputs[0] as HTMLInputElement).setCustomValidity('Please select a funding option');
      (fundingInputs[0] as HTMLInputElement).reportValidity();
      return;
    }

    const payload = {
      title,
      description,
      goals,
      research_areas,
      start_date,
      end_date,
      funding_available,
      requirementsData,
    };

    onCreate(
      title,
      description,
      goals,
      research_areas,
      start_date,
      end_date,
      funding_available
    );
    onClose();

    console.log(JSON.stringify(payload));

    // NEED TO RUN ON CREATE

    /*try {
      const res = await fetch("http://localhost:5000/api/projects/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        console.log(data);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error("Submission error:", err);
      alert("An error occurred");
    }*/
  };

  // Clear custom validity when funding selection changes
  const handleFundingChange = (value: boolean) => {
    setFunding(value);
    const fundingInputs = document.getElementsByName('funding');
    (fundingInputs[0] as HTMLInputElement).setCustomValidity('');
  };

  return (
    <main className={styles.createModal}>
      <section className={styles.createBox}>
        <button onClick={onClose} className={styles.closeButton}>
          X
        </button>
        <h1 className={styles.title}>Project Information</h1>
        <form className={styles.createForm} onSubmit={handleSubmit} noValidate>
          <label htmlFor="projName">Project name</label>
          <input
            type="text"
            id="projName"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <label htmlFor="projectDesc">Project Description</label>
          <input
            id="projectDesc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          <label htmlFor="goals">Goals</label>
          <input
            type="text"
            id="goals"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            required
          />
          <label htmlFor="setResArea">Research Area</label>
          <input
            type="text"
            id="setResArea"
            value={research_areas}
            onChange={(e) => setResArea(e.target.value)}
            required
          />

          <label htmlFor="setStart">Start Date</label>
          <input
            type="date"
            id="setStart"
            value={start_date}
            onChange={(e) => setStart(e.target.value)}
            required
          />

          <label htmlFor="setEnd">End Date</label>
          <input
            type="date"
            id="setEnd"
            value={end_date}
            onChange={(e) => setEnd(e.target.value)}
            required
          />

          <section className={styles.radioContainer}>
            <label htmlFor="Funding">Funding Available *</label>
            <label>
              <input
                type="radio"
                name="funding"
                value="true"
                className={styles.radioInput}
                checked={funding_available === true}
                onChange={() => handleFundingChange(true)}
              />
              Yes
            </label>

            <label>
              <input
                type="radio"
                name="funding"
                value="false"
                className={styles.radioInput}
                checked={funding_available === false}
                onChange={() => handleFundingChange(false)}
              />
              No
            </label>
          </section>

          <button
            type="submit"
            aria-label="submit information"
            style={{ backgroundColor: 'black', color: 'white', border: 'none', borderRadius: 'var(--button-radius)', fontSize: 20, fontWeight: 600 }}
          >
            Next: Add Requirements
          </button>
        </form>
      </section>
    </main>
  );
}
