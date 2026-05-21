import {
  DislikeIcon,
  FavoriteIcon,
  FavoriteIconOutline,
} from "@/components/common/ExercisePreferenceIcons";

export function MenuIconStar({ filled }: { filled?: boolean }) {
  return filled ? (
    <FavoriteIcon size={18} className="text-amber-400" />
  ) : (
    <FavoriteIconOutline size={18} />
  );
}

export function MenuIconDislike({ active }: { active?: boolean }) {
  return (
    <DislikeIcon size={18} className={active ? "text-rose-400" : undefined} />
  );
}
