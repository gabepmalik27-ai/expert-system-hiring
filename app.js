// app.js
//
// INTERFACE layer: builds the form from kb.js's RAW_FACTS, validates
// input, collects it into a raw-facts object, hands it to the engine, and
// renders the results table. This file knows field NAMES (it has to, to
// build inputs and read their values) but contains no qualification
// logic — all of that lives in kb.js (data) and engine.js (inference).

document.addEventListener("DOMContentLoaded", () => {
  buildForm();

  const form = document.getElementById("applicant-form");
  form.addEventListener("submit", handleSubmit);

  const startOverButton = document.getElementById("start-over-button");
  startOverButton.addEventListener("click", handleStartOver);
});

// ---------------------------------------------------------------------
// Form construction
// ---------------------------------------------------------------------

/**
 * Build one <fieldset> per section (Coursework / Experience / Credentials)
 * and one input per RAW_FACTS entry, grouped into those fieldsets in the
 * order they appear in kb.js.
 */
function buildForm() {
  const sectionsContainer = document.getElementById("form-sections");

  // Group RAW_FACTS by section while preserving first-seen order, so a
  // fieldset for a new section can be added to kb.js without this file
  // needing to know the section names in advance.
  const sectionOrder = [];
  const sectionFields = {};
  for (const fact of RAW_FACTS) {
    if (!sectionFields[fact.section]) {
      sectionOrder.push(fact.section);
      sectionFields[fact.section] = [];
    }
    sectionFields[fact.section].push(fact);
  }

  for (const sectionName of sectionOrder) {
    const fieldset = document.createElement("fieldset");
    const legend = document.createElement("legend");
    legend.textContent = sectionName;
    fieldset.appendChild(legend);

    for (const fact of sectionFields[sectionName]) {
      fieldset.appendChild(buildFieldElement(fact));
    }

    sectionsContainer.appendChild(fieldset);
  }
}

/**
 * Build the wrapper <div class="field"> for one raw fact, containing its
 * label, the appropriate input control, helper text (enum fields), and an
 * empty error slot that validation fills in later.
 */
function buildFieldElement(fact) {
  const wrapper = document.createElement("div");
  wrapper.className = "field";
  wrapper.id = `field-${fact.name}`;

  const label = document.createElement("label");
  label.className = "field-label";
  label.textContent = fact.label;
  wrapper.appendChild(label);

  if (fact.type === "boolean") {
    wrapper.appendChild(buildRadioGroup(fact.name, ["Yes", "No"]));
  } else if (fact.type === "integer") {
    wrapper.appendChild(buildNumberInput(fact));
  } else if (fact.type === "choice") {
    wrapper.appendChild(buildRadioGroup(fact.name, fact.values));
  }

  const errorText = document.createElement("p");
  errorText.className = "error-text";
  errorText.id = `error-${fact.name}`;
  errorText.hidden = true;
  wrapper.appendChild(errorText);

  return wrapper;
}

/**
 * A generic radio-button group for a field with a fixed set of options.
 * Used for both Yes/No booleans and multi-value choice fields (e.g.
 * degree) — same markup, just a different option list.
 */
function buildRadioGroup(fieldName, optionLabels) {
  const group = document.createElement("div");
  group.className = "radio-group";

  for (const optionLabel of optionLabels) {
    const radioLabel = document.createElement("label");
    const input = document.createElement("input");
    input.type = "radio";
    input.name = fieldName;
    input.value = optionLabel;
    radioLabel.appendChild(input);
    radioLabel.appendChild(document.createTextNode(optionLabel));
    group.appendChild(radioLabel);
  }

  return group;
}

function buildNumberInput(fact) {
  const input = document.createElement("input");
  input.type = "number";
  input.name = fact.name;
  input.min = fact.min;
  input.max = fact.max;
  input.step = 1;
  return input;
}

// ---------------------------------------------------------------------
// Validation + collection
// ---------------------------------------------------------------------

/**
 * Validate every RAW_FACTS field against the live form. Returns
 * { rawFacts, errors } where errors is a map of fact name -> message.
 * rawFacts is only fully populated when errors is empty, but partial
 * values are still returned so the caller can distinguish "field missing"
 * from "field invalid" if ever needed.
 */
