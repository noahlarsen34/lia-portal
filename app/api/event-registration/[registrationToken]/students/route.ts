import { createAdminClient } from "@/utils/supabase/admin";

function relatedStudent(value: unknown) {
    const row = Array.isArray(value) ? value[0] : value;
    if (!row || typeof row !== "object") return null;
    return row as {
        first_name: string | null;
        last_name: string | null;
        grade_level: string | null;
    };
}

export async function GET(
    request: Request,
    context: { params: Promise<{ registrationToken: string }> },
) {
    const { registrationToken } = await context.params;
    const classId = new URL(request.url).searchParams.get("classId")?.trim();
    if (!classId) return Response.json({ error: "A class is required." }, { status: 400 });

    const supabase = createAdminClient();
    const { data: event } = await supabase
        .from("lia_events")
        .select("id, status, all_schools")
        .eq("registration_token", registrationToken)
        .maybeSingle();

    if (!event || event.status !== "open") {
        return Response.json({ error: "Registration is not open." }, { status: 404 });
    }

    const { data: liaClass } = await supabase
        .from("lia_classes")
        .select("id, school_id")
        .eq("id", classId)
        .eq("status", "active")
        .maybeSingle();

    if (!liaClass) return Response.json({ error: "Class not found." }, { status: 404 });

    if (!event.all_schools) {
        const { data: eligibleSchool } = await supabase
            .from("lia_event_schools")
            .select("school_id")
            .eq("event_id", event.id)
            .eq("school_id", liaClass.school_id)
            .maybeSingle();
        if (!eligibleSchool) return Response.json({ error: "This class is not eligible for the event." }, { status: 403 });
    }

    const { data, error } = await supabase
        .from("lia_class_students")
        .select("id, students(first_name, last_name, grade_level)")
        .eq("lia_class_id", classId)
        .or("status.is.null,status.neq.removed")
        .order("id");

    if (error) {
        console.error("Event registration roster lookup failed", { classId, message: error.message });
        return Response.json({ error: "The class roster could not be loaded." }, { status: 500 });
    }

    const students = (data ?? []).flatMap((enrollment) => {
        const student = relatedStudent(enrollment.students);
        if (!student) return [];
        const name = [student.first_name, student.last_name].filter(Boolean).join(" ").trim();
        return name ? [{ enrollmentId: enrollment.id, name, gradeLevel: student.grade_level }] : [];
    }).sort((a, b) => a.name.localeCompare(b.name));

    return Response.json({ students }, { headers: { "Cache-Control": "private, no-store" } });
}
