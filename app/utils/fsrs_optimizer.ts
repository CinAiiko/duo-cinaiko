// app/utils/fsrs_optimizer.ts

/**
 * FSRS v6 parameters optimizer in TypeScript/JavaScript.
 * Calibrates the 17 weights of FSRS using user's chronological review logs.
 * Minimizes binary cross-entropy (log loss) between predicted probability of recall (Retrievability R)
 * and the actual outcomes (recalled = 1, forgotten = 0).
 */

export function optimizeFSRS(
  logs: Array<{ word_id: string; rating: number; reviewed_at: string | Date }>,
  initialW: number[]
): number[] {
  // Parse logs with numerical timestamps
  const parsedLogs = logs.map((l) => ({
    word_id: l.word_id,
    rating: l.rating,
    reviewed_at: new Date(l.reviewed_at).getTime(),
  }));

  // Group logs by word_id
  const wordLogsMap: Record<string, typeof parsedLogs> = {};
  for (const log of parsedLogs) {
    if (!wordLogsMap[log.word_id]) {
      wordLogsMap[log.word_id] = [];
    }
    wordLogsMap[log.word_id].push(log);
  }

  // Sort each group chronologically and keep only words with at least 2 reviews
  const sortedWordLogs: Array<typeof parsedLogs> = [];
  for (const word_id in wordLogsMap) {
    const sorted = wordLogsMap[word_id].sort((a, b) => a.reviewed_at - b.reviewed_at);
    if (sorted.length >= 2) {
      sortedWordLogs.push(sorted);
    }
  }

  // Count active reviews for optimization (excluding the first encounter of each word)
  const totalReviewsCount = sortedWordLogs.reduce((acc, val) => acc + val.length - 1, 0);
  if (totalReviewsCount < 5) {
    // Not enough review logs to perform calibration, return initial weights
    return [...initialW];
  }

  // Helper to evaluate Log Loss for a given set of weights W
  const evaluateLoss = (W: number[]): number => {
    let totalLoss = 0;
    let count = 0;

    for (const sequence of sortedWordLogs) {
      let stability = 0;
      let difficulty = 0;
      let lastReviewedAt: number | null = null;

      for (const log of sequence) {
        const rating = log.rating;
        const isCorrect = rating >= 2;

        if (lastReviewedAt !== null) {
          const t = Math.max(1, Math.round((log.reviewed_at - lastReviewedAt) / (24 * 60 * 60 * 1000)));

          // Retrievability (predicted probability of recall)
          const R = Math.exp(Math.log(0.9) * (t / stability));
          const clippedR = Math.max(0.0001, Math.min(0.9999, R));

          const y = isCorrect ? 1 : 0;
          const stepLoss = -(y * Math.log(clippedR) + (1 - y) * Math.log(1 - clippedR));

          totalLoss += stepLoss;
          count++;

          // --- Simulate State Progression ---
          // 1. Update difficulty
          const D_0 = W[4] - W[5] * (rating - 3);
          let next_d = difficulty + W[6] * (D_0 - difficulty);
          next_d = W[7] * W[4] + (1 - W[7]) * next_d;
          difficulty = Math.max(1, Math.min(10, next_d));

          // 2. Update stability
          let next_s = stability;
          if (rating === 1) {
            // Lapse (Forgotten)
            next_s = W[11] * Math.pow(difficulty, -W[12]) * (Math.pow(stability + 1, W[13]) - 1) * Math.exp((1 - R) * W[14]);
            next_s = Math.min(next_s, stability);
          } else {
            // Recalled
            next_s = stability * (1 + Math.exp(W[8]) * (11 - difficulty) * Math.pow(stability, -W[9]) * (Math.exp((1 - R) * W[10]) - 1));
            if (rating === 2) {
              next_s *= W[15]; // Hard penalty
            } else if (rating === 4) {
              next_s *= W[16]; // Easy bonus
            }
          }
          stability = Math.max(0.1, next_s);
        } else {
          // First encounter initialization
          stability = W[rating - 1];
          difficulty = Math.max(1, Math.min(10, W[4] - W[5] * (rating - 3)));
        }

        lastReviewedAt = log.reviewed_at;
      }
    }

    return count > 0 ? totalLoss / count : 999;
  };

  // Bounds for parameters to keep FSRS predictions stable and realistic
  const lowerBounds = [
    0.1, 0.1, 0.1, 0.1,      // w[0]..w[3] (initial stability for 1, 2, 3, 4)
    1.0,                     // w[4] (initial difficulty)
    0.1,                     // w[5] (difficulty multiplier)
    0.01,                    // w[6] (difficulty damping)
    0.0,                     // w[7] (mean reversion weight)
    -5.0, 0.01, 0.01,        // w[8]..w[10] (recall stability factors)
    0.01, 0.01, 0.01, 0.01,  // w[11]..w[14] (lapse stability factors)
    0.01,                    // w[15] (hard penalty factor)
    1.0,                     // w[16] (easy bonus factor)
  ];

  const upperBounds = [
    10.0, 10.0, 15.0, 40.0,  // w[0]..w[3]
    10.0,                    // w[4]
    5.0,                     // w[5]
    1.0,                     // w[6]
    0.5,                     // w[7]
    5.0, 5.0, 5.0,           // w[8]..w[10]
    10.0, 5.0, 1.0, 10.0,    // w[11]..w[14]
    1.0,                     // w[15]
    10.0,                    // w[16]
  ];

  // Optimize weights using Coordinate Descent
  let W = [...initialW];
  let bestLoss = evaluateLoss(W);

  let stepSize = 0.5;
  const tolerance = 0.005;

  while (stepSize > tolerance) {
    let improved = false;

    for (let j = 0; j < 17; j++) {
      // 1. Try step in positive direction
      const W_plus = [...W];
      W_plus[j] = Math.max(lowerBounds[j], Math.min(upperBounds[j], W[j] + stepSize));
      const loss_plus = evaluateLoss(W_plus);

      if (loss_plus < bestLoss - 0.00001) {
        bestLoss = loss_plus;
        W = W_plus;
        improved = true;
        continue;
      }

      // 2. Try step in negative direction
      const W_minus = [...W];
      W_minus[j] = Math.max(lowerBounds[j], Math.min(upperBounds[j], W[j] - stepSize));
      const loss_minus = evaluateLoss(W_minus);

      if (loss_minus < bestLoss - 0.00001) {
        bestLoss = loss_minus;
        W = W_minus;
        improved = true;
      }
    }

    // Shrink step size if no improvements were found in this sweep
    if (!improved) {
      stepSize *= 0.7;
    }
  }

  // Return weights formatted to 4 decimals
  return W.map((val) => Number(val.toFixed(4)));
}
