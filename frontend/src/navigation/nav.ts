import { createContext, useContext } from 'react';
import { BoRoute } from '../types/backoffice';

export interface Nav {
  push: (route: BoRoute) => void;
  /** Reemplaza la pantalla actual (p. ej. tras una acción exitosa). */
  replace: (route: BoRoute) => void;
  back: () => void;
  home: () => void;
  roles: string[];
}

export const NavContext = createContext<Nav | null>(null);

export function useNav(): Nav {
  const nav = useContext(NavContext);
  if (!nav) throw new Error('useNav fuera de BackofficeApp');
  return nav;
}
