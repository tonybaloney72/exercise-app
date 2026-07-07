import WorkoutSectionHeader from "@/components/layout/WorkoutSectionHeader";

export default function WorkoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkoutSectionHeader>{children}</WorkoutSectionHeader>;
}
