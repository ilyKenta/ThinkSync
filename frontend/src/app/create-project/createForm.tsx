"use client";

import styles from "./page.module.css";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
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
  forceMounted?: boolean; // test-only prop
};

export default function CreateForm({ onClose, onCreate, forceMounted }: CreateFormProps) {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(forceMounted || false);
  // useAuth(); // Check authentication

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goals, setGoals] = useState("");
  const [research_areas, setResArea] = useState("");
  const [start_date, setStart] = useState("");
  const [end_date, setEnd] = useState("");
  const [funding_available, setFunding] = useState<boolean | null>(null);

  useEffect(() => {
    if (!forceMounted) {
    setMounted(true);
    }
    document.body.classList.add('modal-open');
    
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [forceMounted]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    if (e && typeof (e as any).persist === 'function') {
      (e as any).persist();
    }
    e.preventDefault();

    // Get current date at midnight for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Convert string dates to Date objects for comparison
    const startDate = start_date ? new Date(start_date) : null;
    const endDate = end_date ? new Date(end_date) : null;

    // Validate project name
    if (!title.trim()) {
      const titleInput = document.getElementById('projName') as HTMLInputElement;
      titleInput.setCustomValidity('Project name is required');
      titleInput.reportValidity();
      return;
    }
    if (title.length > 100) {
      const titleInput = document.getElementById('projName') as HTMLInputElement;
      titleInput.setCustomValidity('Project name must be less than 100 characters');
      titleInput.reportValidity();
      return;
    }
    // Check for special characters in project name
    if (!/^[a-zA-Z0-9\s\-_.,&()]+$/.test(title)) {
      const titleInput = document.getElementById('projName') as HTMLInputElement;
      titleInput.setCustomValidity('Project name contains invalid characters. Only letters, numbers, spaces, and basic punctuation are allowed');
      titleInput.reportValidity();
      return;
    }

    // Validate description
    if (!description.trim()) {
      const descInput = document.getElementById('projectDesc') as HTMLInputElement;
      descInput.setCustomValidity('Project description is required');
      descInput.reportValidity();
      return;
    }
    if (description.length > 1000) {
      const descInput = document.getElementById('projectDesc') as HTMLInputElement;
      descInput.setCustomValidity('Description must be less than 1000 characters');
      descInput.reportValidity();
      return;
    }

    // Validate goals
    if (!goals.trim()) {
      const goalsInput = document.getElementById('goals') as HTMLInputElement;
      goalsInput.setCustomValidity('Goals are required');
      goalsInput.reportValidity();
      return;
    }
    if (goals.length > 500) {
      const goalsInput = document.getElementById('goals') as HTMLInputElement;
      goalsInput.setCustomValidity('Goals must be less than 500 characters');
      goalsInput.reportValidity();
      return;
    }

    // Validate research areas
    if (!research_areas.trim()) {
      const resAreaInput = document.getElementById('setResArea') as HTMLInputElement;
      resAreaInput.setCustomValidity('Research area is required');
      resAreaInput.reportValidity();
      return;
    }
    if (research_areas.length > 200) {
      const resAreaInput = document.getElementById('setResArea') as HTMLInputElement;
      resAreaInput.setCustomValidity('Research area must be less than 200 characters');
      resAreaInput.reportValidity();
      return;
    }

    // Validate start date
    if (!start_date) {
      const startInput = document.getElementById('setStart') as HTMLInputElement;
      startInput.setCustomValidity('Start date is required');
      startInput.reportValidity();
      return;
    }
    if (startDate && startDate < today) {
      const startInput = document.getElementById('setStart') as HTMLInputElement;
      startInput.setCustomValidity('Start date cannot be in the past');
      startInput.reportValidity();
      return;
    }

    // Validate end date
    if (!end_date) {
      const endInput = document.getElementById('setEnd') as HTMLInputElement;
      endInput.setCustomValidity('End date is required');
      endInput.reportValidity();
      return;
    }
    if (endDate && endDate < today) {
      const endInput = document.getElementById('setEnd') as HTMLInputElement;
      endInput.setCustomValidity('End date cannot be in the past');
      endInput.reportValidity();
      return;
    }
    if (startDate && endDate && endDate < startDate) {
      const endInput = document.getElementById('setEnd') as HTMLInputElement;
      endInput.setCustomValidity('End date must be after start date');
      endInput.reportValidity();
      return;
    }

    // Check if funding is selected
    if (funding_available === null) {
      const fundingInputs = document.getElementsByName("funding");
      (fundingInputs[0] as HTMLInputElement).setCustomValidity(
        "Please select a funding option"
      );
      (fundingInputs[0] as HTMLInputElement).reportValidity();
      return;
    }

    // Clear any previous validation messages
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => input.setCustomValidity(''));

    // Sanitize inputs before submission
    const sanitizedTitle = title.trim();
    const sanitizedDescription = description.trim();
    const sanitizedGoals = goals.trim();
    const sanitizedResearchAreas = research_areas.trim();

    // Call onCreate with the sanitized form data
    onCreate(
      sanitizedTitle,
      sanitizedDescription,
      sanitizedGoals,
      sanitizedResearchAreas,
      start_date,
      end_date,
      funding_available
    );
  };

  const handleFundingChange = (value: boolean) => {
    setFunding(value);
    const fundingInputs = document.getElementsByName("funding");
    (fundingInputs[0] as HTMLInputElement).setCustomValidity("");
  };

  if (!mounted) return null;

  const modalContent = (
    <main className={styles.createModal} style={{ opacity: isVisible ? 1 : 0 }}>
      <section className={styles.createBox}>
        <button onClick={handleClose} className={styles.closeButton}>
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

          <section className={styles.radioGroup}>
            <label htmlFor="Funding">Funding Available *</label>
            <section className={styles.radioOptions}>
              <label className={styles.radioContainer}>
                <input
                  type="radio"
                  name="funding"
                  value="true"
                  className={styles.radioInput}
                  checked={funding_available === true}
                  onChange={() => handleFundingChange(true)}
                  required
                />
                Yes
              </label>

              <label className={styles.radioContainer}>
                <input
                  type="radio"
                  name="funding"
                  value="false"
                  className={styles.radioInput}
                  checked={funding_available === false}
                  onChange={() => handleFundingChange(false)}
                  required
                />
                No
              </label>
            </section>
          </section>

          <button
            type="submit"
            aria-label="submit information"
            style={{
              backgroundColor: "black",
              color: "white",
              border: "none",
              borderRadius: "var(--button-radius)",
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            Next: Add Requirements
          </button>
        </form>
      </section>
    </main>
  );

  return createPortal(modalContent, document.body);
}
