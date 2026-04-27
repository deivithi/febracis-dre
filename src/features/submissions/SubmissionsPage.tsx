import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, FolderSync, PencilLine, Send } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useAccessProfile } from '../auth/useAccessProfile';
import {
  appendAgentMessage,
  ensureSubmissionVersion,
  fetchAccessibleFranchises,
  fetchAgentMessages,
  fetchCurrentSubmissions,
  fetchEventsForSelection,
  fetchReportingPeriods,
  fetchSubmissionWorkspace,
  formatApiError,
  getOrCreateAgentSession,
  saveSubmissionInputs,
  submitSubmission,
  updateAgentSessionState,
} from '../shared/portal.api';
import { DreAssistantPanel } from './DreAssistantPanel';
import { DreStatementTable } from './DreStatementTable';
import { resolveAssistantInteractionMode } from './agentPermissions';
import {
  buildQuestionForLine,
  findNextGuidedLine,
  getFieldGuide,
  parseFlowCheckpointFromState,
  stripInternalLineCodesFromUserText,
  type DreAssistantTurnResult,
} from './dreAssistant';
import { buildDraftStatementRows, resolveStatementRows } from './dreStatementModel';
import { calculateDrePreview } from './drePreview';
import { invalidateSubmissionRelatedQueries } from './submissionQuerySync';
import {
  isEditableSubmissionStatus,
  isLockedSubmissionStatus,
} from './submissionStatus';
import { validateDraftInputs } from './submissionValidation';
import {
  formatCurrency,
  formatDateTime,
  formatInteger,
  formatPeriodLabel,
  formatStatusLabel,
  getStatusVariant,
  toNumber,
} from '../../utils/formatters';
import './SubmissionsPage.css';

const currencyInputFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const ASSISTANT_FETCH_TIMEOUT_MS = 55_000;

