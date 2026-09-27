# Job Qualification Expert System

A classic, symbolic (rule-based) expert system, built for CSC 371
(Artificial Intelligence), that evaluates a job applicant against four
positions — Entry-Level Python Engineer, Python Engineer, Project Manager,
and Senior Knowledge Engineer — and reports which positions they qualify
for and, for each failure, exactly which requirements were unmet.

Vanilla HTML/CSS/JavaScript. No frameworks, no build step, no
dependencies, no backend, no accounts. Everything runs entirely
client-side, including in a browser opened directly on the local files.

## Architecture

The system is split into three layers that are never allowed to mix:

| File | Layer | Responsibility |
|---|---|---|
| `kb.js` | **Knowledge base** | Facts schema, tier-1 rules, and the four job positions — all declared as plain data (arrays/objects). No `if` statements deciding qualification live here. |
| `engine.js` | **Inference engine** | A generic forward-chaining engine. Iterates the rules from `kb.js`, asserts derived facts, loops to a fixed point, then evaluates positions using only the generic `needed` / `qualifications` / `desired` shape. Contains no knowledge of Python, degrees, or job titles. |
| `app.js` + `index.html` | **Interface** | Builds the form from `kb.js`'s `RAW_FACTS`, validates input, collects it, calls the engine, and renders the results table. |

**Why this separation matters, and why it's the traditional expert-system
design:** classic expert systems (MYCIN, XCON, etc.) separate *what is
known* (the knowledge base) from *how to reason about it* (the inference
engine) precisely so that domain experts can update the knowledge without
touching the reasoning code, and so the reasoning code can be verified
once and trusted for any knowledge base. Here, that promise is concrete:
**adding a fifth position requires editing only `kb.js`.** Nothing in
`engine.js`, `app.js`, or the HTML needs to change, because they all just
walk whatever `RAW_FACTS`, `RULES`, and `POSITIONS` currently contain.

## Why forward chaining, not backward chaining

Backward chaining starts from a single goal ("is this applicant qualified
for position X?") and works backward, asking only the questions needed to
prove or disprove that one goal — it's *goal-driven*.

This system is *data-driven* instead: the form collects **all** raw facts
up front, regardless of which positions the applicant might match, and the
system then evaluates **all four positions** against that one set of
facts in a single run. There's no single goal to work backward from — we
want the full picture for every position simultaneously. That's exactly
the shape forward chaining is built for: start with known facts, keep
applying rules until no more facts can be derived, then read off whatever
conclusions follow.

## The fixed-point loop

`runInference()` in `engine.js` doesn't just walk the rule list once. It
repeats full passes over every rule until an entire pass asserts nothing
new:

```js
let changed = true;
while (changed) {
  changed = false;
  for (const rule of rules) {
    if (workingMemory[rule.derives] === true) continue;
    if (rule.test(workingMemory)) {
      workingMemory[rule.derives] = true;
      changed = true;
    }
  }
}
```

**Why a single pass is not enough:** most tier-1 rules test raw facts
directly (e.g. `years_python_dev >= 3`). But two rules test *other derived
facts*:

- `has_bachelors_cs` fires if `degree == "Bachelor in CS"` **or**
  `has_masters_cs` is already true.
- `has_agile_capability` fires if `has_agile_experience` **or**
  `has_agile_course` is already true.

`has_masters_cs` and `has_agile_experience` are themselves derived facts,
not raw input. Depending on where a rule happens to sit in the array, a
single top-to-bottom pass could evaluate `has_bachelors_cs` *before*
`has_masters_cs` has been asserted yet, and would wrongly conclude the
applicant doesn't have a qualifying degree even though they have a
Masters. Looping until a full pass changes nothing guarantees every
consequence of the raw facts is found no matter what order the rules are
listed in — the engine doesn't need to know or care about dependency
order between rules.

(With this small, non-cyclic rule set the fixed point is always reached in
at most two passes, but the loop makes no assumption about that — it
would still work correctly with a longer dependency chain.)

## Documented assumptions

Two places in the knowledge base require an explicit design decision that
isn't fully spelled out by a literal reading of the job requirements:

1. **A Masters in CS satisfies a Bachelor in CS requirement.** Every
   position that requires "Bachelor in CS" is modeled as
   `has_bachelors_cs`, which is true if the applicant has a Bachelor's *or*
   a Masters in CS. A Masters is assumed to be a strictly higher
   credential that subsumes the Bachelor's requirement. This is isolated
   to the `has_bachelors_cs` rule and does not affect `needed` skills —
   see test case 6, which proves a Masters-holder without the relevant
   coursework still fails Entry-Level Python Engineer on coursework alone,
   rather than being waved through because of their degree.

2. **Python Engineer's "Experience in Agile projects" is unquantified in
   the source requirements**, unlike Project Manager's explicit "2 years."
   This is modeled as `has_agile_capability`: satisfied by **either** at
   least 1 year of Agile project experience **or** completion of an Agile
   course. The reasoning is that for a technical (not management) role, a
   course covering Agile methodology is treated as an acceptable
   substitute for hands-on project time, whereas the Project Manager role
   explicitly demands a quantified 2 years and has no such substitute.

## Running it

- **Form:** open `index.html` directly in a browser (double-click, or
  `file://` URL) — or visit the live link once deployed. No server
  required.
- **Tests:** open `tests.html` the same way. It runs all 10 built-in
  applicant profiles through the real engine (no mocking) and reports a
  pass/fail table with a diff for any mismatch.

## Extending: adding a fifth position

1. Open `kb.js`.
2. Add any new raw facts to `RAW_FACTS` (if the new position needs input
   the form doesn't already collect) and any new derivation rules to
   `RULES`.
3. Add a new entry to `POSITIONS` with its `needed`, `qualifications`, and
   `desired` fact lists.

That's it — `engine.js`, `app.js`, and `index.html` require no changes.
The form will automatically render the new fields (if any), and the
results table will automatically render a new row for the new position.

## Project structure

```
expert-system-hiring/
├── index.html    Form + results view
├── styles.css    Shared styling
├── kb.js         Knowledge base: facts schema, rules, positions (DATA ONLY)
├── engine.js     Generic forward-chaining inference engine
├── app.js        Form building, validation, results rendering
├── tests.html    Test runner page
├── tests.js      10 applicant test profiles + comparison logic
└── README.md     This file
```
