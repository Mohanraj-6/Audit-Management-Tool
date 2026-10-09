'use client';

import { useParams } from 'next/navigation';
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
  Select,
  Textarea,
} from '@/components/ui';
import { api } from '@/lib/api';
import { FINDING_SEVERITY, FINDING_STATUS, humanize } from '@/lib/constants';
import { dueLabel, formatDate, formatDateTime, fullName } from '@/lib/format';
import { useApi, useSubmit, useUsers } from '@/lib/hooks';
import type { CorrectiveAction, Finding, FindingStatus } from '@/lib/types';

export default function FindingDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const finding = useApi<Finding>(`/findings/${id}`);
  const users = useUsers();
  const action = useSubmit();
  const actionSubmit = useSubmit();
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [status, setStatus] = useState<FindingStatus | ''>('');
  const [form, setForm] = useState({
    rootCause: '',
    correctiveAction: '',
    preventiveAction: '',
    assignedToId: '',
    dueDate: '',
  });

  const record = finding.data;

  const changeStatus = async (next: FindingStatus) => {
    const result = await action.run(() => api.patch(`/findings/${id}/status`, { status: next }));
    if (result !== null) {
      setStatus('');
      finding.reload();
    }
  };

  const createAction = async () => {
    const payload: Record<string, unknown> = {
      findingId: id,
      rootCause: form.rootCause,
      correctiveAction: form.correctiveAction,
      assignedToId: form.assignedToId,
      dueDate: new Date(form.dueDate).toISOString(),
    };
    if (form.preventiveAction) payload.preventiveAction = form.preventiveAction;

    const created = await actionSubmit.run(() => api.post<CorrectiveAction>('/corrective-actions', payload));
    if (created) {
      setActionModalOpen(false);
      finding.reload();
    }
  };

  if (finding.loading) return <LoadingBlock label="Loading finding…" />;
  if (finding.error) return <ErrorBlock message={finding.error} onRetry={finding.reload} />;
  if (!record) return <EmptyState title="Finding not found" />;

  const corrective = record.correctiveAction;

  return (
    <div>
      <PageHeader
        title={record.findingNumber}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <MetaBadge meta={FINDING_SEVERITY[record.severity]} fallback={record.severity} />
            <MetaBadge meta={FINDING_STATUS[record.status]} fallback={record.status} />
            {record.audit ? (
              <a href={`/audits/${record.audit.id}`} className="text-brand-700 hover:underline">
                {record.audit.auditNumber}
              </a>
            ) : null}
          </span>
        }
        actions={
          <>
            <Select
              className="w-48"
              value={status}
              onChange={(event) => {
                const next = event.target.value as FindingStatus;
                setStatus(next);
                if (next) changeStatus(next);
              }}
            >
              <option value="">Change status…</option>
              {(Object.keys(FINDING_STATUS) as FindingStatus[])
                .filter((key) => key !== record.status)
                .map((key) => (
                  <option key={key} value={key}>
                    {FINDING_STATUS[key].label}
                  </option>
                ))}
            </Select>
            {!corrective ? (
              <Button size="sm" onClick={() => setActionModalOpen(true)}>
                Create corrective action
              </Button>
            ) : null}
          </>
        }
      />

      {action.error ? <Alert tone="error" className="mb-4">{action.error}</Alert> : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Finding details" className="xl:col-span-2">
          <p className="mb-4 whitespace-pre-line text-sm text-slate-700">{record.description}</p>
          <DefinitionList
            items={[
              { label: 'Audit', value: record.audit?.auditNumber || '—' },
              { label: 'Category / clause', value: record.category || '—' },
              { label: 'Severity', value: FINDING_SEVERITY[record.severity]?.label || record.severity },
              { label: 'Status', value: FINDING_STATUS[record.status]?.label || record.status },
              { label: 'Responsible department', value: record.responsibleDepartment?.name || '—' },
              { label: 'Responsible person', value: fullName(record.responsiblePerson) },
              { label: 'Target closure', value: `${formatDate(record.dueDate)} (${dueLabel(record.dueDate)})` },
              { label: 'Raised by', value: fullName(record.createdBy) },
              { label: 'Raised on', value: formatDate(record.createdAt) },
              { label: 'Closed on', value: formatDateTime(record.closedAt) },
            ]}
          />
        </Card>

        <Card title="Corrective action">
          {corrective ? (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Action number</p>
                <a
                  href={`/corrective-actions/${corrective.id}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {corrective.actionNumber}
                </a>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
                <p>{humanize(corrective.status)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Assigned to</p>
                <p>{fullName(corrective.assignedTo)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Due date</p>
                <p>
                  {formatDate(corrective.dueDate)} ({dueLabel(corrective.dueDate)})
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Root cause</p>
                <p className="text-slate-700">{corrective.rootCause || '—'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Corrective action</p>
                <p className="text-slate-700">{corrective.correctiveAction}</p>
              </div>
              {corrective.preventiveAction ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400">Preventive action</p>
                  <p className="text-slate-700">{corrective.preventiveAction}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState
              title="No corrective action yet"
              description="Raise a corrective action to track the resolution of this finding."
              action={
                <Button size="sm" onClick={() => setActionModalOpen(true)}>
                  Create corrective action
                </Button>
              }
            />
          )}
        </Card>
      </div>

      <Modal
        open={actionModalOpen}
        onClose={() => setActionModalOpen(false)}
        title="Create corrective action"
        width="max-w-2xl"
        footer={
          <>
            <Button tone="neutral" onClick={() => setActionModalOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={actionSubmit.submitting}
              disabled={!form.correctiveAction.trim() || !form.assignedToId || !form.dueDate}
              onClick={createAction}
            >
              Create action
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {actionSubmit.error ? <Alert tone="error">{actionSubmit.error}</Alert> : null}

          <Field label="Root cause analysis" required>
            <Textarea
              rows={3}
              value={form.rootCause}
              onChange={(event) => setForm((current) => ({ ...current, rootCause: event.target.value }))}
              placeholder="Why did the non-conformity occur?"
            />
          </Field>

          <Field label="Corrective action" required>
            <Textarea
              rows={3}
              value={form.correctiveAction}
              onChange={(event) =>
                setForm((current) => ({ ...current, correctiveAction: event.target.value }))
              }
              placeholder="What will be done to fix the issue?"
            />
          </Field>

          <Field label="Preventive action">
            <Textarea
              rows={3}
              value={form.preventiveAction}
              onChange={(event) =>
                setForm((current) => ({ ...current, preventiveAction: event.target.value }))
              }
              placeholder="What will stop it from recurring?"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Assign to" required>
              <Select
                value={form.assignedToId}
                onChange={(event) => setForm((current) => ({ ...current, assignedToId: event.target.value }))}
              >
                <option value="">Select an action owner…</option>
                {(users.data ?? []).map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.firstName} {user.lastName}
                    {user.role?.name ? ` — ${humanize(user.role.name)}` : ''}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Due date" required>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))}
              />
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  );
}
