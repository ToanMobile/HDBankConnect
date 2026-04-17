import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  type ColumnDef,
  flexRender,
} from '@tanstack/react-table';
import {
  ShieldAlert,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  CheckCircle2,
  Monitor,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { SeverityBadge } from '@/components/ui/StatusBadge';
import { cn, formatDatetime } from '@/lib/utils';
import type {
  FraudLog,
  FraudSeverity,
  FraudType,
  FraudFilters,
  PaginatedResponse,
} from '@/types';

const PER_PAGE = 50;

const SEVERITY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tu1ea5t cu1ea3 mu1ee9c u0111u1ed9' },
  { value: 'critical', label: 'Nghu01b0u1ee1m tru1ecdng' },
  { value: 'high', label: 'Cao' },
  { value: 'medium', label: 'Trung bu00ecnh' },
  { value: 'low', label: 'Thu1ea5p' },
];

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Tu1ea5t cu1ea3 lou1ea1i' },
  { value: 'DEVICE_MISMATCH', label: 'Sai thiu1ebft bu1ecb' },
  { value: 'VPN_DETECTED', label: 'Du00f9ng VPN' },
  { value: 'MOCK_LOCATION', label: 'Giu1ea3 vu1ecb tru00ed' },
  { value: 'OUTSIDE_GEOFENCE', label: 'Ngou00e0i vu00f9ng' },
  { value: 'WIFI_MISMATCH', label: 'Sai WiFi' },
  { value: 'OUTSIDE_SCHEDULE', label: 'Ngou00e0i giu1edd' },
  { value: 'RATE_LIMIT_EXCEEDED', label: 'Vu01b0u1ee3t giu1edbi hu1ea1n' },
  { value: 'GPS_INACCURATE', label: 'GPS khu00f4ng chu00ednh xu00e1c' },
];

// u2500u2500 API u2500u2500
async function fetchFraudLogs(
  filters: FraudFilters,
): Promise<PaginatedResponse<FraudLog>['data']> {
  const { data } = await api.get<PaginatedResponse<FraudLog>>('/fraud', {
    params: filters,
  });
  return data.data;
}

async function resolveFraud(
  id: string,
  note: string,
): Promise<FraudLog> {
  const { data } = await api.patch<{ data: FraudLog }>(
    `/fraud/${id}/resolve`,
    { resolution_note: note },
  );
  return data.data;
}

