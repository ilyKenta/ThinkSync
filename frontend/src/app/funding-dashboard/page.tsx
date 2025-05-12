// "use client";

// import React, { useEffect, useState } from 'react';
// import styles from './page.module.css';
// import { useRouter } from 'next/navigation';
// //import useAuth from '../useAuth';
// import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

// const COLORS = ['#0088FE', '#00C49F'];

// type Grant = {
//   id: string;
//   project_id: string;
//   project_title: string;
//   total_awarded: number;
//   amount_spent: number;
//   grant_end_date: string;
//   status: string;
// };

// function Page() {
//   //useAuth();
//   const router = useRouter();
//   const [hasResearcherRole, setHasResearcherRole] = useState<boolean | null>(null);
//   const [fundingData, setFundingData] = useState<Grant[]>([]);
//   const [error, setError] = useState<string | null>(null);

// //   useEffect(() => {
// //     const roleString = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
// //     let researcher = false;
// //     if (roleString) {
// //       try {
// //         const roles = JSON.parse(roleString);
// //         researcher = Array.isArray(roles) && roles.some((r: { role_name: string }) => r.role_name === 'researcher');
// //       } catch (e) {
// //         researcher = false;
// //       }
// //     }
// //     setHasResearcherRole(researcher);
// //     if (!researcher) {
// //       router.push('/login');
// //     }
// //   }, [router]);
  
//   useEffect(() => {
//     if (hasResearcherRole) {
//       const dummyFunding = [
//         {
//           id: 'f001',
//           project_id: 'p001',
//           project_title: 'AI for Healthcare',
//           total_awarded: 100000,
//           amount_spent: 65000,
//           grant_end_date: '2025-12-31',
//           status: 'Active',
//         },
//         {
//           id: 'f002',
//           project_id: 'p002',
//           project_title: 'Smart Agriculture Systems',
//           total_awarded: 150000,
//           amount_spent: 80000,
//           grant_end_date: '2026-03-15',
//           status: 'Active',
//         },
//         {
//           id: 'f003',
//           project_id: 'p003',
//           project_title: 'Climate Change Models',
//           total_awarded: 120000,
//           amount_spent: 120000,
//           grant_end_date: '2024-10-10',
//           status: 'Closed',
//         },
//       ];
//       setFundingData(dummyFunding);
//     }
//   }, [hasResearcherRole]);
  
// //  useEffect(() => {
// //     const fetchFunding = async () => {
// //       try {
// //         const token = localStorage.getItem('jwt');
// //         if (!token) throw new Error('No token found');

// //         const res = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding`, {
// //           headers: { Authorization: `Bearer ${token}` },
// //         });

// //         if (!res.ok) throw new Error('Failed to fetch funding data');

// //         const data = await res.json();
// //         setFundingData(data);
// //       } catch (err) {
// //         setError(err instanceof Error ? err.message : 'An error occurred');
// //       }
// //     };

// //     if (hasResearcherRole) {
// //       fetchFunding();
// //     }
// //   }, [hasResearcherRole]);

// //   const renderPieChart = (total: number, spent: number) => {
// //     const data = [
// //       { name: 'Spent', value: spent },
// //       { name: 'Remaining', value: total - spent },
// //     ];
// //     return (
// //       <PieChart width={160} height={160}>
// //         <Pie data={data} dataKey="value" outerRadius={60}>
// //           {data.map((entry, index) => (
// //             <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
// //           ))}
// //         </Pie>
// //         <Tooltip />
// //         <Legend verticalAlign="bottom" height={36} />
// //       </PieChart>
// //     );
// //   };

//   if (hasResearcherRole === null) return null;
//   if (!hasResearcherRole) return null;
//   if (error) return <main className={styles.mainContent}>Error: {error}</main>;

//   return (
//     <main className={styles.mainContent}>
//       <header className={styles.heading}>
//         <h2>My Funding Dashboard</h2>
//         <button className={styles.createButton} onClick={() => router.push('/funding/new')}>
//           + Add Grant
//         </button>
//       </header>

