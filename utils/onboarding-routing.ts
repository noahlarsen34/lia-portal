export type OnboardingRpm = {
    name: string;
    email: string;
    calendarUrl: string;
};

const BRAYAN: OnboardingRpm = {
    name: "Brayan Zuniga",
    email: "brayan@latinosinaction.org",
    calendarUrl: "https://calendar.app.google/EdtC9CX3ACsHs1AE9",
};

const ARTHUR: OnboardingRpm = {
    name: "Arthur Lanza",
    email: "arthur@latinosinaction.org",
    calendarUrl: "https://calendar.app.google/cvs2cesNoX6UjJdx7",
};

const DEBORAH: OnboardingRpm = {
  name: "Deborah Carias",
  email: "deborah@latinosinaction.org",
  calendarUrl: "https://calendar.app.google/HwYKj4RQ1YQF7Bgj9",
};

export function getOnboardingRpm(
  state: string,
  region: string | null,
): OnboardingRpm {
  if (
    state === "Utah" &&
    region === "North"
  ) {
    return DEBORAH;
  }

  if (
    state === "Utah" &&
    region === "South"
  ) {
    return ARTHUR;
  }

  if (
    state === "Florida" &&
    region === "South"
  ) {
    return ARTHUR;
  }

  if (
    state === "Florida" ||
    state === "Utah" ||
    state === "Idaho" ||
    state === "Connecticut"
  ) {
    return BRAYAN;
  }

  if (
    state === "Colorado" ||
    state === "Arizona" ||
    state === "New York" ||
    state === "Tennessee"
  ) {
    return ARTHUR;
  }

  if (
    state === "New Mexico" ||
    state === "Washington" ||
    state === "Oregon" ||
    state === "Illinois" ||
    state === "Iowa"
  ) {
    return DEBORAH;
  }

  // Brayan handles new states by default.
  return BRAYAN;
}