import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, PlusCircle, RefreshCcw, Search } from 'lucide-react';
import {
  fetchUserAccessDirectory,
  formatApiError,
  provisionUserAccess,
  upsertExistingUserAccess,
} from '../shared/portal.api';
import type { AdminSnapshot, FranchiseListRow, UserAccessDirectoryRow } from '../shared/portal.types';

interface AdminAccessPanelProps {
  snapshot: AdminSnapshot;
}

type ScopeType = 'franchise' | 'regional' | 'network';
type ProfileStatus = 'active' | 'inactive' | 'invited';

function resolveAllowedScopes(roleCode: string): ScopeType[] {
  if (roleCode === 'system_admin') {
    return ['network'];
  }

  if (roleCode === 'franchise_user') {
    return ['franchise'];
  }

  if (roleCode === 'regional_manager') {
    return ['regional'];
  }

  return ['franchise', 'regional', 'network'];
}

function normalizeScope(roleCode: string, scopeType: ScopeType): ScopeType {
  const allowedScopes = resolveAllowedScopes(roleCode);
  return allowedScopes.includes(scopeType) ? scopeType : allowedScopes[0];
}

function getScopeLabel(scopeType: ScopeType | null) {
  switch (scopeType) {
    case 'franchise':
      return 'Coligada';
    case 'regional':
      return 'Regional';
    case 'network':
      return 'Rede';
    default:
      return 'Escopo pendente';
  }
}

function formatRegionalLabel(regional: AdminSnapshot['regionals'][number] | null) {
  if (!regional) {
    return 'Nao definida';
  }

  return `${regional.code} • ${regional.name}`;
}

function formatFranchiseLabel(franchise: FranchiseListRow | null) {
  if (!franchise) {
    return 'Nao definida';
  }

  return `${franchise.code} • ${franchise.trade_name}`;
}

function formatDirectoryTarget(row: UserAccessDirectoryRow) {
  if (row.scope_type === 'franchise' && row.franchise_code && row.franchise_name) {
    return `${row.franchise_code} • ${row.franchise_name}`;
  }

  if (row.scope_type === 'regional' && row.regional_code && row.regional_name) {
    return `${row.regional_code} • ${row.regional_name}`;
  }

  if (row.scope_type === 'network') {
    return 'Rede completa';
  }

  return 'Escopo nao configurado';
}

function includesQuery(value: string | null | undefined, normalizedQuery: string) {
  if (!normalizedQuery) {
    return true;
  }

  return (value ?? '').toLowerCase().includes(normalizedQuery);
}

