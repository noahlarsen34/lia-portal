import "server-only";

import { createAdminClient } from "@/utils/supabase/admin";

export type LiaisonDistrict = {
    id: string;
    name: string;
    state: string | null;
};

export type LiaisonClassRow = {
    id: string;
    name: string;
    schoolId: string;
    schoolYear: string;
    period: string | null;
    gradeLevel: string | null;
    status: string;
    teacherName: string;
    enrollmentCount: number;
};

export type LiaisonSchoolGroup = {
    id: string;
    name: string;
    districtId: string;
    districtName: string;
    state: string | null;
    classes: LiaisonClassRow[];
};

export async function getLiaisonDistricts(
    liaisonId: string,
): Promise<LiaisonDistrict[]> {
    const admin = createAdminClient();
    const { data: assignments, error: assignmentError } = await admin
        .from("district_liaison_districts")
        .select("district_id")
        .eq("liaison_id", liaisonId)
        .order("assigned_at", { ascending: true });

    if (assignmentError) {
        throw new Error(`Unable to load liaison assignments: ${assignmentError.message}`);
    }

    const districtIds = (assignments ?? []).map(
        (assignment) => assignment.district_id,
    );
    if (districtIds.length === 0) return [];

    const { data: districts, error: districtError } = await admin
        .from("districts")
        .select("id, name, state")
        .in("id", districtIds)
        .order("state", { ascending: true })
        .order("name", { ascending: true });

    if (districtError) {
        throw new Error(`Unable to load assigned districts: ${districtError.message}`);
    }

    return districts ?? [];
}

export async function getLiaisonSchoolGroups(
    liaisonId: string,
): Promise<{
    districts: LiaisonDistrict[];
    schools: LiaisonSchoolGroup[];
}> {
    const admin = createAdminClient();
    const districts = await getLiaisonDistricts(liaisonId);
    const districtIds = districts.map((district) => district.id);
    if (districtIds.length === 0) return { districts, schools: [] };

    const { data: schools, error: schoolsError } = await admin
        .from("schools")
        .select("id, name, state, district_id")
        .in("district_id", districtIds)
        .order("name", { ascending: true });

    if (schoolsError) {
        throw new Error(`Unable to load district schools: ${schoolsError.message}`);
    }

    const schoolIds = (schools ?? []).map((school) => school.id);
    const districtById = new Map(
        districts.map((district) => [district.id, district]),
    );
    if (schoolIds.length === 0) return { districts, schools: [] };

    const [{ data: classes, error: classesError }, { data: teachers }] =
        await Promise.all([
            admin
                .from("lia_classes")
                .select(
                    "id, name, school_id, teacher_profile_id, school_year, period, grade_level, status",
                )
                .in("school_id", schoolIds)
                .order("name", { ascending: true }),
            admin
                .from("teachers")
                .select("profile_id, first_name, last_name, name")
                .in("school_id", schoolIds)
                .not("profile_id", "is", null),
        ]);

    if (classesError) {
        throw new Error(`Unable to load district classes: ${classesError.message}`);
    }

    const classIds = (classes ?? []).map((liaClass) => liaClass.id);
    const { data: enrollments, error: enrollmentError } = classIds.length
        ? await admin
            .from("lia_class_students")
            .select("lia_class_id, status")
            .in("lia_class_id", classIds)
            .or("status.is.null,status.neq.removed")
        : { data: [], error: null };

    if (enrollmentError) {
        throw new Error(`Unable to load class enrollment totals: ${enrollmentError.message}`);
    }

    const teacherByProfileId = new Map(
        (teachers ?? []).map((teacher) => {
            const fullName =
                `${teacher.first_name ?? ""} ${teacher.last_name ?? ""}`.trim() ||
                teacher.name ||
                "Primary teacher";
            return [teacher.profile_id, fullName];
        }),
    );
    const enrollmentCountByClassId = new Map<string, number>();
    for (const enrollment of enrollments ?? []) {
        enrollmentCountByClassId.set(
            enrollment.lia_class_id,
            (enrollmentCountByClassId.get(enrollment.lia_class_id) ?? 0) + 1,
        );
    }

    const classesBySchoolId = new Map<string, LiaisonClassRow[]>();
    for (const liaClass of classes ?? []) {
        const rows = classesBySchoolId.get(liaClass.school_id) ?? [];
        rows.push({
            id: liaClass.id,
            name: liaClass.name,
            schoolId: liaClass.school_id,
            schoolYear: liaClass.school_year,
            period: liaClass.period,
            gradeLevel: liaClass.grade_level,
            status: liaClass.status,
            teacherName:
                teacherByProfileId.get(liaClass.teacher_profile_id) ??
                "Primary teacher",
            enrollmentCount: enrollmentCountByClassId.get(liaClass.id) ?? 0,
        });
        classesBySchoolId.set(liaClass.school_id, rows);
    }

    return {
        districts,
        schools: (schools ?? []).flatMap((school) => {
            const district = school.district_id
                ? districtById.get(school.district_id)
                : null;
            if (!district) return [];

            return [{
                id: school.id,
                name: school.name,
                districtId: district.id,
                districtName: district.name,
                state: school.state ?? district.state,
                classes: classesBySchoolId.get(school.id) ?? [],
            }];
        }),
    };
}
