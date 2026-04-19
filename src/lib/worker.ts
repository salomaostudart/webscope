/**
 * Cloudflare Worker proxy client.
 * Fetches a URL server-side to avoid CORS, returns HTML + headers.
 */

export interface WorkerResponse {
  html: string;
  headers: Record<string, string>;
  statusCode: number;
  url: string;
  responseTime: number;
}

export interface WorkerError {
  error: string;
}

const WORKER_URL =
  import.meta.env?.PUBLIC_WORKER_URL || 'https://webscope-api.salomaomstudart.workers.dev';

export async function fetchViaWorker(targetUrl: string): Promise<WorkerResponse> {
  const params = new URLSearchParams({ url: targetUrl });
  const response = await fetch(`${WORKER_URL}?${params.toString()}`);

  if (!response.ok) {
    const body = (await response.json()) as WorkerError;
    throw new Error(body.error || `Worker error (${response.status})`);
  }

  return response.json() as Promise<WorkerResponse>;
}
