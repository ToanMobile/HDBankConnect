import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Trash2,
  Search,
  Building2,
  Save,
  ToggleLeft,
  ToggleRight,
  Wifi,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Branch, CreateBranchDto } from '@/types';

// u2500u2500 Schema u2500u2500
const branchSchema = z.object({
  code: z.string().min(1, 'Mu00e3 chi nhu00e1nh khu00f4ng u0111u01b0u1ee3c u0111u1ec3 tru1ed1ng'),
  name: z.string().min(1, 'Tu00ean chi nhu00e1nh khu00f4ng u0111u01b0u1ee3c u0111u1ec3 tru1ed1ng'),
  address: z.string().min(1, 'u0110u1ecba chu1ec9 khu00f4ng u0111u01b0u1ee3c u0111u1ec3 tru1ed1ng'),
  latitude: z
    .number({ invalid_type_error: 'Vu0129 u0111u1ed9 khu00f4ng hu1ee3p lu1ec7' })
    .min(-90, 'Vu0129 u0111u1ed9 tu1ed1i thiu1ec3u -90')
    .max(90, 'Vu0129 u0111u1ed9 tu1ed1i u0111a 90'),
  longitude: z
    .number({ invalid_type_error: 'Kinh u0111u1ed9 khu00f4ng hu1ee3p lu1ec7' })
    .min(-180, 'Kinh u0111u1ed9 tu1ed1i thiu1ec3u -180')
    .max(180, 'Kinh u0111u1ed9 tu1ed1i u0111a 180'),
  radius_meters: z
    .number({ invalid_type_error: 'Bu00e1n ku00ednh khu00f4ng hu1ee3p lu1ec7' })
    .min(10, 'Bu00e1n ku00ednh tu1ed1i thiu1ec3u 10m')
    .max(5000, 'Bu00e1n ku00ednh tu1ed1i u0111a 5000m'),
  wifi_bssids: z.array(
    z.object({
      value: z
        .string()
        .regex(
          /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
          'BSSID khu00f4ng u0111u00fang u0111u1ecbnh du1ea1ng (VD: AA:BB:CC:DD:EE:FF)',
        ),
    }),
  ),
  telegram_chat_id: z.string().optional(),
  is_active: z.boolean(),
});

type BranchFormData = z.infer<typeof branchSchema>;

// u2500u2500 API helpers u2500u2500
async function fetchBranches(): Promise<Branch[]> {
  const { data } = await api.get<{ data: { items: Branch[] } }>('/branches', {
    params: { per_page: 200 },
  });
  return data.data.items;
}

async function createBranch(dto: CreateBranchDto): Promise<Branch> {
  const { data } = await api.post<{ data: Branch }>('/branches', dto);
  return data.data;
}

async function updateBranch(id: string, dto: Partial<CreateBranchDto>): Promise<Branch> {
  const { data } = await api.put<{ data: Branch }>(`/branches/${id}`, dto);
  return data.data;
}

// u2500u2500 Branch list item u2500u2500
function BranchListItem({
  branch,
  isSelected,
  onClick,
}: {
  branch: Branch;
  isSelected: boolean;
  onClick: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 border-b border-neutral-100 hover:bg-neutral-50 transition-colors',
        isSelected && 'bg-primary-50 border-l-[3px] border-l-primary-500',
      )}
      aria-current={isSelected ? 'true' : undefined}
    >
      <div className="flex items-center gap-3">
        <Building2
          className={cn(
            'w-4 h-4 shrink-0',
            isSelected ? 'text-primary-600' : 'text-neutral-400',
          )}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p
            className={cn(
              'text-sm font-medium truncate',
              isSelected ? 'text-primary-700' : 'text-neutral-950',
            )}
          >
            {branch.name}
          </p>
          <p className="text-xs text-neutral-500 truncate">{branch.code}</p>
        </div>
      </div>
      {!branch.is_active && (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-neutral-100 text-neutral-500 mt-1.5">
          Khu00f4ng hou1ea1t u0111u1ed9ng
        </span>
      )}
    </button>
  );
}

