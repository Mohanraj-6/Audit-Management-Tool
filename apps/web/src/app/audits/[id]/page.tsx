'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  DefinitionList,
  EmptyState,
  ErrorBlock,
  Field,
  Input,
  LoadingBlock,
  MetaBadge,
  Modal,
  PageHeader,
  ProgressBar,
  Select,
  Table,
  Tabs,
  Td,
  Textarea,
  Th,
} from '@/components/ui';
import { api, apiUrl } from '@/lib/api';
import {
  ANSWER_OPTIONS,
  AUDIT_STATUS,
  QUESTION_TYPES,
  FINDING_SEVERITY,
  FINDING_STATUS,
  humanize,
} from '@/lib/constants';
import { dueLabel, formatDate, formatDateTime, fullName, percent, truncate } from '@/lib/format';
import { useApi, useDepartments, useLocations, useSubmit, useUsers } from '@/lib/hooks';
import type { Audit, AuditAssignee, AuditAssignmentResult, Finding, FindingSeverity, MailSummary } from '@/lib/types';

interface ChecklistQuestion {
  id: string;
  questionText: string;
  questionType: string;
  isMandatory: boolean;
  weight: number;
  answer: string | null;
  comment?: string;
  findingId?: string | null;
}

interface ChecklistCategory {
  id: string | null;
  name: string;
  description?: string;
  questions: ChecklistQuestion[];
}

export interface Checklist {
  audit: {
    id: string;
    auditNumber: string;
    title: string;
    status: string;
    template: { id: string; name: string };
    score: number;
    maxScore: number;
    compliancePercentage: number;
    totalQuestions: number;
    answeredQuestions: number;
  };
  categories: ChecklistCategory[];
}

type TabKey = 'overview' | 'checklist' | 'findings';

/** Human-readable summary of an allotment mail result. */
function describeMailing(summary: MailSummary | null | undefined, userCount: number): string {
  if (!summary) return 'No email was sent.';

  const who = userCount === 1 ? '1 user' : `${userCount} users`;
  if (summary.transport === 'smtp') {
    return `Email delivered to ${who} (${summary.delivered} sent, ${summary.failed} failed).`;
  }
  if (summary.transport === 'outbox') {
    return `SMTP is not configured, so the allotment email for ${who} was written to apps/api/mail-outbox (${summary.outboxed} message${
      summary.outboxed === 1 ? '' : 's'
    }).`;
  }
  return `The allotment email could not be sent to ${who}.`;
}

