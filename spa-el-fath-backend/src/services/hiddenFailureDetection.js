// Deterministic hidden-failure detection. Every finding is derived from real
// records supplied by the runner and points back to its source rows. A repeated
// association is evidence for inspection, not a confirmed root cause.

const crypto = require('crypto');

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_DAYS = 90;
const REPAIR_RETURN_DAYS = 7;
const MIN_TREND_POINTS = 4;

const RISK_LEVELS = [
  { level: 'CRITICAL', min: 75 },
  { level: 'HIGH', min: 50 },
  { level: 'MEDIUM', min: 30 },
  { level: 'LOW', min: 0 },
];

function toDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

function levelFor(score) {
  return RISK_LEVELS.find(item => score >= item.min)?.level || 'LOW';
}

function fingerprint(machineId, category, key = '') {
  return crypto.createHash('sha256').update(`${machineId}|${category}|${key}`, 'utf8').digest('hex');
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function tokens(value) {
  return normalizeText(value).split(' ').filter(token => token.length >= 3).sort();
}

function symptomKey(value) {
  const list = tokens(value);
  return list.length ? list.join(' ') : '';
}

function withinWindow(value, start, end) {
  const date = toDate(value);
  return !!date && date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

function sourceIds(rows, limit = 10) {
  return rows.slice(0, limit).map(row => Number(row.id)).filter(Number.isFinite);
}

function buildFinding({ machine, category, key, score, scoreFactors, title, explanation, recommendationCode, recommendation, evidence, windowDays, firstEvidenceAt, lastEvidenceAt }) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  return {
    fingerprint: fingerprint(machine.id, category, key),
    machineId: Number(machine.id),
    machineCode: machine.code || null,
    machineName: machine.name || null,
    machineState: machine.state || null,
    category,
    key,
    riskLevel: levelFor(safeScore),
    riskScore: safeScore,
    scoreFactors,
    title,
    explanation,
    recommendationCode,
    recommendation,
    evidence,
    windowDays,
    firstEvidenceAt: firstEvidenceAt ? toDate(firstEvidenceAt)?.toISOString() || null : null,
    lastEvidenceAt: lastEvidenceAt ? toDate(lastEvidenceAt)?.toISOString() || null : null,
  };
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function linearSlope(points) {
  if (points.length < 2) return null;
  const origin = points[0].x;
  const xs = points.map(point => (point.x - origin) / DAY_MS);
  const ys = points.map(point => point.y);
  const meanX = average(xs);
  const meanY = average(ys);
  const denominator = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0);
  if (!denominator) return null;
  return xs.reduce((sum, x, index) => sum + (x - meanX) * (ys[index] - meanY), 0) / denominator;
}

function detectHiddenFailures({
  machines = [],
  breakdowns = [],
  tasks = [],
  logs = [],
  conditionReadings = [],
  meterReadings = [],
  partUsages = [],
  windowDays = DEFAULT_WINDOW_DAYS,
  now = new Date(),
} = {}) {
  const days = Number(windowDays) >= 7 && Number(windowDays) <= 365 ? Math.round(Number(windowDays)) : DEFAULT_WINDOW_DAYS;
  const start = new Date(now.getTime() - days * DAY_MS);
  const findings = [];
  const machineList = machines.filter(machine => machine && machine.id != null);

  const breakdownsByMachine = new Map();
  const logsByMachine = new Map();
  const tasksByMachine = new Map();
  const conditionsByMachine = new Map();
  const metersByMachine = new Map();
  const partsByMachine = new Map();

  const inWindowBreakdowns = breakdowns.filter(row => withinWindow(row.reported_at, start, now));
  const inWindowLogs = logs.filter(row => withinWindow(row.completed_at || row.maintenance_date, start, now));
  const inWindowTasks = tasks.filter(row => withinWindow(row.completed_at || row.created_at, start, now));
  const inWindowConditions = conditionReadings.filter(row => withinWindow(row.measured_at, start, now));
  const inWindowMeters = meterReadings.filter(row => withinWindow(row.reading_at, start, now));
  const inWindowParts = partUsages.filter(row => withinWindow(row.task_created_at || row.created_at, start, now));

  const push = (map, key, value) => {
    const list = map.get(Number(key)) || [];
    list.push(value);
    map.set(Number(key), list);
  };
  inWindowBreakdowns.forEach(row => push(breakdownsByMachine, row.machine_id, row));
  inWindowLogs.forEach(row => push(logsByMachine, row.machine_id, row));
  inWindowTasks.forEach(row => push(tasksByMachine, row.machine_id, row));
  inWindowConditions.forEach(row => push(conditionsByMachine, row.machine_id, row));
  inWindowMeters.forEach(row => push(metersByMachine, row.machine_id, row));
  inWindowParts.forEach(row => push(partsByMachine, row.machine_id, row));

  const fleetLogAverage = average([...logsByMachine.values()].map(list => list.length)) || 0;
  const coverageMachines = [];

  for (const machine of machineList) {
    const machineId = Number(machine.id);
    const machineBreakdowns = (breakdownsByMachine.get(machineId) || []).slice().sort((a, b) => new Date(a.reported_at) - new Date(b.reported_at));
    const machineLogs = (logsByMachine.get(machineId) || []).slice().sort((a, b) => new Date(a.completed_at || a.maintenance_date) - new Date(b.completed_at || b.maintenance_date));
    const machineTasks = (tasksByMachine.get(machineId) || []).slice();
    const machineConditions = (conditionsByMachine.get(machineId) || []).slice().sort((a, b) => new Date(a.measured_at) - new Date(b.measured_at));
    const machineMeters = (metersByMachine.get(machineId) || []).slice().sort((a, b) => new Date(a.reading_at) - new Date(b.reading_at));
    const machineParts = (partsByMachine.get(machineId) || []).slice();
    const completedRepairs = [
      ...machineLogs.filter(row => String(row.maintenance_type || '').toUpperCase() === 'CORRECTIVE' && toDate(row.completed_at)),
      ...machineTasks.filter(row => String(row.status || '').toUpperCase() === 'COMPLETED' && String(row.maintenance_type || '').toUpperCase() === 'CORRECTIVE' && toDate(row.completed_at)),
    ].sort((a, b) => new Date(a.completed_at) - new Date(b.completed_at));

    coverageMachines.push({
      machineId,
      hasBreakdowns: machineBreakdowns.length > 0,
      hasLogs: machineLogs.length > 0,
      conditionReadings: machineConditions.length,
      meterReadings: machineMeters.length,
    });

    // 1. Repeated failures in the configured window.
    if (machineBreakdowns.length >= 2) {
      const count = machineBreakdowns.length;
      const score = count >= 6 ? 82 : count >= 4 ? 62 : 38;
      findings.push(buildFinding({
        machine, category: 'REPEATED_FAILURE', key: 'breakdowns', score,
        scoreFactors: [{ code: 'BREAKDOWN_FREQUENCY', points: score, value: count }],
        title: `${count} breakdowns recorded in ${days} days`,
        explanation: `${count} breakdown reports are recorded for this machine in the selected ${days}-day window. This is a repeated-failure pattern that requires inspection; it does not by itself confirm a root cause.`,
        recommendationCode: 'REVIEW_FAILURE_HISTORY',
        recommendation: 'Review the breakdown history, confirm the failure mode and schedule an inspection.',
        evidence: {
          windowDays: days,
          breakdownCount: count,
          breakdownIds: sourceIds(machineBreakdowns),
          dates: machineBreakdowns.slice(-5).map(row => ({ id: row.id, date: row.reported_at, severity: row.severity, symptom: row.symptom })),
        },
        windowDays: days,
        firstEvidenceAt: machineBreakdowns[0].reported_at,
        lastEvidenceAt: machineBreakdowns[machineBreakdowns.length - 1].reported_at,
      }));
    }

    // 2. Failure returns shortly after a completed corrective repair.
    const earlyReturns = [];
    for (const breakdown of machineBreakdowns) {
      const reported = toDate(breakdown.reported_at);
      if (!reported) continue;
      const previous = completedRepairs.filter(repair => {
        const completed = toDate(repair.completed_at);
        return completed && completed.getTime() <= reported.getTime() && reported.getTime() - completed.getTime() <= REPAIR_RETURN_DAYS * DAY_MS;
      }).pop();
      if (previous) earlyReturns.push({ breakdown, repair: previous });
    }
    if (earlyReturns.length) {
      const score = earlyReturns.length >= 2 ? 78 : 58;
      const first = earlyReturns[0];
      const last = earlyReturns[earlyReturns.length - 1];
      findings.push(buildFinding({
        machine, category: 'EARLY_RECURRENCE', key: 'repair-return', score,
        scoreFactors: [{ code: 'RETURN_AFTER_REPAIR', points: score, value: earlyReturns.length }],
        title: `${earlyReturns.length} failure(s) returned within ${REPAIR_RETURN_DAYS} days of repair`,
        explanation: `${earlyReturns.length} breakdown(s) were reported within ${REPAIR_RETURN_DAYS} days after a completed corrective intervention. This indicates a possible incomplete repair or recurring condition and should be reviewed; causation is not confirmed.`,
        recommendationCode: 'VERIFY_REPAIR_EFFECTIVENESS',
        recommendation: 'Verify the previous repair, inspect the same failure mode and check whether the corrective action addressed the underlying condition.',
        evidence: {
          windowDays: days,
          returnWindowDays: REPAIR_RETURN_DAYS,
          occurrences: earlyReturns.slice(0, 5).map(item => ({ breakdownId: item.breakdown.id, breakdownDate: item.breakdown.reported_at, repairSource: item.repair.task_id ? 'maintenance_tasks' : 'maintenance_logs', repairId: item.repair.id, repairedAt: item.repair.completed_at })),
        },
        windowDays: days,
        firstEvidenceAt: first.breakdown.reported_at,
        lastEvidenceAt: last.breakdown.reported_at,
      }));
    }

    // 3. Recurring recorded root causes / symptom wording.
    const causeGroups = new Map();
    for (const breakdown of machineBreakdowns) {
      const key = normalizeText(breakdown.root_cause);
      if (!key) continue;
      const group = causeGroups.get(key) || [];
      group.push(breakdown);
      causeGroups.set(key, group);
    }
    const repeatedCauses = [...causeGroups.entries()].filter(([, list]) => list.length >= 2).sort((a, b) => b[1].length - a[1].length);
    const symptomGroups = new Map();
    for (const breakdown of machineBreakdowns) {
      const key = symptomKey(breakdown.symptom);
      if (!key) continue;
      const group = symptomGroups.get(key) || [];
      group.push(breakdown);
      symptomGroups.set(key, group);
    }
    const repeatedSymptoms = [...symptomGroups.entries()].filter(([, list]) => list.length >= 3).sort((a, b) => b[1].length - a[1].length);
    if (repeatedCauses.length || repeatedSymptoms.length) {
      const top = repeatedCauses[0] || repeatedSymptoms[0];
      const score = top[1].length >= 3 ? 64 : 42;
      findings.push(buildFinding({
        machine, category: 'RECURRING_ROOT_CAUSE', key: top[0], score,
        scoreFactors: [{ code: 'REPEATED_CAUSE_OR_SYMPTOM', points: score, value: top[1].length }],
        title: repeatedCauses.length ? `Recurring recorded root cause: ${top[0]}` : `Recurring symptom pattern: ${top[0]}`,
        explanation: `${top[1].length} breakdown records share ${repeatedCauses.length ? 'the same recorded root-cause wording' : 'a strongly similar symptom wording'}. This is recurring textual evidence, not a statistically confirmed root cause.`,
        recommendationCode: 'CONFIRM_ROOT_CAUSE',
        recommendation: 'Inspect the affected subsystem and confirm the root cause before repeating the same corrective action.',
        evidence: {
          windowDays: days,
          causes: repeatedCauses.slice(0, 3).map(([cause, list]) => ({ cause, count: list.length, breakdownIds: sourceIds(list) })),
          symptoms: repeatedSymptoms.slice(0, 3).map(([symptom, list]) => ({ symptom, count: list.length, breakdownIds: sourceIds(list) })),
        },
        windowDays: days,
        firstEvidenceAt: top[1][0].reported_at,
        lastEvidenceAt: top[1][top[1].length - 1].reported_at,
      }));
    }

    // 4. Repair duration trend.
    const durationRows = machineLogs.filter(row => Number(row.duration_hours) > 0 && toDate(row.completed_at));
    if (durationRows.length >= 4) {
      const mid = Math.floor(durationRows.length / 2);
      const older = durationRows.slice(0, mid);
      const recent = durationRows.slice(mid);
      const olderAvg = average(older.map(row => Number(row.duration_hours)));
      const recentAvg = average(recent.map(row => Number(row.duration_hours)));
      if (olderAvg > 0 && recentAvg > olderAvg * 1.2 && recentAvg - olderAvg >= 0.5) {
        const ratio = recentAvg / olderAvg;
        const score = Math.min(72, Math.round(32 + ratio * 12));
        findings.push(buildFinding({
          machine, category: 'REPAIR_DURATION_INCREASE', key: 'duration', score,
          scoreFactors: [{ code: 'REPAIR_DURATION_RATIO', points: score, value: Math.round(ratio * 100) / 100 }],
          title: `Repair duration increased by ${Math.round((ratio - 1) * 100)}%`,
          explanation: `Recent corrective interventions average ${recentAvg.toFixed(2)} h versus ${olderAvg.toFixed(2)} h earlier in the window. The increase is measured from ${durationRows.length} completed repair records and may reflect worsening condition or repair complexity.`,
          recommendationCode: 'REVIEW_REPAIR_COMPLEXITY',
          recommendation: 'Review recent repairs, confirm whether the machine condition is worsening and plan a deeper inspection.',
          evidence: {
            windowDays: days,
            samples: durationRows.length,
            olderAverageHours: Math.round(olderAvg * 100) / 100,
            recentAverageHours: Math.round(recentAvg * 100) / 100,
            logIds: sourceIds(durationRows, 12),
          },
          windowDays: days,
          firstEvidenceAt: durationRows[Math.max(0, mid - 1)].completed_at,
          lastEvidenceAt: durationRows[durationRows.length - 1].completed_at,
        }));
      }
    }

    // 5. Unusually frequent interventions compared with the fleet.
    if (machineLogs.length >= 4 && (machineLogs.length >= 5 || machineLogs.length >= fleetLogAverage * 1.5)) {
      const score = machineLogs.length >= 8 ? 60 : 42;
      findings.push(buildFinding({
        machine, category: 'HIGH_INTERVENTION_FREQUENCY', key: 'interventions', score,
        scoreFactors: [{ code: 'INTERVENTION_FREQUENCY_VS_FLEET', points: score, value: machineLogs.length }],
        title: `${machineLogs.length} interventions in ${days} days`,
        explanation: `This machine has ${machineLogs.length} recorded interventions in the window against a fleet average of ${fleetLogAverage.toFixed(1)}. The comparison is descriptive and should be validated against operating hours.`,
        recommendationCode: 'COMPARE_UTILIZATION',
        recommendation: 'Compare the intervention rate with machine utilization and inspect for a persistent underlying problem.',
        evidence: {
          windowDays: days,
          interventions: machineLogs.length,
          fleetAverage: Math.round(fleetLogAverage * 100) / 100,
          logIds: sourceIds(machineLogs, 12),
        },
        windowDays: days,
        firstEvidenceAt: machineLogs[0].completed_at || machineLogs[0].maintenance_date,
        lastEvidenceAt: machineLogs[machineLogs.length - 1].completed_at || machineLogs[machineLogs.length - 1].maintenance_date,
      }));
    }

    // 6. Repeated spare-part replacement on the same machine.
    const partGroups = new Map();
    for (const usage of machineParts) {
      const key = Number(usage.part_id);
      const group = partGroups.get(key) || [];
      group.push(usage);
      partGroups.set(key, group);
    }
    for (const [, usages] of partGroups) {
      const taskIds = [...new Set(usages.map(item => Number(item.task_id)).filter(Number.isFinite))];
      const totalQuantity = usages.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      if (taskIds.length >= 2 && totalQuantity >= 2) {
        const score = taskIds.length >= 3 || totalQuantity >= 4 ? 58 : 38;
        const first = usages[0];
        findings.push(buildFinding({
          machine, category: 'REPEATED_PART_REPLACEMENT', key: String(first.part_id), score,
          scoreFactors: [{ code: 'REPEATED_PART_USE', points: score, value: taskIds.length }],
          title: `Part ${first.part_name || `#${first.part_id}`} used in ${taskIds.length} work orders`,
          explanation: `The same spare part was issued or reserved on ${taskIds.length} work orders for this machine (total quantity ${totalQuantity}). Repeated replacement can indicate a persistent failure mode or an unsuitable part.`,
          recommendationCode: 'VERIFY_PART_AND_CAUSE',
          recommendation: 'Verify part suitability and inspect the recurring failure location before replacing the part again.',
          evidence: {
            windowDays: days,
            partId: Number(first.part_id),
            partName: first.part_name || null,
            sku: first.sku || null,
            taskIds,
            totalQuantity,
            usageIds: sourceIds(usages, 12),
          },
          windowDays: days,
          firstEvidenceAt: null,
          lastEvidenceAt: null,
        }));
      }
    }

    // 7. Condition threshold violations and abnormal trends.
    const byMetric = new Map();
    for (const reading of machineConditions) {
      const key = String(reading.metric);
      const group = byMetric.get(key) || [];
      group.push(reading);
      byMetric.set(key, group);
    }
    for (const [metric, readings] of byMetric) {
      const latest = readings[readings.length - 1];
      const value = Number(latest.value_num);
      const min = latest.threshold_min == null ? null : Number(latest.threshold_min);
      const max = latest.threshold_max == null ? null : Number(latest.threshold_max);
      const violations = readings.filter(row => {
        const rowValue = Number(row.value_num);
        const rowMin = row.threshold_min == null ? null : Number(row.threshold_min);
        const rowMax = row.threshold_max == null ? null : Number(row.threshold_max);
        return (rowMax != null && rowValue > rowMax) || (rowMin != null && rowValue < rowMin);
      });
      if ((max != null && value > max) || (min != null && value < min)) {
        const margin = max != null && value > max ? (value - max) / Math.max(Math.abs(max), 1e-9) : 0;
        const score = margin >= 0.2 || violations.length >= 2 ? 78 : 56;
        findings.push(buildFinding({
          machine, category: 'CONDITION_THRESHOLD', key: metric, score,
          scoreFactors: [{ code: 'THRESHOLD_EXCEEDED', points: score, value: Math.round(margin * 100) / 100 }],
          title: `${metric} reading outside configured threshold`,
          explanation: `The latest ${metric} reading is ${value} ${latest.unit || ''} against a configured ${max != null && value > max ? 'maximum' : 'minimum'} of ${max != null && value > max ? max : min}. ${violations.length} reading(s) exceeded a threshold in the window.`,
          recommendationCode: 'INSPECT_CONDITION',
          recommendation: 'Inspect the machine condition, verify the reading and plan corrective action if the violation persists.',
          evidence: {
            windowDays: days,
            metric,
            unit: latest.unit || null,
            value,
            thresholdMin: min,
            thresholdMax: max,
            violationCount: violations.length,
            readingIds: sourceIds(violations.length ? violations : readings, 10),
            measuredAt: latest.measured_at,
          },
          windowDays: days,
          firstEvidenceAt: readings[0].measured_at,
          lastEvidenceAt: latest.measured_at,
        }));
      }

      if (readings.length >= MIN_TREND_POINTS) {
        const points = readings.map(row => ({ x: toDate(row.measured_at).getTime(), y: Number(row.value_num) }));
        const slopePerDay = linearSlope(points);
        const firstValue = points[0].y;
        const lastValue = points[points.length - 1].y;
        const change = lastValue - firstValue;
        const changeRatio = Math.abs(firstValue) > 1e-9 ? change / Math.abs(firstValue) : 0;
        if (slopePerDay != null && Math.abs(changeRatio) >= 0.1) {
          const score = Math.abs(changeRatio) >= 0.25 ? 64 : 42;
          findings.push(buildFinding({
            machine, category: 'CONDITION_TREND', key: metric, score,
            scoreFactors: [{ code: 'CONDITION_TREND', points: score, value: Math.round(changeRatio * 100) / 100 }],
            title: `${metric} shows an abnormal ${change > 0 ? 'increasing' : 'decreasing'} trend`,
            explanation: `${metric} changed from ${firstValue} to ${lastValue} over ${readings.length} readings (${Math.round(changeRatio * 100)}%). This is a measured trend, not a confirmed failure prediction.`,
            recommendationCode: 'TREND_INSPECTION',
            recommendation: 'Review the measurement history, verify sensor quality and inspect the affected component.',
            evidence: {
              windowDays: days,
              metric,
              unit: latest.unit || null,
              firstValue,
              lastValue,
              changePercent: Math.round(changeRatio * 1000) / 10,
              slopePerDay: Math.round(slopePerDay * 1000) / 1000,
              samples: readings.length,
              readingIds: sourceIds(readings, 12),
            },
            windowDays: days,
            firstEvidenceAt: readings[0].measured_at,
            lastEvidenceAt: latest.measured_at,
          }));
        }
      }
    }

    // 8. Meter usage-rate spike (only when enough readings exist).
    const byMeter = new Map();
    for (const reading of machineMeters) {
      const key = String(reading.meter_type);
      const group = byMeter.get(key) || [];
      group.push(reading);
      byMeter.set(key, group);
    }
    for (const [meterType, readings] of byMeter) {
      if (readings.length < MIN_TREND_POINTS) continue;
      const intervals = [];
      for (let index = 1; index < readings.length; index += 1) {
        const previous = readings[index - 1];
        const current = readings[index];
        const deltaValue = Number(current.reading_value) - Number(previous.reading_value);
        const deltaDays = (toDate(current.reading_at) - toDate(previous.reading_at)) / DAY_MS;
        if (deltaValue >= 0 && deltaDays > 0) intervals.push({ rate: deltaValue / deltaDays, current, deltaValue, deltaDays });
      }
      if (intervals.length < 3) continue;
      const mid = Math.floor(intervals.length / 2);
      const olderRate = average(intervals.slice(0, mid).map(item => item.rate));
      const recentRate = average(intervals.slice(mid).map(item => item.rate));
      if (olderRate > 0 && recentRate > olderRate * 1.5) {
        findings.push(buildFinding({
          machine, category: 'METER_USAGE_SPIKE', key: meterType, score: 34,
          scoreFactors: [{ code: 'METER_USAGE_RATE_RATIO', points: 34, value: Math.round((recentRate / olderRate) * 100) / 100 }],
          title: `${meterType} usage rate increased`,
          explanation: `The recent ${meterType} increase rate is ${recentRate.toFixed(2)} per day versus ${olderRate.toFixed(2)} earlier in the window. Confirm whether this reflects real utilization or a recording issue.`,
          recommendationCode: 'VERIFY_METER_USAGE',
          recommendation: 'Confirm the usage increase against production records and review the machine duty cycle.',
          evidence: {
            windowDays: days,
            meterType,
            olderRatePerDay: Math.round(olderRate * 100) / 100,
            recentRatePerDay: Math.round(recentRate * 100) / 100,
            samples: readings.length,
            readingIds: sourceIds(readings, 12),
          },
          windowDays: days,
          firstEvidenceAt: readings[0].reading_at,
          lastEvidenceAt: readings[readings.length - 1].reading_at,
        }));
      }
    }

    // 9. Monitoring gap for machines with maintenance activity.
    const hasActivity = machineBreakdowns.length || machineLogs.length || machineTasks.length;
    if (hasActivity && machineConditions.length === 0) {
      findings.push(buildFinding({
        machine, category: 'INSUFFICIENT_MONITORING', key: 'condition', score: 10,
        scoreFactors: [{ code: 'NO_CONDITION_DATA', points: 10, value: 0 }],
        title: 'No condition readings recorded',
        explanation: `This machine has maintenance activity but no condition readings in the selected window. Hidden deterioration cannot be assessed from condition data.`,
        recommendationCode: 'START_CONDITION_MONITORING',
        recommendation: 'Start recording temperature, vibration or other condition readings to enable reliable detection.',
        evidence: {
          windowDays: days,
          conditionReadings: 0,
          meterReadings: machineMeters.length,
          breakdowns: machineBreakdowns.length,
          interventions: machineLogs.length,
        },
        windowDays: days,
        firstEvidenceAt: null,
        lastEvidenceAt: null,
      }));
    }
  }

  const machineRisks = machineList.map(machine => {
    const own = findings.filter(item => item.machineId === Number(machine.id));
    if (!own.length) return null;
    const maxScore = Math.max(...own.map(item => item.riskScore));
    const supporting = own.filter(item => item.riskScore >= 50).length;
    const riskScore = Math.min(100, maxScore + Math.max(0, supporting - 1) * 4);
    return {
      machineId: Number(machine.id),
      code: machine.code || null,
      name: machine.name || null,
      state: machine.state || null,
      riskScore,
      riskLevel: levelFor(riskScore),
      findingCount: own.length,
      categories: [...new Set(own.map(item => item.category))],
      lastEvidenceAt: own.map(item => item.lastEvidenceAt).filter(Boolean).sort().pop() || null,
    };
  }).filter(Boolean).sort((a, b) => b.riskScore - a.riskScore || a.machineId - b.machineId);

  findings.sort((a, b) => b.riskScore - a.riskScore || a.machineId - b.machineId || a.category.localeCompare(b.category));

  return {
    windowDays: days,
    findings,
    machineRisks,
    coverage: {
      machines: machineList.length,
      withConditionReadings: coverageMachines.filter(item => item.conditionReadings > 0).length,
      withMeterReadings: coverageMachines.filter(item => item.meterReadings > 0).length,
      withoutConditionReadings: coverageMachines.filter(item => item.conditionReadings === 0 && (item.hasBreakdowns || item.hasLogs)).map(item => item.machineId),
      insufficientTrendMachines: coverageMachines.filter(item => item.conditionReadings > 0 && item.conditionReadings < MIN_TREND_POINTS).map(item => item.machineId),
      machinesWithoutActivity: coverageMachines.filter(item => !item.hasBreakdowns && !item.hasLogs).map(item => item.machineId),
    },
  };
}

module.exports = {
  DEFAULT_WINDOW_DAYS,
  REPAIR_RETURN_DAYS,
  MIN_TREND_POINTS,
  levelFor,
  fingerprint,
  detectHiddenFailures,
};
