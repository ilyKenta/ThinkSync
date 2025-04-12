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
    <div className={styles.container}>
      <h1 className={styles.title}>Use of platform</h1>
      <div className={styles.buttonGroup}>
        {['researcher', 'admin', 'reviewer'].map((role) => (
          <button
            key={role}
            className={`${styles.roleButton} ${selectedRole === role ? styles.selected : ''}`}
            onClick={() => setSelectedRole(role)}
          >
            {role}
          </button>
        ))}
      </div>
      <button className={styles.continueButton} onClick={handleContinue}>
        Continue →
      </button>
    </div>
  );
};

export default Page;