// tests.js
//
// 10 applicant profiles exercising the KB + engine, each with its full raw
// input and its expected outcome. tests.html runs each through the REAL
// engine (no mocking) and reports pass/fail with a diff.
//
// No test framework — this is plain data + a runner function.

// Base template so each case only needs to spell out what differs.
function blankApplicant() {
  return {
    python_coursework: false,
    software_engineering_coursework: false,
    agile_course: false,
    years_python_dev: 0,
    years_data_development: 0,
    years_data_architecture: 0,
    years_expert_systems: 0,
    years_agile_projects: 0,
    years_managing_software_projects: 0,
    used_git: false,
    pmi_lean_cert: false,
    degree: "None",
  };
}

const TEST_CASES = [
  {
    name: "1. Maximal",
    rawFacts: {
      ...blankApplicant(),
      python_coursework: true,
      software_engineering_coursework: true,
      agile_course: true,
      years_python_dev: 10,
      years_data_development: 10,
      years_data_architecture: 10,
      years_expert_systems: 10,
      years_agile_projects: 10,
      years_managing_software_projects: 10,
      used_git: true,
      pmi_lean_cert: true,
      degree: "Masters in CS",
    },
    expected: {
      qualified: ["Entry-Level Python Engineer", "Python Engineer", "Project Manager", "Senior Knowledge Engineer"],
      starred: ["Entry-Level Python Engineer", "Python Engineer"],
      failureReasons: {},
    },
  },
  {
    name: "2. Null",
    rawFacts: blankApplicant(),
    expected: {
      qualified: [],
      starred: [],
      failureReasons: {
        "Entry-Level Python Engineer": ["Python coursework", "Software Engineering coursework", "Bachelor in CS"],
        "Python Engineer": [
          "3 years Python development",
          "1 year data development",
          "Agile project experience or an Agile course",
          "Bachelor in CS",
        ],
        "Project Manager": [
          "3 years managing software projects",
          "2 years experience in Agile projects",
          "PMI Lean Project Management Certification",
        ],
        "Senior Knowledge Engineer": [
          "4 years using Python to develop",
          "2 years developing Expert Systems",
          "2 years data development",
          "2 years data architecture",
          "Masters in CS",
        ],
      },
    },
  },
  {
    name: "3. Fresh grad",
    rawFacts: {
      ...blankApplicant(),
      python_coursework: true,
      software_engineering_coursework: true,
      agile_course: false,
      degree: "Bachelor in CS",
    },
    expected: {
      qualified: ["Entry-Level Python Engineer"],
      starred: [],
      failureReasons: {
        "Python Engineer": [
          "3 years Python development",
          "1 year data development",
          "Agile project experience or an Agile course",
        ],
        "Project Manager": [
          "3 years managing software projects",
          "2 years experience in Agile projects",
          "PMI Lean Project Management Certification",
        ],
        "Senior Knowledge Engineer": [
          "4 years using Python to develop",
          "2 years developing Expert Systems",
          "2 years data development",
          "2 years data architecture",
          "Masters in CS",
        ],
      },
    },
  },
  {
    name: "4. Fresh grad + Agile course",
    rawFacts: {
      ...blankApplicant(),
      python_coursework: true,
      software_engineering_coursework: true,
      agile_course: true,
      degree: "Bachelor in CS",
    },
    expected: {
      qualified: ["Entry-Level Python Engineer"],
      starred: ["Entry-Level Python Engineer"],
      failureReasons: {
        // agile_course: true satisfies has_agile_capability, so the
        // Agile requirement is met here — only these two are unmet.
        "Python Engineer": ["3 years Python development", "1 year data development"],
        "Project Manager": [
          "3 years managing software projects",
          "2 years experience in Agile projects",
          "PMI Lean Project Management Certification",
        ],
        "Senior Knowledge Engineer": [
          "4 years using Python to develop",
          "2 years developing Expert Systems",
          "2 years data development",
          "2 years data architecture",
          "Masters in CS",
        ],
      },
    },
  },
  {
    name: "5. PE lower boundary",
    rawFacts: {
      ...blankApplicant(),
      years_python_dev: 3,
      years_data_development: 1,
      years_agile_projects: 1,
      used_git: false,
      degree: "Bachelor in CS",
    },
    expected: {
      qualified: ["Python Engineer"],
      starred: [],
      failureReasons: {
        "Entry-Level Python Engineer": ["Python coursework", "Software Engineering coursework"],
        "Project Manager": [
          "3 years managing software projects",
          "2 years experience in Agile projects",
          "PMI Lean Project Management Certification",
        ],
        "Senior Knowledge Engineer": [
          "4 years using Python to develop",
          "2 years developing Expert Systems",
          "2 years data development",
          "2 years data architecture",
          "Masters in CS",
        ],
      },
    },
  },
  {
    name: "6. Subsumption isolation",
    rawFacts: {
      ...blankApplicant(),
      years_python_dev: 4,
      years_expert_systems: 2,
      years_data_development: 2,
      years_data_architecture: 2,
      degree: "Masters in CS",
    },
    expected: {
      qualified: ["Senior Knowledge Engineer"],
      starred: [],
      failureReasons: {
        "Entry-Level Python Engineer": ["Python coursework", "Software Engineering coursework"],
        // python_dev=4 satisfies the 3yr requirement and data_dev=2
        // satisfies the 1yr requirement here — only Agile is unmet.
        "Python Engineer": ["Agile project experience or an Agile course"],
        "Project Manager": [
          "3 years managing software projects",
          "2 years experience in Agile projects",
          "PMI Lean Project Management Certification",
        ],
      },
    },
  },
  {
    name: "7. Agile disjunction via course",
    rawFacts: {
      ...blankApplicant(),
      years_python_dev: 3,
      years_data_development: 1,
      years_agile_projects: 0,
      agile_course: true,
      degree: "Bachelor in CS",
    },
    expected: {
      qualified: ["Python Engineer"],
      // agile_course: true satisfies ELPE's desired list even though ELPE
      // itself is not qualified (missing coursework) — a star is
      // independent of qualification, per spec.
      starred: ["Entry-Level Python Engineer"],
      failureReasons: {
        "Entry-Level Python Engineer": ["Python coursework", "Software Engineering coursework"],
        "Project Manager": [
          "3 years managing software projects",
          "2 years experience in Agile projects",
          "PMI Lean Project Management Certification",
        ],
        "Senior Knowledge Engineer": [
          "4 years using Python to develop",
          "2 years developing Expert Systems",
          "2 years data development",
          "2 years data architecture",
          "Masters in CS",
        ],
      },
    },
  },
  {
    name: "8. Agile disjunction absent",
    rawFacts: {
      ...blankApplicant(),
      years_python_dev: 3,
      years_data_development: 1,
      years_agile_projects: 0,
      agile_course: false,
      degree: "Bachelor in CS",
    },
    expected: {
      qualified: [],
      starred: [],
      failureReasons: {
        "Entry-Level Python Engineer": ["Python coursework", "Software Engineering coursework"],
        "Python Engineer": ["Agile project experience or an Agile course"],
        "Project Manager": [
          "3 years managing software projects",
          "2 years experience in Agile projects",
          "PMI Lean Project Management Certification",
        ],
        "Senior Knowledge Engineer": [
          "4 years using Python to develop",
          "2 years developing Expert Systems",
          "2 years data development",
          "2 years data architecture",
          "Masters in CS",
        ],
      },
    },
  },
  {
    name: "9. Star without qualification",
    rawFacts: {
      ...blankApplicant(),
      used_git: true,
      years_python_dev: 1,
      years_data_development: 0,
      degree: "Bachelor in CS",
    },
    expected: {
      qualified: [],
      starred: ["Python Engineer"],
      failureReasons: {
        "Entry-Level Python Engineer": ["Python coursework", "Software Engineering coursework"],
        "Python Engineer": [
          "3 years Python development",
          "1 year data development",
          "Agile project experience or an Agile course",
        ],
        "Project Manager": [
          "3 years managing software projects",
          "2 years experience in Agile projects",
          "PMI Lean Project Management Certification",
        ],
        "Senior Knowledge Engineer": [
          "4 years using Python to develop",
          "2 years developing Expert Systems",
          "2 years data development",
          "2 years data architecture",
          "Masters in CS",
        ],
      },
    },
  },
  {
    name: "10. PM credential gap",
    rawFacts: {
      ...blankApplicant(),
      years_managing_software_projects: 3,
      years_agile_projects: 2,
      pmi_lean_cert: false,
    },
    expected: {
      qualified: [],
      starred: [],
      failureReasons: {
        "Entry-Level Python Engineer": ["Python coursework", "Software Engineering coursework", "Bachelor in CS"],
        // years_agile_projects: 2 satisfies has_agile_capability here —
        // only Python dev, data dev, and degree are unmet for PE.
        "Python Engineer": ["3 years Python development", "1 year data development", "Bachelor in CS"],
        "Project Manager": ["PMI Lean Project Management Certification"],
        "Senior Knowledge Engineer": [
          "4 years using Python to develop",
          "2 years developing Expert Systems",
          "2 years data development",
          "2 years data architecture",
          "Masters in CS",
        ],
      },
    },
  },
];

