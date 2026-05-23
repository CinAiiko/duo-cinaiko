export const DEFAULT_W = [
  0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.28, 2.61
];

export interface FSRSInput {
  stability: number;
  difficulty: number;
  last_reviewed_at: string | Date | null;
}

export interface FSRSResult {
  stability: number;
  difficulty: number;
  interval: number;
  state: number;
}

export function calculateFSRS(
  rating: number, // 1: Again, 2: Hard, 3: Good, 4: Easy
  existingReview?: FSRSInput | null,
  customWeights?: number[] | null
): FSRSResult {
  const w = customWeights && customWeights.length === 17 ? customWeights : DEFAULT_W;

  // 1. Initial review (New card)
  if (!existingReview || !existingReview.last_reviewed_at || existingReview.stability === 0) {
    const init_s = w[rating - 1];
    const init_d = Math.max(1, Math.min(10, w[4] - w[5] * (rating - 3)));
    const interval = Math.max(1, Math.round(init_s));
    return {
      stability: init_s,
      difficulty: init_d,
      interval,
      state: rating === 1 ? 1 : 2 // 1 = Learning, 2 = Review
    };
  }

  // 2. Subsequent review (Review state)
  const last_s = existingReview.stability || w[2];
  const last_d = existingReview.difficulty || w[4];
  
  const lastReviewedDate = new Date(existingReview.last_reviewed_at);
  const elapsedDays = Math.max(1, Math.round((Date.now() - lastReviewedDate.getTime()) / (24 * 60 * 60 * 1000)));

  // Calculate retrievability (probability of recall)
  const R = Math.exp(Math.log(0.9) * (elapsedDays / last_s));

  // Update difficulty
  const D_0 = w[4] - w[5] * (rating - 3);
  let next_d = last_d + w[6] * (D_0 - last_d);
  // Mean reversion
  next_d = w[7] * w[4] + (1 - w[7]) * next_d;
  next_d = Math.max(1, Math.min(10, next_d));

  // Update stability
  let next_s = last_s;
  if (rating === 1) {
    // Forgotten (Lapse)
    next_s = w[11] * Math.pow(next_d, -w[12]) * (Math.pow(last_s + 1, w[13]) - 1) * Math.exp((1 - R) * w[14]);
    next_s = Math.min(next_s, last_s); // Ensure stability doesn't increase on lapse
  } else {
    // Recalled
    next_s = last_s * (1 + Math.exp(w[8]) * (11 - next_d) * Math.pow(last_s, -w[9]) * (Math.exp((1 - R) * w[10]) - 1));
    if (rating === 2) {
      next_s *= w[15]; // Hard penalty
    } else if (rating === 4) {
      next_s *= w[16]; // Easy bonus
    }
  }

  next_s = Math.max(0.1, next_s);
  const interval = Math.max(1, Math.round(next_s));

  return {
    stability: Number(next_s.toFixed(4)),
    difficulty: Number(next_d.toFixed(4)),
    interval,
    state: rating === 1 ? 3 : 2 // 3 = Relearning, 2 = Review
  };
}
