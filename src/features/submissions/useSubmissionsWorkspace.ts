import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { formatCurrencyInput, parseCurrencyInput } from './currencyInput';
import { resolveAssistantInteractionMode, type AssistantProductTab } from './agentPermissions';
import {
  buildQuestionForLine,
  findNextGuidedLine,
  getFieldGuide,
  parseFlowCheckpointFromState,
  parseDrePhaseFromState,
  parseProposedAssistantValueFromState,
  parseSkippedLineCodesFromState,
  stripInternalLineCodesFromUserText,
  type DreAssistantTurnResult,
} from './dreAssistant';
import { buildDraftStatementRows, resolveStatementRows } from './dreStatementModel';
import { calculateDrePreview } from './drePreview';
import { invalidateSubmissionRelatedQueries } from './submissionQuerySync';
import { isEditableSubmissionStatus, isLockedSubmissionStatus } from './submissionStatus';
import { validateDraftInputs } from './submissionValidation';
import { resolveDefaultReportingPeriod } from '../../utils/reportingPeriodResolve';

const ASSISTANT_FETCH_TIMEOUT_MS = 55_000;

function readSessionStateString(state: Record<string, unknown> | undefined, key: string) {
  const value = state?.[key];
  return typeof value === 'string' ? value : null;
}

export interface SubmissionsWorkspaceOptions {
  /** Abre franquia/período quando a rota inclui `/app/assistant?submission=<uuid>` */
  routeSubmissionId?: string | null;
  /** Hub do assistente: **Dúvidas** obriga apenas orientação (API + UI) */
  assistantProductTab?: AssistantProductTab;
}

