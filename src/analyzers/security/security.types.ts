export interface SecurityData {
  https: boolean;
  headers: {
    hsts: { present: boolean; maxAge: number | null; includeSubDomains: boolean; preload: boolean };
    csp: { present: boolean; value: string | null; hasUnsafeInline: boolean; hasUnsafeEval: boolean };
    xFrameOptions: { present: boolean; value: string | null };
    xContentTypeOptions: { present: boolean };
    referrerPolicy: { present: boolean; value: string | null };
    permissionsPolicy: { present: boolean; value: string | null };
    server: { present: boolean; value: string | null; leaksInfo: boolean };
    xPoweredBy: { present: boolean; value: string | null };
  };
  mixedContent: {
    found: boolean;
    resources: string[];
  };
  sri: {
    externalScripts: number;
    withIntegrity: number;
    without: string[];
  };
  forms: {
    total: number;
    insecureAction: string[];
  };
}
