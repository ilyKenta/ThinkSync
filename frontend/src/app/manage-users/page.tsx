"use client";

import React, { useEffect, useState } from "react";
import styles from "../dashboard/page.module.css";

interface User {
  id: string;
  name: string;
  role: string;
}
//these are just mock data but we will connect to backend after
// API data will be loaded into users state

const roles = ["researcher", "reviewer", "admin"];

const ManageUsersPage = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>("");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('jwt');
        const res = await fetch('http://localhost:5000/api/admin/users', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (res.ok && data.users) {
          setUsers(data.users.map((u: any) => ({
            id: u.user_ID.toString(),
            name: `${u.fname} ${u.sname}`,
            role: u.roles || u.acc_role || '',
          })));
        } else {
          setUsers([]);
        }
      } catch (err) {
        setUsers([]);
      }
    };
    fetchUsers();
  }, []);

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setEditRole(user.role);
  };

  const handleSave = async (user: User) => {
    try {
      const token = localStorage.getItem('jwt');
      const res = await fetch(`http://localhost:5000/api/admin/users/${user.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newRole: editRole }),
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === user.id ? { ...u, role: editRole } : u));
        setEditingId(null);
      } else {
        // Optionally handle error
        alert('Failed to update role');
      }
    } catch (err) {
      alert('Error updating user role');
    }
  };

  return (
    <main className={styles.container}>
      <aside className={styles.sidebar}>
        <h2 style={{ margin: 0 }}>ThinkSync</h2>
        <h3>Manage Users</h3>
      </aside>
      <section style={{ flex: 1, padding: "40px 60px" }}>
        <h1 style={{ marginBottom: 32 }}>User Management</h1>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th style={{ textAlign: "left", padding: 12 }}>Name</th>
              <th style={{ textAlign: "left", padding: 12 }}>Role</th>
              <th style={{ textAlign: "left", padding: 12 }}></th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td style={{ padding: 12 }}>{user.name}</td>
                <td style={{ padding: 12 }}>
                  {editingId === user.id ? (
                    <select value={editRole} onChange={e => setEditRole(e.target.value)}>
                      {roles.map(role => (
                        <option key={role} value={role}>{role}</option>
                      ))}
                    </select>
                  ) : (
                    user.role
                  )}
                </td>
                <td style={{ padding: 12 }}>
                  {editingId === user.id ? (
                    <button style={{ background: '#222', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', marginRight: 8 }} onClick={() => handleSave(user)}>Save</button>
                  ) : (
                    <button style={{ background: '#eee', color: '#222', border: 'none', borderRadius: 6, padding: '6px 16px' }} onClick={() => handleEdit(user)}>Edit</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
};

export default ManageUsersPage;
