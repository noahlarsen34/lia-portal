import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
    canMutateClass,
    resolveClassAccessRole,
} from "../utils/class-access-policy.ts";

const liaisonInput = {
    viewerProfileId: "liaison-profile",
    viewerRole: "district_liaison",
    primaryTeacherProfileId: "teacher-profile",
    hasCoTeacherAssignment: false,
    classDistrictId: "district-a",
    liaisonStatus: "active",
    liaisonPortalAccessStatus: "active",
    liaisonDistrictIds: ["district-a"],
};

test("an active liaison can view a class in an assigned district", () => {
    assert.equal(resolveClassAccessRole(liaisonInput), "district_liaison");
});

test("a liaison cannot view a class outside assigned districts", () => {
    assert.equal(
        resolveClassAccessRole({
            ...liaisonInput,
            classDistrictId: "district-b",
        }),
        null,
    );
});

test("a disabled liaison account cannot view an assigned class", () => {
    assert.equal(
        resolveClassAccessRole({
            ...liaisonInput,
            liaisonStatus: "inactive",
            liaisonPortalAccessStatus: "disabled",
        }),
        null,
    );
});

test("removing a district immediately removes class access", () => {
    assert.equal(resolveClassAccessRole(liaisonInput), "district_liaison");
    assert.equal(
        resolveClassAccessRole({
            ...liaisonInput,
            liaisonDistrictIds: [],
        }),
        null,
    );
});

test("read-only roles cannot mutate a class", () => {
    assert.equal(canMutateClass("district_liaison"), false);
    assert.equal(canMutateClass("co_teacher"), false);
    assert.equal(canMutateClass(null), false);
    assert.equal(canMutateClass("primary"), true);
});

test("a liaison identity is never promoted to primary-teacher access", () => {
    const role = resolveClassAccessRole({
        ...liaisonInput,
        primaryTeacherProfileId: liaisonInput.viewerProfileId,
    });

    assert.equal(role, "district_liaison");
    assert.equal(canMutateClass(role), false);
});

test("primary and co-teacher access continue to resolve for teacher accounts", () => {
    assert.equal(
        resolveClassAccessRole({
            ...liaisonInput,
            viewerProfileId: "teacher-profile",
            viewerRole: "teacher",
            liaisonDistrictIds: [],
        }),
        "primary",
    );
    assert.equal(
        resolveClassAccessRole({
            ...liaisonInput,
            viewerProfileId: "co-teacher-profile",
            viewerRole: "teacher",
            hasCoTeacherAssignment: true,
            liaisonDistrictIds: [],
        }),
        "co_teacher",
    );
});

test("every class mutation module retains teacher and primary-owner guards", async () => {
    const mutationModules = [
        "app/teacher/classes/[classId]/actions.ts",
        "app/teacher/classes/[classId]/applicants/actions.ts",
        "app/teacher/classes/[classId]/application/actions.ts",
        "app/teacher/classes/[classId]/co-teacher-actions.ts",
        "app/teacher/classes/[classId]/edit/actions.ts",
        "app/teacher/classes/[classId]/leadership/settings/actions.ts",
        "app/teacher/classes/[classId]/microcredentials/actions.ts",
        "app/teacher/classes/[classId]/students/actions.ts",
        "app/teacher/classes/[classId]/tutoring/actions.ts",
    ];

    for (const modulePath of mutationModules) {
        const source = await readFile(new URL(`../${modulePath}`, import.meta.url), "utf8");
        assert.match(source, /requireTeacher/);
        assert.match(source, /isPrimaryTeacher/);
        assert.doesNotMatch(source, /requireClassViewer/);
    }
});
