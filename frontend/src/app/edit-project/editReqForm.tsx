"use client";

import { LocalStorage } from "@azure/msal-browser";
import styles from "../create-req/page.module.css";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export type EditReqFormProps = {
  projectId: string;
  projectData: {
    title: string;
    description: string;
    goals: string;
    research_areas: string;
    start_date: string;
    end_date: string;
    funding_available: boolean;
  };
  requirements: {
    skill_required: string;
    experience_level: string;
    role: string;
    technical_requirements: string;
  }[];
  onClose: () => void;
  onEdit: (updatedProject: any) => void;
};

export default function EditReqForm({
  projectId,
  projectData,
  requirements,
  onClose,
  onEdit,
}: EditReqFormProps) {
  // these are all the form fields for project requirements
  const [skill, setSkill] = useState("");
  const [experience, setExp] = useState("");
  const [reqrole, setRole] = useState("");
  const [techReq, setReq] = useState("");
  // loading state for when we're saving to the server
  const [loading, setLoading] = useState(false);
  // to display errors if something goes wrong
  const [error, setError] = useState<string | null>(null);
  // keeps track of whether component is mounted in DOM
  const [mounted, setMounted] = useState(false);

  // Modal setup effect - runs when component first appears
  // makes sure body doesn't scroll while modal is open
  useEffect(() => {
    setMounted(true);
    document.body.classList.add('modal-open');
    
    // clean up when component unmounts
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  // Initialize form fields with current requirement data
  // This fills in the form with existing data when editing
  useEffect(() => {
    if (requirements && requirements.length > 0) {
      // We just take the first requirement (maybe should handle multiple in future)
      const currentReq = requirements[0];
      // Set all the form fields to match the existing data
      // Use empty string as fallback if any fields are missing
      setSkill(currentReq.skill_required || "");
      setExp(currentReq.experience_level || "");
      setRole(currentReq.role || "");
      setReq(currentReq.technical_requirements || "");
    }
  }, [requirements]);

  // This function runs when the form is submitted
  // It handles the API call to save the project requirements
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // prevent page refresh on form submit
    setLoading(true); // show loading state
    setError(null); // clear any previous errors

    try {
      // Get authentication token from browser storage
      const token = localStorage.getItem("jwt");
      if (!token) {
        throw new Error('No access token found');
      }

      // Build the data structure we need to send to the API
      const payload = {
        project: projectData, // project details passed from previous form
        requirements: [{
          // form field values
          skill_required: skill,
          experience_level: experience.toLowerCase(), // make sure it's lowercase for consistency
          role: reqrole,
          technical_requirements: techReq,
        }]
      };

      // Make the API call to update the project
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/projects/update/${projectId}`,
        {
          method: "PUT", // update existing project
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // include auth token
          },
          body: JSON.stringify(payload), // convert data to JSON string
        }
      );

      // Handle error responses from the server
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update project");
      }

      // If successful, get the updated project data
      const data = await res.json();
      onEdit(data); // call the callback to update the parent component
      onClose(); // close the modal
    } catch (err) {
      // Show error message to user
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      // Always turn off loading state when done
      setLoading(false);
    }
  };

  // Only render once component is mounted in the DOM
  // This prevents hydration errors with createPortal
  if (!mounted) return null;

  const modalContent = (
    <section className={styles.createModal} data-modal-root>
      <section className={styles.createBox}>
        <button onClick={onClose} className={styles.closeButton}>
          X
        </button>
        <h1 className={styles.title}>Edit Project Requirements</h1>
        <form className={styles.createForm} onSubmit={handleSubmit}>
          <label htmlFor="skillReq">Skill Required</label>
          <input
            type="text"
            id="skillReq"
            value={skill}
            onChange={(e) => setSkill(e.target.value)}
            required
          />
          <label htmlFor="explvl">Level of experience</label>
          <select
            name="explvl"
            id="explvl"
            className="drop-down"
            value={experience}
            onChange={(e) => setExp(e.target.value)}
          >
            <option value=""></option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="professional">Professional</option>
          </select>
          <label htmlFor="reqrole">Role</label>
          <input
            type="text"
            id="reqrole"
            value={reqrole}
            onChange={(e) => setRole(e.target.value)}
            required
          />
          <label htmlFor="techReq">Technical Requirements</label>
          <input
            type="text"
            id="techReq"
            value={techReq}
            onChange={(e) => setReq(e.target.value)}
            required
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ backgroundColor: 'black', color: 'white', border: 'none', borderRadius: 'var(--button-radius)', fontSize: 20, fontWeight: 600 }}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
          {error && <section style={{ color: "red", marginTop: 8 }}>{error}</section>}
        </form>
      </section>
    </section>
  );

  // Use createPortal to render this outside the normal document flow
  // This makes it appear on top of everything else like a real modal
  return createPortal(modalContent, document.body);
}
