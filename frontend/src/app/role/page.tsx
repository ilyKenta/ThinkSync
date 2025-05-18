// page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./page.module.css";

const Page = () => {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<string | null>("researcher");

  const handleContinue = () => {
    if (selectedRole) {
      router.push(`/${selectedRole}`);
    }
  };

  return (
    <main className={styles.container} role="main">
      <h1 className={styles.title}>Use of platform</h1>
      <section className={styles.buttonGroup} aria-label="Role selection">
        {['researcher', 'admin', 'reviewer'].map((role) => (
          <button
            key={role}
            className={`${styles.roleButton} ${selectedRole === role ? styles.selected : ''}`}
            onClick={() => setSelectedRole(role)}
            aria-pressed={selectedRole === role}
            aria-label={`Select ${role} role`}
          >
            {role}
          </button>
        ))}
      </section>
      <button 
        className={styles.continueButton} 
        onClick={handleContinue}
        aria-label="Continue to selected role"
      >
        Continue →
      </button>
    </main>
  );
};

export default Page;