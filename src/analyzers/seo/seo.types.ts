import type { HeadingsResult, LinksResult, StructuredDataItem } from '../../utils/html-parser';

export interface SEOData {
  title: { value: string | null; length: number; isOptimal: boolean };
  metaDescription: { value: string | null; length: number; isOptimal: boolean };
  headings: HeadingsResult;
  links: LinksResult;
  images: {
    total: number;
    withAlt: number;
    withoutAlt: number;
    withGenericAlt: number;
  };
  structuredData: StructuredDataItem[];
  openGraph: Record<string, string | null>;
  twitterCard: Record<string, string | null>;
  canonical: string | null;
  charset: string | null;
  viewport: string | null;
  language: string | null;
  favicon: string | null;
  https: boolean;
  lighthouseSeoScore: number;
}
