import { redirect } from "next/navigation";
import { routes } from "@/lib/appRoutes";

export default function NutritionRedirectPage() {
  redirect(routes.meals);
}
