"use client";

import styles from "./page.module.css";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CreateForm from "../create-project/createForm";
//import useAuth from "../useAuth";

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
  // useAuth(); // Check authentication

  const [skill, setSkill] = useState("");
  const [experience, setExp] = useState("");
  const [reqrole, setRole] = useState("");
  const [techReq, setReq] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    /*const token = localStorage.getItem("jwt");
    if (!token) {
      alert("User ID is missing.");
      return;
    }*/
    /*const payload = {
      projectName,
      projectDesc,
      goals,
      setResArea,
      setStart,
      setEnd,
      Funding,


      skill,
      experience,
      reqrole,
      techReq,
    };*/

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

    console.log(JSON.stringify(payload));

    // NEED TO RUN ON CREATE

    try {
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
    }
  };

  return (
    <main className={styles.createModal}>
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
          <label htmlFor="explvl">Level of experience</label>{" "}
          {/*remeber to amke drop down */}
          <select
            name="explvl"
            id="explvl"
            className="drop-down"
            onChange={(e) => setExp(e.target.value)}
          >
            <option value=""></option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="professional">Professional</option>
          </select>
          <label htmlFor="role">Role</label>
          <input
            type="text"
            id="reqrole"
            value={reqrole}
            onChange={(e) => setRole(e.target.value)}
            required
          />
          <label htmlFor="techReq">Technical Requirments</label>
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
}
