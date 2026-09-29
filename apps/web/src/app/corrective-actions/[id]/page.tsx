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
  LoadingBlock,
  MetaBadge,
  Modal,
  PageHeader,
  Select,
  Textarea,
} from '@/components/ui';
import { api } from '@/lib/api';
import { ACTION_STATUS } from '@/lib/constants';
import { dueLabel, formatDate, formatDateTime, fullName } from '@/lib/format';
import { useApi, useSubmit } from '@/lib/hooks';
import type { ActionStatus, CorrectiveAction } from '@/lib/types';

export default function CorrectiveActionDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const action = useApi<CorrectiveAction>(`/corrective-actions/${id}`);
  const mutation = useSubmit();
  const [status, setStatus] = useState<ActionStatus | ''>('');
  const [verifyModal, setVerifyModal] = useState(false);
  const [comments, setComments] = useState('');
  const [edit, setEdit] = useState<null | {
    rootCause: string;
    correctiveAction: string;
    preventiveAction: string;
  }>(null);

  const record = action.data;
  const canEdit = record && !['closed', 'verification'].includes(record.status);
  const canSubmit =
    record && ['open', 'assigned', 'in_progress', 'completed'].includes(record.status);
  const canVerify = record && record.status === 'verification';

  const changeStatus = async (next: ActionStatus) => {
    const result = await mutation.run(() =>
      api.patch(`/corrective-actions/${id}/status`, { status: next }),
    );
    if (result !== null) {
      setStatus('');
      action.reload();
    }
  };

  const submitForVerification = async () => {
    const result = await mutation.run(() => api.patch(`/corrective-actions/${id}/submit`));
    if (result !== null) action.reload();
  };

  const saveEdit = async () => {
    if (!edit) return;
    const result = await mutation.run(() =>
      api.patch(`/corrective-actions/${id}`, {
        rootCause: edit.rootCause,
        correctiveAction: edit.correctiveAction,
        preventiveAction: edit.preventiveAction,
      }),
    );
    if (result !== null) {
      setEdit(null);
      action.reload();
    }
  };

  const verify = async () => {
    const result = await mutation.run(() =>
      api.patch(`/corrective-actions/${id}/verify`, { comments }),
    );
    if (result !== null) {
      setVerifyModal(false);
      action.reload();
    }
  };

  if (action.loading) return <LoadingBlock label="Loading corrective action…" />;
  if (action.error) return <ErrorBlock message={action.error} onRetry={action.reload} />;
  if (!record) return <EmptyState title="Corrective action not found" />;

  return (
    <div>
      <PageHeader
        title={record.actionNumber}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <MetaBadge meta={ACTION_STATUS[record.status]} fallback={record.status} />
            {record.finding ? (
              <a href={`/findings/${record.finding.id}`} className="text-brand-700 hover:underline">
                Finding {record.finding.findingNumber}
              </a>
            ) : null}
            {record.finding?.audit ? (
              <a href={`/audits/${record.finding.audit.id}`} className="text-brand-700 hover:underline">
                · Audit {record.finding.audit.auditNumber}
              </a>
            ) : null}
          </span>
        }
        actions={
          <>
            {canEdit ? (
              <Button
                tone="neutral"
                size="sm"
                onClick={() =>
                  setEdit({
                    rootCause: record.rootCause || '',
                    correctiveAction: record.correctiveAction || '',
                    preventiveAction: record.preventiveAction || '',
                  })
                }
              >
                Edit
              </Button>
            ) : null}
            {canSubmit ? (
              <Button size="sm" loading={mutation.submitting} onClick={submitForVerification}>
                Submit for verification
              </Button>
            ) : null}
            {canVerify ? (
              <Button
                tone="success"
                size="sm"
                onClick={() => {
                  setComments('');
                  setVerifyModal(true);
                }}
              >
                Verify &amp; close
              </Button>
            ) : null}
            <Select
              className="w-48"
              value={status}
              onChange={(event) => {
                const next = event.target.value as ActionStatus;
                setStatus(next);
                if (next) changeStatus(next);
              }}
            >
              <option value="">Change status…</option>
              {(Object.keys(ACTION_STATUS) as ActionStatus[])
                .filter((key) => key !== record.status)
                .map((key) => (
                  <option key={key} value={key}>
                    {ACTION_STATUS[key].label}
                  </option>
                ))}
            </Select>
          </>
        }
      />

      {mutation.error ? <Alert tone="error" className="mb-4">{mutation.error}</Alert> : null}

      {edit ? (
        <Card title="Edit corrective action" className="mb-6">
          <div className="space-y-4">
            <Field label="Root cause">
              <Textarea
                rows={3}
                value={edit.rootCause}
                onChange={(event) => setEdit({ ...edit, rootCause: event.target.value })}
              />
            </Field>
            <Field label="Corrective action">
              <Textarea
                rows={3}
                value={edit.correctiveAction}
                onChange={(event) => setEdit({ ...edit, correctiveAction: event.target.value })}
              />
            </Field>
            <Field label="Preventive action">
              <Textarea
                rows={3}
                value={edit.preventiveAction}
                onChange={(event) => setEdit({ ...edit, preventiveAction: event.target.value })}
              />
            </Field>
            <div className="flex items-center justify-end gap-2">
              <Button tone="neutral" onClick={() => setEdit(null)}>
                Cancel
              </Button>
              <Button loading={mutation.submitting} onClick={saveEdit}>
                Save changes
              </Button>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Action details" className="xl:col-span-2">
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Root cause</p>
              <p className="mt-1 whitespace-pre-line text-slate-700">{record.rootCause || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Corrective action</p>
              <p className="mt-1 whitespace-pre-line text-slate-700">{record.correctiveAction}</p>
            </div>
            {record.preventiveAction ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Preventive action</p>
                <p className="mt-1 whitespace-pre-line text-slate-700">{record.preventiveAction}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <DefinitionList
              items={[
                { label: 'Assigned to', value: fullName(record.assignedTo) },
                { label: 'Status', value: ACTION_STATUS[record.status]?.label || record.status },
                { label: 'Due date', value: `${formatDate(record.dueDate)} (${dueLabel(record.dueDate)})` },
                { label: 'Completed on', value: formatDateTime(record.completionDate) },
                { label: 'Verified by', value: fullName(record.verifiedBy) },
                { label: 'Closed on', value: formatDateTime(record.closedAt) },
                { label: 'Raised by', value: fullName(record.createdBy) },
                { label: 'Created', value: formatDate(record.createdAt) },
              ]}
            />
          </div>
        </Card>

        <Card title="Verification">
          {record.verificationComments || record.verifiedBy ? (
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Verified by</p>
                <p className="text-slate-700">{fullName(record.verifiedBy)}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Verification comments</p>
                <p className="mt-1 whitespace-pre-line text-slate-700">
                  {record.verificationComments || '—'}
                </p>
              </div>
            </div>
          ) : (
            <EmptyState
              title={record.status === 'verification' ? 'Awaiting verification' : 'Not yet submitted'}
              description={
                record.status === 'verification'
                  ? 'An auditor or manager needs to verify and close this action.'
                  : 'Submit the action for verification once the work is complete.'
              }
            />
          )}

          {record.finding ? (
            <div className="mt-5 border-t border-slate-100 pt-4 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Linked finding</p>
              <p className="mt-1 text-slate-700">{record.finding.description}</p>
              <a href={`/findings/${record.finding.id}`} className="mt-1 inline-block text-brand-700 hover:underline">
                Open finding →
              </a>
            </div>
          ) : null}
        </Card>
      </div>

      <Modal
        open={verifyModal}
        onClose={() => setVerifyModal(false)}
        title="Verify and close corrective action"
        footer={
          <>
            <Button tone="neutral" onClick={() => setVerifyModal(false)}>
              Cancel
            </Button>
            <Button tone="success" loading={mutation.submitting} onClick={verify}>
              Verify &amp; close
            </Button>
          </>
        }
      >
        <Field
          label="Verification comments"
          hint="Confirming the corrective action resolves the finding — the linked finding will be closed automatically."
        >
          <Textarea
            rows={4}
            value={comments}
            onChange={(event) => setComments(event.target.value)}
            placeholder="Evidence reviewed, implementation confirmed…"
          />
        </Field>
      </Modal>
    </div>
  );
}
