import type {
  IAnalyzer, AnalysisInput, AnalyzerResult, Finding, LighthouseAudit,
} from '../base/analyzer.interface';
import { scoreToGrade } from '../../utils/scoring';
import { extractLanguage, extractImages } from '../../utils/html-parser';
import type { AccessibilityData, AccessibilityViolation } from './accessibility.types';

const LANDMARKS = ['main', 'nav', 'header', 'footer'];

// Lighthouse a11y audit IDs that map to violations
const VIOLATION_AUDITS = [
  'color-contrast', 'image-alt', 'label', 'link-name', 'button-name',
  'html-has-lang', 'html-lang-valid', 'meta-viewport', 'heading-order',
  'duplicate-id-active', 'aria-allowed-attr', 'aria-hidden-body',
  'aria-required-attr', 'aria-roles', 'aria-valid-attr-value',
  'tabindex', 'td-headers-attr', 'th-has-data-cells',
];

export class AccessibilityAnalyzer implements IAnalyzer<AccessibilityData> {
  readonly name = 'accessibility' as const;
  readonly displayName = 'Accessibility';
  readonly description = 'WCAG 2.1 AA, contrast, ARIA, keyboard navigation';
  readonly weight = 15;

  async analyze(input: AnalysisInput): Promise<AnalyzerResult<AccessibilityData>> {
    const start = Date.now();
    const findings: Finding[] = [];
    const lh = input.lighthouse;
    const { html } = input;

    const lighthouseScore = lh?.categories?.accessibility?.score != null
      ? Math.round(lh.categories.accessibility.score * 100) : 0;

    // Extract violations from Lighthouse audits
    const violations: AccessibilityViolation[] = [];
    let passes = 0;
    let incomplete = 0;

    if (lh?.audits) {
      for (const auditId of VIOLATION_AUDITS) {
        const audit = lh.audits[auditId];
        if (!audit) continue;

        if (audit.score === 0) {
          const violation = this.auditToViolation(audit);
          violations.push(violation);
          findings.push(this.violationToFinding(violation));
        } else if (audit.score === 1) {
          passes++;
        } else if (audit.score === null) {
          incomplete++;
        }
      }
    }

    // Language attribute
    const language = extractLanguage(html);
    const languageSet = !!language;
    if (!languageSet && !violations.some((v) => v.id === 'html-has-lang')) {
      findings.push(this.f('a11y-missing-lang', 'Language', 'Missing language attribute',
        'The <html> tag does not have a lang attribute.',
        'Add lang="en" (or appropriate language) to the <html> tag.',
        'critical', 'high', 'quick-fix'));
    }

    // Images without alt (from HTML parsing, not just Lighthouse)
    const images = extractImages(html);
    const imagesWithoutAlt = images.withoutAlt;
    if (imagesWithoutAlt > 0 && !violations.some((v) => v.id === 'image-alt')) {
      findings.push(this.f('a11y-images-no-alt', 'Images', `${imagesWithoutAlt} images missing alt text`,
        `${imagesWithoutAlt} of ${images.total} images have no alt attribute.`,
        'Add descriptive alt text to all images. Use alt="" for decorative images.',
        'critical', 'high', 'moderate',
        undefined, `${imagesWithoutAlt} missing`, 'All images with alt'));
    }

    // Landmarks
    const landmarksPresent: string[] = [];
    const landmarksMissing: string[] = [];
    for (const landmark of LANDMARKS) {
      const regex = new RegExp(`<${landmark}[\\s>]`, 'i');
      if (regex.test(html)) {
        landmarksPresent.push(landmark);
      } else {
        landmarksMissing.push(landmark);
      }
    }

    if (landmarksMissing.length > 0) {
      findings.push(this.f('a11y-missing-landmarks', 'Landmarks',
        `Missing landmarks: ${landmarksMissing.join(', ')}`,
        `Page is missing semantic landmarks: ${landmarksMissing.join(', ')}.`,
        `Add ${landmarksMissing.map((l) => `<${l}>`).join(', ')} elements for better screen reader navigation.`,
        'warning', 'medium', 'quick-fix'));
    }

    // Forms without labels
    const formInputs = (html.match(/<input[^>]*>/gi) || [])
      .filter((tag) => {
        const type = tag.match(/type=["']([^"']*)["']/i)?.[1] || 'text';
        return !['hidden', 'submit', 'button', 'reset', 'image'].includes(type);
      });
    const inputsWithLabel = formInputs.filter((tag) => {
      const id = tag.match(/id=["']([^"']*)["']/i)?.[1];
      const ariaLabel = tag.match(/aria-label=["']([^"']*)["']/i)?.[1];
      const ariaLabelledby = tag.match(/aria-labelledby=["']([^"']*)["']/i)?.[1];
      if (ariaLabel || ariaLabelledby) return true;
      if (id && html.includes(`for="${id}"`)) return true;
      return false;
    });
    const formsWithoutLabels = formInputs.length - inputsWithLabel.length;

    if (formsWithoutLabels > 0 && !violations.some((v) => v.id === 'label')) {
      findings.push(this.f('a11y-forms-no-labels', 'Forms',
        `${formsWithoutLabels} form inputs without labels`,
        `${formsWithoutLabels} input fields have no associated label, aria-label, or aria-labelledby.`,
        'Add a <label for="id"> or aria-label attribute to every form input.',
        'critical', 'high', 'quick-fix'));
    }

    // Contrast issues count from Lighthouse
    const contrastAudit = lh?.audits?.['color-contrast'];
    const contrastIssues = contrastAudit?.score === 0
      ? (contrastAudit.details?.items?.length ?? 1) : 0;

    // Skip navigation
    const hasSkipNav = /skip[- ]?(to[- ]?)?(main|content|nav)/i.test(html);
    if (!hasSkipNav) {
      findings.push(this.f('a11y-no-skip-nav', 'Navigation', 'No skip navigation link',
        'No "skip to content" link found at the top of the page.',
        'Add a visually hidden "Skip to main content" link as the first focusable element.',
        'info', 'low', 'quick-fix'));
    }

    // Font size check
    const hasSmallFont = /<style[^>]*>[\s\S]*?font-size:\s*(1[0-5]|[0-9])px/i.test(html);
    if (hasSmallFont) {
      findings.push(this.f('a11y-small-font', 'Typography', 'Small font size detected',
        'CSS contains font-size declarations below 16px.',
        'Use a minimum font size of 16px for body text for readability.',
        'info', 'low', 'quick-fix'));
    }

    // No Lighthouse data
    if (!lh) {
      findings.push(this.f('a11y-no-lighthouse', 'General', 'Lighthouse data unavailable',
        'Accessibility analysis is limited without Lighthouse data.',
        'Ensure PageSpeed Insights API is accessible.',
        'info', 'low', 'quick-fix'));
    }

    // Score: use Lighthouse if available, otherwise calculate from findings
    const score = lighthouseScore > 0
      ? lighthouseScore
      : this.calculateScore(findings);

    const data: AccessibilityData = {
      lighthouseScore,
      violations,
      passes,
      incomplete,
      languageSet,
      landmarksPresent,
      landmarksMissing,
      contrastIssues,
      formsWithoutLabels,
      imagesWithoutAlt,
    };

    return {
      analyzer: this.name,
      score,
      grade: scoreToGrade(score),
      findings,
      data,
      duration: Date.now() - start,
    };
  }

