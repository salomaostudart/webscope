import { describe, it, expect } from 'vitest';
import { scoreToGrade, sortBySeverity } from '../../src/utils/scoring';

describe('scoreToGrade', () => {
  it('should return A for 90-100', () => {
    expect(scoreToGrade(90)).toBe('A');
    expect(scoreToGrade(95)).toBe('A');
    expect(scoreToGrade(100)).toBe('A');
  });

  it('should return B for 80-89', () => {
    expect(scoreToGrade(80)).toBe('B');
    expect(scoreToGrade(85)).toBe('B');
    expect(scoreToGrade(89)).toBe('B');
  });

  it('should return C for 70-79', () => {
    expect(scoreToGrade(70)).toBe('C');
    expect(scoreToGrade(75)).toBe('C');
    expect(scoreToGrade(79)).toBe('C');
  });

  it('should return D for 50-69', () => {
    expect(scoreToGrade(50)).toBe('D');
    expect(scoreToGrade(60)).toBe('D');
    expect(scoreToGrade(69)).toBe('D');
  });

  it('should return F for 0-49', () => {
    expect(scoreToGrade(0)).toBe('F');
    expect(scoreToGrade(40)).toBe('F');
    expect(scoreToGrade(49)).toBe('F');
  });
});

describe('sortBySeverity', () => {
  it('should sort findings by severity order', () => {
    const findings = [
      { severity: 'info' as const, title: 'Info' },
      { severity: 'critical' as const, title: 'Critical' },
      { severity: 'warning' as const, title: 'Warning' },
      { severity: 'pass' as const, title: 'Pass' },
    ];

    const sorted = sortBySeverity(findings);
    expect(sorted.map((f) => f.severity)).toEqual(['critical', 'warning', 'info', 'pass']);
  });

  it('should not mutate original array', () => {
    const findings = [
      { severity: 'pass' as const },
      { severity: 'critical' as const },
    ];
    const original = [...findings];
    sortBySeverity(findings);
    expect(findings).toEqual(original);
  });

  it('should handle empty array', () => {
    expect(sortBySeverity([])).toEqual([]);
  });
});
