import { supabase } from './supabaseClient';
import { ApprovalRequest, ApprovalTemplate, ApprovalLog, WorkflowStep } from '../types/approval';

// --- SQL SCRIPT FOR DATABASE SETUP ---
export const APPROVAL_SQL_SCRIPT = `
-- 1. Table: Approval Templates
create table if not exists public.approval_templates (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  name text not null,
  description text null,
  icon text null,
  form_schema jsonb not null,
  workflow_steps jsonb not null,
  constraint approval_templates_pkey primary key (id)
);

-- 2. Table: Approval Requests
create table if not exists public.approval_requests (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  template_id uuid not null,
  requester_id uuid not null,
  requester_name text not null,
  requester_avatar text null,
  current_step_index int not null default 0,
  status text not null default 'Pending',
  form_data jsonb not null,
  constraint approval_requests_pkey primary key (id),
  constraint approval_requests_template_id_fkey foreign key (template_id) references approval_templates (id) on delete cascade
);

-- 3. Table: Approval Logs
create table if not exists public.approval_logs (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  request_id uuid not null,
  user_id uuid not null,
  user_name text not null,
  user_avatar text null,
  action text not null,
  comment text null,
  step_name text not null,
  constraint approval_logs_pkey primary key (id),
  constraint approval_logs_request_id_fkey foreign key (request_id) references approval_requests (id) on delete cascade
);

-- 4. Enable RLS
alter table public.approval_templates enable row level security;
alter table public.approval_requests enable row level security;
alter table public.approval_logs enable row level security;

-- 5. Policies (Allow All for Demo)
drop policy if exists "Enable all access" on public.approval_templates;
drop policy if exists "Enable all access" on public.approval_requests;
drop policy if exists "Enable all access" on public.approval_logs;

create policy "Enable all access" on public.approval_templates for all using (true) with check (true);
create policy "Enable all access" on public.approval_requests for all using (true) with check (true);
create policy "Enable all access" on public.approval_logs for all using (true) with check (true);

-- 6. Seed Data: Default Templates
insert into public.approval_templates (name, description, icon, form_schema, workflow_steps)
values 
(
  'Script Approval', 
  'Formulir persetujuan naskah/script konten sebelum produksi.', 
  'file-text', 
  '[
    {"id": "judul_konten", "label": "Judul Konten", "type": "text", "required": true},
    {"id": "pic_script", "label": "PIC Script", "type": "user_select", "required": true},
    {"id": "pillar", "label": "Content Value / Pillar Konten", "type": "text", "required": true},
    {"id": "tanggal_posting", "label": "Tanggal Posting", "type": "date", "required": true},
    {"id": "platform", "label": "Channel / Platform", "type": "select", "required": true, "options": ["Instagram", "TikTok", "YouTube", "LinkedIn", "Facebook"]},
    {"id": "workspace", "label": "Akun / Workspace", "type": "workspace_select", "required": true},
    {"id": "script_file", "label": "Upload Script (PDF)", "type": "file", "required": false},
    {"id": "script_link", "label": "Link Script (Opsional)", "type": "text", "required": false}
  ]',
  '[
    {"id": "step_1", "name": "Review Script", "type": "approval", "approver_role": "Manager"},
    {"id": "step_2", "name": "Final Approval", "type": "approval", "approver_role": "Director"}
  ]'
),
(
  'Content Approval', 
  'Persetujuan hasil akhir konten (gambar/video) sebelum dipublikasikan.', 
  'image', 
  '[
    {"id": "judul_konten", "label": "Judul Konten", "type": "text", "required": true},
    {"id": "pillar", "label": "Value / Pillar Konten", "type": "text", "required": true},
    {"id": "objective", "label": "Objective Content", "type": "select", "required": true, "options": ["Awareness", "Engagement", "Conversion", "Education", "Entertainment"]},
    {"id": "tanggal_posting", "label": "Tanggal Posting", "type": "date", "required": true},
    {"id": "platform", "label": "Channel / Platform", "type": "select", "required": true, "options": ["Instagram", "TikTok", "YouTube", "LinkedIn", "Facebook"]},
    {"id": "workspace", "label": "Akun / Workspace", "type": "workspace_select", "required": true},
    {"id": "content_files", "label": "Upload Konten (Max 15 JPG, 30MB)", "type": "file_multiple", "required": true}
  ]',
  '[
    {"id": "step_1", "name": "Content Review", "type": "approval", "approver_role": "Manager"},
    {"id": "step_2", "name": "Client/Director Approval", "type": "approval", "approver_role": "Owner"}
  ]'
);
`;

