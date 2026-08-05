alter table public.application_questions
drop constraint if exists application_questions_question_type_check;

alter table public.application_questions
add constraint application_questions_question_type_check
check (
    question_type in (
        'short_text',
        'long_text',
        'number',
        'multiple_choice',
        'yes_no',
        'file_upload'
    )
);
