import { cardioKindStaticParams } from "@/lib/capacitorStaticParams";

export function generateStaticParams() {
  return cardioKindStaticParams();
}

export default function HealthExerciseKindLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
