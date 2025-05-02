"use client";

import React, { useState, useEffect } from "react";
import styles from "../dashboard/page.module.css";
import { FaUserCircle } from "react-icons/fa";
// For navigation
import { useRouter } from "next/navigation";

const AdminDashboard = () => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("shared");
  return (
    <main className={styles.container}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <h2 style={{ margin: 0 }}>ThinkSync</h2>
        <h3>Dashboard</h3>
        <ul>
          <li>
            <button
              type="button"
              onClick={() => {
                setActiveTab("my");
                router.push("/messager/AdminMessage");
              }}
              className={activeTab === "my" ? styles.active : ""}
            >
              Messager
            </button>
          </li>
        </ul>
      </aside>

      {/* Main Content */}
      <section style={{ flex: 1, padding: "40px 60px" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
          }}
        >
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
              background: "#f9f9f9",
            }}
          />
          <FaUserCircle size={32} style={{ color: "#222" }} />
        </header>
        <section
          style={{
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "flex-start",
            gap: 20,
            marginTop: 0,
          }}
        >
          <button
            style={{
              background: "#000",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "12px 32px",
              fontSize: 20,
              fontWeight: 600,
              cursor: "pointer",
              marginTop: 0,
              marginLeft: 0,
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
            onClick={() => (window.location.href = "/manage-users")}
          >
            Manage Users
          </button>
          <button
            style={{
              background: "#000",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "12px 32px",
              fontSize: 20,
              fontWeight: 600,
              cursor: "pointer",
              marginTop: 0,
              marginLeft: 0,
              boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
            }}
            onClick={() => (window.location.href = "/submitted-proposals")}
          >
            Submitted Proposals
          </button>
        </section>
        {/* Main content area can be expanded here later */}
      </section>
    </main>
  );
};

export default AdminDashboard;
