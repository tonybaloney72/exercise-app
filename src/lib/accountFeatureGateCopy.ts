export type AccountGatedFeature =
  | "customizeDay"
  | "customWeek"
  | "libraryPreferences"
  | "yourWeek";

export const ACCOUNT_FEATURE_COPY: Record<
  AccountGatedFeature,
  { title: string; description: string; benefits: string[] }
> = {
  customizeDay: {
    title: "Customize workouts",
    description:
      "Change rounds, exercises, stretches, and cardio for a specific day and save that plan for your training week.",
    benefits: [
      "Edit today or any day on Weekly",
      "Saved week syncs when you sign in",
      "Use templates to reuse a day layout",
    ],
  },
  customWeek: {
    title: "Build your week",
    description:
      "Create a full Sun–Sat plan by hand instead of using the auto-generated week.",
    benefits: [
      "Week builder for all seven days",
      "Custom week mode in Settings",
      "Reset and refine day by day",
    ],
  },
  libraryPreferences: {
    title: "Favorites & dislikes",
    description:
      "Mark exercises you prefer or want to avoid. The generator and swap picker respect your choices.",
    benefits: [
      "Personalized weekly plans",
      "Better swap suggestions",
      "Synced across devices",
    ],
  },
  yourWeek: {
    title: "Your week settings",
    description:
      "Control how plans are built: training priorities, weekly layout, round density, and default stretches.",
    benefits: [
      "Priorities, layout, or custom modes",
      "Persisted Sun–Sat plan",
      "Equipment changes update your saved week",
    ],
  },
};