  private calculateScore(findings: Finding[]): number {
    let score = 100;
    for (const f of findings) {
      if (f.severity === 'critical') score -= 15;
      else if (f.severity === 'warning') score -= 5;
      else if (f.severity === 'info') score -= 1;
    }
    return Math.max(0, Math.min(100, score));
  }

  private auditToViolation(audit: LighthouseAudit): AccessibilityViolation {
    const items = audit.details?.items;
    const nodes = Array.isArray(items) ? items.length : 1;
    const impact = audit.score === 0
      ? (nodes > 5 ? 'critical' : nodes > 2 ? 'serious' : 'moderate')
      : 'minor';

    return {
      id: audit.id,
      impact,
      description: audit.title,
      helpUrl: `https://dequeuniversity.com/rules/axe/4.10/${audit.id}`,
      nodes,
    };
  }

  private violationToFinding(v: AccessibilityViolation): Finding {
    const severityMap: Record<string, Finding['severity']> = {
      critical: 'critical', serious: 'critical', moderate: 'warning', minor: 'info',
    };

    return {
      id: `a11y-${v.id}`,
      analyzer: this.name,
      severity: severityMap[v.impact] || 'warning',
      category: 'WCAG',
      title: v.description,
      description: `${v.nodes} element(s) affected.`,
      recommendation: `Fix ${v.id} violations. See: ${v.helpUrl}`,
      impact: v.impact === 'critical' || v.impact === 'serious' ? 'high' : 'medium',
      effort: 'moderate',
      learnMoreUrl: v.helpUrl,
    };
  }

  private f(
    id: string, category: string, title: string, description: string, recommendation: string,
    severity: Finding['severity'], impact: Finding['impact'], effort: Finding['effort'],
    element?: string, value?: string, expected?: string,
  ): Finding {
    return {
      id, analyzer: this.name, severity, category, title, description,
      recommendation, impact, effort, element, value, expected,
    };
  }
}
