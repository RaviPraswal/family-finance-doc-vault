/** Sprint 7 T9 (D-10): reads the advisor's answer; anything unexpected counts as "unavailable", never an error. */
export interface Recommendation {
  title: string;
  description: string;
  type: string;
}

export interface InsightsView {
  available: boolean;
  note: string | null;
  recommendations: Recommendation[];
}

const UNAVAILABLE = 'Insights unavailable today';

export function readInsights(data: unknown): InsightsView {
  if (Array.isArray(data)) return { available: true, note: null, recommendations: data as Recommendation[] };
  if (data && typeof data === 'object' && 'available' in data) {
    const d = data as { available: boolean; message?: string | null; recommendations?: Recommendation[] };
    return d.available
      ? { available: true, note: null, recommendations: d.recommendations ?? [] }
      : { available: false, note: d.message || UNAVAILABLE, recommendations: [] };
  }
  return { available: false, note: UNAVAILABLE, recommendations: [] };
}
