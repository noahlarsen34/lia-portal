import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTeacher } from '@/utils/role-guards';
import { updateClassStudent } from '../../actions';

type EditStudentPageProps = {
    params: Promise<{
        classId: string;
        enrollmentId: string;
    }>;
    searchParams: Promise<{
        error?: string;
    }>;
};

export default async function EditStudentPage({
    params,
    searchParams,
} : EditStudentPageProps) {
    const { classId, enrollmentId } = await params;
    const { error } = await searchParams;
    const { supabase, profile } = await requireTeacher();

    const { data: enrollment } = await supabase
        .from("lia_class_students")
        .select(`
                id,
                status,
                committee,
                officer_role,
                students (
                    id,
                    first_name,
                    last_name,
                    email,
                    grade_level,
                    status,
                    notes
                ),
                lia_classes (
                    id,
                    name,
                    teacher_profile_id
                )
            `)
        .eq("id", enrollmentId)
        .eq("lia_class_id", classId)
        .maybeSingle();
    
    const student = Array.isArray(enrollment?.students)
            ? enrollment?.students[0]
            : enrollment?.students;
    
    const liaClass = Array.isArray(enrollment?.lia_classes)
            ? enrollment?.lia_classes[0]
            : enrollment?.lia_classes;
    
    if (!enrollment || !student || !liaClass || liaClass.teacher_profile_id !== profile.id) {
        notFound();
    }

    const updateStudent = updateClassStudent.bind(null, classId, enrollment.id);

    return (
        <div className='mx-auto max-w-3xl'>
            <Link
                href={`/teacher/classes/${classId}/students`}
                className='text-sm font-semibold text-[#c4122f] hover:text-[#a70d25]'
            >
                Back to students
            </Link>

            <section className='mt-5 rounded-md border border-red-200 bg-white p-5 shadow-sm sm:p-6'>
                <div className='mb-6'>
                    <p className='text-sm font-semibold uppercase tracking-wide text-[#c4122f]'>
                        Edit Student
                    </p>
                    <h1 className='mt-2 text-3xl font-semibold'>
                        {student.first_name} {student.last_name}
                    </h1>
                    <p className='mt-1 text-sm text-zinc-600'>
                        Update this reusable student record and class enrollment.
                    </p>
                </div>

                {error ? (
                    <div className='mb-5 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'>
                        {error === "missing-fields"
                            ? "First name and last name are required."
                            : error === "vp-needs-committee"
                                ? "Vice presidents must be assigned to a committee."
                                : error === "role-conflict"
                                    ? "That officer role is already assigned in this class."
                                    : error === "already-enrolled"
                                        ? "That student is already enrolled in this class."
                                        : "Something went wrong. Please try again."}
                    </div>
                ) : null}

                <form action={updateStudent} className='space-y-5'>
                    <div className='grid gap-5 sm:grid-cols-2'>
                        <label className='block'>
                            <span className='text-sm font-medium text-zinc-800'>
                                First Name
                            </span>
                            <input
                                name='first_name'
                                required
                                defaultValue={student.first_name}
                                className='mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100'
                            />
                        </label>

                        <label className='block'>
                            <span className='text-sm font-medium text-zinc-800'>
                                Last Name
                            </span>
                            <input
                                name='last_name'
                                required
                                defaultValue={student.last_name}
                                className='mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100'
                            />
                        </label>
                    </div>

                    <div className='grid gap-5 sm:grid-cols-2'>
                        <label className='block'>
                            <span className='text-sm font-medium text-zinc-800'>
                                Email
                            </span>
                            <input
                                name='email'
                                type='email'
                                defaultValue={student.email ?? ""}
                                className='mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100'
                            />
                        </label>

                        <label className='block'>
                            <span className='text-sm font-medium text-zinc-800'>
                                Grade Level
                            </span>
                            <input
                                name='grade_level'
                                defaultValue={student.grade_level ?? ""}
                                className='mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100'
                            />
                        </label>
                    </div>

                    <div className='grid gap-5 sm:grid-cols-2'>
                        <label className='block'>
                            <span className='text-sm font-medium text-zinc-800'>
                                Committee Assignment
                            </span>
                            <select
                                name='committee'
                                defaultValue={enrollment.committee ?? ""}
                                className='mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100'
                            >
                                <option value="">No committee</option>
                                <option value="professional">Professional</option>
                                <option value="service">Service</option>
                                <option value="social">Social</option>
                            </select>
                        </label>

                        <label className='block'>
                            <span className='text-sm font-medium text-zinc-800'>
                                Class Leadership Role
                            </span>
                            <select
                                name='officer_role'
                                defaultValue={enrollment.officer_role ?? "member"}
                                className='mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100'
                            >
                                <option value="member">Member</option>
                                <option value="president">Class President</option>
                                <option value="vice_president">Vice President of Selected Committee</option>
                                <option value="secretary">Class Secretary</option>
                                <option value="historian">Class Historian</option>
                            </select>
                        </label>
                    </div>

                    <div className='grid gap-5 sm:grid-cols-2'>
                        <label className='block'>
                            <span className='text-sm font-medium text-zinc-800'>
                                Student Status
                            </span>
                            <select
                                name='student_status'
                                defaultValue={student.status}
                                className='mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100'
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </label>

                        <label className='block'>
                            <span className='text-sm font-medium text-zinc-800'>
                                Enrollment Status
                            </span>
                            <select
                                name='enrollment_status'
                                defaultValue={enrollment.status}
                                className='mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100'
                            >
                                <option value="active">Active</option>
                                <option value="completed">Completed</option>
                                <option value="removed">Removed</option>
                            </select>
                        </label>
                    </div>

                    <label className='block'>
                        <span className='text-sm font-medium text-zinc-800'>
                            Notes
                        </span>
                        <textarea
                            name='notes'
                            rows={4}
                            defaultValue={student.notes ?? ""}
                            className='mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-[#c4122f] focus:ring-4 focus:ring-red-100'
                        />
                    </label>

                    <div className='flex flex-col-reverse gap-3 border-t border-zinc-100 pt-5 sm:flex-row sm:justify-end'>
                        <Link
                            href={`/teacher/classes/${classId}/students`}
                            className='inline-flex h-10 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 hover:bg-red-50 hover:text-[#c4122f] sm:w-auto'
                        >
                            Cancel
                        </Link>

                        <button
                            type='submit'
                            className='inline-flex h-10 w-full items-center justify-center rounded-md bg-[#c4122f] px-4 text-sm font-semibold text-white hover:bg-[#a70d25] sm:w-auto'
                        >
                            Save Student
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
