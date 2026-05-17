/**
 * Confetti + optional toast when a workout is finished.
 * Dynamic import keeps canvas-confetti off the critical path.
 */

export async function celebrateWorkoutComplete(): Promise<void> {
  if (typeof window === "undefined") return;

  try {
    const confetti = (await import("canvas-confetti")).default;
    const duration = 2200;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: ["#a78bfa", "#38bdf8", "#34d399", "#f472b6"],
      });
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors: ["#a78bfa", "#38bdf8", "#34d399", "#f472b6"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    };
    frame();

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.55 },
      colors: ["#a78bfa", "#38bdf8", "#34d399", "#fbbf24"],
    });
  } catch {
    // Non-fatal if the bundle fails to load.
  }
}
