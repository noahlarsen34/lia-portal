-- Aligns the onboarding pipeline with the MOU workflow.
-- Existing records are mapped to the closest new stage without deleting history.

begin;

alter table public.school_interest_submissions
    drop constraint if exists school_interest_pipeline_stage_check;

alter table public.school_interest_submissions
    alter column pipeline_stage set default 'interest_received';

update public.school_interest_submissions
set pipeline_stage = case pipeline_stage
    when 'new_interest' then 'interest_received'
    when 'scheduling' then 'launch_meeting'
    when 'meeting_scheduled' then 'launch_meeting'
    when 'qualified' then 'mou_preparation'
    when 'awaiting_school_signature' then 'awaiting_school_signature'
    when 'awaiting_lia_signature' then 'mou_signed'
    when 'fully_executed' then 'mou_signed'
    when 'active' then 'program_active'
    when 'declined' then 'declined'
    when 'unqualified' then 'unqualified'
    when 'unresponsive' then 'unresponsive'
    else 'interest_received'
end,
updated_at = now();

alter table public.school_interest_submissions
    add constraint school_interest_pipeline_stage_check check (
        pipeline_stage in (
            'interest_received',
            'launch_meeting',
            'mou_preparation',
            'awaiting_school_signature',
            'mou_signed',
            'onboarding',
            'program_active',
            'declined',
            'unqualified',
            'unresponsive'
        )
    );

commit;
