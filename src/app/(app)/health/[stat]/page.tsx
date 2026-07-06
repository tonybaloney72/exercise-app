"use client";

import { notFound, useParams } from "next/navigation";
import HealthStatDetail from "@/components/health/HealthStatDetail";
import { isHealthStatSlug } from "@/lib/health/healthStatRoutes";

export default function HealthStatPage() {
  const params = useParams();
  const slug = typeof params.stat === "string" ? params.stat : "";
  if (!isHealthStatSlug(slug)) {
    notFound();
  }

  return <HealthStatDetail slug={slug} />;
}