// u2500u2500 Detail Modal u2500u2500
function FraudDetailModal({
  fraud,
  onClose,
}: {
  fraud: FraudLog;
  onClose: () => void;
}): JSX.Element {
  const queryClient = useQueryClient();
  const [resolutionNote, setResolutionNote] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () => resolveFraud(fraud.id, resolutionNote),
    onSuccess: () => {
      toast.success('u0110u00e3 xu1eed lu00fd bu00e1o cu00e1o gian lu1eadn');
      void queryClient.invalidateQueries({ queryKey: ['fraud-logs'] });
      onClose();
    },
    onError: () => toast.error('Xu1eed lu00fd thu1ea5t bu1ea1i'),
  });

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fraud-modal-title"
    >
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 shrink-0">
          <div className="flex items-center gap-3">
            <ShieldAlert
              className="w-5 h-5 text-danger-base"
              aria-hidden="true"
            />
            <div>
              <h2 id="fraud-modal-title" className="text-base font-semibold text-neutral-950">
                Chi tiu1ebft gian lu1eadn
              </h2>
              <p className="text-xs text-neutral-500">
                {fraud.full_name} u2014 {fraud.branch_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 text-xl leading-none"
            aria-label="u0110u00f3ng"
          >
            u00d7
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Summary */}
          <div className="flex flex-wrap gap-3">
            <SeverityBadge severity={fraud.severity} />
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
              {fraud.type}
            </span>
            {fraud.is_resolved && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-bg text-success-text">
                <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                u0110u00e3 xu1eed lu00fd
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-neutral-50 rounded-lg p-3">
              <p className="text-xs text-neutral-500 mb-0.5">Nhu00e2n viu00ean</p>
              <p className="text-sm font-medium">{fraud.full_name}</p>
              <p className="font-mono text-xs text-neutral-500">
                {fraud.employee_code}
              </p>
            </div>
            <div className="bg-neutral-50 rounded-lg p-3">
              <p className="text-xs text-neutral-500 mb-0.5">Thu1eddi gian</p>
              <p className="font-mono text-sm">
                {formatDatetime(fraud.created_at)}
              </p>
            </div>
          </div>

          {/* Device snapshot */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Monitor
                className="w-4 h-4 text-neutral-500"
                aria-hidden="true"
              />
              <h3 className="text-sm font-semibold text-neutral-950">
                Thu00f4ng tin thiu1ebft bu1ecb
              </h3>
            </div>
            <div className="bg-neutral-50 rounded-lg p-4 space-y-2">
              {Object.entries(fraud.device_snapshot).map(([key, val]) => (
                <div key={key} className="flex items-start justify-between gap-4">
                  <span className="text-xs text-neutral-500 min-w-[140px] shrink-0">
                    {key}
                  </span>
                  <span
                    className={cn(
                      'font-mono text-xs text-right break-all',
                      (key === 'is_vpn_active' || key === 'is_mock_location') &&
                        val === true
                        ? 'text-danger-base font-semibold'
                        : 'text-neutral-700',
                    )}
                  >
                    {String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Location snapshot */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MapPin
                className="w-4 h-4 text-neutral-500"
                aria-hidden="true"
              />
              <h3 className="text-sm font-semibold text-neutral-950">
                Thu00f4ng tin vu1ecb tru00ed
              </h3>
            </div>
            <div className="bg-neutral-50 rounded-lg p-4 space-y-2">
              {Object.entries(fraud.location_snapshot).map(([key, val]) => (
                <div key={key} className="flex items-start justify-between gap-4">
                  <span className="text-xs text-neutral-500 min-w-[140px] shrink-0">
                    {key}
                  </span>
                  <span className="font-mono text-xs text-neutral-700 text-right break-all">
                    {val !== null ? String(val) : 'null'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* IP */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500">IP Address:</span>
            <span className="font-mono text-xs text-neutral-700">
              {fraud.client_ip}
            </span>
          </div>

          {/* Resolution note */}
          {!fraud.is_resolved && (
            <div>
              <label htmlFor="resolution-note" className="label">
                Ghi chu00fa xu1eed lu00fd
              </label>
              <textarea
                id="resolution-note"
                className="input resize-none"
                rows={3}
                placeholder="Mou00f4 tu1ea3 nu1ed9i dung xu1eed lu00fd..."
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
              />
            </div>
          )}

          {/* Resolved info */}
          {fraud.is_resolved && (
            <div className="bg-success-bg border border-success-base/20 rounded-lg p-4">
              <p className="text-xs font-medium text-success-text mb-1">
                u0110u00e3 xu1eed lu00fd bu1edfi {fraud.resolved_by} lu00fac{' '}
                {fraud.resolved_at ? formatDatetime(fraud.resolved_at) : 'N/A'}
              </p>
              {fraud.resolution_note && (
                <p className="text-sm text-success-text">{fraud.resolution_note}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!fraud.is_resolved && (
          <div className="px-6 py-4 border-t border-neutral-200 shrink-0 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              u0110u00f3ng
            </button>
            <button
              type="button"
              onClick={() => mutate()}
              disabled={isPending}
              className="btn-primary"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  u0110ang xu1eed lu00fd...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  Xu00e1c nhu1eadn u0111u00e3 xu1eed lu00fd
                </span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// u2500u2500 Sort header u2500u2500
function SortHeader({
  label,
  sorted,
  onClick,
}: {
  label: string;
  sorted: false | 'asc' | 'desc';
  onClick: (event: unknown) => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1 text-left hover:text-neutral-950 transition-colors"
    >
      {label}
      {sorted === 'asc' ? (
        <ChevronUp className="w-3.5 h-3.5" />
      ) : sorted === 'desc' ? (
        <ChevronDown className="w-3.5 h-3.5" />
      ) : (
        <ChevronsUpDown className="w-3.5 h-3.5 text-neutral-400" />
      )}
    </button>
  );
}

// u2500u2500 Columns u2500u2500
const FRAUD_COLUMNS: ColumnDef<FraudLog>[] = [
  {
    accessorKey: 'severity',
    header: 'Mu1ee9c u0111u1ed9',
    cell: ({ getValue }) => (
      <SeverityBadge severity={getValue() as FraudSeverity} />
    ),
    size: 120,
  },
  {
    accessorKey: 'employee_code',
    header: 'Mu00e3 NV',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs">{String(getValue())}</span>
    ),
    size: 90,
  },
  {
    accessorKey: 'full_name',
    header: 'Hu1ecd tu00ean',
    cell: ({ getValue }) => (
      <span className="font-medium">{String(getValue())}</span>
    ),
    size: 160,
  },
  {
    accessorKey: 'branch_name',
    header: 'Chi nhu00e1nh',
    size: 150,
  },
  {
    accessorKey: 'type',
    header: 'Lou1ea1i',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700">
        {String(getValue())}
      </span>
    ),
    size: 160,
  },
  {
    accessorKey: 'created_at',
    header: 'Thu1eddi gian',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs text-neutral-600">
        {formatDatetime(String(getValue()))}
      </span>
    ),
    size: 150,
  },
  {
    accessorKey: 'is_resolved',
    header: 'Tru1ea1ng thu00e1i',
    cell: ({ getValue }) => (
      <span
        className={cn(
          'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
          getValue()
            ? 'bg-success-bg text-success-text'
            : 'bg-warning-bg text-warning-text',
        )}
      >
        {getValue() ? (
          <>
            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
            u0110u00e3 xu1eed lu00fd
          </>
        ) : (
          'Chu01b0a xu1eed lu00fd'
        )}
      </span>
    ),
    size: 110,
  },
];

// u2500u2500 Page u2500u2500
export function FraudLogsPage(): JSX.Element {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'severity', desc: false }, // critical first (alphabetical: critical < high < low < medium)
  ]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FraudFilters>({});
  const [selectedFraud, setSelectedFraud] = useState<FraudLog | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['fraud-logs', filters, page],
    queryFn: () =>
      fetchFraudLogs({ ...filters, page, per_page: PER_PAGE }),
    placeholderData: (prev) => prev,
  });

  const table = useReactTable({
    data: data?.items ?? [],
    columns: FRAUD_COLUMNS,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: data?.total_pages ?? 1,
  });

  const totalPages = data?.total_pages ?? 1;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-h1">Phu00e1t hiu1ec7n gian lu1eadn</h1>
          <p className="text-body-sm mt-1">
            {data ? `${data.total.toLocaleString('vi-VN')} bu00e1o cu00e1o` : 'u0110ang tu1ea3i...'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {/* Severity */}
          <select
            className="input"
            value={filters.severity ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                severity: (e.target.value as FraudSeverity) || undefined,
              }))
            }
            aria-label="Mu1ee9c u0111u1ed9"
          >
            {SEVERITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Type */}
          <select
            className="input"
            value={filters.type ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                type: (e.target.value as FraudType) || undefined,
              }))
            }
            aria-label="Lou1ea1i gian lu1eadn"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Date from */}
          <input
            type="date"
            className="input"
            value={filters.date_from ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                date_from: e.target.value || undefined,
              }))
            }
            aria-label="Tu1eeb ngu00e0y"
          />

          {/* Date to */}
          <input
            type="date"
            className="input"
            value={filters.date_to ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                date_to: e.target.value || undefined,
              }))
            }
            aria-label="u0110u1ebfn ngu00e0y"
          />

          {/* Resolved */}
          <select
            className="input"
            value={filters.is_resolved === undefined ? '' : String(filters.is_resolved)}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                is_resolved:
                  e.target.value === '' ? undefined : e.target.value === 'true',
              }))
            }
            aria-label="Tru1ea1ng thu00e1i xu1eed lu00fd"
          >
            <option value="">Tu1ea5t cu1ea3</option>
            <option value="false">Chu01b0a xu1eed lu00fd</option>
            <option value="true">u0110u00e3 xu1eed lu00fd</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr
                  key={hg.id}
                  className="border-b border-neutral-200 bg-neutral-50"
                >
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-xs font-medium text-neutral-600 uppercase tracking-wider whitespace-nowrap"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <SortHeader
                          label={String(
                            flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            ),
                          )}
                          sorted={header.column.getIsSorted()}
                          onClick={
                            header.column.getToggleSortingHandler() ?? ((_e: unknown) => {})
                          }
                        />
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {FRAUD_COLUMNS.map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="skeleton h-4 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={FRAUD_COLUMNS.length}
                    className="px-4 py-16 text-center text-sm text-neutral-500"
                  >
                    Khu00f4ng cu00f3 bu00e1o cu00e1o gian lu1eadn
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-neutral-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedFraud(row.original)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedFraud(row.original);
                      }
                    }}
                    aria-label={`Xem chi tiu1ebft: ${row.original.full_name} u2014 ${row.original.type}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-4 py-3 text-sm text-neutral-700 whitespace-nowrap"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neutral-200">
          <p className="text-sm text-neutral-500">
            {data
              ? `${(page - 1) * PER_PAGE + 1}u2013${Math.min(page * PER_PAGE, data.total)} trong ${data.total.toLocaleString('vi-VN')}`
              : '0'}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="btn-secondary px-2 py-1.5 text-xs disabled:opacity-40"
            >
              u00ab
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary px-2 py-1.5 text-xs disabled:opacity-40"
            >
              u2039
            </button>
            <span className="px-3 py-1.5 text-sm text-neutral-700">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-secondary px-2 py-1.5 text-xs disabled:opacity-40"
            >
              u203a
            </button>
            <button
              type="button"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
              className="btn-secondary px-2 py-1.5 text-xs disabled:opacity-40"
            >
              u00bb
            </button>
          </div>
        </div>
      </div>

      {/* Detail modal */}
      {selectedFraud && (
        <FraudDetailModal
          fraud={selectedFraud}
          onClose={() => setSelectedFraud(null)}
        />
      )}
    </div>
  );
}