// --- SERVICE FUNCTIONS ---

export const getTemplates = async (): Promise<ApprovalTemplate[]> => {
    const { data, error } = await supabase.from('approval_templates').select('*');
    if (error) throw error;
    return data || [];
};

export const getRequests = async (): Promise<ApprovalRequest[]> => {
    const { data, error } = await supabase
        .from('approval_requests')
        .select(`*, template:approval_templates(*)`)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Map template relation manually if needed, but Supabase handles simple joins well
    return data.map((req: any) => ({
        ...req,
        template: req.template // Ensure template is nested
    }));
};

export const getLogs = async (requestId: string): Promise<ApprovalLog[]> => {
    const { data, error } = await supabase
        .from('approval_logs')
        .select('*')
        .eq('request_id', requestId)
        .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
};

export const createRequest = async (template: ApprovalTemplate, formData: any, user: any) => {
    // 1. Create Request
    const { data, error } = await supabase
        .from('approval_requests')
        .insert({
            template_id: template.id,
            requester_id: user.id || 'guest', // Fallback for demo
            requester_name: user.name || 'Guest User',
            requester_avatar: user.avatar || '',
            current_step_index: 0,
            status: 'Pending',
            form_data: formData
        })
        .select()
        .single();

    if (error) throw error;

    // 2. Log Activity
    await logActivity(data.id, user, 'Submit', 'Mengajukan permohonan baru.', template.workflow_steps[0].name);

    return data;
};

export const processApproval = async (request: ApprovalRequest, action: 'Approve' | 'Reject' | 'Return', comment: string, user: any) => {
    const steps = request.template?.workflow_steps || [];
    const currentStep = steps[request.current_step_index];
    
    let nextStatus: any = request.status;
    let nextStepIndex = request.current_step_index;

    if (action === 'Approve') {
        // Check for next step
        const nextStep = steps[request.current_step_index + 1];
        
        if (nextStep) {
            // Check condition for next step
            if (nextStep.condition) {
                const { field, operator, value } = nextStep.condition;
                const formValue = request.form_data[field];
                let conditionMet = false;
                
                // Simple evaluation
                if (operator === '>') conditionMet = Number(formValue) > Number(value);
                else if (operator === '<') conditionMet = Number(formValue) < Number(value);
                else if (operator === '==') conditionMet = formValue == value;
                else if (operator === '!=') conditionMet = formValue != value;

                if (conditionMet) {
                    nextStepIndex++;
                    nextStatus = 'Pending'; // Still pending next approval
                } else {
                    // Skip this step if condition not met, check next next step recursively? 
                    // For MVP, if condition not met, we assume it's the end or skip to next.
                    // Let's assume if condition not met, we skip this step and go to next.
                    // But wait, if condition is for Director Approval > 10jt, and amount is 5jt, we skip Director.
                    // So we are DONE if no more steps after skipping.
                    
                    const nextNextStep = steps[request.current_step_index + 2];
                    if (nextNextStep) {
                        nextStepIndex += 2;
                        nextStatus = 'Pending';
                    } else {
                        nextStatus = 'Approved'; // No more steps
                    }
                }
            } else {
                nextStepIndex++;
                nextStatus = 'Pending';
            }
        } else {
            nextStatus = 'Approved'; // Workflow complete
        }
    } else if (action === 'Reject') {
        nextStatus = 'Rejected';
    } else if (action === 'Return') {
        nextStatus = 'Returned';
        nextStepIndex = Math.max(0, request.current_step_index - 1);
    }

    // Update Request
    const { error } = await supabase
        .from('approval_requests')
        .update({
            status: nextStatus,
            current_step_index: nextStepIndex,
            updated_at: new Date().toISOString()
        })
        .eq('id', request.id);

    if (error) throw error;

    // Log Activity
    await logActivity(request.id, user, action, comment, currentStep?.name || 'Unknown Step');
};

const logActivity = async (requestId: string, user: any, action: string, comment: string, stepName: string) => {
    await supabase.from('approval_logs').insert({
        request_id: requestId,
        user_id: user.id || 'guest',
        user_name: user.name || 'Guest',
        user_avatar: user.avatar || '',
        action,
        comment,
        step_name: stepName
    });
};
