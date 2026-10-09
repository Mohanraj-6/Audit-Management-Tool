'use client';

import { useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  Field,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
  Table,
  Td,
  Textarea,
  Th,
} from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, truncate } from '@/lib/format';
import { useApi, useSubmit } from '@/lib/hooks';
import type { Setting } from '@/lib/types';

type SettingForm = {
  id?: string;
  key: string;
  value: string;
  type: string;
  description: string;
  isPublic: boolean;
};

function renderValue(setting: Setting): string {
  const v = setting.value;
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

interface MailStatus {
  mode: 'smtp' | 'outbox';
  smtp: { host: string; port: number; secure: boolean; user: string | null } | null;
  from: string | null;
  outboxDir: string;
  hint: string;
}

interface OutboxMail {
  file: string;
  to: string | null;
  from: string | null;
  subject: string | null;
  date: string | null;
  mode: string | null;
}

/**
 * Shows how the API delivers allotment emails and lets you send a test message.
 * With no SMTP host configured every message is captured in the dev outbox.
 */
function EmailDeliveryCard() {
  const status = useApi<MailStatus>('/mail/status');
  const outbox = useApi<{ directory: string; count: number; mails: OutboxMail[] }>(
    status.data?.mode === 'outbox' ? '/mail/outbox?limit=5' : null,
  );
  const send = useSubmit();
  const [testTo, setTestTo] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  const sendTest = async () => {
    const result = await send.run(() =>
      api.post<{ delivered: boolean; transport: string; file?: string; error?: string }>('/mail/test', {
        to: testTo,
      }),
    );

    if (result) {
      setNotice(
        result.transport === 'smtp'
          ? `Test email delivered to ${testTo}.`
          : result.transport === 'outbox'
            ? `SMTP is not configured — the test email was written to ${result.file ?? 'the outbox folder'}.`
            : `The test email could not be sent: ${result.error ?? 'unknown error'}`,
      );
      outbox.reload();
    }
  };

  return (
    <Card
      title="Email delivery"
      subtitle="How audit allotment emails are sent to users"
      className="mb-6"
      actions={
        <Badge
          className={
            status.data?.mode === 'smtp'
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-amber-50 text-amber-700 ring-amber-200'
          }
        >
          {status.data?.mode === 'smtp' ? 'SMTP configured' : 'Dev outbox'}
        </Badge>
      }
    >
      {status.loading ? (
        <LoadingBlock label="Checking mail settings…" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Transport</p>
              <p className="text-slate-800">
                {status.data?.mode === 'smtp'
                  ? `SMTP ${status.data?.smtp?.host}:${status.data?.smtp?.port}`
                  : 'Dev outbox (no SMTP_HOST set)'}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Sender</p>
              <p className="text-slate-800">
                {status.data?.from ? status.data.from : 'The auditor of the audit (Reply-To)'}
              </p>
            </div>
          </div>

          <p className="text-xs text-slate-400">{status.data?.hint}</p>

          {notice ? <Alert tone="info">{notice}</Alert> : null}
          {send.error ? <Alert tone="error">{send.error}</Alert> : null}

          <div className="flex flex-wrap items-end gap-2">
            <Field label="Send a test email to" className="w-full sm:w-72">
              <Input
                type="email"
                placeholder="you@chiptest.in"
                value={testTo}
                onChange={(event) => setTestTo(event.target.value)}
              />
            </Field>
            <Button loading={send.submitting} disabled={!testTo} onClick={sendTest}>
              Send test email
            </Button>
          </div>

          {status.data?.mode === 'outbox' ? (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Recently captured messages
              </p>
              {(outbox.data?.mails ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">Nothing captured yet.</p>
              ) : (
                <ul className="space-y-1">
                  {(outbox.data?.mails ?? []).map((mail) => (
                    <li key={mail.file} className="rounded-lg border border-slate-200 px-3 py-2">
                      <span className="block truncate text-sm font-medium text-slate-800">
                        {mail.subject}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        To: {mail.to} · From: {mail.from}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 break-all text-xs text-slate-400">
                Folder: {outbox.data?.directory ?? status.data?.outboxDir}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </Card>
  );
}

export default function SettingsPage() {
  const settings = useApi<Setting[]>('/settings');
  const submit = useSubmit();
  const [editing, setEditing] = useState<SettingForm | null>(null);

  const openCreate = () =>
    setEditing({
      key: '',
      value: '',
      type: 'string',
      description: '',
      isPublic: false,
    });
  const openEdit = (setting: Setting) =>
    setEditing({
      id: setting.key,
      key: setting.key,
      value: setting.value === null || setting.value === undefined ? '' : String(setting.value),
      type: setting.type,
      description: setting.description || '',
      isPublic: setting.isPublic,
    });

  const save = async () => {
    if (!editing) return;
    const payload: Record<string, unknown> = {
      value: editing.type === 'number' ? Number(editing.value) : editing.value,
      type: editing.type,
      description: editing.description || undefined,
      isPublic: editing.isPublic,
    };

    const result = editing.id
      ? await submit.run(() => api.patch(`/settings/${editing.id}`, payload))
      : await submit.run(() => api.post('/settings', { key: editing.key, ...payload }));
    if (result !== null) {
      setEditing(null);
      settings.reload();
    }
  };

  const remove = async (setting: Setting) => {
    if (!window.confirm(`Delete setting "${setting.key}"?`)) return;
    const result = await submit.run(() => api.delete(`/settings/${setting.key}`));
    if (result !== null) settings.reload();
  };

  const rows = settings.data ?? [];

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="System-wide configuration stored as key/value pairs"
        actions={<Button onClick={openCreate}>Add setting</Button>}
      />

      <EmailDeliveryCard />

      {submit.error ? (
        <Alert tone="error" className="mb-4">
          {submit.error}
        </Alert>
      ) : null}

      {settings.error ? (
        <ErrorBlock message={settings.error} onRetry={settings.reload} />
      ) : settings.loading ? (
        <LoadingBlock label="Loading settings…" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No settings yet"
          description="System settings are stored as key/value pairs and drive behaviour across the application."
          action={<Button onClick={openCreate}>Add setting</Button>}
        />
      ) : (
        <Card padded={false}>
          <Table
            head={
              <tr>
                <Th>Key</Th>
                <Th>Value</Th>
                <Th>Type</Th>
                <Th>Public</Th>
                <Th>Updated</Th>
                <Th>Actions</Th>
              </tr>
            }
          >
            {rows.map((setting) => (
              <tr key={setting.key} className="hover:bg-slate-50">
                <Td className="font-mono text-xs text-slate-800">{setting.key}</Td>
                <Td className="text-xs text-slate-600">{truncate(renderValue(setting), 80)}</Td>
                <Td className="text-xs text-slate-500">{setting.type || '—'}</Td>
                <Td className="text-xs">
                  {setting.isPublic ? (
                    <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">
                      Public
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-500 ring-slate-200">
                      Private
                    </Badge>
                  )}
                </Td>
                <Td className="text-xs text-slate-500">{formatDate(setting.updatedAt)}</Td>
                <Td>
                  <div className="flex gap-2">
                    <Button tone="neutral" size="sm" onClick={() => openEdit(setting)}>
                      Edit
                    </Button>
                    <Button tone="danger" size="sm" onClick={() => remove(setting)}>
                      Delete
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit setting' : 'Add setting'}
        footer={
          <>
            <Button tone="neutral" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              loading={submit.submitting}
              disabled={!editing?.key || !editing?.value}
              onClick={save}
            >
              {editing?.id ? 'Save changes' : 'Create setting'}
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="space-y-4">
            {submit.error ? <Alert tone="error">{submit.error}</Alert> : null}

            <Field label="Key" hint="Unique setting identifier" required>
              <Input
                value={editing.key}
                disabled={!!editing.id}
                onChange={(event) => setEditing({ ...editing, key: event.target.value })}
              />
            </Field>
            <Field label="Value" required>
              <Textarea
                rows={3}
                value={editing.value}
                onChange={(event) => setEditing({ ...editing, value: event.target.value })}
              />
            </Field>
            <Field label="Type">
              <Select
                value={editing.type}
                onChange={(event) => setEditing({ ...editing, type: event.target.value })}
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="object">Object (JSON)</option>
              </Select>
            </Field>
            <Field label="Description">
              <Textarea
                rows={2}
                value={editing.description}
                onChange={(event) => setEditing({ ...editing, description: event.target.value })}
              />
            </Field>
            <Field label="Public">
              <Select
                value={editing.isPublic ? 'yes' : 'no'}
                onChange={(event) =>
                  setEditing({ ...editing, isPublic: event.target.value === 'yes' })
                }
              >
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </Select>
            </Field>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
