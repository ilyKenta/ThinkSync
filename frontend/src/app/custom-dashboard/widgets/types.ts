export interface WidgetProps {
    onDelete: () => void;
}

export interface Project {
    project_ID: number;
    title: string;
    description?: string;
    status?: string;
    created_at?: string;
    owner_ID: string;
    collaborators: Array<{
        user_ID: string;
        first_name: string;
        last_name: string;
        is_owner: boolean;
    }>;
    milestones: Milestone[];
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