export function useSubmissionsWorkspace(opts?: SubmissionsWorkspaceOptions) {
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
  const [mobileWorkspaceTab, setMobileWorkspaceTab] = useState<'panel' | 'dre'>('panel');
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

  useEffect(() => {
    const submissionIdFromRoute = opts?.routeSubmissionId?.trim();
    if (!submissionIdFromRoute || !submissionsQuery.data?.length) {
      return;
    }
    const row = submissionsQuery.data.find((submission) => submission.submission_id === submissionIdFromRoute);
    if (!row) {
      return;
    }
    queueMicrotask(() => {
      setSelectedFranchiseId(row.franchise_id);
      setSelectedPeriodId(row.reporting_period_id);
      setSubmissionFocusId(row.submission_id);
      setEditingSubmissionId(null);
      setSelectedEventId('');
    });
  }, [opts?.routeSubmissionId, submissionsQuery.data]);

  const resolvedFranchiseId = selectedFranchiseId || franchisesQuery.data?.[0]?.id || '';
  const defaultPeriod = resolveDefaultReportingPeriod(periodsQuery.data ?? null);
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
      setMobileWorkspaceTab('panel');
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
      return { ok: true, missingRequired: [], filledCount: 0, totalInputs: 0 };
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
    : opts?.assistantProductTab === 'duvidas'
      ? ('explain_only' as const)
      : resolveAssistantInteractionMode(access?.roleCodes ?? [], workspaceQuery.data.submission.status);
  const assistantState = agentSessionQuery.data?.state_json;
  const assistantSkippedCodes = parseSkippedLineCodesFromState(assistantState);
  const assistantSkippedSet = useMemo(() => new Set(assistantSkippedCodes), [assistantSkippedCodes]);
  const assistantDrePhaseId = parseDrePhaseFromState(assistantState);
  const assistantProposedValue = parseProposedAssistantValueFromState(assistantState);
  const assistantStoredFocusLineCode = readSessionStateString(assistantState, 'guided_line_code');
  const assistantStoredNextPrompt = readSessionStateString(assistantState, 'next_prompt');
  const assistantFocusLine = !workspaceQuery.data?.inputLines.length
    ? null
    : assistantStoredFocusLineCode
      ? workspaceQuery.data.inputLines.find((line) => line.line_code === assistantStoredFocusLineCode) ?? null
      : findNextGuidedLine(workspaceQuery.data.inputLines, effectiveLineValues, null, {
          skippedLineCodes: assistantSkippedSet,
        });
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
  const assistantAgentMode: 'llm' | 'fallback' | null =
    rawAssistantMode === 'llm' || rawAssistantMode === 'fallback' ? rawAssistantMode : null;
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
      result.fieldUpdates.length === 0 ||
      result.requiresFieldConfirmation === true
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
            ...(opts?.assistantProductTab === 'duvidas' ? { assistantProductTab: 'duvidas' as const } : {}),
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
        session_state_patch?: Record<string, unknown>;
      };
      try {
        body = (await response.json()) as {
          error?: string;
          result?: DreAssistantTurnResult;
          flow_checkpoint?: Record<string, unknown>;
          interaction_mode?: string;
          session_state_patch?: Record<string, unknown>;
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
      const commitsFieldUpdatesImmediately =
        result.fieldUpdates.length > 0 && result.requiresFieldConfirmation !== true;
      const shouldPersistAfterAgent =
        assistantInteractionMode !== 'explain_only' &&
        canEditActiveSubmission &&
        !blockedByWorkflow &&
        ((commitsFieldUpdatesImmediately && result.fieldUpdates.length > 0) || autoSaveRequested);
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

      const serverPatchRaw = body.session_state_patch ?? {};
      const sanitizedServerPatch =
        typeof serverPatchRaw === 'object' && serverPatchRaw !== null ? serverPatchRaw : {};
      const focusLine =
        workspaceQuery.data?.inputLines.find((line) => line.line_code === result.focusLineCode) ??
        null;

      await updateAgentSessionState(
        agentSessionQuery.data.id,
        {
          ...(typeof agentSessionQuery.data.state_json === 'object' && agentSessionQuery.data.state_json !== null
            ? (agentSessionQuery.data.state_json as Record<string, unknown>)
            : {}),
          ...sanitizedServerPatch,
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

  const sendAssistantCommand = (command: string) => {
    sendAssistantPrompt(command);
  };


  return {
    access,
    accessProfileQuery,
    activeSubmissionId,
    activeSubmissionLocked,
    activeSubmissionStatus,
    agentMessagesQuery,
    agentSessionQuery,
    assistantAgentMode,
    assistantDraft,
    setAssistantDraft,
    assistantDrePhaseId,
    assistantEnabled,
    assistantErrorMessage,
    assistantFocusLine,
    assistantFlowPhaseLabel,
    assistantFocusLabel,
    assistantMessages,
    assistantInteractionMode,
    assistantMutation,
    assistantNextPrompt,
    assistantProposedValue,
    assistantRealignHint,
    assistantSkippedCodes,
    beginEditing,
    canEdit,
    canEditActiveSubmission,
    canPrepareDraft,
    createDraftMutation,
    currentErrorMessage,
    currentSubmission,
    currentSubmissionLocked,
    currentSubmissionStatus,
    draftActionLabel,
    draftValidation,
    effectiveEventId,
    effectiveLineValues,
    effectiveNotes,
    eventsQuery,
    filledInputCount,
    franchisesQuery,
    initialLineValues,
    inputLineCodes,
    lastAssistantCitations,
    lineValues,
    setLineValues,
    mobileWorkspaceTab,
    setMobileWorkspaceTab,
    periodsQuery,
    preview,
    queryClient,
    resolvedFranchiseId,
    resolvedPeriodId,
    resolvedStatementRows,
    saveActionLabel,
    saveDraftMutation,
    selectedEventId,
    setSelectedEventId,
    selectedFranchise,
    selectedFranchiseId,
    setSelectedFranchiseId,
    selectedPeriod,
    selectedPeriodId,
    setSelectedPeriodId,
    sendAssistantPrompt,
    sendAssistantCommand,
    statementSource,
    submissionFocusId,
    setSubmissionFocusId,
    submissionLockMessage,
    editingSubmissionId,
    setEditingSubmissionId,
    submissionNotes,
    setSubmissionNotes,
    submissionsQuery,
    submitActionLabel,
    submitMutation,
    workspaceQuery,
  };
}
