"use client";

import React, { useState, useEffect } from "react";
import styles from "../researcher-dashboard/page.module.css";
import { FaUserCircle } from "react-icons/fa";
import ManageUsersPage from "../manage-users/page";
import SubmittedProposalsPage from "../submitted-proposals/page";
import useAuth from "../useAuth";
import { useRouter } from "next/navigation";
import ProfileSidebar from "../components/ProfileSidebar";

const AdminDashboard = () => {
  const router = useRouter();
  // Track admin permission status with three possible states:
  // null = still checking, true = is admin, false = not admin
  const [hasAdminRole, setHasAdminRole] = useState<boolean | null>(null);
  // Control which content panel is displayed (users management or proposals)
  const [activeTab, setActiveTab] = useState<'users' | 'proposals'>('users');
  // Track number of unread messages for notification badge
  const [unreadCount, setUnreadCount] = useState(0);
  const [isProfileSidebarOpen, setIsProfileSidebarOpen] = useState(false);

  // Authentication check effect - verifies user has admin role
  useEffect(() => {
    // Get roles from localStorage, with SSR safety check
    const roleString = typeof window !== "undefined" ? localStorage.getItem('role') : null;
    let admin = false;
    if (roleString) {
      try {
        // Parse the roles JSON and check if any role is 'admin'
        const roles = JSON.parse(roleString);
        admin = Array.isArray(roles) && roles.some((r: { role_name: string; }) => r.role_name === 'admin');
      } catch (e) {
        // If JSON parsing fails, default to no admin access
        admin = false;
      }
    }
    setHasAdminRole(admin);
    // Redirect non-admin users to login page
    if (!admin) {
      router.push('/login');
    }
  }, [router]);

  // Fetch unread messages count for notification badge
  useEffect(() => {
    const fetchUnread = async () => {
      // Get authentication token
      const token = localStorage.getItem('jwt');
      if (!token) return;
      
      // Call API to get unread messages
      const res = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/messages/unread`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        // Handle both array response and potential non-array responses
        setUnreadCount(Array.isArray(data) ? data.length : 0);
      }
    };
    fetchUnread();
  }, []);

  // Handle loading and unauthorized states
  if (hasAdminRole === null) {
    // Still checking role, render nothing or a spinner
    return null;
  }
  if (!hasAdminRole) {
    // Redirecting, render nothing
    return null;
  }

  const handleProfileClick = () => {
    setIsProfileSidebarOpen(true);
  };

  return (
    <main className={styles.container}>
      {/* Sidebar navigation panel */}
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
          <li>
            <button
              type="button"
              onClick={() => router.push('/messager/AdminMessage')}
              className={''}
            >
              Messager
              {/* Notification badge for unread messages - only shows when count > 0 */}
              {unreadCount > 0 && (
                <strong style={{
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
                  {/* Cap display at 99+ for large numbers */}
                  {unreadCount > 99 ? '99+' : unreadCount}
                </strong>
              )}
            </button>
          </li>
        </ul>
      </aside>
      {/* Main content area */}
      <section style={{ flex: 1, padding: "40px 60px" }}>
        {/* Top header with search and user profile */}
        <header style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <button
            onClick={handleProfileClick}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f0f0f0'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <FaUserCircle size={32} style={{ color: "#222" }} />
          </button>
        </header>
        
        {/* Conditional content rendering based on active tab selection */}
        {activeTab === 'users' ? <ManageUsersPage /> : <SubmittedProposalsPage />}

        <ProfileSidebar
          isOpen={isProfileSidebarOpen}
          onClose={() => {
            setIsProfileSidebarOpen(false);
          }}
        />
      </section>
    </main>
  );
};

export default AdminDashboard;