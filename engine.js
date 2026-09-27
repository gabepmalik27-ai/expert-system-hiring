// engine.js
//
// INFERENCE ENGINE — a generic forward-chaining engine.
//
// This file contains NO knowledge about Python, degrees, job titles, or any
// other domain concept. It only knows how to:
//   1. Take a set of raw facts + a list of { derives, test } rules, and
//      repeatedly apply the rules until a full pass derives nothing new
//      (forward chaining to a fixed point).
//   2. Given the resulting working memory and a list of positions, decide
//      qualified/starred/failure-reasons using the generic needed /
//      qualifications / desired shape defined in kb.js.
//
// Swap in a completely different kb.js (different rules, different jobs)
// and this file does not change.

/**
 * Run forward-chaining inference to a fixed point.
 *
 * Starts working memory as a copy of the raw facts, then repeatedly walks
 * every rule and asserts `rule.derives = true` into working memory whenever
 * `rule.test(workingMemory)` returns true and the fact isn't already there.
 * Repeats full passes until one entire pass asserts nothing new.
 *
 * Why a loop instead of one pass: some rules test the RESULT of other
 * rules (e.g. has_bachelors_cs checks has_masters_cs, which is itself
 * derived, not a raw fact). On the pass where has_bachelors_cs is
 * evaluated, has_masters_cs might not have been asserted yet, depending on
 * rule order. A single pass could therefore miss a fact it should have
 * derived. Looping until nothing new is asserted guarantees every
 * consequence of the raw facts is found, regardless of rule order.
 *
 * @param {object} rawFacts - the applicant's raw answers, e.g. { python_coursework: true, ... }
 * @param {Array<{derives: string, test: function}>} rules - from kb.js
 * @returns {object} workingMemory - rawFacts plus every derived fact that fired
 */
function runInference(rawFacts, rules) {
  const workingMemory = { ...rawFacts };

  let changed = true;
  while (changed) {
    changed = false;
    for (const rule of rules) {
      if (workingMemory[rule.derives] === true) {
        continue; // already asserted, nothing new to do
      }
      if (rule.test(workingMemory)) {
        workingMemory[rule.derives] = true;
        changed = true;
      }
    }
  }

  return workingMemory;
}

/**
 * Check whether every fact in a list of { fact, label } entries is present
 * (true) in working memory. Used for both "needed" and "qualifications",
 * which are evaluated identically — both are hard requirements.
 */
function allFactsPresent(factList, workingMemory) {
  return factList.every((entry) => workingMemory[entry.fact] === true);
}

/**
 * Evaluate a single position against working memory.
 *
 * @returns {{
 *   title: string,
 *   qualified: boolean,
 *   starred: boolean,
 *   needed: Array<{label: string, met: boolean}>,
 *   qualifications: Array<{label: string, met: boolean}>,
 *   desired: Array<{label: string, met: boolean}>,
 *   failureReasons: string[]
 * }}
 */
function evaluatePosition(position, workingMemory) {
  const neededResults = position.needed.map((entry) => ({
    label: entry.label,
    met: workingMemory[entry.fact] === true,
  }));
  const qualificationResults = position.qualifications.map((entry) => ({
    label: entry.label,
    met: workingMemory[entry.fact] === true,
  }));
  const desiredResults = position.desired.map((entry) => ({
    label: entry.label,
    met: workingMemory[entry.fact] === true,
  }));

  const qualified =
    allFactsPresent(position.needed, workingMemory) &&
    allFactsPresent(position.qualifications, workingMemory);

  // Guard: a position with an empty desired list can never be starred,
  // even though `.every()` on an empty array is vacuously true.
  const starred = position.desired.length > 0 && allFactsPresent(position.desired, workingMemory);

  // Failure reasons are derived from the same needed/qualifications lists
  // used for the verdict, not hardcoded per position — collect the labels
  // of everything that came back unmet.
  const failureReasons = [...neededResults, ...qualificationResults]
    .filter((result) => !result.met)
    .map((result) => result.label);

  return {
    title: position.title,
    qualified,
    starred,
    needed: neededResults,
    qualifications: qualificationResults,
    desired: desiredResults,
    failureReasons,
  };
}

/**
 * Run inference on rawFacts, then evaluate every position in `positions`.
 *
 * @param {object} rawFacts
 * @param {Array} rules - from kb.js
 * @param {Array} positions - from kb.js
 * @returns {Array} one evaluation result per position, in the same order
 */
function evaluateAllPositions(rawFacts, rules, positions) {
  const workingMemory = runInference(rawFacts, rules);
  return positions.map((position) => evaluatePosition(position, workingMemory));
}
