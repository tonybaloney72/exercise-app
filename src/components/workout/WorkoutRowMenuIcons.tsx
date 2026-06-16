import {
  DislikeIcon,
  FavoriteIcon,
  FavoriteIconOutline,
  ReportIcon,
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

export function MenuIconReport() {
  return <ReportIcon size={18} />;
}

export function MenuIconSwap() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

export function MenuIconRemove() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}
