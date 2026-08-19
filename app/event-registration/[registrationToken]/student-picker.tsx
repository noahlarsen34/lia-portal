"use client";

import { useEffect, useMemo, useState } from "react";

type School = { id: string; name: string; state: string | null };
type Teacher = {
    id: string;
    profileId: string | null;
    schoolId: string;
    name: string;
};
type LiaClass = {
    id: string;
    name: string;
    period: string | null;
    schoolId: string;
    teacherProfileId: string;
};
type StudentOption = {
    enrollmentId: string;
    name: string;
    gradeLevel: string | null;
};

const selectClass = "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 font-normal text-gray-950 outline-none focus:border-[#c8102e] focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500";

export function StudentPicker({
    registrationToken,
    schools,
    teachers,
    classes,
}: {
    registrationToken: string;
    schools: School[];
    teachers: Teacher[];
    classes: LiaClass[];
}) {
    const [schoolId, setSchoolId] = useState("");
    const [teacherId, setTeacherId] = useState("");
    const [classId, setClassId] = useState("");
    const [studentEnrollmentId, setStudentEnrollmentId] = useState("");
    const [students, setStudents] = useState<StudentOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState("");

    const availableTeachers = useMemo(
        () => teachers.filter((teacher) => teacher.schoolId === schoolId),
        [schoolId, teachers],
    );
    const selectedTeacher = teachers.find((teacher) => teacher.id === teacherId);
    const availableClasses = useMemo(
        () => classes.filter(
            (liaClass) =>
                liaClass.schoolId === schoolId &&
                liaClass.teacherProfileId === selectedTeacher?.profileId,
        ),
        [classes, schoolId, selectedTeacher?.profileId],
    );

    useEffect(() => {
        setStudents([]);
        setStudentEnrollmentId("");
        setLoadError("");
        if (!classId) return;

        const controller = new AbortController();
        setLoading(true);

        fetch(
            `/api/event-registration/${encodeURIComponent(registrationToken)}/students?classId=${encodeURIComponent(classId)}`,
            { signal: controller.signal },
        )
            .then(async (response) => {
                const payload = await response.json();
                if (!response.ok) throw new Error(payload.error || "Unable to load students.");
                setStudents(payload.students ?? []);
            })
            .catch((error) => {
                if (error instanceof Error && error.name !== "AbortError") {
                    setLoadError(error.message);
                }
            })
            .finally(() => setLoading(false));

        return () => controller.abort();
    }, [classId, registrationToken]);

    return (
        <div>
            <h3 className="mb-2 text-xl font-bold">Find your student record</h3>
            <p className="mb-5 text-gray-600">
                Select your school, teacher, and class. Then choose your name from the class roster.
            </p>

            <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2 font-semibold">
                    <span>School <span className="text-[#c8102e]">*</span></span>
                    <select
                        name="school_id"
                        required
                        value={schoolId}
                        onChange={(event) => {
                            setSchoolId(event.target.value);
                            setTeacherId("");
                            setClassId("");
                        }}
                        className={selectClass}
                    >
                        <option value="" disabled>Select your school</option>
                        {schools.map((school) => (
                            <option key={school.id} value={school.id}>
                                {school.name}{school.state ? ` - ${school.state}` : ""}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="space-y-2 font-semibold">
                    <span>Teacher <span className="text-[#c8102e]">*</span></span>
                    <select
                        name="teacher_id"
                        required
                        value={teacherId}
                        disabled={!schoolId}
                        onChange={(event) => {
                            setTeacherId(event.target.value);
                            setClassId("");
                        }}
                        className={selectClass}
                    >
                        <option value="" disabled>{schoolId ? "Select your teacher" : "Select a school first"}</option>
                        {availableTeachers.map((teacher) => (
                            <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                        ))}
                    </select>
                </label>

                <label className="space-y-2 font-semibold">
                    <span>Class or period <span className="text-[#c8102e]">*</span></span>
                    <select
                        name="lia_class_id"
                        required
                        value={classId}
                        disabled={!teacherId}
                        onChange={(event) => setClassId(event.target.value)}
                        className={selectClass}
                    >
                        <option value="" disabled>{teacherId ? "Select your class" : "Select a teacher first"}</option>
                        {availableClasses.map((liaClass) => (
                            <option key={liaClass.id} value={liaClass.id}>
                                {liaClass.name}{liaClass.period ? ` - Period ${liaClass.period}` : ""}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="space-y-2 font-semibold">
                    <span>Student <span className="text-[#c8102e]">*</span></span>
                    <select
                        name="student_enrollment_id"
                        required
                        value={studentEnrollmentId}
                        onChange={(event) => setStudentEnrollmentId(event.target.value)}
                        disabled={!classId || loading}
                        className={selectClass}
                    >
                        <option value="" disabled>
                            {loading ? "Loading students..." : classId ? "Select your name" : "Select a class first"}
                        </option>
                        {students.map((student) => (
                            <option key={student.enrollmentId} value={student.enrollmentId}>
                                {student.name}{student.gradeLevel ? ` - Grade ${student.gradeLevel}` : ""}
                            </option>
                        ))}
                    </select>
                    {classId && !loading && students.length === 0 && !loadError ? (
                        <span className="block text-sm font-normal text-amber-700">No active students were found in this class. Ask your teacher to check the roster.</span>
                    ) : null}
                    {loadError ? <span className="block text-sm font-normal text-red-700">{loadError}</span> : null}
                </label>

                <label className="space-y-2 font-semibold md:col-span-2">
                    <span>Phone <span className="font-normal text-gray-500">(optional)</span></span>
                    <input type="tel" name="phone" className={selectClass} />
                </label>
            </div>
        </div>
    );
}
