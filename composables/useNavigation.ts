import {
  GlobeAmericasIcon, UserIcon, CogIcon,
} from "@heroicons/vue/24/outline";
import type { FunctionalComponent } from "@vue/runtime-core";

type Where = 'home' | 'app' | 'user' | 'admin';

type Navigation = {
  name: string;
  to: string;
  icon: FunctionalComponent;
};

export function getNavigation(where: Where): Navigation[] {
  const user = useSupabaseUser();

  const isDev = import.meta.env.DEV;
  switch (where) {
    case 'home':
      const routes = [
        { name: 'Games', to: "/", icon: GlobeAmericasIcon },
      ];
      if (user.value && isDev) {
        routes.push({ name: "Admin", to: "/admin", icon: CogIcon });
      } else {
        routes.push({ name: "Login", to: "/login", icon: UserIcon });
      }
      return routes;
    default:
      return [];
  }
}
