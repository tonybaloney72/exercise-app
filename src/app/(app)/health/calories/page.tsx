import { redirect } from "next/navigation";
import { routes } from "@/lib/appRoutes";

export default function HealthCaloriesRedirectPage() {
  redirect(routes.healthNutrition);
}
