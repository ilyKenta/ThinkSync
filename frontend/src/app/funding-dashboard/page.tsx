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

const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28CFE", "#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"
];

const CATEGORY_COLORS: Record<string, string> = {
  Personnel: "#0088FE",
  Equipment: "#00C49F",
  Consumables: "#FFBB28",
  Remaining: "#FF4C4C"
};

interface Category {
  category_ID: number;
  category: string;
  description?: string;
  amount_spent: number;
  amount_allocated: number;
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

const normalizeCategory = (catVal: string) => {
  const lower = catVal.trim().toLowerCase();
  if (lower === "personnel") return "Personnel";
  if (lower === "equipment") return "Equipment";
  if (lower === "consumables") return "Consumables";
  return "Personnel";
};

// Helper to format date as YYYY-MM-DD
const formatDate = (dateString: string | undefined | null): string | null => {
  if (!dateString) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
  return new Date(dateString).toISOString().split('T')[0];
};

// Helper to format date for input type="date"
const formatDateForInput = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
  return new Date(dateString).toISOString().split('T')[0];
};

export default function Page() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState('funding');
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all projects with funding data
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('jwt');
        const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }
        const data = await response.json();
        console.log(data);
        setProjects(data.projects);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();

    // Fetch unread messages count
    const fetchUnread = async () => {
      const token = localStorage.getItem('jwt');
      if (!token) return;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/messages/unread`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(Array.isArray(data) ? data.length : 0);
      }
    };
    fetchUnread();
  }, []);

  const handleEdit = async (projectId: string) => {
    try {
      const token = localStorage.getItem('jwt');
      const selected = projects.find((p) => p.project_ID === projectId);
      
      if (selected?.funding_initialized) {
        // If funding is already initialized, fetch categories
        const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding/${projectId}/categories`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!response.ok) {
          throw new Error('Failed to fetch project details');
        }
        const data = await response.json();
        
        // Map the categories to include the type field and normalize values
        const mappedCategories = data.categories.map((cat: any) => {
          const normalized = normalizeCategory(cat.category);
          return {
            ...cat,
            category: normalized,
            type: normalized
          };
        });
        setEditData({
          ...selected,
          funding: {
            grant_status: selected.funding?.grant_status?.toLowerCase() || 'active',
            total_awarded: typeof selected.funding?.total_awarded === 'number' ? selected.funding.total_awarded : 0,
            amount_spent: typeof selected.funding?.amount_spent === 'number' ? selected.funding.amount_spent : 0,
            amount_remaining: typeof selected.funding?.amount_remaining === 'number' ? selected.funding.amount_remaining : 0,
            grant_end_date: typeof selected.funding?.grant_end_date === 'string' ? selected.funding.grant_end_date : new Date().toISOString().split('T')[0],
          },
          categories: mappedCategories
        });
      } else {
        // If funding is not initialized, create new funding data structure
        setEditData({
          ...selected!,
          funding: {
            total_awarded: 0,
            amount_spent: 0,
            amount_remaining: 0,
            grant_status: 'active',
            grant_end_date: new Date().toISOString().split('T')[0]
          },
          categories: [],
          funding_initialized: false
        });
      }
      setEditProjectId(projectId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleConfirmEdit = async () => {
    if (!editData || !editProjectId) return;

    try {
      const token = localStorage.getItem('jwt');
      const project = projects.find(p => p.project_ID === editProjectId);
      
      if (!project) {
        throw new Error('Project not found');
      }

      // Check if funding needs to be initialized
      if (!editData.funding_initialized) {
        const payload = {
          total_awarded: editData.funding?.total_awarded,
          grant_status: editData.funding?.grant_status,
          grant_end_date: formatDate(editData.funding?.grant_end_date),
        };
        console.log('POST funding payload:', payload);
        const initResponse = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding/${editProjectId}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!initResponse.ok) {
          const errorData = await initResponse.json();
          console.error('Backend error:', errorData);
          throw new Error(errorData.error || 'Failed to initialize funding');
        }
      } else if (project.funding) {
        // Only update funding if values have changed
        const fundingChanged = 
          project.funding.total_awarded !== editData.funding?.total_awarded ||
          project.funding.grant_status !== editData.funding?.grant_status ||
          project.funding.grant_end_date !== editData.funding?.grant_end_date;

        if (fundingChanged) {
          const payload = {
            total_awarded: editData.funding?.total_awarded,
            grant_status: editData.funding?.grant_status,
            grant_end_date: formatDate(editData.funding?.grant_end_date),
          };
          console.log('PUT funding payload:', payload);
          const fundingResponse = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding/${editProjectId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });

          if (!fundingResponse.ok) {
            const errorData = await fundingResponse.json();
            console.error('Backend error:', errorData);
            throw new Error(errorData.error || 'Failed to update funding details');
          }
        }
      }

      // Update categories only if they exist and have changed
      if (editData.categories.length > 0) {
        for (const category of editData.categories) {
          const existingCategory = project.categories?.find(c => c.category_ID === category.category_ID);
          
          // Check if category has changed
          const categoryChanged = !existingCategory || 
            existingCategory.description !== category.description ||
            existingCategory.type !== category.type ||
            existingCategory.amount_spent !== category.amount_spent;

          if (categoryChanged) {
            // Ensure amount_spent is a non-negative number
            const amountSpent = Math.max(0, category.amount_spent || 0);
            
            const categoryData = {
              category: category.category,
              description: category.description || '',
              amount_allocated: existingCategory?.amount_allocated || amountSpent,
              amount_spent: amountSpent
            };

            if (category.category_ID) {
              // Update existing category
              const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding/${editProjectId}/categories/${category.category_ID}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(categoryData),
              });

              if (!updateResponse.ok) {
                const errorData = await updateResponse.json();
                throw new Error(`Failed to update category ${category.category_ID}: ${errorData.error || 'Unknown error'}`);
              }
            } else {
              // Add new category
              const addResponse = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding/${editProjectId}/categories`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(categoryData),
              });

              if (!addResponse.ok) {
                const errorData = await addResponse.json();
                throw new Error(`Failed to add new category: ${errorData.error || 'Unknown error'}`);
              }
            }
          }
        }
      }

      // Only refresh if changes were made
      const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to refresh projects');
      }
      const data = await response.json();
      setProjects(data.projects);
      setEditProjectId(null);
      setEditData(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDelete = async (projectId: string) => {
    try {
      const token = localStorage.getItem('jwt');
      // Delete funding for the project using the new endpoint
      const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete funding');
      }
      // Refresh projects data
      const refreshed = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!refreshed.ok) {
        throw new Error('Failed to refresh projects');
      }
      const data = await refreshed.json();
      setProjects(data.projects);
      setDeleteProjectId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleAddCategory = async () => {
    if (!editData || !editProjectId) return;
    
    try {
      const token = localStorage.getItem('jwt');
      const newCategory = {
        category: "Personnel",
        description: "",
        amount_allocated: 0,
        amount_spent: 0
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding/${editProjectId}/categories`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCategory),
      });

      if (!response.ok) {
        throw new Error('Failed to add category');
      }

      // Fetch updated categories
      const categoriesResponse = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding/${editProjectId}/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!categoriesResponse.ok) {
        throw new Error('Failed to fetch updated categories');
      }

      const categoriesData = await categoriesResponse.json();
      // Merge: preserve UI state for existing categories, only normalize new ones
      const mergedCategories = categoriesData.categories.map((cat: any) => {
        const existing = editData.categories.find(c => c.category_ID === cat.category_ID);
        if (existing) {
          // Preserve the user's current selection for category and type
          return { ...cat, category: existing.category, type: existing.type };
        } else {
          // Normalize only the new category
          const normalized = normalizeCategory(cat.category);
          return { ...cat, category: normalized, type: normalized };
        }
      });

      setEditData({
        ...editData,
        categories: mergedCategories
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleDeleteCategory = async (projectId: string, categoryId: number) => {
    try {
      const token = localStorage.getItem('jwt');
      await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding/${projectId}/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (editData) {
        const updated = editData.categories.filter(cat => cat.category_ID !== categoryId);
        setEditData({ ...editData, categories: updated });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleCategoryUpdate = async (projectId: string, categoryId: number, updatedCategory: any) => {
    try {
      const token = localStorage.getItem('jwt');
      const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding/${projectId}/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: updatedCategory.type,
          description: updatedCategory.description,
          amount_allocated: updatedCategory.amount_spent,
          amount_spent: updatedCategory.amount_spent,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update category');
      }

      // Refresh the categories data
      const categoriesResponse = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding/${projectId}/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!categoriesResponse.ok) {
        throw new Error('Failed to fetch updated categories');
      }

      const categoriesData = await categoriesResponse.json();
      if (editData) {
        setEditData({
          ...editData,
          categories: categoriesData.categories
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  if (loading) {
    return <main className={styles.container}><p>Loading...</p></main>;
  }

  if (error) {
    return <main className={styles.container}><p>Error: {error}</p></main>;
  }

  return (
    <main className={styles.container}>
      <nav className={styles.sidebar} aria-label="Main navigation">
        <h2>ThinkSync</h2>
        <h3>DASHBOARD</h3>

        <ul>
          <li>
            <button 
              type="button" 
              onClick={() => {
                setActiveTab('my');
                router.push("/researcher-dashboard");
              }}
              className={activeTab === 'my' ? styles.active : ''}
            >
              My Projects
            </button>
          </li>
          <li>
            <button 
              type="button" 
              onClick={() => {
                setActiveTab('shared');
                router.push("/Shared_projects");
              }}
              className={activeTab === 'shared' ? styles.active : ''}
            >
              Shared Projects
            </button>
          </li>
          <li>
            <button 
              type="button" 
              onClick={() => {
                setActiveTab('custom');
                router.push("/custom-dashboard");
              }}
              className={activeTab === 'custom' ? styles.active : ''}
            >
              Custom Dashboard
            </button>
          </li>
          <li>
            <button 
              type="button" 
              onClick={() => {
                setActiveTab('messager');
                router.push("/messager");
              }}
              className={activeTab === 'messager' ? styles.active : ''}
            >
              Messager
              {unreadCount > 0 && (
                <mark style={{
                  display: 'inline-block',
                  marginLeft: 8,
                  minWidth: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'red',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: 12,
                  textAlign: 'center',
                  lineHeight: '20px',
                  padding: '0 6px',
                  verticalAlign: 'middle',
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </mark>
              )}
            </button>
          </li>
          <li>
            <button 
              type="button" 
              onClick={() => {
                setActiveTab('milestones');
                router.push("/milestones");
              }}
              className={activeTab === 'milestones' ? styles.active : ''}
            >
              Milestones
            </button>
          </li>
          <li>
            <button 
              type="button" 
              onClick={() => {
                setActiveTab('funding');
                router.push("/funding-dashboard");
              }}
              className={activeTab === 'funding' ? styles.active : ''}
            >
              Funding
            </button>
          </li>
        </ul>
      </nav>

      <section className={styles.mainContent}>
        <header className={styles.heading}>
          <h2>Project Funding Overview</h2>
          <button
            className={styles.createBtn}
            style={{ backgroundColor: '#4a90e2', display: 'flex', alignItems: 'center' }}
            onClick={async () => {
              try {
                const token = localStorage.getItem('jwt');
                const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding/report`, {
                  headers: {
                    'Authorization': `Bearer ${token}`
                  }
                });
                if (!response.ok) {
                  const errorData = await response.text();
                  throw new Error(`Failed to generate report: ${response.status} ${errorData}`);
                }
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'funding-report.pdf';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
              } catch (err) {
                alert('Failed to download report. Please try again.');
              }
            }}
          >
            <strong style={{ marginRight: 8, fontStyle: 'normal' }}>📊</strong>
            Download Report
          </button>
        </header>
        <section className={styles.cardContainer}>
          {projects.map((project) => {
            // Aggregate category spending for the pie chart
            const categoryTotals: Record<string, number> = {};
            project.categories.forEach(cat => {
              const normalized = normalizeCategory(cat.category);
              if (!categoryTotals[normalized]) categoryTotals[normalized] = 0;
              categoryTotals[normalized] += cat.amount_spent;
            });
            const pieData = project.funding
              ? [
                  ...Object.entries(categoryTotals)
                    .filter(([_, value]) => value > 0)
                    .map(([name, value]) => ({
                      name,
                      value,
                      normalizedName: name
                    })),
                  {
                    name: "Remaining",
                    value: project.funding.amount_remaining,
                    normalizedName: "Remaining"
                  }
                ]
              : [];

            return (
              <article key={project.project_ID} className={styles.card}>
                <h3>{project.title}</h3>
                {project.funding ? (
                  <>
                    <dl>
                      <dt>Total Awarded:</dt>
                      <dd>R{project.funding.total_awarded.toLocaleString()}</dd>
                      
                      <dt>Spent:</dt>
                      <dd>R{project.funding.amount_spent.toLocaleString()}</dd>
                      
                      <dt>Remaining:</dt>
                      <dd>R{project.funding.amount_remaining.toLocaleString()}</dd>
                      
                      <dt>Status:</dt>
                      <dd><em className={styles[`status${project.funding.grant_status}`]}>{project.funding.grant_status}</em></dd>
                      
                      <dt>Grant Ends:</dt>
                      <dd>{project.funding.grant_end_date ? new Date(project.funding.grant_end_date).toLocaleDateString() : 'N/A'}</dd>
                    </dl>

                    <table className={styles.breakdownTable}>
                      <caption>Category Breakdown</caption>
                      <thead>
                        <tr>
                          <th scope="col">Description</th>
                          <th scope="col">Category</th>
                          <th scope="col">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {project.categories.map((cat) => (
                          <tr key={cat.category_ID}>
                            <td>{cat.description || 'No description'}</td>
                            <td>{normalizeCategory(cat.category)}</td>
                            <td>R{cat.amount_spent.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <figure className={styles.pieContainer}>
                      <figcaption>Funding Distribution</figcaption>
                      <section className={styles.pieChartWrapper}>
                        <ResponsiveContainer width={320} height={300}>
                          <PieChart>
                            <Pie
                              data={pieData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={100}
                              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                const RADIAN = Math.PI / 180;
                                const isSmall = percent < 0.1;
                                const radius = isSmall
                                  ? outerRadius + 24
                                  : innerRadius + (outerRadius - innerRadius) * 0.5;
                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                return (
                                  <text
                                    x={x}
                                    y={y}
                                    fill="#333"
                                    textAnchor={x > cx ? "start" : "end"}
                                    dominantBaseline="central"
                                    fontSize={14}
                                  >
                                    {`${(percent * 100).toFixed(0)}%`}
                                  </text>
                                );
                              }}
                              labelLine={false}
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.normalizedName] || "#CCCCCC"} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </section>
                    </figure>
                  </>
                ) : (
                  <>
                    <p>No funding available for this project.</p>
                    <button className={styles.addButton} onClick={() => handleEdit(project.project_ID)}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Initialize Funding
                    </button>
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
                  <section className={styles.editModal} aria-labelledby={`edit-title-${project.project_ID}`}>
                    <h4 id={`edit-title-${project.project_ID}`}>{project.funding ? "Edit Funding" : "Initialize Funding"}</h4>
                    <form onSubmit={(e) => { e.preventDefault(); handleConfirmEdit(); }}>
                      <fieldset>
                        <legend>Funding Details</legend>
                        <label htmlFor={`total-awarded-${project.project_ID}`}>Total Awarded</label>
                        <input
                          id={`total-awarded-${project.project_ID}`}
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
                                grant_status: editData.funding?.grant_status || "active",
                                grant_end_date: editData.funding?.grant_end_date || new Date().toISOString().split("T")[0]
                              }
                            })
                          }
                        />

                        <label htmlFor={`status-${project.project_ID}`}>Status</label>
                        <select
                          id={`status-${project.project_ID}`}
                          value={editData.funding?.grant_status || "active"}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              funding: {
                                grant_status: e.target.value.toLowerCase(),
                                total_awarded: (editData.funding && typeof editData.funding.total_awarded === 'number') ? editData.funding.total_awarded : 0,
                                amount_spent: (editData.funding && typeof editData.funding.amount_spent === 'number') ? editData.funding.amount_spent : 0,
                                amount_remaining: (editData.funding && typeof editData.funding.amount_remaining === 'number') ? editData.funding.amount_remaining : 0,
                                grant_end_date: (editData.funding && typeof editData.funding.grant_end_date === 'string') ? editData.funding.grant_end_date : new Date().toISOString().split("T")[0]
                              }
                            })
                          }
                        >
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                          <option value="expired">Expired</option>
                          <option value="cancelled">Cancelled</option>
                        </select>

                        <label htmlFor={`end-date-${project.project_ID}`}>Grant End Date</label>
                        <input
                          id={`end-date-${project.project_ID}`}
                          type="date"
                          value={formatDateForInput(editData.funding?.grant_end_date)}
                          onChange={(e) =>
                            setEditData({
                              ...editData,
                              funding: {
                                ...(editData.funding || {}),
                                grant_end_date: e.target.value,
                                total_awarded: editData.funding?.total_awarded || 0,
                                grant_status: editData.funding?.grant_status || "active",
                                amount_spent: editData.funding?.amount_spent || 0,
                                amount_remaining: editData.funding?.amount_remaining || 0
                              }
                            })
                          }
                        />
                      </fieldset>

                      {editData.funding_initialized && (
                        <fieldset>
                          <legend>Funding Categories</legend>
                          <table className={styles.breakdownTable}>
                            <caption>Category Details</caption>
                            <thead>
                              <tr>
                                <th scope="col">Description</th>
                                <th scope="col">Category</th>
                                <th scope="col">Amount Spent</th>
                                <th scope="col">Remove</th>
                              </tr>
                            </thead>
                            <tbody>
                              {editData.categories.map((cat, idx) => (
                                <tr key={cat.category_ID}>
                                  <td>
                                    <input
                                      type="text"
                                      value={cat.description || ''}
                                      onChange={(e) => {
                                        const updated = [...editData.categories];
                                        updated[idx].description = e.target.value;
                                        setEditData({ ...editData, categories: updated });
                                      }}
                                      placeholder="Enter description"
                                    />
                                  </td>
                                  <td>
                                    <select
                                      value={cat.category}
                                      onChange={(e) => {
                                        const updated = [...editData.categories];
                                        updated[idx].category = e.target.value as Category["type"];
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
                                    <button 
                                      type="button"
                                      onClick={() => handleDeleteCategory(project.project_ID, cat.category_ID)}
                                      aria-label={`Remove ${cat.category} category`}
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <button type="button" className={styles.addButton} onClick={handleAddCategory}>+ Add Category</button>
                        </fieldset>
                      )}

                      <nav className={styles.modalButtons}>
                        <button type="submit">Confirm</button>
                        <button type="button" onClick={() => setEditProjectId(null)}>Cancel</button>
                      </nav>
                    </form>
                  </section>
                )}

                {deleteProjectId === project.project_ID && (
                  <section className={styles.editModal} aria-labelledby={`delete-title-${project.project_ID}`}>
                    <h4 id={`delete-title-${project.project_ID}`}>Confirm Deletion</h4>
                    <p>Are you sure you want to delete funding for <strong>{project.title}</strong>?</p>
                    <nav className={styles.modalButtons}>
                      <button type="button" onClick={() => handleDelete(project.project_ID)}>Yes, Delete</button>
                      <button type="button" onClick={() => setDeleteProjectId(null)}>Cancel</button>
                    </nav>
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
