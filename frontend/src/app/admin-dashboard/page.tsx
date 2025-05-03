"use client";

import React, { useState, useEffect } from "react";
import styles from "../researcher-dashboard/page.module.css";
import { FaUserCircle } from "react-icons/fa";
import ManageUsersPage from "../manage-users/page";
import SubmittedProposalsPage from "../submitted-proposals/page";
import useAuth from "../useAuth";
import { useRouter } from "next/navigation";
// For navigation
// import { useRouter } from "next/navigation";

const AdminDashboard = () => {
  const router = useRouter();
  const [hasAdminRole, setHasAdminRole] = useState<boolean | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'proposals'>('users');

  useEffect(() => {
    const roleString = typeof window !== "undefined" ? localStorage.getItem('role') : null;
    let admin = false;
    if (roleString) {
      try {
        const roles = JSON.parse(roleString);
        admin = Array.isArray(roles) && roles.some((r: { role_name: string; }) => r.role_name === 'admin');
      } catch (e) {
        admin = false;
      }
    }
    setHasAdminRole(admin);
    if (!admin) {
      router.push('/login');
    }
  }, [router]);

  if (hasAdminRole === null) {
    // Still checking role, render nothing or a spinner
    return null;
  }
  if (!hasAdminRole) {
    // Redirecting, render nothing
    return null;
  }

  return (
    <main className={styles.container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <h2 style={{ margin: 0 }}>ThinkSync</h2>
        <h3>Admin Dashboard</h3>
        <ul>
          <li>
            <button
              type="button"
              onClick={() => setActiveTab('users')}
              className={activeTab === 'users' ? styles.activeTab : ''}
            >
              Manage Users
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={() => setActiveTab('proposals')}
              className={activeTab === 'proposals' ? styles.activeTab : ''}
            >
              Submitted Proposals
            </button>
          </li>
        </ul>
      </aside>
      <section style={{ flex: 1, padding: "40px 60px" }}>
        <header style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <input
            type="text"
            placeholder="Search..."
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "1px solid #ccc",
              fontSize: 16,
              marginRight: 20,
              width: 240,
              background: "#f9f9f9"
            }}
          />
          <FaUserCircle size={32} style={{ color: "#222" }} />
        </header>
        
        {/* Content based on active tab */}
        {activeTab === 'users' ? <ManageUsersPage /> : <SubmittedProposalsPage />}
      </section>
    </main>
  );
};

export default ManageUsersPage;