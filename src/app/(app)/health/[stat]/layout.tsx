import { healthStatStaticParams } from "@/lib/capacitorStaticParams";

export function generateStaticParams() {
  return healthStatStaticParams();
}

export default function HealthStatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
