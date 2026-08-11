// Reference data for common tests run in a Nigerian hospital lab. Values are
// adult reference ranges for demo purposes — good enough to make abnormal
// flagging meaningful, not a substitute for a real LIS reference table.

export type NumericTestRef = {
  kind: "NUMERIC";
  unit: string;
  low: number;
  high: number;
};

export type QualitativeTestRef = {
  kind: "QUALITATIVE";
  options: string[];
  abnormalValues: string[];
};

export type TestRef = NumericTestRef | QualitativeTestRef;

export const LAB_TEST_REFERENCE: Record<string, TestRef> = {
  Hemoglobin: { kind: "NUMERIC", unit: "g/dL", low: 12, high: 16 },
  "Packed Cell Volume": { kind: "NUMERIC", unit: "%", low: 36, high: 48 },
  "White Blood Cell Count": { kind: "NUMERIC", unit: "x10^9/L", low: 4, high: 11 },
  "Platelet Count": { kind: "NUMERIC", unit: "x10^9/L", low: 150, high: 450 },
  "Fasting Blood Glucose": { kind: "NUMERIC", unit: "mg/dL", low: 70, high: 100 },
  "Random Blood Glucose": { kind: "NUMERIC", unit: "mg/dL", low: 70, high: 140 },
  "Serum Creatinine": { kind: "NUMERIC", unit: "mg/dL", low: 0.6, high: 1.3 },
  "Blood Urea Nitrogen": { kind: "NUMERIC", unit: "mg/dL", low: 7, high: 20 },
  "Alanine Aminotransferase (ALT)": { kind: "NUMERIC", unit: "U/L", low: 7, high: 56 },
  "Aspartate Aminotransferase (AST)": { kind: "NUMERIC", unit: "U/L", low: 10, high: 40 },
  "Total Bilirubin": { kind: "NUMERIC", unit: "mg/dL", low: 0.1, high: 1.2 },
  "Urine Specific Gravity": { kind: "NUMERIC", unit: "", low: 1.005, high: 1.03 },
  "Malaria Parasite": { kind: "QUALITATIVE", options: ["Negative", "Positive (+)", "Positive (++)", "Positive (+++)"], abnormalValues: ["Positive (+)", "Positive (++)", "Positive (+++)"] },
  "Widal Test": { kind: "QUALITATIVE", options: ["Non-significant titre", "Significant titre (≥1:160)"], abnormalValues: ["Significant titre (≥1:160)"] },
  "HIV Screening": { kind: "QUALITATIVE", options: ["Non-reactive", "Reactive"], abnormalValues: ["Reactive"] },
  "Urine Protein": { kind: "QUALITATIVE", options: ["Negative", "Trace", "1+", "2+", "3+"], abnormalValues: ["Trace", "1+", "2+", "3+"] },
  "Urine Glucose": { kind: "QUALITATIVE", options: ["Negative", "1+", "2+", "3+"], abnormalValues: ["1+", "2+", "3+"] },
  Genotype: { kind: "QUALITATIVE", options: ["AA", "AS", "SS", "AC", "SC"], abnormalValues: ["SS", "SC"] },
};

export const LAB_TEST_NAMES = Object.keys(LAB_TEST_REFERENCE);

// Maps a department's request-type label (a panel) to the individual tests a
// lab scientist typically records against it. Falls back to every test if a
// panel has no explicit mapping — a request type not listed here just means
// pick from the full test list.
export const PANEL_TO_TESTS: Record<string, string[]> = {
  "Full Blood Count": ["Hemoglobin", "Packed Cell Volume", "White Blood Cell Count", "Platelet Count"],
  "Fasting Blood Glucose": ["Fasting Blood Glucose"],
  "Malaria Parasite Test": ["Malaria Parasite"],
  "Widal Test": ["Widal Test"],
  "Genotype Test": ["Genotype"],
  Urinalysis: ["Urine Specific Gravity", "Urine Protein", "Urine Glucose"],
  "Liver Function Test": ["Alanine Aminotransferase (ALT)", "Aspartate Aminotransferase (AST)", "Total Bilirubin"],
  "Renal Function Test": ["Serum Creatinine", "Blood Urea Nitrogen"],
  "HIV Screening": ["HIV Screening"],
};

export function suggestedTestsForRequestType(requestType: string): string[] {
  return PANEL_TO_TESTS[requestType] ?? LAB_TEST_NAMES;
}
