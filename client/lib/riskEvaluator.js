// client/lib/riskEvaluator.js
// Simplified risk evaluator: uses only age, total_hours_worked, and health_conditions.
// No rest/vitals logic included.

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

/**
 * Compute health multiplier based on number of conditions and medications.
 * Every condition adds +0.2, capped so multiplier is between 1.0 and 1.6.
 * Medications add a small caution (+0.1).
 * @param {string[]} conditions
 * @param {string} medications
 * @returns {number}
 */
function computeHealthMultiplier(conditions = [], medications = "") {
  if (!conditions || conditions.length === 0 || (conditions.length === 1 && conditions[0] === "None")) {
    return 1.0;
  }
  const conditionCount = conditions.filter(c => c !== "None").length;
  const add = 0.2 * conditionCount;
  let mult = 1.0 + add;
  if (medications && medications.trim().length > 0) {
    mult += 0.1;
  }
  return clamp(mult, 1.0, 1.6);
}

/**
 * Compute a simplified risk score and alert level for a worker.
 * Uses age (0-30 pts), hours worked (0-40 pts), and health multiplier.
 *
 * @param {Object} input
 * @param {string|number} [input.worker_id]
 * @param {string} [input.worker_name]
 * @param {number} input.age
 * @param {number} input.total_hours_worked
 * @param {string[]} [input.health_conditions]
 * @param {string} [input.medications]
 * @returns {Object} { worker_id, score, alert_level, reasons, recommended_actions }
 */
function computeRiskScore(input = {}) {
  const age = Number(input.age || 0);
  const hours = Number(input.total_hours_worked || 0);
  const conds = input.health_conditions || [];
  const meds = input.medications || "";

  // Age score (0 - 25)
  // Simpler bucketing to avoid tiny decimals and be interpretable
  let ageScore = 0;
  if (age <= 30) ageScore = 5;
  else if (age <= 40) ageScore = 10;
  else if (age <= 50) ageScore = 15;
  else if (age <= 60) ageScore = 20;
  else ageScore = 25;

  // Hours score (0 - 40)
  // 0-8h: low; 9-10: moderate; 11-12: high; 13+: max
  let hoursScore = 0;
  if (hours <= 8) hoursScore = 10;
  else if (hours <= 10) hoursScore = 20;
  else if (hours <= 12) hoursScore = 30;
  else hoursScore = 40;

  // Combine raw score
  const raw = clamp(ageScore + hoursScore, 0, 100);

  // Multiplier from conditions & meds
  const mult = computeHealthMultiplier(conds, meds);

  // Final score capped at 100
  const score = clamp(Math.round(raw * mult), 0, 100);

  // Map to alert level
  let alert_level = "ok";
  if (score >= 80) alert_level = "critical";
  else if (score >= 60) alert_level = "warning";
  else if (score >= 40) alert_level = "watch";

  // Reasons (human readable)
  const reasons = [
    `Age (${age}) contributes ${Math.round(ageScore)} pts`,
    `Hours worked (${hours}h) contributes ${Math.round(hoursScore)} pts`
  ];

  const conditionCount = conds.filter(c => c !== "None").length;
  if (conditionCount > 0) {
    reasons.push(`${conditionCount} health condition(s) apply multiplier x${mult.toFixed(2)}`);
  } else {
    reasons.push("No health conditions - multiplier x1.00");
  }

  if (meds && meds.trim().length > 0) {
    reasons.push("Medications present - added caution");
  }

  // Recommended actions based on alert level
  let recommended_actions = [];
  if (alert_level === "ok") {
    recommended_actions = ["Maintain hydration and standard rest schedule."];
  } else if (alert_level === "watch") {
    recommended_actions = ["Add a short 15-minute rest and verify hydration.", "Supervisor: brief check-in at shift end."];
  } else if (alert_level === "warning") {
    recommended_actions = ["Require 30-minute rest and reduced physical tasks.", "Supervisor to adjust next shift workload."];
  } else {
    recommended_actions = ["Stop work immediately and initiate medical check.", "Notify supervisor and emergency contact."];
  }

  return {
    worker_id: input.worker_id || null,
    worker_name: input.worker_name || null,
    score,
    alert_level,
    reasons,
    recommended_actions
  };
}

export { computeRiskScore };