/**
 * Run one test case through the real engine and compare against expected.
 * Returns { name, passed, diffs: string[] }.
 */
function runTestCase(testCase, rules, positions) {
  const results = evaluateAllPositions(testCase.rawFacts, rules, positions);
  const diffs = [];

  const actualQualified = results.filter((r) => r.qualified).map((r) => r.title);
  const actualStarred = results.filter((r) => r.starred).map((r) => r.title);

  if (!arraysEqualAsSets(actualQualified, testCase.expected.qualified)) {
    diffs.push(
      `qualified: expected [${testCase.expected.qualified.join(", ")}] but got [${actualQualified.join(", ")}]`
    );
  }
  if (!arraysEqualAsSets(actualStarred, testCase.expected.starred)) {
    diffs.push(`starred: expected [${testCase.expected.starred.join(", ")}] but got [${actualStarred.join(", ")}]`);
  }

  for (const result of results) {
    const expectedReasons = testCase.expected.failureReasons[result.title];
    if (expectedReasons === undefined) {
      continue; // this test case doesn't assert failure reasons for this position
    }
    if (!arraysEqualAsSets(result.failureReasons, expectedReasons)) {
      diffs.push(
        `${result.title} failureReasons: expected [${expectedReasons.join(", ")}] but got [${result.failureReasons.join(", ")}]`
      );
    }
  }

  return { name: testCase.name, passed: diffs.length === 0, diffs };
}

function arraysEqualAsSets(a, b) {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  for (const item of b) {
    if (!setA.has(item)) return false;
  }
  return true;
}

function runAllTests(rules, positions) {
  return TEST_CASES.map((testCase) => runTestCase(testCase, rules, positions));
}
