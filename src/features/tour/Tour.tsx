import Shepherd from 'shepherd.js';
import type { Tour } from 'shepherd.js';
import { useEffect, useRef } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import type { AccessProfile, RoleCode } from '../auth/auth.types';
import { getSupabaseClient } from '../../lib/supabase';
import { buildTourForRole, resolveTourVariant, type TourVariant } from './tourConfig';

const SESSION_STARTED_KEY = 'febracis.tour.startedThisSession';

let activeTour: Tour | null = null;

async function persistTourCompletedMetadata(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    return;
  }
  await client.auth.updateUser({
    data: {
      tour_completed_dre: true,
      tour_completed_dre_at: new Date().toISOString(),
    },
  });
}

function cancelActiveTour(): void {
  if (!activeTour) {
    return;
  }
  const t = activeTour;
  activeTour = null;
  void t.cancel();
}

type StartArgs = {
  accessProfile: AccessProfile;
  navigate: NavigateFunction;
  pathname: string;
  persistOnFinish: boolean;
  role: RoleCode;
};

export function startTour(args: StartArgs): void {
  cancelActiveTour();

  const tour = new Shepherd.Tour({
    useModalOverlay: true,
    exitOnEsc: true,
    keyboardNavigation: false,
    defaultStepOptions: {
      cancelIcon: { enabled: true },
      scrollTo: true,
      modalOverlayOpeningPadding: 6,
    },
  });

  activeTour = tour;

  let persistConsumed = false;
  const maybePersist = () => {
    if (!args.persistOnFinish || persistConsumed) {
      return;
    }
    persistConsumed = true;
    void persistTourCompletedMetadata();
  };

  tour.once('complete', maybePersist);
  tour.once('cancel', maybePersist);

  const variant: TourVariant = resolveTourVariant(args.accessProfile);
  const steps = buildTourForRole(args.role, tour, variant, args.navigate, args.pathname);

  tour.addSteps(steps);
  void tour.start();
}

export function cancelTour(): void {
  cancelActiveTour();
}

/** Hook: cancela instância Shepherd ao desmontar o layout autenticado. */
export function usePlatformTourCleanup(): void {
  useEffect(
    () => () => {
      cancelActiveTour();
    },
    [],
  );
}

export function useAutoStartDashboardTour(opts: {
  userLoaded: boolean;
  tourCompleted: boolean;
  accessProfile: AccessProfile | undefined;
  pathname: string;
  navigate: NavigateFunction;
  userRole: RoleCode;
}) {
  const startedRef = useRef(false);

  useEffect(() => {
    const { accessProfile, pathname, navigate, userRole, tourCompleted, userLoaded } = opts;
    if (!userLoaded || !accessProfile || tourCompleted) {
      return;
    }
    if (startedRef.current || sessionStorage.getItem(SESSION_STARTED_KEY)) {
      return;
    }

    const variant = resolveTourVariant(accessProfile);
    const pathOk =
      pathname === '/app/dashboard' ||
      pathname === '/app/submissions' ||
      (variant === 'controller' && pathname === '/app/workflow') ||
      (variant === 'viewer' && pathname === '/app/guide');

    if (!pathOk) {
      return;
    }

    startedRef.current = true;
    sessionStorage.setItem(SESSION_STARTED_KEY, '1');

    queueMicrotask(() => {
      startTour({
        accessProfile,
        navigate,
        pathname,
        persistOnFinish: true,
        role: userRole,
      });
    });
  }, [
    opts.userLoaded,
    opts.tourCompleted,
    opts.accessProfile,
    opts.pathname,
    opts.navigate,
    opts.userRole,
  ]);
}

export { SESSION_STARTED_KEY };
