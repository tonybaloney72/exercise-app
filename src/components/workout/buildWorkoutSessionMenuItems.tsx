"use client";

import type { ExercisePreferenceKind } from "@/types";
import type { WorkoutRowMenuItem } from "@/components/workout/WorkoutRowOverflowMenu";
import {
  MenuIconDislike,
  MenuIconRemove,
  MenuIconReport,
  MenuIconSkip,
  MenuIconStar,
  MenuIconSwap,
  MenuIconUndoSkip,
} from "@/components/workout/WorkoutRowMenuIcons";

export type BuildWorkoutSessionMenuItemsInput = {
  /** When `"authenticated"`, Favorite / Dislike items are included. */
  authMode: string;
  preference?: ExercisePreferenceKind | null;
  onToggleFavorite?: () => void;
  onToggleDislike?: () => void;
  onReport?: () => void;
  /** e.g. "Swap exercise" / "Swap stretch". Omit to hide swap. */
  swapLabel?: string;
  onSwap?: () => void;
  completed: boolean;
  skipped: boolean;
  onSkip?: () => void;
  onUnskip?: () => void;
  onRemove?: () => void;
};

/** Shared ⋮ actions for in-session exercise / stretch / cardio rows. */
export function buildWorkoutSessionMenuItems(
  input: BuildWorkoutSessionMenuItemsInput,
): WorkoutRowMenuItem[] {
  const items: WorkoutRowMenuItem[] = [];

  if (
    input.authMode === "authenticated" &&
    input.onToggleFavorite &&
    input.onToggleDislike
  ) {
    const isFavorite = input.preference === "favorite";
    const isDisliked = input.preference === "disliked";
    items.push({
      label: isFavorite ? "Remove favorite" : "Favorite",
      icon: <MenuIconStar filled={isFavorite} />,
      onClick: input.onToggleFavorite,
    });
    items.push({
      label: isDisliked ? "Remove dislike" : "Dislike",
      icon: <MenuIconDislike active={isDisliked} />,
      onClick: input.onToggleDislike,
    });
  }

  if (input.onReport) {
    items.push({
      label: "Report an issue",
      icon: <MenuIconReport />,
      onClick: input.onReport,
    });
  }

  if (input.swapLabel && input.onSwap && !input.skipped) {
    items.push({
      label: input.swapLabel,
      icon: <MenuIconSwap />,
      onClick: input.onSwap,
    });
  }

  if (!input.completed && !input.skipped && input.onSkip) {
    items.push({
      label: "Skip",
      icon: <MenuIconSkip />,
      onClick: input.onSkip,
    });
  }

  if (input.skipped && input.onUnskip) {
    items.push({
      label: "Undo skip",
      icon: <MenuIconUndoSkip />,
      onClick: input.onUnskip,
    });
  }

  if (input.onRemove) {
    items.push({
      label: "Remove from workout",
      icon: <MenuIconRemove />,
      onClick: input.onRemove,
    });
  }

  return items;
}
