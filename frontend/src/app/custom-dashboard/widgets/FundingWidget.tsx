'use client';

import { useState, useEffect } from 'react';
import styles from '../page.module.css';
import { WidgetProps } from './types';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer
} from 'recharts';

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
    project_ID: number;
    title: string;
    funding: Funding | null;
    funding_initialized: boolean;
    categories: Category[];
}

const normalizeCategory = (category: string): string => {
    const normalized = category.toLowerCase();
    if (normalized.includes('personnel')) return 'Personnel';
    if (normalized.includes('equipment')) return 'Equipment';
    if (normalized.includes('consumable')) return 'Consumables';
    return category;
};

export default function FundingWidget({ onDelete }: WidgetProps) {
    const [projects, setProjects] = useState<Project[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchFunding();
    }, []);

    const fetchFunding = async () => {
        try {
            console.log('Fetching funding data...');
            const token = localStorage.getItem('jwt');

            const response = await fetch(`${process.env.NEXT_PUBLIC_AZURE_API_URL}/api/funding`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.status === 401) {
                setError('Session expired. Please log in again.');
                setIsLoading(false);
                return;
            }
            
            if (!response.ok) {
                throw new Error(`Failed to fetch funding: ${response.status}`);
            }
            
            const data = await response.json();
            setProjects(data.projects || []);
            setError(null);
        } catch (error) {
            setError('Failed to load funding data. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % projects.length);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + projects.length) % projects.length);
    };

    const formatCurrency = (amount: number | undefined) => {
        if (amount === undefined) return 'R0.00';
        return `R${amount.toLocaleString()}`;
    };

    if (isLoading) {
        return (
            <article className={styles.widgetContainer}>
                <header className={styles.widgetHeader}>
                    <h2 className={styles.widgetTitle}>Funding</h2>
                    <button className={styles.deleteButton} onClick={onDelete} aria-label="Delete widget">×</button>
                </header>
                <p className={styles.loading}>Loading funding data...</p>
            </article>
        );
    }

    if (error) {
        return (
            <article className={styles.widgetContainer}>
                <header className={styles.widgetHeader}>
                    <h2 className={styles.widgetTitle}>Funding</h2>
                    <button className={styles.deleteButton} onClick={onDelete} aria-label="Delete widget">×</button>
                </header>
                <p className={styles.error}>{error}</p>
            </article>
        );
    }

    if (projects.length === 0) {
        return (
            <article className={styles.widgetContainer}>
                <header className={styles.widgetHeader}>
                    <h2 className={styles.widgetTitle}>Funding</h2>
                    <button className={styles.deleteButton} onClick={onDelete} aria-label="Delete widget">×</button>
                </header>
                <p>No funding data found.</p>
            </article>
        );
    }

    const currentProject = projects[currentIndex];

    if (!currentProject.funding) {
        return (
            <article className={styles.widgetContainer}>
                <header className={styles.widgetHeader}>
                    <h2 className={styles.widgetTitle}>Funding</h2>
                    <button className={styles.deleteButton} onClick={onDelete} aria-label="Delete widget">×</button>
                </header>
                <p>No funding data for this project.</p>
            </article>
        );
    }

    // Prepare data for pie chart
    const categoryTotals: Record<string, number> = {};
    currentProject.categories.forEach(cat => {
        const normalized = normalizeCategory(cat.category);
        if (!categoryTotals[normalized]) categoryTotals[normalized] = 0;
        categoryTotals[normalized] += cat.amount_spent;
    });

    const pieData = [
        ...Object.entries(categoryTotals)
            .filter(([_, value]) => value > 0)
            .map(([name, value]) => ({
                name,
                value,
                normalizedName: name
            })),
        {
            name: "Remaining",
            value: currentProject.funding.amount_remaining,
            normalizedName: "Remaining"
        }
    ];

    return (
        <article className={styles.widgetContainer}>
            <header className={styles.widgetHeader}>
                <h2 className={styles.widgetTitle}>Funding</h2>
                <button className={styles.deleteButton} onClick={onDelete} aria-label="Delete widget">×</button>
            </header>
            
            <section className={styles.fundingCard}>
                <h3>{currentProject.title}</h3>
                <dl className={styles.fundingOverview}>
                    <dt>Total Awarded:</dt>
                    <dd>{formatCurrency(currentProject.funding.total_awarded)}</dd>
                    
                    <dt>Spent:</dt>
                    <dd>{formatCurrency(currentProject.funding.amount_spent)}</dd>
                    
                    <dt>Remaining:</dt>
                    <dd>{formatCurrency(currentProject.funding.amount_remaining)}</dd>
                    
                    <dt>Status:</dt>
                    <dd>{currentProject.funding.grant_status}</dd>
                    
                    <dt>Grant Ends:</dt>
                    <dd><time dateTime={currentProject.funding.grant_end_date}>{currentProject.funding.grant_end_date ? new Date(currentProject.funding.grant_end_date).toLocaleDateString() : 'N/A'}</time></dd>
                </dl>

                <figure className={styles.pieContainer}>
                    <figcaption>Funding Distribution</figcaption>
                    <section className={styles.pieChartWrapper}>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                        const RADIAN = Math.PI / 180;
                                        const isSmall = percent < 0.1;
                                        const radius = isSmall
                                            ? outerRadius + 20
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
                                                fontSize={12}
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
                                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                            </PieChart>
                        </ResponsiveContainer>
                    </section>
                </figure>

                <section className={styles.categoryBreakdown}>
                    <h4>Category Breakdown</h4>
                    <ul className={styles.categoryList}>
                        {currentProject.categories.map((category) => (
                            <li key={category.category_ID} className={styles.categoryItem}>
                                <header className={styles.categoryHeader}>
                                    <strong className={styles.categoryName}>{category.category}</strong>
                                    <mark className={styles.categoryType}>{category.type}</mark>
                                </header>
                                {category.description && (
                                    <p className={styles.categoryDescription}>{category.description}</p>
                                )}
                                <dl className={styles.categoryDetails}>
                                    <dt>Spent:</dt>
                                    <dd>{formatCurrency(category.amount_spent)}</dd>
                                </dl>
                            </li>
                        ))}
                    </ul>
                </section>
            </section>

            <nav className={styles.navigationButtons} aria-label="Project navigation">
                <button onClick={handlePrev} disabled={currentIndex === 0}>Previous</button>
                <p>{currentIndex + 1} of {projects.length}</p>
                <button onClick={handleNext} disabled={currentIndex === projects.length - 1}>Next</button>
            </nav>
        </article>
    );
} 