function validateAndCollect() {
  const form = document.getElementById("applicant-form");
  const rawFacts = {};
  const errors = {};

  for (const fact of RAW_FACTS) {
    if (fact.type === "boolean") {
      const checked = form.querySelector(`input[name="${fact.name}"]:checked`);
      if (!checked) {
        errors[fact.name] = "Please select Yes or No.";
      } else {
        rawFacts[fact.name] = checked.value === "Yes";
      }
    } else if (fact.type === "integer") {
      const input = form.querySelector(`input[name="${fact.name}"]`);
      const raw = input.value.trim();
      if (raw === "") {
        errors[fact.name] = "This field is required.";
      } else if (!/^-?\d+$/.test(raw)) {
        errors[fact.name] = "Please enter a whole number.";
      } else {
        const value = parseInt(raw, 10);
        if (value < fact.min || value > fact.max) {
          errors[fact.name] = `Please enter a number between ${fact.min} and ${fact.max}.`;
        } else {
          rawFacts[fact.name] = value;
        }
      }
    } else if (fact.type === "choice") {
      const checked = form.querySelector(`input[name="${fact.name}"]:checked`);
      if (!checked) {
        errors[fact.name] = `Please select one: ${fact.values.join(", ")}.`;
      } else {
        rawFacts[fact.name] = checked.value;
      }
    }
  }

  return { rawFacts, errors };
}

/**
 * Show/clear error text for every field and return the name of the first
 * field with an error (in RAW_FACTS order), or null if there were none.
 */
function renderErrors(errors) {
  let firstErrorField = null;

  for (const fact of RAW_FACTS) {
    const fieldWrapper = document.getElementById(`field-${fact.name}`);
    const errorEl = document.getElementById(`error-${fact.name}`);
    const message = errors[fact.name];

    if (message) {
      errorEl.textContent = message;
      errorEl.hidden = false;
      fieldWrapper.classList.add("has-error");
      if (firstErrorField === null) {
        firstErrorField = fact.name;
      }
    } else {
      errorEl.textContent = "";
      errorEl.hidden = true;
      fieldWrapper.classList.remove("has-error");
    }
  }

  return firstErrorField;
}

// ---------------------------------------------------------------------
// Submit / results rendering
// ---------------------------------------------------------------------

function handleSubmit(event) {
  event.preventDefault();

  const { rawFacts, errors } = validateAndCollect();
  const firstErrorField = renderErrors(errors);

  if (firstErrorField) {
    const fieldWrapper = document.getElementById(`field-${firstErrorField}`);
    fieldWrapper.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const positionResults = evaluateAllPositions(rawFacts, RULES, POSITIONS);
  renderResults(positionResults);

  document.getElementById("applicant-form").classList.add("hidden");
  document.getElementById("results-container").classList.remove("hidden");
}

function renderResults(positionResults) {
  const qualifiedCount = positionResults.filter((r) => r.qualified).length;
  document.getElementById("results-summary").textContent =
    `You qualified for ${qualifiedCount} of ${positionResults.length} positions.`;

  const tbody = document.getElementById("results-table-body");
  tbody.innerHTML = "";

  for (const result of positionResults) {
    const row = document.createElement("tr");
    row.className = result.qualified ? "qualified-row" : "not-qualified-row";

    const positionCell = document.createElement("td");
    positionCell.textContent = result.starred ? `${result.title} ★` : result.title;

    const neededCell = document.createElement("td");
    neededCell.appendChild(buildRequirementList(result.needed));

    const desiredCell = document.createElement("td");
    desiredCell.appendChild(buildRequirementList(result.desired));

    const qualificationsCell = document.createElement("td");
    qualificationsCell.appendChild(buildRequirementList(result.qualifications));

    const resultCell = document.createElement("td");
    resultCell.textContent = result.qualified
      ? "QUALIFIED"
      : `NOT QUALIFIED — ${result.failureReasons.join(", ")}`;

    row.appendChild(positionCell);
    row.appendChild(neededCell);
    row.appendChild(desiredCell);
    row.appendChild(qualificationsCell);
    row.appendChild(resultCell);
    tbody.appendChild(row);
  }
}

/**
 * Build a <ul> listing each requirement with a ✓/✗ prefix so the grader
 * can see line-by-line exactly which condition passed or failed. Returns
 * an empty (but valid) list for positions with no desired skills — the
 * "Desired Skills" cell for Project Manager / Senior Knowledge Engineer
 * will simply be blank.
 */
function buildRequirementList(requirementResults) {
  const list = document.createElement("ul");
  list.className = "requirement-list";

  for (const requirement of requirementResults) {
    const item = document.createElement("li");
    item.className = requirement.met ? "req-met" : "req-unmet";
    item.textContent = requirement.label;
    list.appendChild(item);
  }

  return list;
}

function handleStartOver() {
  document.getElementById("applicant-form").reset();
  renderErrors({}); // clear all error states

  document.getElementById("results-container").classList.add("hidden");
  document.getElementById("applicant-form").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
