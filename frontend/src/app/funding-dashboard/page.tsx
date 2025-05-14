"use client";

import React, { useEffect, useState } from "react";
import styles from "./page.module.css";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { useRouter } from "next/navigation";

const COLORS = ["#0088FE", "#00C49F"];

interface Category {
  category_ID: number;
  category: string;
  amount_spent: number;
  type: "Personnel" | "Equipment" | "Consumables";
}

interface Funding {
  total_awarded: number;
  amount_spent: number;
  amount_remaining: number;
  grant_status: string;
  grant_end_date: string;
}

interface Project {
  project_ID: string;
  title: string;
  funding: Funding | null;
  funding_initialized: boolean;
  categories: Category[];
}

export default function Page() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Project | null>(null);

  useEffect(() => {
    const mockData: Project[] = [
      {
        project_ID: "p001",
        title: "AI for Healthcare",
        funding: {
          total_awarded: 100000,
          amount_spent: 85000,
          amount_remaining: 15000,
          grant_status: "Active",
          grant_end_date: "2025-12-31"
        },
        funding_initialized: true,
        categories: [
          { category_ID: 1, category: "Cloud Compute", amount_spent: 30000, type: "Equipment" },
          { category_ID: 2, category: "API Licenses", amount_spent: 15000, type: "Consumables" },
          { category_ID: 3, category: "Research Assistants", amount_spent: 10000, type: "Personnel" },
          { category_ID: 4, category: "Sensors", amount_spent: 10000, type: "Equipment" },
          { category_ID: 5, category: "Data Usage", amount_spent: 20000, type: "Personnel" }
        ]
      },
      {
        project_ID: "p002",
        title: "Smart Agriculture Systems",
        funding: null,
        funding_initialized: false,
        categories: []
      }
    ];
    setProjects(mockData);
  }, []);

  const handleEdit = (projectId: string) => {
    const selected = projects.find((p) => p.project_ID === projectId);
    if (selected) {
      setEditData(JSON.parse(JSON.stringify(selected)));
      setEditProjectId(projectId);
    }
  };

  const handleConfirmEdit = () => {
    if (!editData) return;
    const totalSpent = editData.categories.reduce((sum, cat) => sum + cat.amount_spent, 0);
    const updatedData: Project = {
      ...editData,
      funding: {
        ...editData.funding!,
        amount_spent: totalSpent,
        amount_remaining: editData.funding!.total_awarded - totalSpent
      },
      funding_initialized: true
    };
    setProjects((prev) =>
      prev.map((p) => (p.project_ID === editProjectId ? updatedData : p))
    );
    setEditProjectId(null);
    setEditData(null);
  };

  const handleDelete = (projectId: string) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.project_ID === projectId
          ? { ...p, funding: null, categories: [], funding_initialized: false }
          : p
      )
    );
    setDeleteProjectId(null);
  };

  const handleAddCategory = () => {
    if (!editData) return;
    const newCategory: Category = {
      category_ID: Date.now(),
      category: "",
      amount_spent: 0,
      type: "Personnel"
    };
    setEditData({ ...editData, categories: [...editData.categories, newCategory] });
  };

  const handleDeleteCategory = (index: number) => {
    if (!editData) return;
    const updated = [...editData.categories];
    updated.splice(index, 1);
    setEditData({ ...editData, categories: updated });
  };

  return (
    <main className={styles.container}>
      <nav className={styles.sidebar}>
        <h2>ThinkSync</h2>
        <h3>FUNDING</h3>
        <ul>
          <li>
            <button className={styles.activeTab}>Funding Dashboard</button>
          </li>
        </ul>
      </nav>

      <section className={styles.mainContent}>
        <header className={styles.heading}>
          <h2>Project Funding Overview</h2>
        </header>
        <section className={styles.cardContainer}>
          {projects.map((project) => {
            const pieData = project.funding ? [
              { name: "Spent", value: project.funding.amount_spent },
              { name: "Remaining", value: project.funding.amount_remaining }
            ] : [];

            return (
              <article key={project.project_ID} className={styles.card}>
                <h3>{project.title}</h3>
                {project.funding ? (
                  <>
                    <p>Total Awarded: R{project.funding.total_awarded.toLocaleString()}</p>
                    <p>Spent: R{project.funding.amount_spent.toLocaleString()}</p>
                    <p>Remaining: R{project.funding.amount_remaining.toLocaleString()}</p>
                    <p>Status: <span className={styles[`status${project.funding.grant_status}`]}>{project.funding.grant_status}</span></p>
                    <p>Grant Ends: {project.funding.grant_end_date}</p>
                    <table className={styles.breakdownTable}>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Amount</th>
                          <th>Category</th>
                        </tr>
                      </thead>
                      <tbody>
                        {project.categories.map((cat) => (
                          <tr key={cat.category_ID}>
                            <td>{cat.category}</td>
                            <td>R{cat.amount_spent.toLocaleString()}</td>
                            <td>{cat.type}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className={styles.pieContainer}>
                      <ResponsiveContainer width={250} height={250}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {pieData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                ) : (
                  <>
                    <p>No funding available for this project.</p>
                    <button className={styles.addButton} onClick={() => handleEdit(project.project_ID)}>Initialize Funding</button>
                  </>
                )}

                <footer className={styles.cardFooter}>
                  {project.funding && (
                    <>
                      <button className={styles.editButton} onClick={() => handleEdit(project.project_ID)}>Edit</button>
                      <button className={styles.trashButton} onClick={() => setDeleteProjectId(project.project_ID)}>Delete</button>
                    </>
                  )}
                </footer>

                {editProjectId === project.project_ID && editData && (
                  <section className={styles.editModal}>
                    <h4>{project.funding ? "Edit Funding" : "Initialize Funding"}</h4>
                    <label>Total Awarded</label>
                    <input
                      type="number"
                      value={editData.funding?.total_awarded || 0}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          funding: {
                            ...(editData.funding || {}),
                            total_awarded: parseFloat(e.target.value) || 0,
                            amount_spent: 0,
                            amount_remaining: 0,
                            grant_status: editData.funding?.grant_status || "Planned",
                            grant_end_date: editData.funding?.grant_end_date || new Date().toISOString().split("T")[0]
                          }
                        })
                      }
                    />

                    <label>Status</label>
                    <select
                      value={editData.funding?.grant_status || "Planned"}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          funding: {
                            ...(editData.funding || {}),
                            grant_status: e.target.value,
                            total_awarded: editData.funding?.total_awarded || 0,
                            amount_spent: 0,
                            amount_remaining: 0,
                            grant_end_date: editData.funding?.grant_end_date || new Date().toISOString().split("T")[0]
                          }
                        })
                      }
                    >
                      <option value="Active">Active</option>
                      <option value="Planned">Planned</option>
                      <option value="Inactive">Inactive</option>
                    </select>

                    <label>Grant End Date</label>
                    <input
                      type="date"
                      value={editData.funding?.grant_end_date || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          funding: {
                            ...(editData.funding || {}),
                            grant_end_date: e.target.value,
                            total_awarded: editData.funding?.total_awarded || 0,
                            grant_status: editData.funding?.grant_status || "Planned",
                            amount_spent: 0,
                            amount_remaining: 0
                          }
                        })
                      }
                    />

                    <h4>Funding Categories</h4>
                    <table className={styles.breakdownTable}>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Amount Spent</th>
                          <th>Category</th>
                          <th>Remove</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editData.categories.map((cat, idx) => (
                          <tr key={cat.category_ID}>
                            <td>
                              <input
                                type="text"
                                value={cat.category}
                                onChange={(e) => {
                                  const updated = [...editData.categories];
                                  updated[idx].category = e.target.value;
                                  setEditData({ ...editData, categories: updated });
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                value={cat.amount_spent}
                                onChange={(e) => {
                                  const updated = [...editData.categories];
                                  updated[idx].amount_spent = parseFloat(e.target.value) || 0;
                                  setEditData({ ...editData, categories: updated });
                                }}
                              />
                            </td>
                            <td>
                              <select
                                value={cat.type}
                                onChange={(e) => {
                                  const updated = [...editData.categories];
                                  updated[idx].type = e.target.value as Category["type"];
                                  setEditData({ ...editData, categories: updated });
                                }}
                              >
                                <option value="Personnel">Personnel</option>
                                <option value="Equipment">Equipment</option>
                                <option value="Consumables">Consumables</option>
                              </select>
                            </td>
                            <td>
                              <button onClick={() => handleDeleteCategory(idx)}>✕</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button className={styles.addButton} onClick={handleAddCategory}>+ Add Category</button>

                    <div className={styles.modalButtons}>
                      <button onClick={handleConfirmEdit}>Confirm</button>
                      <button onClick={() => setEditProjectId(null)}>Cancel</button>
                    </div>
                  </section>
                )}

                {deleteProjectId === project.project_ID && (
                  <section className={styles.editModal}>
                    <p>Are you sure you want to delete funding for <strong>{project.title}</strong>?</p>
                    <div className={styles.modalButtons}>
                      <button onClick={() => handleDelete(project.project_ID)}>Yes, Delete</button>
                      <button onClick={() => setDeleteProjectId(null)}>Cancel</button>
                    </div>
                  </section>
                )}
              </article>
            );
          })}
        </section>
      </section>
    </main>
  );
}
