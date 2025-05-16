"use client";

import styles from "./page.module.css";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";

type CreateFormProps = {
  projectName: string;
  projectDesc: string;
  goals: string;
  setResArea: string;
  setStart: string;
  setEnd: string;
  Funding: boolean | null;
  onClose: () => void;
  onCreate: (projectName: string) => void;
};

export default function CreateReqForm({
  projectName,
  projectDesc,
  goals,
  setResArea,
  setStart,
  setEnd,
  Funding,
  onClose,
  onCreate,
}: CreateFormProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  const [skill, setSkill] = useState("");
  const [experience, setExp] = useState("");
  const [reqrole, setRole] = useState("");
  const [techReq, setReq] = useState("");

  useEffect(() => {
    setMounted(true);
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("jwt");
    if (!token) {
      alert("User not logged in");
      return;
    }

    const payload = {
      project: {
        title: projectName,
        description: projectDesc,
        goals,
        research_areas: setResArea,
        start_date: setStart,
        end_date: setEnd,
        funding_available: Funding,
      },
      requirements: [
        {
          skill_required: skill,
          experience_level: experience.toLowerCase(),
          role: reqrole,
          technical_requirements: techReq,
        },
      ],
    };

    onCreate(skill);
    onClose();

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/projects/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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
    }
  };

  const modalContent = (
    <main className={styles.createModal} data-modal-root>
      <section className={styles.createBox}>
        <button onClick={onClose} className={styles.closeButton}>
          X
        </button>
        <h1 className={styles.title}>Project Requirements</h1>
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
            onChange={(e) => setExp(e.target.value)}
            required
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
          <button type="submit" aria-label="submit information">
            Create →
          </button>
        </form>
      </section>
    </main>
  );

  if (!mounted) return null;

  return createPortal(modalContent, document.body);
}