export function AdminAccessPanel({ snapshot }: AdminAccessPanelProps) {
  const queryClient = useQueryClient();
  const directoryQuery = useQuery({
    queryKey: ['admin', 'user-access-directory'],
    queryFn: fetchUserAccessDirectory,
  });

  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [profileId, setProfileId] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [status, setStatus] = useState<ProfileStatus>('active');
  const [roleCode, setRoleCode] = useState('franchise_user');
  const [scopeType, setScopeType] = useState<ScopeType>('franchise');
  const [regionalId, setRegionalId] = useState('');
  const [franchiseId, setFranchiseId] = useState('');
  const [password, setPassword] = useState('');
  const [franchiseSearch, setFranchiseSearch] = useState('');
  const [directorySearch, setDirectorySearch] = useState('');

  const resolvedRoleCode = snapshot.roles.some((role) => role.code === roleCode)
    ? roleCode
    : snapshot.roles[0]?.code ?? 'franchise_user';
  const allowedScopes = resolveAllowedScopes(resolvedRoleCode);
  const effectiveScopeType = normalizeScope(resolvedRoleCode, scopeType);
  const selectedRegional = snapshot.regionals.find((regional) => regional.id === regionalId) ?? null;
  const selectedFranchise = snapshot.franchises.find((franchise) => franchise.id === franchiseId) ?? null;
  const roleLabel = snapshot.roles.find((role) => role.code === resolvedRoleCode)?.name ?? resolvedRoleCode;
  const normalizedFranchiseSearch = franchiseSearch.trim().toLowerCase();
  const normalizedDirectorySearch = directorySearch.trim().toLowerCase();

  const visibleFranchises = useMemo(
    () =>
      snapshot.franchises.filter((franchise) => {
        const matchesRegional = !regionalId || franchise.regional_id === regionalId;

        const matchesSearch =
          !normalizedFranchiseSearch ||
          includesQuery(franchise.code, normalizedFranchiseSearch) ||
          includesQuery(franchise.trade_name, normalizedFranchiseSearch) ||
          includesQuery(franchise.city, normalizedFranchiseSearch) ||
          includesQuery(franchise.state, normalizedFranchiseSearch);

        return matchesRegional && matchesSearch;
      }),
    [normalizedFranchiseSearch, regionalId, snapshot.franchises],
  );

  const filteredDirectory = useMemo(() => {
    const rows = directoryQuery.data ?? [];

    if (!normalizedDirectorySearch) {
      return rows;
    }

    return rows.filter((row) =>
      [
        row.full_name,
        row.email,
        row.role_name,
        row.role_code,
        row.scope_type,
        row.franchise_code,
        row.franchise_name,
        row.regional_code,
        row.regional_name,
      ].some((value) => includesQuery(value, normalizedDirectorySearch)),
    );
  }, [directoryQuery.data, normalizedDirectorySearch]);

  const selectableFranchises = useMemo(() => {
    if (!selectedFranchise) {
      return visibleFranchises;
    }

    return visibleFranchises.some((franchise) => franchise.id === selectedFranchise.id)
      ? visibleFranchises
      : [selectedFranchise, ...visibleFranchises];
  }, [selectedFranchise, visibleFranchises]);

  const clearForm = () => {
    setMode('create');
    setProfileId('');
    setEmail('');
    setFullName('');
    setStatus('active');
    setRoleCode('franchise_user');
    setScopeType('franchise');
    setRegionalId('');
    setFranchiseId('');
    setPassword('');
    setFranchiseSearch('');
  };

  const editUser = (row: UserAccessDirectoryRow) => {
    setMode('edit');
    setProfileId(row.profile_id);
    setEmail(row.email);
    setFullName(row.full_name);
    setStatus((row.profile_status as ProfileStatus) ?? 'active');
    setRoleCode(row.role_code ?? 'viewer');
    setScopeType((row.scope_type as ScopeType) ?? 'network');
    setRegionalId(row.regional_id ?? '');
    setFranchiseId(row.franchise_id ?? '');
    setPassword('');
    setFranchiseSearch('');
  };

  const refreshAccessData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['admin-snapshot'] }),
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-access-directory'] }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      provisionUserAccess({
        email,
        fullName,
        password: password || null,
        status,
        roleCode: resolvedRoleCode,
        scopeType: effectiveScopeType,
        franchiseId: effectiveScopeType === 'franchise' ? franchiseId || null : null,
        regionalId: effectiveScopeType === 'regional' ? regionalId || null : null,
      }),
    onSuccess: async () => {
      clearForm();
      await refreshAccessData();
    },
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      upsertExistingUserAccess({
        profileId,
        fullName,
        status,
        roleCode: resolvedRoleCode,
        scopeType: effectiveScopeType,
        franchiseId: effectiveScopeType === 'franchise' ? franchiseId || null : null,
        regionalId: effectiveScopeType === 'regional' ? regionalId || null : null,
      }),
    onSuccess: async () => {
      clearForm();
      await refreshAccessData();
    },
  });

  const formError = createMutation.error
    ? formatApiError(createMutation.error, 'Nao foi possivel criar o acesso.')
    : updateMutation.error
      ? formatApiError(updateMutation.error, 'Nao foi possivel atualizar o acesso.')
      : null;

  const isScopeIncomplete =
    (effectiveScopeType === 'regional' && !regionalId) ||
    (effectiveScopeType === 'franchise' && !franchiseId);

  const isSubmitDisabled =
    !fullName.trim() ||
    (mode === 'create' && !email.trim()) ||
    isScopeIncomplete ||
    createMutation.isPending ||
    updateMutation.isPending;

  const scopePreviewText =
    effectiveScopeType === 'network'
      ? 'Este usuario ficara com alcance de rede inteira, sujeito apenas ao papel configurado.'
      : effectiveScopeType === 'regional'
        ? selectedRegional
          ? `Este usuario vera apenas as coligadas da regional ${formatRegionalLabel(selectedRegional)}.`
          : 'Selecione a regional para concluir o escopo de leitura e operacao.'
        : selectedFranchise
          ? `Este usuario vera somente a coligada ${formatFranchiseLabel(selectedFranchise)}. Todo o restante da rede continuara oculto.`
          : 'Selecione a unidade pelo codigo da coligada para concluir a liberacao do acesso.';

  return (
    <div className="page-grid page-grid--wide">
      <div className="card">
        <div className="card__header">
          <div>
            <h3 className="card__title">Gestao de acessos</h3>
            <p className="card__subtitle">
              O admin define papel, escopo e codigo da coligada para liberar apenas o dado correto.
            </p>
          </div>
        </div>

        <div className="card__body">
          {formError && <div className="inline-message inline-message--danger">{formError}</div>}
          {(createMutation.data?.message || updateMutation.data?.message) && (
            <div className="inline-message inline-message--success">
              {createMutation.data?.message ?? updateMutation.data?.message}
            </div>
          )}

          <div className="admin-access__toolbar">
            <p className="admin-access__hint">
              Para esta fase, o codigo da coligada exibido aqui e o campo <code>franchises.code</code>.
            </p>
            <span className="admin-access__count" data-testid="admin-access-mode">
              {mode === 'create' ? 'Novo acesso' : 'Edicao de acesso'}
            </span>
          </div>

          <div className="admin-access__form-grid">
            <label className="form-group">
              <span className="form-label">Nome completo</span>
              <input
                className="form-input"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                data-testid="admin-access-full-name"
              />
            </label>

            <label className="form-group">
              <span className="form-label">E-mail</span>
              <input
                className="form-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={mode === 'edit'}
                data-testid="admin-access-email"
              />
            </label>

            <label className="form-group">
              <span className="form-label">Perfil</span>
              <select
                className="form-select"
                value={roleCode}
                onChange={(event) => {
                  const nextRoleCode = event.target.value;
                  const nextAllowedScopes = resolveAllowedScopes(nextRoleCode);
                  setRoleCode(nextRoleCode);
                  setScopeType(nextAllowedScopes[0]);

                  if (nextAllowedScopes[0] !== 'regional') {
                    setRegionalId('');
                  }

                  if (nextAllowedScopes[0] !== 'franchise') {
                    setFranchiseId('');
                    setFranchiseSearch('');
                  }

                  if (nextRoleCode === 'system_admin') {
                    setRegionalId('');
                    setFranchiseId('');
                    setFranchiseSearch('');
                  }
                }}
                data-testid="admin-access-role"
              >
                {snapshot.roles.map((role) => (
                  <option key={role.id} value={role.code}>
                    {role.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-group">
              <span className="form-label">Status</span>
              <select
                className="form-select"
                value={status}
                onChange={(event) => setStatus(event.target.value as ProfileStatus)}
                data-testid="admin-access-status"
              >
                <option value="active">Ativo</option>
                <option value="invited">Convidado</option>
                <option value="inactive">Inativo</option>
              </select>
            </label>

            <label className="form-group">
              <span className="form-label">Escopo</span>
              <select
                className="form-select"
                value={effectiveScopeType}
                onChange={(event) => {
                  const nextScopeType = event.target.value as ScopeType;
                  setScopeType(nextScopeType);

                  if (nextScopeType === 'network') {
                    setRegionalId('');
                    setFranchiseId('');
                    setFranchiseSearch('');
                  }

                  if (nextScopeType === 'regional') {
                    setFranchiseId('');
                    setFranchiseSearch('');
                  }
                }}
                disabled={allowedScopes.length === 1}
                data-testid="admin-access-scope"
              >
                {allowedScopes.map((allowedScope) => (
                  <option key={allowedScope} value={allowedScope}>
                    {getScopeLabel(allowedScope)}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-group">
              <span className="form-label">Senha provisoria</span>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={mode === 'create' ? 'Opcional para acesso imediato' : 'Opcional para redefinir senha'}
                data-testid="admin-access-password"
              />
            </label>

            {effectiveScopeType === 'regional' && (
              <label className="form-group">
                <span className="form-label">Regional</span>
                <select
                  className="form-select"
                  value={regionalId}
                  onChange={(event) => setRegionalId(event.target.value)}
                  data-testid="admin-access-regional-select"
                >
                  <option value="">Selecione</option>
                  {snapshot.regionals.map((regional) => (
                    <option key={regional.id} value={regional.id}>
                      {formatRegionalLabel(regional)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {effectiveScopeType === 'franchise' && (
              <>
                <label className="form-group">
                  <span className="form-label">Regional filtro</span>
                  <select
                    className="form-select"
                    value={regionalId}
                    onChange={(event) => {
                      const nextRegionalId = event.target.value;
                      setRegionalId(nextRegionalId);

                      if (
                        franchiseId &&
                        !snapshot.franchises.some(
                          (franchise) =>
                            franchise.id === franchiseId &&
                            (!nextRegionalId || franchise.regional_id === nextRegionalId),
                        )
                      ) {
                        setFranchiseId('');
                      }
                    }}
                    data-testid="admin-access-regional-filter"
                  >
                    <option value="">Todas</option>
                    {snapshot.regionals.map((regional) => (
                      <option key={regional.id} value={regional.id}>
                        {formatRegionalLabel(regional)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form-group">
                  <span className="form-label">Buscar coligada</span>
                  <div className="admin-access__search">
                    <Search size={16} />
                    <input
                      className="form-input"
                      value={franchiseSearch}
                      onChange={(event) => setFranchiseSearch(event.target.value)}
                      placeholder="Codigo ou nome da unidade"
                      data-testid="admin-access-franchise-search"
                    />
                  </div>
                </label>

                <label className="form-group admin-access__form-group--wide">
                  <span className="form-label">Unidade / codigo da coligada</span>
                  <select
                    className="form-select"
                    value={franchiseId}
                    onChange={(event) => setFranchiseId(event.target.value)}
                    data-testid="admin-access-franchise-select"
                  >
                    <option value="">Selecione</option>
                    {selectableFranchises.map((franchise) => (
                      <option key={franchise.id} value={franchise.id}>
                        {formatFranchiseLabel(franchise)}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
          </div>

          <div className="admin-access__summary" data-testid="admin-access-summary">
            <div className="admin-access__summary-grid">
              <div className="admin-access__summary-item">
                <span className="admin-access__summary-label">Papel</span>
                <strong className="admin-access__summary-value">{roleLabel}</strong>
              </div>
              <div className="admin-access__summary-item">
                <span className="admin-access__summary-label">Escopo</span>
                <strong className="admin-access__summary-value">{getScopeLabel(effectiveScopeType)}</strong>
              </div>
              <div className="admin-access__summary-item">
                <span className="admin-access__summary-label">Regional efetiva</span>
                <strong className="admin-access__summary-value">
                  {effectiveScopeType === 'network'
                    ? 'Rede completa'
                    : formatRegionalLabel(selectedRegional)}
                </strong>
              </div>
              <div className="admin-access__summary-item">
                <span className="admin-access__summary-label">Coligada efetiva</span>
                <strong className="admin-access__summary-value">
                  {effectiveScopeType === 'franchise'
                    ? formatFranchiseLabel(selectedFranchise)
                    : 'Nao se aplica'}
                </strong>
              </div>
            </div>
            <p className="admin-access__summary-text">{scopePreviewText}</p>
            {allowedScopes.length === 1 && (
              <p className="admin-access__summary-text">
                Este perfil opera somente em escopo de {getScopeLabel(allowedScopes[0]).toLowerCase()}.
              </p>
            )}
          </div>
        </div>

        <div className="card__footer">
          <button type="button" className="btn btn--ghost" onClick={clearForm}>
            <RefreshCcw size={18} aria-hidden />
            Limpar formulario
          </button>
          <button
            type="button"
            className="btn btn--gold"
            onClick={() => (mode === 'create' ? createMutation.mutate() : updateMutation.mutate())}
            disabled={isSubmitDisabled}
            data-testid="admin-access-submit"
          >
            {mode === 'create' ? <PlusCircle size={18} aria-hidden /> : <KeyRound size={18} aria-hidden />}
            {mode === 'create'
              ? createMutation.isPending
                ? 'Criando acesso...'
                : 'Criar acesso'
              : updateMutation.isPending
                ? 'Salvando...'
                : 'Salvar atualizacao'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card__header">
          <div>
            <h3 className="card__title">Diretorio atual</h3>
            <p className="card__subtitle">
              Clique em um usuario para editar o papel, a regional e a coligada visivel.
            </p>
          </div>
        </div>

        <div className="card__body card__body--compact">
          <div className="admin-access__directory-toolbar">
            <div className="admin-access__search">
              <Search size={16} />
              <input
                className="form-input"
                value={directorySearch}
                onChange={(event) => setDirectorySearch(event.target.value)}
                placeholder="Buscar por nome, email, papel ou codigo"
                data-testid="admin-access-directory-search"
              />
            </div>
            <span className="admin-access__count" data-testid="admin-access-directory-count">
              {filteredDirectory.length} acesso(s) encontrado(s)
            </span>
          </div>

          {directoryQuery.isLoading ? (
            <div className="skeleton skeleton--card" />
          ) : directoryQuery.error || !directoryQuery.data ? (
            <div className="inline-message inline-message--danger">
              Nao foi possivel carregar o diretorio de acessos.
            </div>
          ) : (
            <div className="list-stack">
              {filteredDirectory.map((row) => (
                <button
                  key={row.profile_id}
                  type="button"
                  className="admin-access__row"
                  onClick={() => editUser(row)}
                  data-testid={`admin-access-row-${row.profile_id}`}
                >
                  <div>
                    <div className="list-row__title">{row.full_name || row.email}</div>
                    <div className="list-row__meta">{row.email}</div>
                    <div className="list-row__meta">
                      {row.role_name ?? 'Sem papel'} • {getScopeLabel(row.scope_type)}
                    </div>
                    <div className="list-row__meta">{formatDirectoryTarget(row)}</div>
                  </div>
                  <div className="list-row__value">
                    <div className="list-row__meta">{row.profile_status}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
