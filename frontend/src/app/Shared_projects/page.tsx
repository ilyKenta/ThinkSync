"use client";

import React from "react";
import styles from "./page.module.css";
import Image from "next/image";
import CreateForm from "../create-project/createForm";
import EditProjectForm from "../edit-project/editProjectForm";
import EditReqForm from "../edit-project/editReqForm";
import { useState } from "react";
import { useRouter } from "next/navigation";

const Page = () => {
  // State for editing requirements
  const [editReqProject, setEditReqProject] = useState<any | null>(null);
  const [showEditReqForm, setShowEditReqForm] = useState(false);
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editProject, setEditProject] = useState<any | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  // Dummy project data for demonstration (replace with real data)
  const projects = [
    {
      projectId: "1",
      title: "Q4 Sales Deck",
      description: "Q4 sales deck description",
      goals: "Increase sales",
      research_areas: "Sales, Marketing",
      start_date: "2025-01-01",
      end_date: "2025-06-30",
      funding_available: true,
      info: "Shared folder • 8 presentations",
      requirements: [
        {
          skill_required: "Sales",
          experience_level: "intermediate",
          role: "Sales Manager",
          technical_requirements: "CRM experience",
        },
      ],
    },
    {
      projectId: "2",
      title: "Product Videos",
      description: "Product videos description",
      goals: "Promote product",
      research_areas: "Video, Marketing",
      start_date: "2025-02-01",
      end_date: "2025-07-31",
      funding_available: true,
      info: "Shared folder • 5 videos",
      requirements: [
        {
          skill_required: "Video Editing",
          experience_level: "professional",
          role: "Video Editor",
          technical_requirements: "Adobe Premier Pro",
        },
      ],
    },
    {
      projectId: "3",
      title: "ROI Calculator",
      description: "ROI calculator description",
      goals: "Calculate ROI",
      research_areas: "Finance, Analytics",
      start_date: "2025-03-01",
      end_date: "2025-08-31",
      funding_available: false,
      info: "Shared file • 1 Excel",
      requirements: [
        {
          skill_required: "Financial Analysis",
          experience_level: "intermediate",
          role: "Financial Analyst",
          technical_requirements: "Excel, SQL",
        },
      ],
    },
  ];

  // Handler for edit submit
  const handleEdit = async (updatedProject: any) => {
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch(
        `http://localhost:5000/api/project/update/${updatedProject.projectId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            project: {
              title: updatedProject.title,
              description: updatedProject.description,
              goals: updatedProject.goals,
              research_areas: updatedProject.research_areas,
              start_date: updatedProject.start_date,
              end_date: updatedProject.end_date,
              funding_available: updatedProject.funding_available,
            },
            requirements: updatedProject.requirements || [],
          }),
        }
      );
      const data = await res.json();
      if (res.ok) {
        alert("Project updated successfully!");
        setShowEditForm(false);
        setEditProject(null);
        // Optionally refresh project list here
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      alert("An error occurred while updating the project.");
    }
  };

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <h2>ThinkSync</h2>

        <h3>DASHBOARD</h3>
        <ul>
          <li>
            {" "}
            <button type="button" onClick={() => router.push("/dashboard")}>
              {" "}
              My Projects
            </button>
          </li>
          <li>
            {" "}
            <button type="button" onClick={() => router.push("/Shared_projects")}>
              {" "}
              Shared Projects
            </button>
          </li>
        </ul>
      </aside>

      <main className={styles.mainContent}>
        <section className={styles.heading}>
          <h2>Shared Projects</h2>
          <div className={styles.searchContainer}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="  Search files..."
            />
          </div>
        </section>
        <section className={styles.buttonHeader}>
          <button
            className={styles.createButton}
            onClick={() => setShowForm(true)}
          >
            + Create
          </button>
          {showForm && (
            <CreateForm
              onClose={() => setShowForm(false)}
              onCreate={(projectName) => {
                setShowForm(false);
                // Add more logic here if needed
                console.log("Project created:", projectName);
              }}
            />
          )}
          {showEditForm && editProject && (
            <EditProjectForm
              initialValues={editProject}
              onClose={() => {
                setShowEditForm(false);
                setEditProject(null);
              }}
              onEdit={handleEdit}
            />
          )}

          <div className={styles.buttonGroup}>
            <button>Upload</button>
            <button>Create folder</button>
            <button>Record</button>
          </div>
        </section>

        <div className={styles.tabGroup}>
          <button>Recent</button>
          <button>Starred</button>
          <button>Shared</button>
        </div>

        <div className={styles.cardContainer}>
          {projects.map((project) => (
            <div className={styles.card} key={project.projectId}>
              <div className={styles.cardContent}>
                <img src="/exampleImg.png" alt="search" />
                <span>{project.title}</span>
                <section className={styles.cardFooter}>
                  <p>{project.info}</p>
                  <div className={styles.buttonContainer}>
                    <button
                      className={styles.editButton}
                      title="Edit project"
                      onClick={() => {
                        setEditProject(project);
                        setShowEditForm(true);
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z" />
                      </svg>
                    </button>

                    <button
                      className={styles.trashButton}
                      title="Delete project"
                    >
                      🗑️
                    </button>
                  </div>
                </section>
              </div>
            </div>
          ))}
          {/* Edit Requirements Modal */}
          {showEditReqForm && editReqProject && (
            <EditReqForm
              projectId={editReqProject.projectId}
              projectData={{
                title: editReqProject.title,
                description: editReqProject.description,
                goals: editReqProject.goals,
                research_areas: editReqProject.research_areas,
                start_date: editReqProject.start_date,
                end_date: editReqProject.end_date,
                funding_available: editReqProject.funding_available,
              }}
              requirements={editReqProject.requirements || []}
              onClose={() => {
                setShowEditReqForm(false);
                setEditReqProject(null);
              }}
              onEdit={(updatedRequirements) => {
                // Update requirements in the project list (dummy for now)
                // You can add API call here
                setShowEditReqForm(false);
                setEditReqProject(null);
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default Page;
