import { CheckCircle2, Clock, XCircle, AlertCircle, MinusCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AttendanceStatus, FraudSeverity } from '@/types';

// u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500
// Attendance Status Badge
// u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500

interface StatusConfig {
  label: string;
  className: string;
  Icon: LucideIcon;
}

const statusConfig: Record<AttendanceStatus, StatusConfig> = {
  on_time: {
    label: 'u0110u00fang giu1edd',
    className: 'bg-success-bg text-success-text',
    Icon: CheckCircle2,
  },
  late: {
    label: 'Muu1ed9n',
    className: 'bg-warning-bg text-warning-text',
    Icon: Clock,
  },
  early_leave: {
    label: 'Vu1ec1 su1edbm',
    className: 'bg-warning-bg text-warning-text',
    Icon: AlertCircle,
  },
  absent: {
    label: 'Vu1eafng',
    className: 'bg-danger-bg text-danger-text',
    Icon: XCircle,
  },
  pending: {
    label: 'Chu1edd xu00e1c nhu1eadn',
    className: 'bg-neutral-100 text-neutral-600',
    Icon: MinusCircle,
  },
};

interface StatusBadgeProps {
  status: AttendanceStatus;
  className?: string;
  /** When true, renders a smaller pill without the icon */
  compact?: boolean;
}

export function StatusBadge({ status, className, compact = false }: StatusBadgeProps): JSX.Element {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className,
      )}
      aria-label={config.label}
    >
      {!compact && <config.Icon className="w-3 h-3 shrink-0" aria-hidden="true" />}
      {config.label}
    </span>
  );
}

// u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500
// Fraud Severity Badge
// u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500

interface SeverityConfig {
  label: string;
  className: string;
}

const severityConfig: Record<FraudSeverity, SeverityConfig> = {
  critical: {
    label: 'Nghu01b0u1ee1m tru1ecdng',
    className: 'bg-danger-bg text-danger-text border border-danger-base/20',
  },
  high: {
    label: 'Cao',
    className: 'bg-orange-100 text-orange-800 border border-orange-200',
  },
  medium: {
    label: 'Trung bu00ecnh',
    className: 'bg-warning-bg text-warning-text border border-warning-base/20',
  },
  low: {
    label: 'Thu1ea5p',
    className: 'bg-neutral-100 text-neutral-600 border border-neutral-200',
  },
};

interface SeverityBadgeProps {
  severity: FraudSeverity;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps): JSX.Element {
  const config = severityConfig[severity];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide',
        config.className,
        className,
      )}
      aria-label={config.label}
    >
      {config.label}
    </span>
  );
}

// u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500
// Generic colored badge (for role labels, etc.)
// u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500u2500

interface RoleBadgeProps {
  role: string;
  className?: string;
}

const roleConfig: Record<string, { label: string; className: string }> = {
  super_admin: { label: 'Super Admin', className: 'bg-primary-100 text-primary-800' },
  hr: { label: 'HR', className: 'bg-info-bg text-info-text' },
  branch_manager: { label: 'Quu1ea3n lu00fd CN', className: 'bg-purple-100 text-purple-800' },
  employee: { label: 'Nhu00e2n viu00ean', className: 'bg-neutral-100 text-neutral-700' },
};

export function RoleBadge({ role, className }: RoleBadgeProps): JSX.Element {
  const config = roleConfig[role] ?? { label: role, className: 'bg-neutral-100 text-neutral-700' };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
