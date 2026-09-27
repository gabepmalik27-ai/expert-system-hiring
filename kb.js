// kb.js
//
// KNOWLEDGE BASE for the job-qualification expert system.
//
// This file contains ONLY data: the shape of the raw facts collected from
// the applicant, the tier-1 rules that derive new facts from those raw
// facts (and from each other), and the four job positions expressed as
// lists of required/qualifying/desired facts.
//
// There is NO inference logic in this file. engine.js reads RULES and
// POSITIONS and knows nothing about Python, degrees, or job titles — it
// just walks the data structures below. That separation is the whole
// point of a "knowledge base": swapping in a different KB (different
// rules, different jobs) should never require touching the engine.

// ---------------------------------------------------------------------
// RAW_FACTS
// ---------------------------------------------------------------------
// Describes every field the form collects, so app.js can build the form
// and validate it generically instead of hardcoding field names. Each
// entry says the fact's name (the key it will have in working memory),
// its type, and (for enums) the accepted values.
//
// type: "boolean" | "integer" | "enum"
const RAW_FACTS = [
  { name: "python_coursework", label: "Completed Python coursework", type: "boolean", section: "Coursework" },
  { name: "software_engineering_coursework", label: "Completed Software Engineering coursework", type: "boolean", section: "Coursework" },
  { name: "agile_course", label: "Completed an Agile course", type: "boolean", section: "Coursework" },

  { name: "years_python_dev", label: "Years of Python development experience", type: "integer", min: 0, max: 50, section: "Experience" },
  { name: "years_data_development", label: "Years of data development experience", type: "integer", min: 0, max: 50, section: "Experience" },
  { name: "years_data_architecture", label: "Years of data architecture experience", type: "integer", min: 0, max: 50, section: "Experience" },
  { name: "years_expert_systems", label: "Years developing Expert Systems", type: "integer", min: 0, max: 50, section: "Experience" },
  { name: "years_agile_projects", label: "Years of experience in Agile projects", type: "integer", min: 0, max: 50, section: "Experience" },
  { name: "years_managing_software_projects", label: "Years managing software projects", type: "integer", min: 0, max: 50, section: "Experience" },

  { name: "used_git", label: "Have you used Git?", type: "boolean", section: "Credentials" },
  { name: "pmi_lean_cert", label: "Hold a PMI Lean Project Management Certification?", type: "boolean", section: "Credentials" },
  {
    name: "degree",
    label: "Highest relevant degree",
    type: "enum",
    values: ["None", "Bachelor in CS", "Masters in CS", "Other"],
    section: "Credentials",
  },
];

// ---------------------------------------------------------------------
// RULES
// ---------------------------------------------------------------------
// Each rule is { derives, test }. `test` is a pure function that takes the
// current working-memory object (raw facts + any derived facts asserted
// so far) and returns true/false. If it returns true, `derives` is
// asserted into working memory.
//
// Order in this array does NOT matter for correctness — the engine loops
// to a fixed point specifically so that rules which depend on OTHER
// derived facts (has_bachelors_cs, has_agile_capability) still fire
// correctly no matter what order they're listed or evaluated in.
const RULES = [
  { derives: "has_python_coursework", test: (wm) => wm.python_coursework === true },
  { derives: "has_se_coursework", test: (wm) => wm.software_engineering_coursework === true },
  { derives: "has_agile_course", test: (wm) => wm.agile_course === true },
  { derives: "has_git", test: (wm) => wm.used_git === true },
  { derives: "has_pmi_lean", test: (wm) => wm.pmi_lean_cert === true },

  { derives: "has_3yr_python_dev", test: (wm) => wm.years_python_dev >= 3 },
  { derives: "has_4yr_python_dev", test: (wm) => wm.years_python_dev >= 4 },
  { derives: "has_1yr_data_dev", test: (wm) => wm.years_data_development >= 1 },
  { derives: "has_2yr_data_dev", test: (wm) => wm.years_data_development >= 2 },
  { derives: "has_2yr_data_arch", test: (wm) => wm.years_data_architecture >= 2 },
  { derives: "has_2yr_expert_systems", test: (wm) => wm.years_expert_systems >= 2 },
  { derives: "has_agile_experience", test: (wm) => wm.years_agile_projects >= 1 },
  { derives: "has_2yr_agile_projects", test: (wm) => wm.years_agile_projects >= 2 },
  { derives: "has_3yr_managing_projects", test: (wm) => wm.years_managing_software_projects >= 3 },

  { derives: "has_masters_cs", test: (wm) => wm.degree === "Masters in CS" },

  // Chains off has_masters_cs (a derived fact), so this may need a second
  // pass before it can fire correctly.
  { derives: "has_bachelors_cs", test: (wm) => wm.degree === "Bachelor in CS" || wm.has_masters_cs === true },

  // Chains off has_agile_experience (also derived).
  { derives: "has_agile_capability", test: (wm) => wm.has_agile_experience === true || wm.has_agile_course === true },
];

// ---------------------------------------------------------------------
// POSITIONS
// ---------------------------------------------------------------------
// needed          — facts that MUST all be present to qualify (hard requirements)
// qualifications  — facts that MUST all be present to qualify (credentials,
//                    kept as a separate list so the results table can show
//                    "Needed Skills" and "Qualifications" as distinct columns)
// desired         — facts that are not required, but if ALL are present the
//                    position is "starred". An empty desired list must never
//                    be starred (the engine guards this explicitly).
//
// Each fact reference carries { fact, label } so failure-reason text and
// table rendering never need a lookup table elsewhere — the label lives
// right next to the fact it describes.
const POSITIONS = [
  {
    title: "Entry-Level Python Engineer",
    needed: [
      { fact: "has_python_coursework", label: "Python coursework" },
      { fact: "has_se_coursework", label: "Software Engineering coursework" },
    ],
    qualifications: [
      { fact: "has_bachelors_cs", label: "Bachelor in CS" },
    ],
    desired: [
      { fact: "has_agile_course", label: "Agile course" },
    ],
  },
  {
    title: "Python Engineer",
    needed: [
      { fact: "has_3yr_python_dev", label: "3 years Python development" },
      { fact: "has_1yr_data_dev", label: "1 year data development" },
      { fact: "has_agile_capability", label: "Agile project experience or an Agile course" },
    ],
    qualifications: [
      { fact: "has_bachelors_cs", label: "Bachelor in CS" },
    ],
    desired: [
      { fact: "has_git", label: "Used Git" },
    ],
  },
  {
    title: "Project Manager",
    needed: [
      { fact: "has_3yr_managing_projects", label: "3 years managing software projects" },
      { fact: "has_2yr_agile_projects", label: "2 years experience in Agile projects" },
    ],
    qualifications: [
      { fact: "has_pmi_lean", label: "PMI Lean Project Management Certification" },
    ],
    desired: [],
  },
  {
    title: "Senior Knowledge Engineer",
    needed: [
      { fact: "has_4yr_python_dev", label: "4 years using Python to develop" },
      { fact: "has_2yr_expert_systems", label: "2 years developing Expert Systems" },
      { fact: "has_2yr_data_dev", label: "2 years data development" },
      { fact: "has_2yr_data_arch", label: "2 years data architecture" },
    ],
    qualifications: [
      { fact: "has_masters_cs", label: "Masters in CS" },
    ],
    desired: [],
  },
];
