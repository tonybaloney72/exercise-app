import { capacitorDateStaticParams } from "@/lib/capacitorStaticParams";

export function generateStaticParams() {
  return capacitorDateStaticParams();
}

export default function WeeklyDayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
