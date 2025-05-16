export interface WidgetProps {
    onDelete: () => void;
}

export interface Project {
    project_ID: string;
    title: string;
    description: string;
    goals?: string;
    research_areas?: string;
    start_date?: string;
    end_date?: string;
    funding_available?: boolean;
    created_at?: string;
    collaborators?: Array<{
        first_name: string;
        last_name: string;
    }>;
    milestones?: Array<{
        milestone_ID: string;
        title: string;
        status: string;
    }>;
}

export interface Milestone {
    milestone_ID: number;
    project_ID: number;
    title: string;
    description: string;
    status: string;
    expected_completion_date: string;
    assigned_user_ID: string;
    assigned_user_fname?: string;
    assigned_user_sname?: string;
}

export interface FundingCategory {
    category: string;
    amount_spent: number;
}

export interface Funding {
    project_ID: number;
    total_awarded: number;
    amount_spent: number;
    amount_remaining: number;
    currency: string;
    last_updated: string;
    grant_status?: string;
} 