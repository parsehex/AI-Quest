import {
  HomeIcon, PresentationChartBarIcon
} from "@heroicons/vue/24/outline";
import { IconBrandGithub } from '@tabler/icons-vue';
import type { FunctionalComponent } from "@vue/runtime-core";

type Where = "home" | "app" | "user" | "admin";

type Navigation = {
  name: string;
  to: string;
  icon: FunctionalComponent;
  target?: string;
};

export function getNavigation(where: Where): Navigation[] {
  const isDev = import.meta.env.DEV;
  switch (where) {
    case "home":
      const routes: Navigation[] = [
        { name: "Home", to: "/", icon: HomeIcon },
      ];
      if (isDev) {
        routes.push({ name: "Admin", to: "/admin", icon: PresentationChartBarIcon });
      }
      routes.push({ name: "", to: "https://github.com/parsehex/AI-Quest", icon: IconBrandGithub, target: '_blank' });
      return routes;
    default:
      return [];
  }
}
