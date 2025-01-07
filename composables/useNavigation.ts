import {
  GlobeAmericasIcon, UserIcon, CogIcon,
} from "@heroicons/vue/24/outline";
import type { FunctionalComponent } from "@vue/runtime-core";
import { computed, type ComputedRef } from 'vue';

type Where = 'home' | 'app' | 'user' | 'admin';

interface Navigation {
  name: string;
  to: string;
  icon: FunctionalComponent;
}

export function useNavigation(where: Where): {
  routes: ComputedRef<Navigation[]>
} {
  const user = useSupabaseUser();
  const isDev = import.meta.env.DEV;

  const routes = computed(() => {
    switch (where) {
      case 'home':
        const baseRoutes: Navigation[] = [
          { name: 'Games', to: "/", icon: GlobeAmericasIcon },
        ];

        if (isDev) {
          baseRoutes.push({ name: "Admin", to: "/admin", icon: CogIcon });
        }

        if (user.value) {
          baseRoutes.push({ name: "Logout", to: "/logout", icon: UserIcon });
        } else {
          baseRoutes.push({ name: "Login", to: "/login", icon: UserIcon });
        }

        return baseRoutes;

      default:
        return [];
    }
  });

  return { routes };
}
