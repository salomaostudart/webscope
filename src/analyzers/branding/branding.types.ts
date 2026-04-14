export interface ColorInfo {
  hex: string;
  usage: string;
  count: number;
}

export interface FontInfo {
  name: string;
  weights: string[];
  source: 'system' | 'google' | 'custom';
}

export interface BrandingData {
  colors: {
    palette: ColorInfo[];
    totalUnique: number;
    isConsistent: boolean;
  };
  fonts: {
    families: FontInfo[];
    totalFamilies: number;
    hasDisplaySwap: boolean;
    hasPreload: boolean;
  };
  logo: {
    found: boolean;
    src: string | null;
    inHeader: boolean;
  };
  favicon: {
    found: boolean;
    type: string | null;
  };
  appleTouchIcon: boolean;
  ogImage: string | null;
  manifest: {
    found: boolean;
    hasName: boolean;
    hasIcons: boolean;
    hasThemeColor: boolean;
  };
  themeColor: string | null;
}