function parseCurrencyInput(rawValue: string) {
  const normalized = rawValue.replace(/\s/g, '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrencyInput(value: unknown) {
  const numberValue = toNumber(value);
  return numberValue ? currencyInputFormatter.format(numberValue) : '';
}

function readSessionStateString(state: Record<string, unknown> | undefined, key: string) {
  const value = state?.[key];
  return typeof value === 'string' ? value : null;
}

export function SubmissionsPage() {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const accessProfileQuery = useAccessProfile();
  const [selectedFranchiseId, setSelectedFranchiseId] = useState('');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [submissionFocusId, setSubmissionFocusId] = useState<string | null>(null);
  const [editingSubmissionId, setEditingSubmissionId] = useState<string | null>(null);
  const [lineValues, setLineValues] = useState<Record<string, string>>({});
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [assistantDraft, setAssistantDraft] = useState('');
  const [mobileWorkspaceTab, setMobileWorkspaceTab] = useState<'chat' | 'panel' | 'dre'>('chat');
  const access = accessProfileQuery.data ?? null;

  const franchisesQuery = useQuery({
    queryKey: ['franchises', access?.franchiseIds.join(',') ?? 'all-franchises', access?.regionalIds.join(',') ?? 'all-regionals'],
    queryFn: () => fetchAccessibleFranchises(access!),
    enabled: Boolean(access),
  });

  const periodsQuery = useQuery({ queryKey: ['reporting-periods'], queryFn: fetchReportingPeriods });

  const submissionsQuery = useQuery({
    queryKey: ['submissions', access?.franchiseIds.join(',') ?? 'all-franchises', access?.regionalIds.join(',') ?? 'all-regionals'],
    queryFn: () => fetchCurrentSubmissions(access!),
    enabled: Boolean(access),
  });

  const resolvedFranchiseId = selectedFranchiseId || franchisesQuery.data?.[0]?.id || '';
  const defaultPeriod = periodsQuery.data?.find((period) => period.status === 'open' || period.status === 'reopened') ?? periodsQuery.data?.[0] ?? null;
  const resolvedPeriodId = selectedPeriodId || defaultPeriod?.id || '';

  const eventsQuery = useQuery({
    queryKey: ['events', resolvedFranchiseId || 'no-franchise', resolvedPeriodId || 'no-period'],
    queryFn: () => fetchEventsForSelection(resolvedFranchiseId, resolvedPeriodId),
    enabled: Boolean(resolvedFranchiseId && resolvedPeriodId),
  });

  const currentSubmission = useMemo(() => {
    if (!submissionsQuery.data || !resolvedFranchiseId || !resolvedPeriodId) return null;
    return submissionsQuery.data.find((row) => row.franchise_id === resolvedFranchiseId && row.reporting_period_id === resolvedPeriodId) ?? null;
  }, [resolvedFranchiseId, resolvedPeriodId, submissionsQuery.data]);

  const activeSubmissionId = submissionFocusId ?? currentSubmission?.submission_id ?? null;

  const workspaceQuery = useQuery({
    queryKey: ['submission-workspace', activeSubmissionId],
    queryFn: () => fetchSubmissionWorkspace(activeSubmissionId!),
    enabled: Boolean(activeSubmissionId),
  });

  const agentSessionQuery = useQuery({
    queryKey: ['agent-session', activeSubmissionId ?? 'no-submission', resolvedFranchiseId || 'no-franchise', resolvedPeriodId || 'no-period'],
    queryFn: () => getOrCreateAgentSession(activeSubmissionId!, resolvedFranchiseId, resolvedPeriodId),
    enabled: Boolean(activeSubmissionId && resolvedFranchiseId && resolvedPeriodId),
  });

  const agentMessagesQuery = useQuery({
    queryKey: ['agent-messages', agentSessionQuery.data?.id ?? 'no-session'],
    queryFn: () => fetchAgentMessages(agentSessionQuery.data!.id),
    enabled: Boolean(agentSessionQuery.data?.id),
  });

  useEffect(() => {
    queueMicrotask(() => {
      setMobileWorkspaceTab('chat');
    });
  }, [resolvedFranchiseId, resolvedPeriodId]);

  const canEdit = access?.canOperateSubmission ?? false;
  const selectedFranchise = franchisesQuery.data?.find((franchise) => franchise.id === resolvedFranchiseId) ?? null;
  const selectedPeriod = periodsQuery.data?.find((period) => period.id === resolvedPeriodId) ?? defaultPeriod;
  const defaultEventId = workspaceQuery.data?.submission?.event_id || eventsQuery.data?.[0]?.id || '';
  const effectiveEventId = selectedEventId || defaultEventId;

  const initialLineValues = useMemo(
    () =>
      (workspaceQuery.data?.inputLines ?? []).reduce<Record<string, string>>((acc, line) => {
        acc[line.line_code] = formatCurrencyInput(line.value_currency);
        return acc;
      }, {}),
    [workspaceQuery.data?.inputLines],
  );

  const effectiveLineValues =
    editingSubmissionId && editingSubmissionId === workspaceQuery.data?.submission?.id
      ? lineValues
      : initialLineValues;
  const effectiveNotes =
    editingSubmissionId && editingSubmissionId === workspaceQuery.data?.submission?.id
      ? submissionNotes
      : workspaceQuery.data?.submission?.notes ?? '';

  const previewValueMap = useMemo(
    () =>
      Object.entries(effectiveLineValues).reduce<Record<string, number>>((acc, [lineCode, rawValue]) => {
        acc[lineCode] = parseCurrencyInput(rawValue) ?? 0;
        return acc;
      }, {}),
    [effectiveLineValues],
  );

  const preview = useMemo(() => calculateDrePreview(previewValueMap), [previewValueMap]);

  const draftStatementRows = useMemo(() => {
    if (!workspaceQuery.data?.inputLines?.length) return [];
    return buildDraftStatementRows(workspaceQuery.data.inputLines, effectiveLineValues, parseCurrencyInput);
  }, [workspaceQuery.data, effectiveLineValues]);

  const { rows: resolvedStatementRows, source: statementSource } = useMemo(
    () => resolveStatementRows(workspaceQuery.data?.dreStatement, draftStatementRows),
    [workspaceQuery.data?.dreStatement, draftStatementRows],
  );

  const draftValidation = useMemo(() => {
    if (!workspaceQuery.data?.inputLines?.length) {
      return { ok: true, missingRequired: [] as const, filledCount: 0, totalInputs: 0 };
    }
    return validateDraftInputs(workspaceQuery.data.inputLines, effectiveLineValues, parseCurrencyInput);
  }, [workspaceQuery.data, effectiveLineValues]);

  const currentSubmissionStatus = currentSubmission?.status ?? null;
  const activeSubmissionStatus = workspaceQuery.data?.submission?.status ?? currentSubmissionStatus;
  const currentSubmissionLocked = isLockedSubmissionStatus(currentSubmissionStatus);
  const activeSubmissionLocked = Boolean(activeSubmissionId) && isLockedSubmissionStatus(activeSubmissionStatus);
  const canPrepareDraft =
    canEdit &&
    Boolean(resolvedFranchiseId) &&
    Boolean(resolvedPeriodId) &&
    (!currentSubmission || isEditableSubmissionStatus(currentSubmission.status));
  const canEditActiveSubmission = canEdit && isEditableSubmissionStatus(activeSubmissionStatus);
  const assistantEnabled = Boolean(activeSubmissionId && workspaceQuery.data?.submission);
  const assistantInteractionMode = !workspaceQuery.data?.submission
    ? ('full' as const)
    : resolveAssistantInteractionMode(access?.roleCodes ?? [], workspaceQuery.data.submission.status);
  const assistantState = agentSessionQuery.data?.state_json;
  const assistantStoredFocusLineCode = readSessionStateString(assistantState, 'guided_line_code');
  const assistantStoredNextPrompt = readSessionStateString(assistantState, 'next_prompt');
  const assistantFocusLine = !workspaceQuery.data?.inputLines.length
    ? null
    : assistantStoredFocusLineCode
      ? workspaceQuery.data.inputLines.find((line) => line.line_code === assistantStoredFocusLineCode) ?? null
      : findNextGuidedLine(workspaceQuery.data.inputLines, effectiveLineValues);
  const assistantFocusLabel = assistantFocusLine
    ? `${assistantFocusLine.section_name} • ${assistantFocusLine.line_name}`
    : null;
  const inputLineCodes = workspaceQuery.data?.inputLines.map((line) => line.line_code) ?? [];
  const assistantNextPromptRaw =
    assistantStoredNextPrompt ?? (assistantFocusLine ? buildQuestionForLine(assistantFocusLine) : null);
  const assistantNextPrompt = assistantNextPromptRaw
    ? stripInternalLineCodesFromUserText(assistantNextPromptRaw, inputLineCodes)
    : null;
  const storedFlowCheckpoint = useMemo(
    () => parseFlowCheckpointFromState(agentSessionQuery.data?.state_json),
    [agentSessionQuery.data?.state_json],
  );
  const assistantFlowPhaseLabel = useMemo(() => {
    if (!storedFlowCheckpoint) {
      return null;
    }
    const labels: Record<string, string> = {
      collecting: 'Fase: preenchimento',
      complete: 'Fase: rascunho completo',
      explain_only: 'Fase: só orientação',
    };
    return labels[storedFlowCheckpoint.phase] ?? null;
  }, [storedFlowCheckpoint]);
  const assistantRealignHint = useMemo(() => {
    if (!storedFlowCheckpoint || storedFlowCheckpoint.last_user_intent !== 'off_topic') {
      return null;
    }
    const stepText = assistantNextPrompt ?? assistantFocusLabel;
    if (!stepText) {
      return 'Esse tema fica fora do escopo da DRE. Retomo o acompanhamento do formulário.';
    }
    return `Esse tema fica fora do escopo da DRE. Próximo passo sugerido: ${stepText}`;
  }, [storedFlowCheckpoint, assistantNextPrompt, assistantFocusLabel]);
  const filledInputCount = !workspaceQuery.data?.inputLines.length
    ? 0
    : workspaceQuery.data.inputLines.filter((line) => {
        const raw = effectiveLineValues[line.line_code]?.trim() ?? '';
        return raw.length > 0;
      }).length;
  const lastModeRaw =
    assistantState && typeof assistantState === 'object' && 'last_mode' in assistantState
      ? assistantState.last_mode
      : null;
  const rawAssistantMode = typeof lastModeRaw === 'string' ? lastModeRaw : null;
  const assistantAgentMode = rawAssistantMode === 'llm' || rawAssistantMode === 'fallback' ? rawAssistantMode : null;
  const assistantMessages = agentMessagesQuery.data ?? [];
  const lastAssistantMessage = [...assistantMessages]
    .reverse()
    .find((message) => message.role === 'assistant');
  const lastAssistantCitations = (lastAssistantMessage?.citations ?? []).map((citation) => ({
    title: citation.title,
    source: citation.source,
    excerpt: citation.excerpt ?? '',
  }));

  const beginEditing = () => {
    if (!workspaceQuery.data?.submission) return;
    if (!(canEdit && isEditableSubmissionStatus(workspaceQuery.data.submission.status))) return;
    if (editingSubmissionId === workspaceQuery.data.submission.id) return;
    setEditingSubmissionId(workspaceQuery.data.submission.id);
    setLineValues(initialLineValues);
    setSubmissionNotes(workspaceQuery.data.submission.notes ?? '');
  };

  const buildSubmissionInputPayload = (valueMap: Record<string, string>) => {
    if (!workspaceQuery.data) {
      throw new Error('Workspace da submissao nao carregado.');
    }

    return workspaceQuery.data.inputLines.map((line) => ({
      line_code: line.line_code,
      value_currency: parseCurrencyInput(valueMap[line.line_code] ?? ''),
      notes: line.notes,
    }));
  };

  const persistDraftValues = async (valueMap: Record<string, string>, notesText: string) => {
    if (!activeSubmissionId) {
      throw new Error('Nenhuma submissao ativa para salvar.');
    }

    return saveSubmissionInputs(activeSubmissionId, buildSubmissionInputPayload(valueMap), notesText);
  };

  const applyAssistantFieldUpdates = (result: DreAssistantTurnResult) => {
    if (
      assistantInteractionMode === 'explain_only' ||
      !workspaceQuery.data?.submission ||
      !canEditActiveSubmission ||
      result.fieldUpdates.length === 0
    ) {
      return effectiveLineValues;
    }

    const baseValues =
      editingSubmissionId === workspaceQuery.data.submission.id ? lineValues : initialLineValues;
    const nextValues = { ...baseValues };

    result.fieldUpdates.forEach((update) => {
      nextValues[update.lineCode] = formatCurrencyInput(update.valueCurrency);
    });

    if (editingSubmissionId !== workspaceQuery.data.submission.id) {
      setEditingSubmissionId(workspaceQuery.data.submission.id);
      setSubmissionNotes(workspaceQuery.data.submission.notes ?? '');
    }

    setLineValues(nextValues);
    return nextValues;
  };

  const refreshOperationalData = async () => {
    await invalidateSubmissionRelatedQueries(queryClient, {
      activeSubmissionId,
      agentSessionId: agentSessionQuery.data?.id ?? null,
      franchiseId: resolvedFranchiseId,
      periodId: resolvedPeriodId,
    });
  };

  const createDraftMutation = useMutation({
    mutationFn: () => ensureSubmissionVersion(resolvedFranchiseId, resolvedPeriodId, effectiveEventId || null),
    onSuccess: async (result) => {
      setSubmissionFocusId(result.submission_id);
      setEditingSubmissionId(null);
      setLineValues({});
      setSubmissionNotes('');
      await refreshOperationalData();
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: () => {
      if (!activeSubmissionId || !workspaceQuery.data) throw new Error('Nenhuma submissão ativa para salvar.');
      return persistDraftValues(effectiveLineValues, effectiveNotes);
    },
    onSuccess: refreshOperationalData,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!activeSubmissionId || !workspaceQuery.data) throw new Error('Nenhuma submissão ativa para enviar.');
      const check = validateDraftInputs(
        workspaceQuery.data.inputLines,
        effectiveLineValues,
        parseCurrencyInput,
      );
      if (!check.ok) {
        throw new Error(
          `Preencha todos os campos da DRE antes de enviar (${check.filledCount}/${check.totalInputs} campos válidos).`,
        );
      }
      await persistDraftValues(effectiveLineValues, effectiveNotes);
      return submitSubmission(activeSubmissionId, effectiveNotes);
    },
    onSuccess: refreshOperationalData,
  });

  const assistantMutation = useMutation({
    mutationFn: async (prompt: string) => {
      if (!assistantEnabled || !activeSubmissionId || !agentSessionQuery.data) {
        throw new Error('Abra um rascunho para ativar o assistente.');
      }

      if (!session?.access_token) {
        throw new Error('Sessao autenticada nao encontrada para falar com o assistente.');
      }

      const trimmedPrompt = prompt.trim();

      if (!trimmedPrompt) {
        throw new Error('Digite uma mensagem para o assistente.');
      }

      await appendAgentMessage(agentSessionQuery.data.id, 'user', trimmedPrompt);

      await queryClient.invalidateQueries({ queryKey: ['agent-messages', agentSessionQuery.data.id] });
      await queryClient.refetchQueries({ queryKey: ['agent-messages', agentSessionQuery.data.id] });

      let response: Response;
      try {
        response = await fetch('/api/dre-agent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            sessionId: agentSessionQuery.data.id,
            submissionId: activeSubmissionId,
            message: trimmedPrompt,
          }),
          signal: AbortSignal.timeout(ASSISTANT_FETCH_TIMEOUT_MS),
        });
      } catch (fetchError) {
        const isTimeout =
          fetchError instanceof DOMException && fetchError.name === 'TimeoutError';
        if (isTimeout) {
          throw new Error(
            'Tempo esgotado ao falar com o assistente. Verifique a ligação e tente novamente.',
          );
        }
        throw fetchError;
      }

      let body: {
        error?: string;
        result?: DreAssistantTurnResult;
        flow_checkpoint?: Record<string, unknown>;
        interaction_mode?: string;
      };
      try {
        body = (await response.json()) as {
          error?: string;
          result?: DreAssistantTurnResult;
          flow_checkpoint?: Record<string, unknown>;
          interaction_mode?: string;
        };
      } catch {
        throw new Error(
          response.status === 404
            ? 'Rota do assistente nao encontrada. Em desenvolvimento local, confira o proxy do Vite ou use vercel dev.'
            : `Assistente indisponivel (HTTP ${response.status}).`,
        );
      }

      if (!response.ok || !body.result) {
        throw new Error(body.error ?? 'Nao foi possivel processar a mensagem no assistente.');
      }

      const result = body.result;
      const appliedValues = applyAssistantFieldUpdates(result);
      const blockedByWorkflow =
        assistantInteractionMode !== 'explain_only' &&
        result.fieldUpdates.length > 0 &&
        !canEditActiveSubmission;
      const autoSaveRequested =
        assistantInteractionMode !== 'explain_only' && result.requestSave && canEditActiveSubmission;
      const shouldPersistAfterAgent =
        assistantInteractionMode !== 'explain_only' &&
        canEditActiveSubmission &&
        !blockedByWorkflow &&
        (result.fieldUpdates.length > 0 || autoSaveRequested);
      const answer = blockedByWorkflow
        ? `${result.answer} O recorte atual esta em leitura, entao eu nao alterei os campos.`
        : result.answer;

      if (shouldPersistAfterAgent) {
        await persistDraftValues(appliedValues, effectiveNotes);
        await refreshOperationalData();
      }

      await appendAgentMessage(agentSessionQuery.data.id, 'assistant', answer, {
        citations: result.citations,
        payload: {
          ...result,
          blocked_by_workflow: blockedByWorkflow,
          auto_saved: shouldPersistAfterAgent,
        },
      });

      const focusLine =
        workspaceQuery.data?.inputLines.find((line) => line.line_code === result.focusLineCode) ??
        null;

      await updateAgentSessionState(
        agentSessionQuery.data.id,
        {
          ...(agentSessionQuery.data.state_json ?? {}),
          guided_line_code: result.focusLineCode,
          next_prompt: result.nextPrompt,
          last_mode: result.mode,
          last_answer: answer,
          last_citations: result.citations,
          auto_saved: shouldPersistAfterAgent,
          flow_checkpoint: body.flow_checkpoint,
          last_interaction_mode: body.interaction_mode ?? null,
        },
        focusLine ? `Campo em foco: ${getFieldGuide(focusLine).label}` : agentSessionQuery.data.summary,
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['agent-session', activeSubmissionId, resolvedFranchiseId, resolvedPeriodId] }),
        queryClient.invalidateQueries({ queryKey: ['agent-messages', agentSessionQuery.data.id] }),
      ]);

      return result;
    },
  });

  const draftActionLabel = createDraftMutation.isPending
    ? 'Preparando...'
    : !currentSubmission
      ? 'Criar rascunho'
      : isEditableSubmissionStatus(currentSubmission.status)
        ? 'Abrir rascunho'
        : currentSubmission.status === 'approved'
          ? 'Versão aprovada'
          : 'Em aprovação';
  const saveActionLabel = saveDraftMutation.isPending
    ? 'Salvando...'
    : activeSubmissionLocked
      ? 'Rascunho bloqueado'
      : 'Salvar rascunho';
  const submitActionLabel = submitMutation.isPending
    ? 'Enviando...'
    : activeSubmissionStatus === 'approved'
      ? 'Versão aprovada'
      : activeSubmissionLocked
        ? 'Aguardando revisão'
        : 'Enviar para revisão';
  const submissionLockMessage = activeSubmissionStatus === 'approved'
    ? 'Esta versão foi aprovada e ficou congelada como registro oficial do período.'
    : 'Esta versão já foi enviada e está bloqueada até a controladoria aprovar ou devolver para ajuste.';

  const currentErrorMessage = createDraftMutation.error
    ? formatApiError(createDraftMutation.error, 'Não foi possível preparar a submissão.')
    : saveDraftMutation.error
      ? formatApiError(saveDraftMutation.error, 'Não foi possível salvar o rascunho.')
      : submitMutation.error
        ? formatApiError(submitMutation.error, 'Não foi possível enviar a submissão.')
        : null;

  const assistantErrorMessage = agentSessionQuery.error
    ? formatApiError(agentSessionQuery.error, 'Não foi possível abrir a memória do assistente.')
    : agentMessagesQuery.error
      ? formatApiError(agentMessagesQuery.error, 'Não foi possível carregar o histórico do assistente.')
      : assistantMutation.error
        ? formatApiError(assistantMutation.error, 'Não foi possível processar a mensagem do assistente.')
        : null;

  const sendAssistantPrompt = (prompt: string) => {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      return;
    }

    setAssistantDraft('');
    assistantMutation.mutate(trimmedPrompt);
  };

  if (accessProfileQuery.isLoading || franchisesQuery.isLoading || periodsQuery.isLoading || submissionsQuery.isLoading) {
    return <div className="skeleton skeleton--card" />;
  }

  if (accessProfileQuery.error || franchisesQuery.error || periodsQuery.error || submissionsQuery.error || !access || !franchisesQuery.data || !periodsQuery.data || !submissionsQuery.data) {
    return (
      <div className="page-stack">
        <div className="inline-message inline-message--danger">
          Não foi possível carregar o workspace de submissões. Verifique a conexão e tente atualizar a página.
        </div>
      </div>
    );
  }

  if (franchisesQuery.data.length === 0) {
    return (
      <div className="page-stack submissions-page-root">
        <div className="page-container__title-bar">
          <div>
            <h1 className="page-container__title">Submissões</h1>
            <p className="page-container__subtitle">
              A unidade escolhe a competência, preenche a DRE e envia a versão oficial para revisão.
            </p>
          </div>
        </div>
        <div className="card">
          <div className="card__body">
            <div className="empty-state">
              <div className="empty-state__icon">
                <FileSpreadsheet />
              </div>
              <h3 className="empty-state__title">Nenhuma franquia disponível no seu escopo</h3>
              <p className="empty-state__description">
                O seu utilizador não tem franquias associadas ou o acesso ainda não foi configurado. Peça ao
                administrador para validar o vínculo da coligada ou da regional no painel de configurações.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentRows = submissionsQuery.data;
  const approvedCount = currentRows.filter((row) => row.status === 'approved').length;
  const pendingCount = currentRows.filter((row) => ['submitted', 'under_review', 'pending_adjustment'].includes(row.status)).length;

  return (
    <div className="page-stack submissions-page-root">
      <div className="page-container__title-bar">
        <div>
          <h1 className="page-container__title">Submissões</h1>
          <p className="page-container__subtitle">
            Escolha franquia e competência, preencha com o assistente e envie para revisão — o painel à direita mostra o preview e as ações.
          </p>
        </div>
      </div>

      <section className="submission-hero submission-hero--compact card card--gold">
        <div className="submission-hero__compact-top">
          <span className="badge badge--gold">DRE</span>
          <p className="submission-hero__compact-tagline">
            Dados e MC/EBITDA vêm do assistente e do motor oficial; use o rascunho antes de enviar à controladoria.
          </p>
        </div>

        <div className="submission-hero__toolbar glass">
          <div className="form-group">
            <label className="form-label" htmlFor="submission-franchise">Franquia</label>
            <select
              id="submission-franchise"
              data-testid="submission-franchise"
              className="form-select"
              value={resolvedFranchiseId}
              onChange={(event) => {
                setSelectedFranchiseId(event.target.value);
                setSubmissionFocusId(null);
                setEditingSubmissionId(null);
                setSelectedEventId('');
              }}
            >
              {franchisesQuery.data.map((franchise) => (
                <option key={franchise.id} value={franchise.id}>{franchise.trade_name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="submission-period">Competência</label>
            <select
              id="submission-period"
              data-testid="submission-period"
              className="form-select"
              value={resolvedPeriodId}
              onChange={(event) => {
                setSelectedPeriodId(event.target.value);
                setSubmissionFocusId(null);
                setEditingSubmissionId(null);
                setSelectedEventId('');
              }}
            >
              {periodsQuery.data.map((period) => (
                <option key={period.id} value={period.id}>
                  {formatPeriodLabel(period.label)} • {formatStatusLabel(period.status)}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="submission-event">Evento</label>
            <select
              id="submission-event"
              data-testid="submission-event"
              className="form-select"
              value={effectiveEventId}
              onChange={(event) => setSelectedEventId(event.target.value)}
              disabled={!eventsQuery.data?.length || currentSubmissionLocked}
            >
              <option value="">Sem evento vinculado</option>
              {eventsQuery.data?.map((eventOption) => (
                <option key={eventOption.id} value={eventOption.id}>{eventOption.name}</option>
              ))}
            </select>
          </div>

          <div className="submission-hero__actions">
            <button
              type="button"
              data-testid="submission-create-draft"
              className="btn btn--gold"
              onClick={() => createDraftMutation.mutate()}
              disabled={!canPrepareDraft || createDraftMutation.isPending}
            >
              <PencilLine size={18} />
              {draftActionLabel}
            </button>

            {currentSubmissionLocked ? (
              <div className="inline-message">
                A submissão corrente deste período já está em aprovação. O franqueado não pode criar nova versão nem reenviar até uma devolução formal para ajuste.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {currentErrorMessage && <div className="inline-message inline-message--danger">{currentErrorMessage}</div>}

      <div className="submissions-kpi-wrap submissions-kpi-wrap--tiered">
        <div className="submissions-kpi-primary kpi-grid">
          <div className="kpi-card">
            <div className="kpi-card__header">
              <span className="kpi-card__label">Submissões no seu escopo</span>
              <div className="kpi-card__icon"><FileSpreadsheet /></div>
            </div>
            <div className="kpi-card__value">{formatInteger(currentRows.length)}</div>
            <div className="kpi-card__footer"><span className="kpi-card__percent">Versões correntes listadas</span></div>
          </div>

          <div className="kpi-card kpi-card--gold">
            <div className="kpi-card__header">
              <span className="kpi-card__label">EBITDA 2 (preview)</span>
              <div className="kpi-card__icon"><FolderSync /></div>
            </div>
            <div className="kpi-card__value kpi-card__value--gold">{formatCurrency(preview.ebitda2)}</div>
            <div className="kpi-card__footer"><span className="kpi-card__percent">Motor local alinhado aos inputs do rascunho</span></div>
          </div>
        </div>

        <details className="submissions-kpi-more">
          <summary className="submissions-kpi-more__summary">Mais indicadores do período</summary>
          <div className="submissions-kpi-more__grid kpi-grid">
            <div className="kpi-card kpi-card--success">
              <div className="kpi-card__header">
                <span className="kpi-card__label">Aprovadas</span>
                <div className="kpi-card__icon"><CheckCircle2 /></div>
              </div>
              <div className="kpi-card__value kpi-card__value--success">{formatInteger(approvedCount)}</div>
              <div className="kpi-card__footer"><span className="kpi-card__percent">Status finalizado</span></div>
            </div>

            <div className="kpi-card kpi-card--warning">
              <div className="kpi-card__header">
                <span className="kpi-card__label">Em tratamento</span>
                <div className="kpi-card__icon"><AlertTriangle /></div>
              </div>
              <div className="kpi-card__value">{formatInteger(pendingCount)}</div>
              <div className="kpi-card__footer"><span className="kpi-card__percent">Envio, revisão ou ajuste</span></div>
            </div>
          </div>
        </details>
      </div>

      {assistantErrorMessage ? (
        <div className="inline-message inline-message--danger">{assistantErrorMessage}</div>
      ) : null}

      <div
        className="submission-mobile-tabs"
        role="tablist"
        aria-label="Secções do workspace de submissão"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileWorkspaceTab === 'chat'}
          className="submission-mobile-tabs__btn"
          onClick={() => setMobileWorkspaceTab('chat')}
        >
          Conversa
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileWorkspaceTab === 'panel'}
          className="submission-mobile-tabs__btn"
          onClick={() => setMobileWorkspaceTab('panel')}
        >
          Painel
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mobileWorkspaceTab === 'dre'}
          className="submission-mobile-tabs__btn"
          onClick={() => setMobileWorkspaceTab('dre')}
        >
          DRE
        </button>
      </div>

      <div className="submission-workbench" data-testid="submission-workbench">
        <div
          className={`submission-workbench__main submission-workbench__panel ${
            mobileWorkspaceTab === 'chat'
              ? 'submission-workbench__panel--active-sm'
              : 'submission-workbench__panel--hidden-sm'
          }`}
        >
          <DreAssistantPanel
            enabled={assistantEnabled}
            loading={agentSessionQuery.isLoading || agentMessagesQuery.isLoading}
            pending={assistantMutation.isPending}
            focusLabel={assistantFocusLabel}
            nextPrompt={assistantNextPrompt}
            flowPhaseLabel={assistantFlowPhaseLabel}
            realignHint={assistantRealignHint}
            messages={assistantMessages}
            draftValue={assistantDraft}
            lastCitations={lastAssistantCitations}
            lineCodes={inputLineCodes}
            filledSteps={filledInputCount}
            totalSteps={workspaceQuery.data?.inputLines.length ?? 0}
            agentMode={assistantAgentMode}
            interactionMode={assistantInteractionMode}
            onDraftChange={setAssistantDraft}
            onSend={() => sendAssistantPrompt(assistantDraft)}
            onQuickAction={sendAssistantPrompt}
          />

          {!activeSubmissionId ? (
            <div className="card">
              <div className="card__body">
                <div className="empty-state">
                  <div className="empty-state__icon"><FileSpreadsheet /></div>
                  <h3 className="empty-state__title">Nenhuma submissão ativa neste recorte</h3>
                  <p className="empty-state__description">
                    {canEdit
                      ? 'Selecione a franquia e a competência desejada e clique em "Criar rascunho" para iniciar a DRE.'
                      : 'O seu perfil está em modo leitura. Escolha uma franquia e uma competência para acompanhar a versão corrente, quando existir.'}
                  </p>
                </div>
              </div>
            </div>
          ) : workspaceQuery.isLoading || !workspaceQuery.data ? (
            <div className="skeleton skeleton--card" />
          ) : (
            <>
              <div className="card submission-agent-only-card">
                <div className="card__header">
                  <div>
                    <h3 className="card__title">Sua DRE neste período</h3>
                    <p className="card__subtitle">
                      O preenchimento é feito só pela conversa com o assistente acima — na ordem da planilha oficial. Use
                      “Salvar rascunho” à direita quando quiser gravar; a DRE calculada aparece abaixo após salvar.
                    </p>
                  </div>
                  <span
                    className={`status-badge status-badge--${getStatusVariant(workspaceQuery.data.submission?.status ?? 'draft')}`}
                  >
                    <span className="status-badge__dot" />
                    {formatStatusLabel(workspaceQuery.data.submission?.status)}
                  </span>
                </div>
                <div className="card__body">
                  {activeSubmissionLocked ? (
                    <div className="inline-message">{submissionLockMessage}</div>
                  ) : canEditActiveSubmission ? (
                    <p className="submission-agent-only-card__text">
                      Toque em <strong>Olá</strong> no assistente e responda com valores em reais. O resumo MC1 / MC2 /
                      EBITDA ao lado acompanha os números após cada gravação.
                    </p>
                  ) : (
                    <p className="submission-agent-only-card__text">
                      Modo leitura: acompanhe o preview à direita e a tabela de DRE oficial quando disponível.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <aside
          className={`submission-workbench__rail submission-sidebar submission-workbench__panel ${
            mobileWorkspaceTab === 'panel'
              ? 'submission-workbench__panel--active-sm'
              : 'submission-workbench__panel--hidden-sm'
          }`}
        >
          <div className="card">
            <div className="card__header">
              <div>
                <h3 className="card__title">Controle da submissão</h3>
                <p className="card__subtitle">Status atual, narrativa do período e ações operacionais.</p>
              </div>
            </div>

            <div className="card__body">
              <div className="detail-list">
                <div className="detail-list__item">
                  <span className="detail-list__label">Franquia</span>
                  <span className="detail-list__value">{selectedFranchise?.trade_name ?? '—'}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Competência</span>
                  <span className="detail-list__value">{formatPeriodLabel(selectedPeriod?.label ?? null)}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Versão ativa</span>
                  <span className="detail-list__value">{workspaceQuery.data?.submission ? `v${workspaceQuery.data.submission.version_number}` : '—'}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Último envio</span>
                  <span className="detail-list__value">{formatDateTime(workspaceQuery.data?.submission?.submitted_at ?? null)}</span>
                </div>
              </div>

              <div className="form-group submission-sidebar__notes">
                <label className="form-label" htmlFor="submission-notes">Observações da unidade</label>
                <textarea
                  id="submission-notes"
                  data-testid="submission-notes"
                  className="form-input submission-sidebar__textarea"
                  value={effectiveNotes}
                  onChange={(event) => {
                    beginEditing();
                    setSubmissionNotes(event.target.value);
                  }}
                  disabled={!canEditActiveSubmission}
                  placeholder="Explique variações, premissas e fatos relevantes do período."
                />
              </div>

              <div className="submission-sidebar__actions">
                <button
                  type="button"
                  data-testid="submission-save-draft"
                  className="btn btn--secondary btn--full"
                  onClick={() => saveDraftMutation.mutate()}
                  disabled={!canEditActiveSubmission || !activeSubmissionId || saveDraftMutation.isPending}
                >
                  <FolderSync size={18} />
                  {saveActionLabel}
                </button>

                <button
                  type="button"
                  data-testid="submission-send-review"
                  className="btn btn--gold btn--full"
                  onClick={() => submitMutation.mutate()}
                  disabled={
                    !canEditActiveSubmission ||
                    !activeSubmissionId ||
                    submitMutation.isPending ||
                    !draftValidation.ok
                  }
                  title={
                    !draftValidation.ok && canEditActiveSubmission
                      ? 'Preencha todas as linhas da DRE antes de enviar para revisão.'
                      : undefined
                  }
                >
                  <Send size={18} />
                  {submitActionLabel}
                </button>
              </div>

              {activeSubmissionLocked ? (
                <div className="inline-message">
                  {submissionLockMessage}
                </div>
              ) : null}

              {!canEdit && (
                <div className="inline-message">
                  Este perfil está em leitura. Apenas usuários de franquia e administradores podem alterar a DRE.
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card__header">
              <h3 className="card__title">Preview financeiro</h3>
            </div>
            <div className="card__body">
              <div className="detail-list">
                <div className="detail-list__item"><span className="detail-list__label">RBV</span><span className="detail-list__value font-mono">{formatCurrency(preview.grossRevenue)}</span></div>
                <div className="detail-list__item"><span className="detail-list__label">MC1</span><span className="detail-list__value font-mono">{formatCurrency(preview.mc1)}</span></div>
                <div className="detail-list__item"><span className="detail-list__label">MC2</span><span className="detail-list__value font-mono">{formatCurrency(preview.mc2)}</span></div>
                <div className="detail-list__item"><span className="detail-list__label">EBITDA 1</span><span className="detail-list__value font-mono">{formatCurrency(preview.ebitda1)}</span></div>
                <div className="detail-list__item"><span className="detail-list__label">EBITDA 2</span><span className="detail-list__value font-mono">{formatCurrency(preview.ebitda2)}</span></div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card__header">
              <h3 className="card__title">Validações</h3>
            </div>
            <div className="card__body">
              {!draftValidation.ok && canEditActiveSubmission ? (
                <div className="inline-message inline-message--warning submission-validation-draft">
                  <strong>Campos obrigatórios:</strong> faltam {draftValidation.missingRequired.length} linha(s) com valor
                  válido antes do envio.
                  <ul className="submission-validation-draft__list">
                    {draftValidation.missingRequired.slice(0, 6).map((item) => (
                      <li key={item.lineCode}>
                        {item.sectionName} — {item.lineName}
                      </li>
                    ))}
                  </ul>
                  {draftValidation.missingRequired.length > 6 ? (
                    <p className="submission-validation-draft__more">
                      +{draftValidation.missingRequired.length - 6} outras linhas
                    </p>
                  ) : null}
                </div>
              ) : null}

              {workspaceQuery.data?.validationResults.length ? (
                <div className="list-stack">
                  {workspaceQuery.data.validationResults.map((result) => (
                    <div key={result.id} className="list-row">
                      <div>
                        <div className="list-row__title">{result.rule_name}</div>
                        <div className="list-row__meta">{result.message ?? 'Sem observações.'}</div>
                      </div>
                      <div className="list-row__value">
                        <span className={`status-badge status-badge--${getStatusVariant(result.status)}`}>
                          <span className="status-badge__dot" />
                          {formatStatusLabel(result.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="inline-message">As validações do motor aparecerão após salvar o rascunho.</div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {resolvedStatementRows.length ? (
        <div
          className={`submission-details-dre-wrap ${
            mobileWorkspaceTab === 'dre' ? 'submission-statement-root--dre-active' : ''
          }`}
        >
          <details className="submission-details" open>
            <summary className="submission-details__summary">
              {statementSource === 'official' ? 'DRE oficial calculada' : 'DRE — pré-visualização do rascunho'}
            </summary>
            <p className="submission-details__meta">
              {statementSource === 'official'
                ? 'Demonstração hierárquica gerada pelo motor após gravar o rascunho (MC1, MC2, EBITDA 1 e EBITDA 2).'
                : 'Valores digitados no rascunho, agrupados como income statement até existir DRE oficial no servidor.'}
            </p>
            <div className="submission-details__body">
              <DreStatementTable rows={resolvedStatementRows} source={statementSource} />
            </div>
          </details>
        </div>
      ) : null}

      <details className="submission-details">
        <summary className="submission-details__summary">Todas as submissões no seu escopo</summary>
        <p className="submission-details__meta">
          Clique numa linha para abrir essa franquia e competência. Recolha esta secção para focar no assistente e no painel lateral.
        </p>
        <div className="submission-details__body submission-details__body--flush">
          <div className="card__body card__body--compact">
            {currentRows.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon"><FileSpreadsheet /></div>
                <h3 className="empty-state__title">Nenhuma submissão encontrada</h3>
                <p className="empty-state__description">Quando houver uma submissão salva ou enviada dentro do seu escopo, ela aparecerá aqui.</p>
              </div>
            ) : (
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Franquia</th>
                      <th>Período</th>
                      <th>Regional</th>
                      <th className="align-center">Versão</th>
                      <th>Status</th>
                      <th>Submetido em</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRows.map((row) => (
                      <tr
                        key={row.submission_id}
                        className={row.submission_id === activeSubmissionId ? 'data-row--active' : ''}
                        onClick={() => {
                          setSelectedFranchiseId(row.franchise_id);
                          setSelectedPeriodId(row.reporting_period_id);
                          setSubmissionFocusId(row.submission_id);
                          setEditingSubmissionId(null);
                          setSelectedEventId('');
                        }}
                      >
                        <td><div className="list-row__title">{row.franchise_name}</div><div className="list-row__meta">{row.franchise_code}</div></td>
                        <td>{formatPeriodLabel(row.period_label)}</td>
                        <td>{row.regional_name}</td>
                        <td className="align-center font-mono">v{row.version_number}</td>
                        <td>
                          <span className={`status-badge status-badge--${getStatusVariant(row.status)}`}>
                            <span className="status-badge__dot" />
                            {formatStatusLabel(row.status)}
                          </span>
                        </td>
                        <td>{formatDateTime(row.submitted_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </details>
    </div>
  );
}
