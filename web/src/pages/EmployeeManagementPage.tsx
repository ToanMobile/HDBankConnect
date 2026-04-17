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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Search,
  UserCheck,
  UserX,
  Smartphone,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { RoleBadge } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';
import type {
  Employee,
  Branch,
  UserRole,
  PaginatedResponse,
  EmployeeFilters,
  CreateEmployeeDto,
} from '@/types';

const PER_PAGE = 50;

// u2500u2500 Schema u2500u2500
const createEmployeeSchema = z.object({
  employee_code: z.string().min(1, 'Mu00e3 nhu00e2n viu00ean khu00f4ng u0111u01b0u1ee3c u0111u1ec3 tru1ed1ng'),
  full_name: z.string().min(1, 'Hu1ecd tu00ean khu00f4ng u0111u01b0u1ee3c u0111u1ec3 tru1ed1ng'),
  email: z.string().email('Email khu00f4ng u0111u00fang u0111u1ecbnh du1ea1ng'),
  phone: z.string().optional(),
  role: z.enum(['super_admin', 'hr', 'branch_manager', 'employee']),
  branch_id: z.string().optional(),
  password: z.string().min(8, 'Mu1eadt khu1ea9u tu1ed1i thiu1ec3u 8 ku00fd tu1ef1'),
});

type CreateEmployeeFormData = z.infer<typeof createEmployeeSchema>;

// u2500u2500 API u2500u2500
async function fetchEmployees(
  filters: EmployeeFilters,
): Promise<PaginatedResponse<Employee>['data']> {
  const { data } = await api.get<PaginatedResponse<Employee>>('/employees', {
    params: filters,
  });
  return data.data;
}

async function fetchBranches(): Promise<Branch[]> {
  const { data } = await api.get<{ data: { items: Branch[] } }>('/branches', {
    params: { per_page: 200 },
  });
  return data.data.items;
}

async function createEmployee(dto: CreateEmployeeDto): Promise<Employee> {
  const { data } = await api.post<{ data: Employee }>('/employees', dto);
  return data.data;
}

async function toggleEmployeeStatus(
  id: string,
  is_active: boolean,
): Promise<Employee> {
  const { data } = await api.put<{ data: Employee }>(`/employees/${id}`, {
    is_active,
  });
  return data.data;
}

