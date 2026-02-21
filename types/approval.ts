export type ApprovalStatus = 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Returned';

export interface ApprovalTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    form_schema: FormField[];
    workflow_steps: WorkflowStep[];
}

export interface FormField {
    id: string;
    label: string;
    type: 'text' | 'number' | 'textarea' | 'date' | 'select' | 'file' | 'file_multiple' | 'user_select' | 'workspace_select';
    required: boolean;
    options?: string[]; // For select
}

export interface WorkflowStep {
    id: string;
    name: string;
    type: 'approval' | 'cc';
    approver_role?: string; // e.g., 'Manager', 'Finance', 'Director'
    approver_id?: string; // Specific user
    condition?: {
        field: string;
        operator: '>' | '<' | '==' | '!=';
        value: any;
    };
}

export interface ApprovalRequest {
    id: string;
    template_id: string;
    requester_id: string;
    requester_name: string; // Joined for display
    requester_avatar: string; // Joined for display
    current_step_index: number;
    status: ApprovalStatus;
    form_data: Record<string, any>;
    created_at: string;
    updated_at: string;
    template?: ApprovalTemplate; // Joined
}

export interface ApprovalLog {
    id: string;
    request_id: string;
    user_id: string;
    user_name: string;
    user_avatar?: string;
    action: 'Submit' | 'Approve' | 'Reject' | 'Return' | 'Comment';
    comment?: string;
    attachment?: string;
    step_name: string;
    created_at: string;
}
