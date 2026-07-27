alter table public.lia_class_applications
    add column if not exists gpa numeric(3, 2),
    add column if not exists low_grade_explanation text;

alter table public.lia_class_applications
    drop constraint if exists lia_class_applications_gpa_check;

alter table public.lia_class_applications
    add constraint lia_class_applications_gpa_check
    check (gpa is null or (gpa >= 0 and gpa <= 5));
