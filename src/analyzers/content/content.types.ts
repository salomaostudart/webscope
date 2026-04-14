export interface ContentData {
  wordCount: number;
  readabilityScore: number;
  readabilityLevel: 'easy' | 'moderate' | 'difficult';
  images: {
    total: number;
    withAlt: number;
    withGenericAlt: number;
    withoutAlt: number;
  };
  ctas: Array<{
    text: string;
    href: string;
  }>;
  hasFAQ: boolean;
  hasContactInfo: boolean;
  hasSocialLinks: boolean;
  hasFavicon: boolean;
}