export default function AuditDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const departments = useDepartments();
  const locations = useLocations();
  const users = useUsers();
  const audit = useApi<Audit>(`/audits/${id}`);
  const checklist = useApi<Checklist>(`/audits/${id}/checklist`);
  const action = useSubmit();
  const answerSubmit = useSubmit();

  // Users allotted to this audit (by the auditor) + the allotment form state.
  const assignees = useApi<AuditAssignee[]>(`/audits/${id}/assignees`);
  const [allotSelection, setAllotSelection] = useState<string[]>([]);
  const [allotNotify, setAllotNotify] = useState(true);
  const [allotNote, setAllotNote] = useState('');
  const [mailNotice, setMailNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [editAuditOpen, setEditAuditOpen] = useState(false);
  const [editAuditForm, setEditAuditForm] = useState({ title: '', description: '', departmentId: '', locationId: '', scheduledDate: '', dueDate: '' });

  const [tab, setTab] = useState<TabKey>('overview');
  const [answers, setAnswers] = useState<Record<string, { answer: string; comment: string }>>({});
  const [savedQuestion, setSavedQuestion] = useState<string | null>(null);
  const [checklistEditor, setChecklistEditor] = useState<null | { question: ChecklistQuestion | null; categoryId: string }>(null);
  const [checklistForm, setChecklistForm] = useState({ questionText: '', questionType: 'yes_no', isMandatory: true, weight: 1, categoryId: '' });
  const [checklistMessage, setChecklistMessage] = useState('');
  const [checklistMailNotice, setChecklistMailNotice] = useState<string | null>(null);
  const [commentModal, setCommentModal] = useState<null | 'approve' | 'reject'>(null);
  const [comment, setComment] = useState('');
  const [findingFor, setFindingFor] = useState<ChecklistQuestion | null>(null);
  const [findingForm, setFindingForm] = useState({
    description: '',
    severity: 'major' as FindingSeverity,
    responsibleDepartmentId: '',
    responsiblePersonId: '',
    dueDate: '',
  });

  const allottedIds = new Set((assignees.data ?? []).map((row) => row.userId));
  const availableUsers = (users.data ?? []).filter((user) => !allottedIds.has(user.id));

  const record = audit.data;
  const status = record?.status;
  const canAnswer = status === 'in_progress';

  const refreshAll = () => {
    audit.reload();
    checklist.reload();
  };

  const runStatusAction = async (path: string, body?: unknown) => {
    const result = await action.run(() => api.patch<Audit>(`/audits/${id}/${path}`, body ?? {}));
    if (result) refreshAll();
  };

  const toggleAllotSelection = (userId: string, checked: boolean) =>
    setAllotSelection((current) =>
      checked ? [...current, userId] : current.filter((value) => value !== userId),
    );

  /** Allots the selected users — the API notifies + emails them from the auditor. */
  const allotUsers = async () => {
    if (allotSelection.length === 0) return;

    const result = await action.run(() =>
      api.post<AuditAssignmentResult>(`/audits/${id}/assignees`, {
        userIds: allotSelection,
        notify: allotNotify,
        message: allotNote || undefined,
      }),
    );

    if (result) {
      setMailNotice({
        tone: 'success',
        text: describeMailing(result.email, result.newlyAllottedUsers?.length ?? 0),
      });
      setAllotSelection([]);
      setAllotNote('');
      assignees.reload();
      audit.reload();
    }
  };

  /** Re-sends the allotment email to everyone already allotted. */
  const emailAllottedUsers = async () => {
    const result = await action.run(() =>
      api.post<MailSummary>(`/audits/${id}/notify-assignees`, { message: allotNote || undefined }),
    );

    if (result) {
      setMailNotice({
        tone: 'success',
        text: describeMailing(result, (assignees.data ?? []).length),
      });
      assignees.reload();
      audit.reload();
    }
  };

  const removeAllottedUser = async (userId: string) => {
    const done = await action.run(() => api.delete(`/audits/${id}/assignees/${userId}`));
    if (done !== null) {
      assignees.reload();
      audit.reload();
    }
  };

  const openEditAudit = () => {
    if (!record) return;
    setEditAuditForm({
      title: record.title ?? '',
      description: record.description ?? '',
      departmentId: record.departmentId ?? '',
      locationId: record.locationId ?? '',
      scheduledDate: record.scheduledDate ? record.scheduledDate.slice(0, 10) : '',
      dueDate: record.dueDate ? record.dueDate.slice(0, 10) : '',
    });
    setEditAuditOpen(true);
  };

  const saveAuditDetails = async () => {
    if (!editAuditForm.title.trim()) return;
    const result = await action.run(() => api.patch<Audit>(`/audits/${id}`, {
      ...editAuditForm,
      title: editAuditForm.title.trim(),
      description: editAuditForm.description.trim() || undefined,
      scheduledDate: editAuditForm.scheduledDate || undefined,
      dueDate: editAuditForm.dueDate || undefined,
    }));
    if (result) {
      setEditAuditOpen(false);
      audit.reload();
      checklist.reload();
    }
  };

  const saveAnswer = async (question: ChecklistQuestion) => {
    const value = answers[question.id] ?? { answer: question.answer ?? '', comment: question.comment ?? '' };
    if (!value.answer) return;

    const result = await answerSubmit.run(() =>
      api.post(`/audits/${id}/answers/${question.id}`, { answer: value.answer, comment: value.comment }),
    );

    if (result !== null) {
      setSavedQuestion(question.id);
      refreshAll();
      setTimeout(() => setSavedQuestion((current) => (current === question.id ? null : current)), 2500);
    }
  };

  const openChecklistEditor = (categoryId: string, question: ChecklistQuestion | null) => {
    setChecklistEditor({ categoryId, question });
    setChecklistForm({
      questionText: question?.questionText ?? '',
      questionType: question?.questionType ?? 'yes_no',
      isMandatory: question?.isMandatory ?? true,
      weight: question?.weight ?? 1,
      categoryId,
    });
  };

  const saveChecklistQuestion = async () => {
    if (!checklistEditor || !checklistForm.questionText.trim()) return;
    const questionId = checklistEditor.question?.id;
    const result = questionId
      ? await action.run(() => api.patch(`/audits/${id}/checklist/questions/${questionId}`, checklistForm))
      : await action.run(() => api.post(`/audits/${id}/checklist/questions`, checklistForm));
    if (result !== null) {
      setChecklistEditor(null);
      checklist.reload();
    }
  };

  /** Persists local answer/comment edits before emailing the current checklist. */
  const saveEditedAnswers = async () => {
    if (!canAnswer) return true;

    const questions = (checklist.data?.categories ?? []).flatMap((category) => category.questions);
    for (const question of questions) {
      const localValue = answers[question.id];
      const value = localValue ?? { answer: question.answer ?? '', comment: question.comment ?? '' };
      if (!value.answer) continue;

      const saved = await answerSubmit.run(() =>
        api.post(`/audits/${id}/answers/${question.id}`, {
          answer: value.answer,
          comment: value.comment,
        }),
      );
      if (saved === null) return false;
    }

    refreshAll();
    return true;
  };

  const emailChecklist = async () => {
    const answersSaved = await saveEditedAnswers();
    if (!answersSaved) return;

    const result = await action.run(() => api.post<MailSummary>(`/audits/${id}/checklist/email`, { message: checklistMessage }));
    if (result) {
      setChecklistMailNotice(describeMailing(result, (assignees.data ?? []).length));
      setChecklistMessage('');
    }
  };

  const createFinding = async () => {
    if (!findingFor) return;

    const payload: Record<string, unknown> = {
      auditId: id,
      questionId: findingFor.id,
      description: findingForm.description,
      severity: findingForm.severity,
    };
    if (findingForm.responsibleDepartmentId) payload.responsibleDepartmentId = findingForm.responsibleDepartmentId;
    if (findingForm.responsiblePersonId) payload.responsiblePersonId = findingForm.responsiblePersonId;
    if (findingForm.dueDate) payload.dueDate = new Date(findingForm.dueDate).toISOString();

    const created = await action.run(() => api.post<Finding>('/findings', payload));
    if (created) {
      setFindingFor(null);
      setFindingForm({
        description: '',
        severity: 'major',
        responsibleDepartmentId: '',
        responsiblePersonId: '',
        dueDate: '',
      });
      refreshAll();
    }
  };

  const deleteAudit = async () => {
    if (!window.confirm('Delete this draft audit?')) return;
    const done = await action.run(() => api.delete(`/audits/${id}`));
    if (done !== null) router.push('/audits');
  };

  if (audit.loading) return <LoadingBlock label="Loading audit…" />;
  if (audit.error) return <ErrorBlock message={audit.error} onRetry={audit.reload} />;
  if (!record) return <EmptyState title="Audit not found" />;

  const findings = record.findings ?? [];
  const allQuestions = (checklist.data?.categories ?? []).flatMap((category) => category.questions);

  return (
    <div>
      <PageHeader
        title={record.auditNumber}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <MetaBadge meta={AUDIT_STATUS[record.status]} fallback={record.status} />
            <span>{record.title}</span>
            <span className="text-slate-400">·</span>
            <span>{record.template?.name}</span>
          </span>
        }
        actions={
          <>
            <a href={apiUrl(`/reports/audits/${id}/pdf`)} target="_blank" rel="noreferrer">
              <Button tone="neutral" size="sm">PDF</Button>
            </a>
            <a href={apiUrl(`/reports/audits/${id}/excel`)} target="_blank" rel="noreferrer">
              <Button tone="neutral" size="sm">Excel</Button>
            </a>

            <Button tone="neutral" size="sm" onClick={openEditAudit}>Edit audit</Button>
            {status === 'draft' ? (
              <Button size="sm" loading={action.submitting} onClick={() => runStatusAction('start')}>
                Start audit
              </Button>
            ) : null}
            {status === 'draft' ? (
              <Button tone="danger" size="sm" onClick={deleteAudit}>
                Delete
              </Button>
            ) : null}
            {status === 'in_progress' ? (
              <Button size="sm" loading={action.submitting} onClick={() => runStatusAction('submit')}>
                Submit for review
              </Button>
            ) : null}
            {status === 'submitted' || status === 'in_review' ? (
              <>
                <Button
                  tone="success"
                  size="sm"
                  onClick={() => {
                    setComment('');
                    setCommentModal('approve');
                  }}
                >
                  Approve
                </Button>
                <Button
                  tone="danger"
                  size="sm"
                  onClick={() => {
                    setComment('');
                    setCommentModal('reject');
                  }}
                >
                  Reject
                </Button>
              </>
            ) : null}
            {status === 'approved' ? (
              <Button size="sm" loading={action.submitting} onClick={() => runStatusAction('close')}>
                Close audit
              </Button>
            ) : null}
          </>
        }
      />

      {action.error ? <Alert tone="error" className="mb-4">{action.error}</Alert> : null}
      {answerSubmit.error ? <Alert tone="error" className="mb-4">{answerSubmit.error}</Alert> : null}

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'overview', label: 'Overview' },
          { key: 'checklist', label: 'Checklist', count: allQuestions.length },
          { key: 'findings', label: 'Findings', count: findings.length },
        ]}
      />

      {tab === 'overview' ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card title="Audit information" className="xl:col-span-2">
            <DefinitionList
              items={[
                { label: 'Template', value: `${record.template?.name || '—'} (v${record.template?.versionNumber ?? 1})` },
                { label: 'Audit type', value: humanize(record.auditType) },
                { label: 'Department', value: record.department?.name || '—' },
                { label: 'Location', value: record.location?.name || '—' },
                { label: 'Auditor', value: fullName(record.auditor) },
                { label: 'Created', value: formatDate(record.createdAt) },
                { label: 'Scheduled date', value: formatDate(record.scheduledDate) },
                { label: 'Due date', value: `${formatDate(record.dueDate)} (${dueLabel(record.dueDate)})` },
                { label: 'Actual start', value: formatDateTime(record.actualStart) },
                { label: 'Completed', value: formatDateTime(record.actualEnd) },
                { label: 'Approved by', value: record.approvedBy ? fullName(record.approvedBy) : '—' },
                { label: 'Approved at', value: formatDateTime(record.approvedAt) },
              ]}
            />
            {record.description ? (
              <div className="mt-5">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Description</p>
                <p className="mt-1 text-sm text-slate-700">{record.description}</p>
              </div>
            ) : null}
          </Card>

          <div className="space-y-6">
            <Card title="Progress &amp; score">
              <div className="space-y-4">
                <div>
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>Questions answered</span>
                    <span>
                      {record.answeredQuestions}/{record.totalQuestions}
                    </span>
                  </div>
                  <ProgressBar
                    value={
                      record.totalQuestions
                        ? (Number(record.answeredQuestions) / Number(record.totalQuestions)) * 100
                        : 0
                    }
                  />
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>Compliance</span>
                    <span>{percent(record.compliancePercentage)}</span>
                  </div>
                  <ProgressBar
                    value={Number(record.compliancePercentage)}
                    tone={Number(record.compliancePercentage) >= 80 ? 'success' : 'warning'}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Score</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {Number(record.score)} / {Number(record.maxScore)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Non-compliances</p>
                    <p className="text-lg font-semibold text-rose-600">{record.nonComplianceCount}</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card
              title="Allotted users"
              subtitle={`Allotted by ${fullName(record.auditor)} — every allotted user is emailed from the auditor`}
            >
              <div className="space-y-4">
                {mailNotice ? <Alert tone={mailNotice.tone}>{mailNotice.text}</Alert> : null}
                {action.error ? <Alert tone="error">{action.error}</Alert> : null}

                {assignees.loading ? (
                  <LoadingBlock label="Loading allotted users…" />
                ) : (assignees.data ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No users allotted yet. Select users below and allot them — they are emailed about this audit.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {(assignees.data ?? []).map((row) => (
                      <li
                        key={row.id}
                        className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-slate-800">{fullName(row.user)}</p>
                          <p className="truncate text-xs text-slate-500">{row.user?.email}</p>
                          <p className="text-[11px] text-slate-400">
                            {row.emailSentAt
                              ? `Email sent ${formatDateTime(row.emailSentAt)}`
                              : 'Email not sent yet'}
                          </p>
                        </div>
                        <Button
                          tone="neutral"
                          size="sm"
                          disabled={action.submitting}
                          onClick={() => removeAllottedUser(row.userId)}
                        >
                          Remove
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Allot more users
                  </p>

                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
                    {availableUsers.length === 0 ? (
                      <p className="px-1 py-2 text-xs text-slate-400">Every user is already allotted.</p>
                    ) : (
                      availableUsers.map((user) => (
                        <label
                          key={user.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-slate-300"
                            checked={allotSelection.includes(user.id)}
                            onChange={(event) => toggleAllotSelection(user.id, event.target.checked)}
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-slate-800">{fullName(user)}</span>
                            <span className="block truncate text-[11px] text-slate-400">{user.email}</span>
                          </span>
                        </label>
                      ))
                    )}
                  </div>

                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300"
                      checked={allotNotify}
                      onChange={(event) => setAllotNotify(event.target.checked)}
                    />
                    Email the allotted users from the auditor
                  </label>

                  <Textarea
                    rows={2}
                    placeholder="Optional note from the auditor (included in the email)"
                    value={allotNote}
                    onChange={(event) => setAllotNote(event.target.value)}
                  />

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      loading={action.submitting}
                      disabled={allotSelection.length === 0}
                      onClick={allotUsers}
                    >
                      Allot selected ({allotSelection.length})
                    </Button>
                    <Button
                      tone="neutral"
                      size="sm"
                      loading={action.submitting}
                      disabled={(assignees.data ?? []).length === 0}
                      onClick={emailAllottedUsers}
                      title="Re-send the allotment email to everyone already allotted"
                    >
                      Re-send email to allotted
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="Quick links">
              <div className="flex flex-col gap-2 text-sm">
                <a href={`/templates/${record.templateId}`} className="text-brand-700 hover:underline">
                  Open the audit template →
                </a>
                <a href={`/findings?auditId=${record.id}`} className="text-brand-700 hover:underline">
                  Findings for this audit →
                </a>
                <a href={`/reports?auditId=${record.id}`} className="text-brand-700 hover:underline">
                  Open in reports →
                </a>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'findings' ? (
        <Card title="Findings raised during this audit" padded={false}>
          {findings.length === 0 ? (
            <div className="p-5">
              <EmptyState
                title="No findings recorded"
                description="Non-compliances raised while answering the checklist appear here."
              />
            </div>
          ) : (
            <Table
              head={
                <tr>
                  <Th>Finding</Th>
                  <Th>Severity</Th>
                  <Th>Status</Th>
                  <Th>Responsible</Th>
                  <Th>Due</Th>
                  <Th>Corrective action</Th>
                </tr>
              }
            >
              {findings.map((finding) => (
                <tr key={finding.id} className="hover:bg-slate-50">
                  <Td>
                    <a href={`/findings/${finding.id}`} className="font-medium text-brand-700 hover:underline">
                      {finding.findingNumber}
                    </a>
                    <p className="text-xs text-slate-500">{truncate(finding.description, 60)}</p>
                  </Td>
                  <Td><MetaBadge meta={FINDING_SEVERITY[finding.severity]} fallback={finding.severity} /></Td>
                  <Td><MetaBadge meta={FINDING_STATUS[finding.status]} fallback={finding.status} /></Td>
                  <Td className="text-xs">
                    {fullName(finding.responsiblePerson)}
                    <p className="text-slate-400">{finding.responsibleDepartment?.name || '—'}</p>
                  </Td>
                  <Td className="text-xs text-slate-500">
                    {formatDate(finding.dueDate)}
                    <p className="text-slate-400">{dueLabel(finding.dueDate)}</p>
                  </Td>
                  <Td className="text-xs">
                    {finding.correctiveAction ? (
                      <a
                        href={`/corrective-actions/${finding.correctiveAction.id}`}
                        className="text-brand-700 hover:underline"
                      >
                        {finding.correctiveAction.actionNumber} · {humanize(finding.correctiveAction.status)}
                      </a>
                    ) : (
                      <span className="text-slate-400">Not raised</span>
                    )}
                  </Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      ) : null}

      {tab === 'checklist' ? (
        <div className="space-y-6">
          {!canAnswer ? (
            <Alert tone="info">
              The checklist can only be edited while the audit is <strong>in progress</strong>.
              {status === 'draft' ? ' Start the audit to begin answering.' : null}
            </Alert>
          ) : null}

          <Card title="Save and email checklist" className="mt-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
              <Field label="Message from auditor" hint={`Answers and comments are saved first, then the current questions are emailed to all ${(assignees.data ?? []).length} allotted users`}>
                <Textarea
                  rows={3}
                  value={checklistMessage}
                  onChange={(event) => setChecklistMessage(event.target.value)}
                  placeholder="Optional instructions for the allotted users…"
                />
              </Field>
              <Button
                tone="neutral"
                loading={action.submitting || answerSubmit.submitting}
                disabled={(assignees.data ?? []).length === 0 || checklist.loading}
                onClick={emailChecklist}
              >
                Save answers & email checklist
              </Button>
            </div>
            {checklistMailNotice ? <Alert tone="success" className="mt-3">{checklistMailNotice}</Alert> : null}
          </Card>

          {checklist.loading ? (
            <LoadingBlock label="Loading checklist…" />
          ) : checklist.error ? (
            <ErrorBlock message={checklist.error} onRetry={checklist.reload} />
          ) : (checklist.data?.categories ?? []).length === 0 ? (
            <EmptyState
              title="This template has no questions yet"
              description="Add categories and questions to the template to build the checklist."
              action={
                <a href={`/templates/${record.templateId}`}>
                  <Button size="sm">Edit template</Button>
                </a>
              }
            />
          ) : (
            (checklist.data?.categories ?? []).map((category) => (
              <Card key={category.id ?? category.name} title={category.name} subtitle={category.description} actions={canAnswer ? <Button tone="neutral" size="sm" onClick={() => openChecklistEditor(category.id ?? '', null)}>Add question</Button> : null}>
                <div className="space-y-4">
                  {category.questions.map((question) => (
                    <QuestionRow
                      key={question.id}
                      question={question}
                      canAnswer={canAnswer}
                      saved={savedQuestion === question.id}
                      saving={answerSubmit.submitting}
                      value={answers[question.id] ?? { answer: question.answer ?? '', comment: question.comment ?? '' }}
                      onChange={(next) =>
                        setAnswers((current) => ({ ...current, [question.id]: next }))
                      }
                      onSave={() => saveAnswer(question)}
                      onEditQuestion={canAnswer ? () => openChecklistEditor(category.id ?? '', question) : undefined}
                      onRaiseFinding={() => {
                        setFindingFor(question);
                        setFindingForm({
                          description: '',
                          severity: 'major',
                          responsibleDepartmentId: record.departmentId || '',
                          responsiblePersonId: '',
                          dueDate: '',
                        });
                      }}
                    />
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      ) : null}

      <Modal
        open={editAuditOpen}
        onClose={() => setEditAuditOpen(false)}
        title="Edit audit details"
        width="max-w-2xl"
        footer={
          <>
            <Button tone="neutral" onClick={() => setEditAuditOpen(false)}>Cancel</Button>
            <Button loading={action.submitting} disabled={!editAuditForm.title.trim()} onClick={saveAuditDetails}>
              Save audit
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Title" required>
            <Input value={editAuditForm.title} onChange={(event) => setEditAuditForm((current) => ({ ...current, title: event.target.value }))} />
          </Field>
          <Field label="Description">
            <Textarea rows={4} value={editAuditForm.description} onChange={(event) => setEditAuditForm((current) => ({ ...current, description: event.target.value }))} />
          </Field>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Department">
              <Select value={editAuditForm.departmentId} onChange={(event) => setEditAuditForm((current) => ({ ...current, departmentId: event.target.value }))}>
                <option value="">Unassigned</option>
                {(departments.data ?? []).map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
              </Select>
            </Field>
            <Field label="Location">
              <Select value={editAuditForm.locationId} onChange={(event) => setEditAuditForm((current) => ({ ...current, locationId: event.target.value }))}>
                <option value="">Not specified</option>
                {(locations.data ?? []).map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </Select>
            </Field>
            <Field label="Scheduled date">
              <Input type="date" value={editAuditForm.scheduledDate} onChange={(event) => setEditAuditForm((current) => ({ ...current, scheduledDate: event.target.value }))} />
            </Field>
            <Field label="Due date">
              <Input type="date" value={editAuditForm.dueDate} onChange={(event) => setEditAuditForm((current) => ({ ...current, dueDate: event.target.value }))} />
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        open={checklistEditor !== null}
        onClose={() => setChecklistEditor(null)}
        title={checklistEditor?.question ? 'Edit checklist question' : 'Add checklist question'}
        footer={
          <>
            <Button tone="neutral" onClick={() => setChecklistEditor(null)}>Cancel</Button>
            <Button
              loading={action.submitting}
              disabled={!checklistForm.questionText.trim()}
              onClick={saveChecklistQuestion}
            >
              Save question
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Question" required>
            <Textarea
              rows={3}
              value={checklistForm.questionText}
              onChange={(event) => setChecklistForm((current) => ({ ...current, questionText: event.target.value }))}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Field label="Question type">
              <Select
                value={checklistForm.questionType}
                onChange={(event) => setChecklistForm((current) => ({ ...current, questionType: event.target.value }))}
              >
                {QUESTION_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
              </Select>
            </Field>
            <Field label="Weight">
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={checklistForm.weight}
                onChange={(event) => setChecklistForm((current) => ({ ...current, weight: Number(event.target.value) }))}
              />
            </Field>
            <Field label="Mandatory">
              <Select
                value={checklistForm.isMandatory ? 'yes' : 'no'}
                onChange={(event) => setChecklistForm((current) => ({ ...current, isMandatory: event.target.value === 'yes' }))}
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
            </Field>
          </div>
        </div>
      </Modal>

      <Modal
        open={commentModal !== null}
        onClose={() => setCommentModal(null)}
        title={commentModal === 'approve' ? 'Approve audit' : 'Reject audit'}
        footer={
          <>
            <Button tone="neutral" onClick={() => setCommentModal(null)}>
              Cancel
            </Button>
            <Button
              tone={commentModal === 'approve' ? 'success' : 'danger'}
              loading={action.submitting}
              onClick={async () => {
                await runStatusAction(commentModal === 'approve' ? 'approve' : 'reject', { comments: comment });
                setCommentModal(null);
              }}
            >
              {commentModal === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </>
        }
      >
        <Field label="Comments" hint="Recorded in the audit trail and sent to the auditor">
          <Textarea
            rows={4}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={
              commentModal === 'approve'
                ? 'Audit verified against the checklist evidence.'
                : 'Please correct the following points and resubmit…'
            }
          />
        </Field>
      </Modal>

      <Modal
        open={findingFor !== null}
        onClose={() => setFindingFor(null)}
        title="Raise a finding"
        width="max-w-2xl"
        footer={
          <>
            <Button tone="neutral" onClick={() => setFindingFor(null)}>
              Cancel
            </Button>
            <Button
              loading={action.submitting}
              disabled={!findingForm.description.trim()}
              onClick={createFinding}
            >
              Create finding
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <span className="font-medium">Question:</span> {findingFor?.questionText}
          </div>

          <Field label="Description of the non-conformity" required>
            <Textarea
              rows={4}
              value={findingForm.description}
              onChange={(event) =>
                setFindingForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder="Describe what was found, where and why it does not meet the requirement."
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Severity" required>
              <Select
                value={findingForm.severity}
                onChange={(event) =>
                  setFindingForm((current) => ({
                    ...current,
                    severity: event.target.value as FindingSeverity,
                  }))
                }
              >
                {(Object.keys(FINDING_SEVERITY) as FindingSeverity[]).map((severity) => (
                  <option key={severity} value={severity}>
                    {FINDING_SEVERITY[severity].label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Target closure date">
              <Input
                type="date"
                value={findingForm.dueDate}
                onChange={(event) =>
                  setFindingForm((current) => ({ ...current, dueDate: event.target.value }))
                }
              />
            </Field>

            <Field label="Responsible department">
              <Select
                value={findingForm.responsibleDepartmentId}
                onChange={(event) =>
                  setFindingForm((current) => ({ ...current, responsibleDepartmentId: event.target.value }))
                }
              >
                <option value="">Not specified</option>
                {(departments.data ?? []).map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Responsible person">
              <Select
                value={findingForm.responsiblePersonId}
                onChange={(event) =>
                  setFindingForm((current) => ({ ...current, responsiblePersonId: event.target.value }))
                }
              >
                <option value="">Not specified</option>
                {(users.data ?? []).map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** A single checklist question with its answer, comment and finding shortcut. */
function QuestionRow({
  question,
  canAnswer,
  saved,
  saving,
  value,
  onChange,
  onSave,
  onEditQuestion,
  onRaiseFinding,
}: {
  question: ChecklistQuestion;
  canAnswer: boolean;
  saved: boolean;
  saving: boolean;
  value: { answer: string; comment: string };
  onChange: (next: { answer: string; comment: string }) => void;
  onSave: () => void;
  onEditQuestion?: () => void;
  onRaiseFinding: () => void;
}) {
  const canRaise = value.answer === 'non_compliant' || value.answer === 'observation';

  return (
    <div className="rounded-lg border border-slate-200 p-4 transition hover:border-slate-300">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="max-w-2xl text-sm font-medium text-slate-800">
          {question.questionText}
          {question.isMandatory ? <span className="ml-1 text-rose-500">*</span> : null}
        </p>
        <span className="text-xs text-slate-400">
          {humanize(question.questionType)} · weight {question.weight}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
        <Field label="Answer">
          <Select
            disabled={!canAnswer}
            value={value.answer}
            onChange={(event) => onChange({ ...value, answer: event.target.value })}
          >
            <option value="">Select…</option>
            {ANSWER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Comment" className="md:col-span-2">
          <Input
            disabled={!canAnswer}
            placeholder="Objective evidence, observations…"
            value={value.comment}
            onChange={(event) => onChange({ ...value, comment: event.target.value })}
          />
        </Field>

        <div className="flex items-end gap-2">
          <Button size="sm" disabled={!canAnswer || !value.answer} loading={saving} onClick={onSave}>
            {saved ? 'Saved ✓' : 'Save'}
          </Button>
          {onEditQuestion ? (
            <Button tone="neutral" size="sm" onClick={onEditQuestion}>Edit question</Button>
          ) : null}
          <Button tone="warning" size="sm" disabled={!canRaise} onClick={onRaiseFinding}>
            Raise finding
          </Button>
        </div>
      </div>

      {question.findingId ? (
        <p className="mt-2 text-xs text-amber-700">
          A finding has been raised for this question —{' '}
          <a href={`/findings/${question.findingId}`} className="underline">
            open finding
          </a>
        </p>
      ) : null}
    </div>
  );
}