//       <section className={styles.cardContainer}>
//         {fundingData.map((grant) => (
//           <article key={grant.id} className={styles.card} onClick={() => router.push(`/funding/${grant.project_id}`)}>
//             <section className={styles.cardContent}>
//               <span>{grant.project_title}</span>
//               <p>Total Awarded: R{grant.total_awarded.toLocaleString()}</p>
//               <p>Spent: R{grant.amount_spent.toLocaleString()}</p>
//               <p>Remaining: R{(grant.total_awarded - grant.amount_spent).toLocaleString()}</p>
//               <time>End Date: {grant.grant_end_date}</time>
//               <p>Status: {grant.status}</p>
//               {renderPieChart(grant.total_awarded, grant.amount_spent)}
//             </section>
//             <footer className={styles.cardFooter}>
//               <section className={styles.buttonContainer}>
//                 <button
//                   className={styles.editButton}
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     router.push(`/funding/edit/${grant.id}`);
//                   }}
//                 >
//                   ✏️
//                 </button>
//                 <button
//                   className={styles.trashButton}
//                   onClick={(e) => {
//                     e.stopPropagation();
//                     // handle delete
//                   }}
//                 >
//                   🗑️
//                 </button>
//               </section>
//             </footer>
//           </article>
//         ))}
//       </section>
//     </main>
//   );
// }

// export default Page;
"use client";

import React, { useEffect, useState } from 'react';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const COLORS = ['#0088FE', '#00C49F'];

type Grant = {
  id: string;
  project_id: string;
  project_title: string;
  total_awarded: number;
  amount_spent: number;
  grant_end_date: string;
  status: string;
};

function Page() {
  const router = useRouter();
  const [fundingData, setFundingData] = useState<Grant[]>([]);

  useEffect(() => {
    // Inject mock data directly
    const dummyFunding = [
      {
        id: 'f001',
        project_id: 'p001',
        project_title: 'AI for Healthcare',
        total_awarded: 100000,
        amount_spent: 65000,
        grant_end_date: '2025-12-31',
        status: 'Active',
      },
      {
        id: 'f002',
        project_id: 'p002',
        project_title: 'Smart Agriculture Systems',
        total_awarded: 150000,
        amount_spent: 80000,
        grant_end_date: '2026-03-15',
        status: 'Active',
      },
      {
        id: 'f003',
        project_id: 'p003',
        project_title: 'Climate Change Models',
        total_awarded: 120000,
        amount_spent: 120000,
        grant_end_date: '2024-10-10',
        status: 'Closed',
      },
    ];
    setFundingData(dummyFunding);
  }, []);

  const renderPieChart = (total: number, spent: number) => {
    const data = [
      { name: 'Spent', value: spent },
      { name: 'Remaining', value: total - spent },
    ];
    return (
      <PieChart width={160} height={160}>
        <Pie data={data} dataKey="value" outerRadius={60}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend verticalAlign="bottom" height={36} />
      </PieChart>
    );
  };

  return (
    <main className={styles.mainContent}>
      <header className={styles.heading}>
        <h2>My Funding Dashboard</h2>
        <button className={styles.createButton} onClick={() => router.push('/funding/new')}>
          + Add Grant
        </button>
      </header>

      <section className={styles.cardContainer}>
        {fundingData.map((grant) => (
          <article key={grant.id} className={styles.card} onClick={() => router.push(`/funding/${grant.project_id}`)}>
            <section className={styles.cardContent}>
              <span>{grant.project_title}</span>
              <p>Total Awarded: R{grant.total_awarded.toLocaleString()}</p>
              <p>Spent: R{grant.amount_spent.toLocaleString()}</p>
              <p>Remaining: R{(grant.total_awarded - grant.amount_spent).toLocaleString()}</p>
              <time>End Date: {grant.grant_end_date}</time>
              <p>Status: {grant.status}</p>
              {renderPieChart(grant.total_awarded, grant.amount_spent)}
            </section>
            <footer className={styles.cardFooter}>
              <section className={styles.buttonContainer}>
                <button
                  className={styles.editButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/funding/edit/${grant.id}`);
                  }}
                >
                  ✏️
                </button>
                <button
                  className={styles.trashButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    // handle delete
                  }}
                >
                  🗑️
                </button>
              </section>
            </footer>
          </article>
        ))}
      </section>
    </main>
  );
}

export default Page;
