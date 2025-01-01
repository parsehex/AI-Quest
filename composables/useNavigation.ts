import {
  HomeIcon, PresentationChartBarIcon
} from "@heroicons/vue/24/outline";
import type { FunctionalComponent } from "@vue/runtime-core";

type Where = "home" | "app" | "user" | "admin";

type Navigation = {
  name: string;
  to: string;
  icon: FunctionalComponent;
};

export function getNavigation(where: Where): Navigation[] {
  const isDev = import.meta.env.DEV;
  switch (where) {
    case "home":
      const routes = [
        { name: "Home", to: "/", icon: HomeIcon },
      ];
      if (isDev) {
        routes.push({ name: "Admin", to: "/admin", icon: PresentationChartBarIcon });
      }
      return routes;
    default:
      return [];
  }
}
