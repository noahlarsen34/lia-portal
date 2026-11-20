import assert from "node:assert/strict";
import test from "node:test";

import {
    formatSchoolYear,
    normalizeSchoolYear,
} from "../utils/school-year.ts";

test("normalizes common school-year variations to one value", () => {
    for (const value of [
        "26-27",
        "2026-2027",
        "2026 - 2027",
        "2026 – 2027",
        "2026/27",
    ]) {
        assert.equal(normalizeSchoolYear(value), "2026-2027");
    }
});

test("formats a normalized school year consistently", () => {
    assert.equal(formatSchoolYear("26-27"), "2026–2027");
});

test("preserves unrecognized school-year labels", () => {
    assert.equal(normalizeSchoolYear("Current year"), "Current year");
});
