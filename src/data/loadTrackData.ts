import type { TrackData } from '../shared/types';

// Member 2 replaces this entry point; no CSV readings are fabricated here.
export async function loadTrackData(): Promise<TrackData> {
  throw new Error('The data module is not integrated yet. Use fixture mode for the baseline.');
}