// u2500u2500 Branch form u2500u2500
function BranchForm({
  branch,
  onSuccess,
}: {
  branch: Branch | null;
  onSuccess: () => void;
}): JSX.Element {
  const queryClient = useQueryClient();
  const isNew = !branch;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      code: branch?.code ?? '',
      name: branch?.name ?? '',
      address: branch?.address ?? '',
      latitude: branch?.latitude ?? 10.7769,
      longitude: branch?.longitude ?? 106.7009,
      radius_meters: branch?.radius_meters ?? 100,
      wifi_bssids: (branch?.wifi_bssids ?? ['']).map((v) => ({ value: v })),
      telegram_chat_id: branch?.telegram_chat_id ?? '',
      is_active: branch?.is_active ?? true,
    },
  });

  // Reset when branch changes
  useEffect(() => {
    reset({
      code: branch?.code ?? '',
      name: branch?.name ?? '',
      address: branch?.address ?? '',
      latitude: branch?.latitude ?? 10.7769,
      longitude: branch?.longitude ?? 106.7009,
      radius_meters: branch?.radius_meters ?? 100,
      wifi_bssids: (branch?.wifi_bssids ?? ['']).map((v) => ({ value: v })),
      telegram_chat_id: branch?.telegram_chat_id ?? '',
      is_active: branch?.is_active ?? true,
    });
  }, [branch, reset]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'wifi_bssids',
  });

  const isActive = watch('is_active');
  const radiusValue = watch('radius_meters');

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: BranchFormData) => {
      const dto: CreateBranchDto = {
        ...data,
        wifi_bssids: data.wifi_bssids
          .map((b) => b.value.trim().toUpperCase())
          .filter(Boolean),
        telegram_chat_id: data.telegram_chat_id || undefined,
      };
      if (isNew) return createBranch(dto);
      return updateBranch(branch.id, dto);
    },
    onSuccess: () => {
      toast.success(
        isNew ? 'Tu1ea1o chi nhu00e1nh thu00e0nh cu00f4ng!' : 'Cu1eadp nhu1eadt thu00e0nh cu00f4ng!',
      );
      void queryClient.invalidateQueries({ queryKey: ['branches'] });
      onSuccess();
    },
    onError: () => {
      toast.error('Lu01b0u thu1ea5t bu1ea1i. Vui lu00f2ng thu1eed lu1ea1i.');
    },
  });

  function onSubmit(data: BranchFormData): void {
    mutate(data);
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 shrink-0">
        <h2 className="text-h3">
          {isNew ? 'Tu1ea1o chi nhu00e1nh mu1edbi' : 'Chu1ec9nh su1eeda chi nhu00e1nh'}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setValue('is_active', !isActive, { shouldDirty: true })
            }
            className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
            aria-label={isActive ? 'u0110ang hou1ea1t u0111u1ed9ng' : 'Khu00f4ng hou1ea1t u0111u1ed9ng'}
          >
            {isActive ? (
              <ToggleRight
                className="w-5 h-5 text-success-base"
                aria-hidden="true"
              />
            ) : (
              <ToggleLeft className="w-5 h-5 text-neutral-400" aria-hidden="true" />
            )}
            {isActive ? 'Hou1ea1t u0111u1ed9ng' : 'Khu00f4ng hou1ea1t u0111u1ed9ng'}
          </button>
        </div>
      </div>

      {/* Form fields */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          {/* Code */}
          <div>
            <label htmlFor="code" className="label">
              Mu00e3 chi nhu00e1nh <span className="text-danger-base">*</span>
            </label>
            <input
              id="code"
              type="text"
              className={cn('input', errors.code && 'ring-2 ring-danger-base')}
              placeholder="Q1-001"
              {...register('code')}
            />
            {errors.code && (
              <p className="field-error">{errors.code.message}</p>
            )}
          </div>

          {/* Name */}
          <div>
            <label htmlFor="name" className="label">
              Tu00ean chi nhu00e1nh <span className="text-danger-base">*</span>
            </label>
            <input
              id="name"
              type="text"
              className={cn('input', errors.name && 'ring-2 ring-danger-base')}
              placeholder="HDB Chi nhu00e1nh Quu1eadn 1"
              {...register('name')}
            />
            {errors.name && (
              <p className="field-error">{errors.name.message}</p>
            )}
          </div>
        </div>

        {/* Address */}
        <div>
          <label htmlFor="address" className="label">
            u0110u1ecba chu1ec9 <span className="text-danger-base">*</span>
          </label>
          <input
            id="address"
            type="text"
            className={cn('input', errors.address && 'ring-2 ring-danger-base')}
            placeholder="123 Nguyu1ec5n Huu1ec7 Hu1ed1 Cu00f4ng Minh, Quu1eadn 1"
            {...register('address')}
          />
          {errors.address && (
            <p className="field-error">{errors.address.message}</p>
          )}
        </div>

        {/* GPS Coordinates */}
        <div>
          <p className="label mb-2">Tu1ecda u0111u1ed9 GPS</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="latitude" className="label text-xs">
                Vu0129 u0111u1ed9 (Latitude) <span className="text-danger-base">*</span>
              </label>
              <input
                id="latitude"
                type="number"
                step="any"
                className={cn(
                  'input font-mono',
                  errors.latitude && 'ring-2 ring-danger-base',
                )}
                placeholder="10.776900"
                {...register('latitude', { valueAsNumber: true })}
              />
              {errors.latitude && (
                <p className="field-error">{errors.latitude.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="longitude" className="label text-xs">
                Kinh u0111u1ed9 (Longitude) <span className="text-danger-base">*</span>
              </label>
              <input
                id="longitude"
                type="number"
                step="any"
                className={cn(
                  'input font-mono',
                  errors.longitude && 'ring-2 ring-danger-base',
                )}
                placeholder="106.700900"
                {...register('longitude', { valueAsNumber: true })}
              />
              {errors.longitude && (
                <p className="field-error">{errors.longitude.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Radius */}
        <div>
          <label htmlFor="radius_meters" className="label">
            Bu00e1n ku00ednh Geofence:{' '}
            <span className="font-mono text-primary-600">{radiusValue}m</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              id="radius_meters"
              type="range"
              min={10}
              max={1000}
              step={10}
              className="flex-1 accent-primary-500"
              {...register('radius_meters', { valueAsNumber: true })}
            />
            <input
              type="number"
              min={10}
              max={5000}
              className="input w-24 font-mono"
              {...register('radius_meters', { valueAsNumber: true })}
              aria-label="Bu00e1n ku00ednh (mu00e9t)"
            />
          </div>
          {errors.radius_meters && (
            <p className="field-error">{errors.radius_meters.message}</p>
          )}
        </div>

        {/* WiFi BSSIDs */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">
              <Wifi
                className="inline-block w-4 h-4 mr-1 text-neutral-500"
                aria-hidden="true"
              />
              Danh su00e1ch WiFi BSSID
            </label>
            <button
              type="button"
              onClick={() => append({ value: '' })}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              Thu00eam BSSID
            </button>
          </div>

          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-start gap-2">
                <input
                  type="text"
                  className={cn(
                    'input flex-1 font-mono uppercase',
                    errors.wifi_bssids?.[index]?.value &&
                      'ring-2 ring-danger-base',
                  )}
                  placeholder="AA:BB:CC:DD:EE:FF"
                  {...register(`wifi_bssids.${index}.value`)}
                />
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="p-2 text-neutral-400 hover:text-danger-base transition-colors mt-0.5"
                    aria-label={`Xu00f3a BSSID ${index + 1}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
            {errors.wifi_bssids && (
              <p className="field-error">
                {errors.wifi_bssids.root?.message ?? 'Vui lu00f2ng kiu1ec3m tra BSSID'}
              </p>
            )}
          </div>
        </div>

        {/* Telegram chat ID */}
        <div>
          <label htmlFor="telegram_chat_id" className="label">
            Telegram Chat ID
            <span className="ml-1 text-xs text-neutral-400 font-normal">
              (tu00f9y chu1ecdn)
            </span>
          </label>
          <input
            id="telegram_chat_id"
            type="text"
            className="input font-mono"
            placeholder="-100xxxxxxxxxx"
            {...register('telegram_chat_id')}
          />
        </div>
      </div>

      {/* Footer: save button */}
      <div className="px-6 py-4 border-t border-neutral-200 shrink-0">
        <button
          type="submit"
          disabled={isPending || (!isDirty && !isNew)}
          className="btn-primary w-full"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              u0110ang lu01b0u...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="w-4 h-4" aria-hidden="true" />
              {isNew ? 'Tu1ea1o chi nhu00e1nh' : 'Lu01b0u thu00e0y u0111u1ed5i'}
            </span>
          )}
        </button>
      </div>
    </form>
  );
}

// u2500u2500 Page u2500u2500
export function BranchConfigPage(): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
  });

  const filteredBranches = branches.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.code.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedBranch = branches.find((b) => b.id === selectedId) ?? null;
  const showForm = isCreating || selectedBranch;

  function handleSelect(id: string): void {
    setSelectedId(id);
    setIsCreating(false);
  }

  function handleNew(): void {
    setSelectedId(null);
    setIsCreating(true);
  }

  function handleSuccess(): void {
    if (isCreating) {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="text-h1">Cu1ea5u hu00ecnh chi nhu00e1nh</h1>
        <button type="button" onClick={handleNew} className="btn-primary">
          <Plus className="w-4 h-4" aria-hidden="true" />
          Tu1ea1o mu1edbi
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-180px)]">
        {/* Left: branch list */}
        <div className="card overflow-hidden flex flex-col">
          <div className="p-3 border-b border-neutral-200 shrink-0">
            <div className="relative">
              <Search
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Tu00ecm chi nhu00e1nh..."
                className="input pl-8 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Tu00ecm kiu1ebfm chi nhu00e1nh"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="skeleton h-12 rounded" />
                ))}
              </div>
            ) : filteredBranches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Building2
                  className="w-8 h-8 text-neutral-300 mb-2"
                  aria-hidden="true"
                />
                <p className="text-sm text-neutral-500 text-center">
                  {search ? 'Khu00f4ng tu00ecm thu1ea5y' : 'Chu01b0a cu00f3 chi nhu00e1nh'}
                </p>
              </div>
            ) : (
              filteredBranches.map((b) => (
                <BranchListItem
                  key={b.id}
                  branch={b}
                  isSelected={b.id === selectedId}
                  onClick={() => handleSelect(b.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: form */}
        <div className="card overflow-hidden">
          {showForm ? (
            <BranchForm
              branch={isCreating ? null : selectedBranch}
              onSuccess={handleSuccess}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <Building2
                className="w-12 h-12 text-neutral-200 mb-4"
                aria-hidden="true"
              />
              <p className="text-neutral-500 text-sm">
                Chu1ecdn chu1ecdn hu00e0ng bu00ean tru00e1i u0111u1ec3 xu00e3i
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
