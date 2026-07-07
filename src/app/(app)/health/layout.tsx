import HealthSectionHeader from "@/components/layout/HealthSectionHeader";

export default function HealthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HealthSectionHeader>{children}</HealthSectionHeader>;
}
