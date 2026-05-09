import type { AccessProfile } from '../../auth/auth.types';
import type { DerivedHoldingView } from '../holdingDerivations';
import type { DashboardSnapshot } from '../../shared/portal.types';
import type { ExecutiveKpiItem } from '../ExecutiveKpiGrid';
import type { DashboardKpiSparklineState } from '../../../components/ui/KpiCard';
import type { WidgetConfig } from './dashboardLayout.types';

export type DashboardWidgetRuntimeProps = {
  config: WidgetConfig;
  onPropsPatch: (id: string, nextProps: Record<string, unknown>) => void;
  kpis: ExecutiveKpiItem[];
  kpiSparklineStates: DashboardKpiSparklineState[];
  snapshot: DashboardSnapshot;
  accessProfile: AccessProfile;
  holdingDerived: DerivedHoldingView | null;
  editMode: boolean;
};
