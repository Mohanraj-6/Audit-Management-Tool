'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Alert, Button, Card, Field, Input, LoadingBlock, PageHeader, Select, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { AUDIT_TYPES } from '@/lib/constants';
import { fullName } from '@/lib/format';
import { useApi, useDepartments, useLocations, useSubmit, useTemplates, useUsers } from '@/lib/hooks';
import type { Audit } from '@/lib/types';

/** Returns a yyyy-mm-dd string for "today + n days" used to pre-fill dates. */
function offsetDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default function NewAuditPage() {
  const router = useRouter();
  const templates = useTemplates();
  const departments = useDepartments();
  const locations = useLocations();
  const users = useUsers();
  const settings = useApi<Array<{ key: string; value: any }>>('/settings');
  const submit = useSubmit();

  const defaultDueDays = useMemo(() => {
    const setting = (settings.data ?? []).find((row) => row.key === 'default_audit_due_days');
    const value = Number(setting?.value);
    return Number.isFinite(value) && value > 0 ? value : 14;
  }, [settings.data]);

  const [form, setForm] = useState({
    title: '',
    description: '',
    templateId: '',
    departmentId: '',
    locationId: '',
    auditType: '',
    auditorId: '',
    scheduledDate: offsetDate(1),
    dueDate: offsetDate(1 + defaultDueDays),
  });

  // Users the auditor allots to this audit — they are notified in-app and by
  // email as soon as the audit is created.
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [notifyAssignees, setNotifyAssignees] = useState(true);
  const [assignmentMessage, setAssignmentMessage] = useState('');
  const mailStatus = useApi<{ mode: string; hint: string }>('/mail/status');

  const toggleAssignee = (userId: string, checked: boolean) =>
    setAssigneeIds((current) =>
      checked ? [...current, userId] : current.filter((id) => id !== userId),
    );

  const auditorLabel = useMemo(() => {
    const selected = (users.data ?? []).find((user) => user.id === form.auditorId);
    return selected ? `${fullName(selected)} (${selected.email})` : 'Mohanraj (default auditor)';
  }, [users.data, form.auditorId]);

  const auditors = (users.data ?? []).filter(
    (user) => user.role?.name === 'auditor' || user.role?.name === 'admin',
  );

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // Only IDs returned by GET /users are valid allotment values. Keep the
    // strict v4 contract at the API boundary while preventing stale UI values.
    const selectedAssigneeIds = assigneeIds.filter((id) =>
      (users.data ?? []).some(
        (user) =>
          user.id === id &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id),
      ),
    );

    const payload: Record<string, unknown> = {
      title: form.title,
      templateId: form.templateId,
      departmentId: form.departmentId,
    };
    if (form.description) payload.description = form.description;
    if (form.locationId) payload.locationId = form.locationId;
    if (form.auditType) payload.auditType = form.auditType;
    if (form.scheduledDate) payload.scheduledDate = new Date(form.scheduledDate).toISOString();
    if (form.dueDate) payload.dueDate = new Date(form.dueDate).toISOString();
    if (form.auditorId) payload.auditorId = form.auditorId;

    // Allot the selected users — the API notifies + emails them from the auditor.
    if (selectedAssigneeIds.length > 0) {
      payload.assigneeIds = selectedAssigneeIds;
      payload.notifyAssignees = notifyAssignees;
      if (notifyAssignees && assignmentMessage) payload.assignmentMessage = assignmentMessage;
    }

    const created = await submit.run(() => api.post<Audit>('/audits', payload));
    if (created) router.push(`/audits/${created.id}`);
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Create audit"
        subtitle="An audit is created from a template — the checklist questions come from that template."
      />

      {submit.error ? <Alert tone="error" className="mb-4">{submit.error}</Alert> : null}

      {templates.loading ? (
        <LoadingBlock />
      ) : (
        <form onSubmit={onSubmit}>
          <Card title="Audit details">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Title" required className="md:col-span-2">
                <Input
                  required
                  placeholder="Q1 Internal Quality Audit — Assembly"
                  value={form.title}
                  onChange={(event) => set('title')(event.target.value)}
                />
              </Field>

              <Field label="Template" required>
                <Select
                  required
                  value={form.templateId}
                  onChange={(event) => set('templateId')(event.target.value)}
                >
                  <option value="">Select a template…</option>
                  {(templates.data ?? []).map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.templateNumber} · {template.name} (v{template.versionNumber})
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Audit type" hint="Defaults to the template audit type">
                <Select value={form.auditType} onChange={(event) => set('auditType')(event.target.value)}>
                  <option value="">Use template default</option>
                  {AUDIT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Department" required>
                <Select
                  required
                  value={form.departmentId}
                  onChange={(event) => set('departmentId')(event.target.value)}
                >
                  <option value="">Select a department…</option>
                  {(departments.data ?? []).map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Location">
                <Select value={form.locationId} onChange={(event) => set('locationId')(event.target.value)}>
                  <option value="">Not specified</option>
                  {(locations.data ?? []).map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Scheduled date">
                <Input
                  type="date"
                  value={form.scheduledDate}
                  onChange={(event) => set('scheduledDate')(event.target.value)}
                />
              </Field>

              <Field label="Due date">
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => set('dueDate')(event.target.value)}
                />
              </Field>

              <Field label="Auditor" hint="Applied when the audit is started">
                <Select value={form.auditorId} onChange={(event) => set('auditorId')(event.target.value)}>
                  <option value="">Default (Mohanraj)</option>
                  {auditors.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.firstName} {user.lastName}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Description" className="md:col-span-2">
                <Textarea
                  placeholder="Scope, objective and any relevant notes"
                  value={form.description}
                  onChange={(event) => set('description')(event.target.value)}
                />
              </Field>
            </div>
          </Card>

          <Card
            title="Allot users"
            subtitle="The auditor allots users to the audit — they get an in-app notification and an email sent from the auditor."
            className="mt-4"
          >
            <div className="space-y-4">
              {(users.data ?? []).length === 0 ? (
                <p className="text-sm text-slate-500">No users available.</p>
              ) : (
                <div className="grid max-h-72 grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                  {(users.data ?? []).map((user) => (
                    <label
                      key={user.id}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm transition hover:bg-slate-50"
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-slate-300"
                        checked={assigneeIds.includes(user.id)}
                        onChange={(event) => toggleAssignee(user.id, event.target.checked)}
                      />
                      <span className="min-w-0">
                        <span className="block font-medium text-slate-800">{fullName(user)}</span>
                        <span className="block truncate text-xs text-slate-500">{user.email}</span>
                        <span className="block text-[11px] uppercase tracking-wide text-slate-400">
                          {user.role?.name ?? 'user'}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300"
                  checked={notifyAssignees}
                  onChange={(event) => setNotifyAssignees(event.target.checked)}
                />
                Email the allotted users from the auditor
              </label>

              {notifyAssignees && assigneeIds.length > 0 ? (
                <Field label="Note from the auditor" hint="Included in the allotment email">
                  <Textarea
                    placeholder="Please complete the checklist before the due date."
                    value={assignmentMessage}
                    onChange={(event) => setAssignmentMessage(event.target.value)}
                  />
                </Field>
              ) : null}

              <p className="text-xs text-slate-400">
                Sender: {auditorLabel}
                {' · '}
                {mailStatus.data?.mode === 'smtp'
                  ? 'SMTP configured — the email is delivered.'
                  : 'Dev mode — the email is saved to apps/api/mail-outbox.'}
              </p>
            </div>
          </Card>

          <div className="mt-4 flex items-center justify-end gap-2">
            <Button tone="neutral" onClick={() => router.push('/audits')}>
              Cancel
            </Button>
            <Button type="submit" loading={submit.submitting}>
              Create audit
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
