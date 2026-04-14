/**
 * Scoring utilities for WebScope.
 */

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export function scoreToGrade(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export function gradeColor(grade: Grade): string {
  const colors: Record<Grade, string> = {
    A: 'var(--grade-a)',
    B: 'var(--grade-b)',
    C: 'var(--grade-c)',
    D: 'var(--grade-d)',
    F: 'var(--grade-f)',
  };
  return colors[grade];
}

export type Severity = 'critical' | 'warning' | 'info' | 'pass';

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
  pass: 3,
};

export function sortBySeverity<T extends { severity: Severity }>(findings: T[]): T[] {
  return [...findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
}
