export interface AccessibilityViolation {
  id: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  description: string;
  helpUrl: string;
  nodes: number;
}

export interface AccessibilityData {
  lighthouseScore: number;
  violations: AccessibilityViolation[];
  passes: number;
  incomplete: number;
  languageSet: boolean;
  landmarksPresent: string[];
  landmarksMissing: string[];
  contrastIssues: number;
  formsWithoutLabels: number;
  imagesWithoutAlt: number;
}
