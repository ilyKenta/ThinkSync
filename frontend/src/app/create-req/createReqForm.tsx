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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.classList.add('modal-open');
    return () => {
      document.body.classList.remove('modal-open');
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate skill
    if (!skill.trim()) {
      setError('Skill is required');
      setLoading(false);
      return;
    }
    if (skill.length > 100) {
      setError('Skill must be less than 100 characters');
      setLoading(false);
      return;
    }
    if (!/^[a-zA-Z0-9\s\-_.,&()]+$/.test(skill)) {
      setError('Skill contains invalid characters. Only letters, numbers, spaces, and basic punctuation are allowed');
      setLoading(false);
      return;
    }

    // Validate role
    if (!reqrole.trim()) {
      setError('Role is required');
      setLoading(false);
      return;
    }
    if (reqrole.length > 100) {
      setError('Role must be less than 100 characters');
      setLoading(false);
      return;
    }
    if (!/^[a-zA-Z0-9\s\-_.,&()]+$/.test(reqrole)) {
      setError('Role contains invalid characters. Only letters, numbers, spaces, and basic punctuation are allowed');
      setLoading(false);
      return;
    }

    // Validate technical requirements
    if (!techReq.trim()) {
      setError('Technical requirements are required');
      setLoading(false);
      return;
    }
    if (techReq.length > 500) {
      setError('Technical requirements must be less than 500 characters');
      setLoading(false);
      return;
    }

    // Validate experience level
    if (!experience) {
      setError('Experience level is required');
      setLoading(false);
      return;
    }

    const token = localStorage.getItem("jwt");
    if (!token) {
      setError("User not logged in");
      setLoading(false);
      return;
    }

    // Sanitize inputs
    const sanitizedSkill = skill.trim();
    const sanitizedRole = reqrole.trim();
    const sanitizedTechReq = techReq.trim();

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
          skill_required: sanitizedSkill,
          experience_level: experience.toLowerCase(),
          role: sanitizedRole,
          technical_requirements: sanitizedTechReq,
        },
      ],
    };

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
        onCreate(sanitizedSkill);
        onClose();
      } else {
        setError(data.error || 'Failed to create project');
      }
    } catch (err) {
      console.error("Submission error:", err);
      setError("An error occurred while creating the project");
    } finally {
      setLoading(false);
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
            maxLength={100}
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
            maxLength={100}
          />
          <label htmlFor="techReq">Technical Requirements</label>
          <input
            type="text"
            id="techReq"
            value={techReq}
            onChange={(e) => setReq(e.target.value)}
            required
            maxLength={500}
          />
          {error && (
            <div style={{ color: 'red', marginTop: '10px', marginBottom: '10px' }}>
              {error}
            </div>
          )}
          <button 
            type="submit" 
            aria-label="submit information"
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Creating...' : 'Create →'}
          </button>
        </form>
      </section>
    </main>
  );

  if (!mounted) return null;

  return createPortal(modalContent, document.body);
}