async function resetDevice(id: string): Promise<Employee> {
  const { data } = await api.post<{ data: Employee }>(
    `/employees/${id}/reset-device`,
  );
  return data.data;
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

// u2500u2500 Create Employee Dialog u2500u2500
function CreateEmployeeDialog({
  branches,
  onClose,
}: {
  branches: Branch[];
  onClose: () => void;
}): JSX.Element {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateEmployeeFormData>({
    resolver: zodResolver(createEmployeeSchema),
    defaultValues: {
      role: 'employee',
      employee_code: '',
      full_name: '',
      email: '',
      password: '',
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: CreateEmployeeFormData) => {
      const dto: CreateEmployeeDto = {
        ...data,
        phone: data.phone || undefined,
        branch_id: data.branch_id || undefined,
      };
      return createEmployee(dto);
    },
    onSuccess: () => {
      toast.success('Tu1ea1o nhu00e2n viu00ean thu00e0nh cu00f4ng!');
      void queryClient.invalidateQueries({ queryKey: ['employees'] });
      onClose();
    },
    onError: () => toast.error('Tu1ea1o thu1ea5t bu1ea1i'),
  });

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-employee-title"
    >
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 sticky top-0 bg-white z-10">
          <h2 id="create-employee-title" className="text-h3">
            Tu1ea1o nhu00e2n viu00ean mu1edbi
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 text-xl leading-none"
            aria-label="u0110u00f3ng"
          >
            u00d7
          </button>
        </div>

        <form
          onSubmit={handleSubmit((d) => mutate(d))}
          noValidate
          className="px-6 py-5 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="emp-code" className="label">
                Mu00e3 NV <span className="text-danger-base">*</span>
              </label>
              <input
                id="emp-code"
                className={cn('input font-mono', errors.employee_code && 'ring-2 ring-danger-base')}
                placeholder="NV001"
                {...register('employee_code')}
              />
              {errors.employee_code && <p className="field-error">{errors.employee_code.message}</p>}
            </div>

            <div>
              <label htmlFor="emp-phone" className="label">
                Su1ed1 u0111iu1ec7n thou1ea1i
              </label>
              <input
                id="emp-phone"
                type="tel"
                className="input"
                placeholder="0901234567"
                {...register('phone')}
              />
            </div>
          </div>

          <div>
            <label htmlFor="emp-name" className="label">
              Hu1ecd tu00ean <span className="text-danger-base">*</span>
            </label>
            <input
              id="emp-name"
              className={cn('input', errors.full_name && 'ring-2 ring-danger-base')}
              placeholder="Nguyu1ec5n Vu0103n A"
              {...register('full_name')}
            />
            {errors.full_name && <p className="field-error">{errors.full_name.message}</p>}
          </div>

          <div>
            <label htmlFor="emp-email" className="label">
              Email <span className="text-danger-base">*</span>
            </label>
            <input
              id="emp-email"
              type="email"
              className={cn('input', errors.email && 'ring-2 ring-danger-base')}
              placeholder="nhanvien@hdbank.vn"
              {...register('email')}
            />
            {errors.email && <p className="field-error">{errors.email.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="emp-role" className="label">
                Vai tru00f2 <span className="text-danger-base">*</span>
              </label>
              <select
                id="emp-role"
                className="input"
                {...register('role')}
              >
                <option value="employee">Nhu00e2n viu00ean</option>
                <option value="branch_manager">Quu1ea3n lu00fd CN</option>
                <option value="hr">HR</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            <div>
              <label htmlFor="emp-branch" className="label">
                Chi nhu00e1nh
              </label>
              <select
                id="emp-branch"
                className="input"
                {...register('branch_id')}
              >
                <option value="">Chu01b0a gu00e1n chi nhu00e1nh</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="emp-password" className="label">
              Mu1eadt khu1ea9u <span className="text-danger-base">*</span>
            </label>
            <input
              id="emp-password"
              type="password"
              className={cn('input', errors.password && 'ring-2 ring-danger-base')}
              placeholder="Tu1ed1i thiu1ec3u 8 ku00fd tu1ef1"
              {...register('password')}
            />
            {errors.password && <p className="field-error">{errors.password.message}</p>}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Hu1ee7y
            </button>
            <button type="submit" disabled={isPending} className="btn-primary">
              {isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  u0110ang tu1ea1o...
                </span>
              ) : (
                'Tu1ea1o nhu00e2n viu00ean'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// u2500u2500 Row actions u2500u2500
function EmployeeActions({
  employee,
}: {
  employee: Employee;
}): JSX.Element {
  const queryClient = useQueryClient();

  const { mutate: toggleStatus, isPending: isToggling } = useMutation({
    mutationFn: () => toggleEmployeeStatus(employee.id, !employee.is_active),
    onSuccess: () => {
      toast.success(
        employee.is_active ? 'u0110u00e3 vu00f4 hou1ea1t hu00f3a tu00e0i khou1ea3n' : 'u0110u00e3 kou00edch hou1ea1t tu00e0i khou1ea3n',
      );
      void queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const { mutate: doResetDevice, isPending: isResetting } = useMutation({
    mutationFn: () => resetDevice(employee.id),
    onSuccess: () => {
      toast.success('u0110u00e3 xo00e1 u0111u0103ng ku00fd thiu1ebft bu1ecb');
      void queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  return (
    <div className="flex items-center gap-1 justify-end">
      <button
        type="button"
        onClick={() => toggleStatus()}
        disabled={isToggling}
        className={cn(
          'p-1.5 rounded-lg transition-colors',
          employee.is_active
            ? 'text-danger-base hover:bg-danger-bg'
            : 'text-success-base hover:bg-success-bg',
        )}
        title={employee.is_active ? 'Vu00f4 hou1ea1t hu00f3a' : 'Kou00edch hou1ea1t'}
        aria-label={
          employee.is_active ? `Vu00f4 hou1ea1t hu00f3a ${employee.full_name}` : `Kou00edch hou1ea1t ${employee.full_name}`
        }
      >
        {employee.is_active ? (
          <UserX className="w-4 h-4" aria-hidden="true" />
        ) : (
          <UserCheck className="w-4 h-4" aria-hidden="true" />
        )}
      </button>

      {employee.registered_device_id && (
        <button
          type="button"
          onClick={() => doResetDevice()}
          disabled={isResetting}
          className="p-1.5 rounded-lg text-neutral-400 hover:bg-warning-bg hover:text-warning-text transition-colors"
          title="Xo00f3a u0111u0103ng ku00fd thiu1ebft bu1ecb"
          aria-label={`Xu00f3a u0111u0103ng ku00fd thiu1ebft bu1ecb cu1ee7a ${employee.full_name}`}
        >
          <Smartphone className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

// u2500u2500 Columns u2500u2500
function buildColumns(): ColumnDef<Employee>[] {
  return [
    {
      accessorKey: 'employee_code',
      header: 'Mu00e3 NV',
      cell: ({ getValue }) => (
        <span className="font-mono text-xs text-neutral-600">
          {String(getValue())}
        </span>
      ),
      size: 90,
    },
    {
      accessorKey: 'full_name',
      header: 'Hu1ecd tu00ean',
      cell: ({ getValue }) => (
        <span className="font-medium text-neutral-950">{String(getValue())}</span>
      ),
      size: 180,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      size: 200,
    },
    {
      accessorKey: 'branch_name',
      header: 'Chi nhu00e1nh',
      cell: ({ getValue }) => (
        <span className="text-neutral-600 text-sm">
          {String(getValue() ?? 'u2014')}
        </span>
      ),
      size: 160,
    },
    {
      accessorKey: 'role',
      header: 'Vai tru00f2',
      cell: ({ getValue }) => <RoleBadge role={String(getValue())} />,
      size: 130,
    },
    {
      id: 'status',
      header: 'Tru1ea1ng thu00e1i',
      cell: ({ row }) => (
        <span
          className={cn(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
            row.original.is_active
              ? 'bg-success-bg text-success-text'
              : 'bg-neutral-100 text-neutral-500',
          )}
        >
          {row.original.is_active ? 'Hou1ea1t u0111u1ed9ng' : 'Vu00f4 hou1ea1t hu00f3a'}
        </span>
      ),
      size: 110,
    },
    {
      id: 'device',
      header: 'Thiu1ebft bu1ecb',
      cell: ({ row }) => (
        <span
          className={cn(
            'inline-flex items-center gap-1 text-xs',
            row.original.registered_device_id
              ? 'text-neutral-700'
              : 'text-neutral-400',
          )}
        >
          <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
          {row.original.registered_device_id ? 'u0110u00e3 u0111u0103ng ku00fd' : 'Chu01b0a u0111u0103ng ku00fd'}
        </span>
      ),
      size: 120,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => <EmployeeActions employee={row.original} />,
      size: 80,
    },
  ];
}

// u2500u2500 Page u2500u2500
export function EmployeeManagementPage(): JSX.Element {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<EmployeeFilters>({
    search: '',
    branch_id: '',
    role: undefined,
    is_active: undefined,
  });
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['employees', filters, page],
    queryFn: () =>
      fetchEmployees({ ...filters, page, per_page: PER_PAGE }),
    placeholderData: (prev) => prev,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-options'],
    queryFn: fetchBranches,
    staleTime: 300_000,
  });

  const columns = buildColumns();
  const table = useReactTable({
    data: data?.items ?? [],
    columns,
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
          <h1 className="text-h1">Nhu00e2n viu00ean</h1>
          <p className="text-body-sm mt-1">
            {data ? `${data.total.toLocaleString('vi-VN')} nhu00e2n viu00ean` : 'u0110ang tu1ea3i...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="btn-secondary"
          >
            <RefreshCw
              className={cn('w-4 h-4', isFetching && 'animate-spin')}
              aria-hidden="true"
            />
            Lu00e0m mu1edbi
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Tu1ea1o nhu00e2n viu00ean
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Tu00ecm nhu00e2n viu00ean..."
              className="input pl-8"
              value={filters.search ?? ''}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              aria-label="Tu00ecm kiu1ebfm"
            />
          </div>

          {/* Branch */}
          <select
            className="input"
            value={filters.branch_id ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, branch_id: e.target.value || undefined }))
            }
            aria-label="Chi nhu00e1nh"
          >
            <option value="">Tu1ea5t cu1ea3 chi nhu00e1nh</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Role */}
          <select
            className="input"
            value={filters.role ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({ ...prev, role: (e.target.value as UserRole) || undefined }))
            }
            aria-label="Vai tru00f2"
          >
            <option value="">Tu1ea5t cu1ea3 vai tru00f2</option>
            <option value="employee">Nhu00e2n viu00ean</option>
            <option value="branch_manager">Quu1ea3n lu00fd CN</option>
            <option value="hr">HR</option>
            <option value="super_admin">Super Admin</option>
          </select>

          {/* Status */}
          <select
            className="input"
            value={filters.is_active === undefined ? '' : String(filters.is_active)}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                is_active:
                  e.target.value === '' ? undefined : e.target.value === 'true',
              }))
            }
            aria-label="Tru1ea1ng thu00e1i"
          >
            <option value="">Tu1ea5t cu1ea3 tru1ea1ng thu00e1i</option>
            <option value="true">Hou1ea1t u0111u1ed9ng</option>
            <option value="false">Vu00f4 hou1ea1t hu00f3a</option>
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
                          onClick={header.column.getToggleSortingHandler() ?? ((_e: unknown) => {})}
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
                    {columns.map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="skeleton h-4 rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-16 text-center text-sm text-neutral-500"
                  >
                    Khu00f4ng cu00f3 nhu00e2n viu00ean nu00e0o
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-neutral-50 transition-colors"
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
            Hiu1ec3n thu1ecb{' '}
            <span className="font-medium text-neutral-700">
              {data
                ? `${(page - 1) * PER_PAGE + 1}u2013${Math.min(page * PER_PAGE, data.total)}`
                : '0'}
            </span>{' '}
            trong{' '}
            <span className="font-medium text-neutral-700">
              {data?.total.toLocaleString('vi-VN') ?? 0}
            </span>{' '}
            nhu00e2n viu00ean
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

      {/* Create dialog */}
      {isCreateOpen && (
        <CreateEmployeeDialog
          branches={branches}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </div>
  );
}
