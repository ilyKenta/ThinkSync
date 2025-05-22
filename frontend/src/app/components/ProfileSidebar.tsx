import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './ProfileSidebar.module.css';

interface ProfileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserDetails {
  fname: string;
  sname: string;
  department: string;
  role_name: string;
  acc_role?: string;
  phone_number?: string;
  res_area?: string;
  qualification?: string;
}

const ProfileSidebar: React.FC<ProfileSidebarProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const token = localStorage.getItem('jwt');
        if (!token) return;

        const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/auth/user-details`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUserDetails(data);
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchUserDetails();
    }
  }, [isOpen]);

  const handleLogout = () => {
    localStorage.removeItem('jwt');
    localStorage.removeItem('role');
    router.push('/');
  };

  if (!isOpen) {
    return null;
  }

  const renderField = (label: string, value: string | undefined) => {
    if (!value) return null;
    return (
      <section className={styles.field}>
        <label>{label}:</label>
        <p>{value}</p>
      </section>
    );
  };

  return (
    <aside className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true" aria-label="Profile Details">
      <section 
        className={styles.sidebar} 
        onClick={e => e.stopPropagation()}
        style={{ display: isOpen ? 'block' : 'none' }}
      >
        <button 
          className={styles.closeButton} 
          onClick={onClose}
          aria-label="Close profile sidebar"
        >
          ×
        </button>
        
        <main className={styles.content}>
          <header>
            <h2>Profile Details</h2>
          </header>
          
          {loading ? (
            <p>Loading...</p>
          ) : userDetails ? (
            <article className={styles.details}>
              {renderField('Name', `${userDetails.fname} ${userDetails.sname}`)}
              {renderField('Department', userDetails.department)}
              {renderField('Role', userDetails.role_name)}
              {renderField('Academic Role', userDetails.acc_role)}
              {renderField('Phone Number', userDetails.phone_number)}
              {renderField('Research Area', userDetails.res_area)}
              {renderField('Qualification', userDetails.qualification)}
            </article>
          ) : (
            <p>Error loading profile details</p>
          )}

          <footer>
            <button 
              className={styles.logoutButton} 
              onClick={handleLogout}
              aria-label="Logout from account"
            >
              Logout
            </button>
          </footer>
        </main>
      </section>
    </aside>
  );
};

export default ProfileSidebar; 