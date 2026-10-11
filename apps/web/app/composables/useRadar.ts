export interface Organization {
  id: string;
  name: string;
  role: string;
  cnpj: string | null;
}
export interface Procurement {
  id: string;
  title: string;
  agency: string;
  agencyState: string;
  agencyMunicipality: string;
  status: string;
  publishedAt: string;
  deadline: string | null;
  estimatedValue: string | null;
  officialUrl: string;
  sourceId: string;
  executionState: string | null;
  version: number;
}
export function useRadar() {
  const organizationCookie = useCookie<string | null>('radar-organization', { sameSite: 'lax' });
  const selected = useState<string | null>('active-organization', () => organizationCookie.value || null);
  const activeOrganization = computed({ get: () => selected.value, set: (id: string | null) => { selected.value = id; organizationCookie.value = id; } });
  const organizations = useState<Organization[]>('organizations', () => []);
  const request = useRequestFetch();
  function api<T>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: unknown;
      query?: Record<string, string | number | undefined>;
    } = {},
  ) {
    return request(`/api/backend/${path}`, {
      ...options,
      body: options.body as Record<string, unknown> | undefined,
      headers: activeOrganization.value ? { 'x-organization-id': activeOrganization.value } : {},
    }) as Promise<T>;
  }
  async function loadOrganizations() {
    organizations.value = await api<Organization[]>('organizations');
    if (!organizations.value.some((o) => o.id === activeOrganization.value))
      activeOrganization.value = organizations.value[0]?.id || null;
  }
  return {
    api,
    organizations,
    activeOrganization,
    loadOrganizations,
    organization: computed(() =>
      organizations.value.find((o) => o.id === activeOrganization.value),
    ),
  };
}
export function formatMoney(value: string | null) {
  return value == null
    ? 'Valor não informado'
    : Number(value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      });
}
export function formatDate(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    : 'Não informado';
}
export function errorMessage(error: unknown) {
  const value = error as { data?: { message?: string }; message?: string };
  return value.data?.message || value.message || 'Não foi possível concluir. Tente novamente.';
}
