'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  ErrorBlock,
  Field,
  Input,
  LoadingBlock,
  MetaBadge,
  Modal,
  PageHeader,
  Select,
  Table,
  Td,
  Textarea,
  Th,
} from '@/components/ui';
import { api, qs } from '@/lib/api';
import { FINDING_SEVERITY, FINDING_STATUS } from '@/lib/constants';
import { dueLabel, formatDate, fullName, truncate } from '@/lib/format';
import { useApi, useDepartments, useQueryParam, useSubmit, useUsers } from '@/lib/hooks';
import type { Audit, Finding, FindingSeverity, FindingStatus } from '@/lib/types';

export default function FindingsPage() {
  const auditIdParam = useQueryParam('auditId');
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const departments = useDepartments();
  const users = useUsers();
  const audits = useApi<Audit[]>('/audits');
  const submit = useSubmit();

  const path = useMemo(
    () =>
      `/findings${qs({
        search,
        severity,
        status,
        departmentId,
        auditId: auditIdParam || undefined,
      })}`,
    [search, severity, status, departmentId, auditIdParam],
  );
  const findings = useApi<Finding[]>(path);
  const rows = findings.data ?? [];

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    auditId: '',
    description: '',
    category: '',
    severity: 'major' as FindingSeverity,
    responsibleDepartmentId: '',
    responsiblePersonId: '',
    dueDate: '',
  });

  const createFinding = async () => {
    const payload: Record<string, unknown> = {
      auditId: form.auditId,
      description: form.description,
      severity: form.severity,
    };
    if (form.category) payload.category = form.category;
    if (form.responsibleDepartmentId) payload.responsibleDepartmentId = form.responsibleDepartmentId;
    if (form.responsiblePersonId) payload.responsiblePersonId = form.responsiblePersonId;
    if (form.dueDate) payload.dueDate = new Date(form.dueDate).toISOString();

    const created = await submit.run(() => api.post<Finding>('/findings', payload));
    if (created) {
      setModalOpen(false);
      setForm({
        auditId: '',
        description: '',
        category: '',
        severity: 'major',
        responsibleDepartmentId: '',
        responsiblePersonId: '',
        dueDate: '',
      });
      findings.reload();
    }
  };

  return (
    <div>
      <PageHeader
        title="Findings"
        subtitle="Non-conformities and observations raised during audits"
        actions={<Button onClick={() => setModalOpen(true)}>Raise finding</Button>}
      />

      {auditIdParam ? (
        <Alert tone="info" className="mb-4">
          Showing findings for a single audit.{' '}
          <a href="/findings" className="underline">
            Clear filter
          </a>
        </Alert>
      ) : null}

      <Card className="mb-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <Field label="Search">
            <Input
              placeholder="Finding number or description"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          <Field label="Severity">
            <Select value={severity} onChange={(event) => setSeverity(event.target.value)}>
              <option value="">All severities</option>
              {(Object.keys(FINDING_SEVERITY) as FindingSeverity[]).map((key) => (
                <option key={key} value={key}>
                  {FINDING_SEVERITY[key].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              {(Object.keys(FINDING_STATUS) as FindingStatus[]).map((key) => (
                <option key={key} value={key}>
                  {FINDING_STATUS[key].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Responsible department">
            <Select value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}>
              <option value="">All departments</option>
              {(departments.data ?? []).map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-2">
            <Button
              tone="neutral"
              onClick={() => {
                setSearch('');
                setSeverity('');
                setStatus('');
                setDepartmentId('');
              }}
            >
              Clear
            </Button>
            <Button tone="neutral" onClick={findings.reload}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {findings.error ? (
        <ErrorBlock message={findings.error} onRetry={findings.reload} />
      ) : findings.loading ? (
        <LoadingBlock label="Loading findings…" />
      ) : (
        <Card padded={false}>
          <Table
            head={
              <tr>
                <Th>Finding</Th>
                <Th>Audit</Th>
                <Th>Severity</Th>
                <Th>Status</Th>
                <Th>Responsible</Th>
                <Th>Due</Th>
                <Th>Action</Th>
              </tr>
            }
          >
            {rows.map((finding) => (
              <tr key={finding.id} className="hover:bg-slate-50">
                <Td>
                  <Link href={`/findings/${finding.id}`} className="font-medium text-brand-700 hover:underline">
                    {finding.findingNumber}
                  </Link>
                  <p className="text-xs text-slate-500">{truncate(finding.description, 60)}</p>
                </Td>
                <Td className="text-xs">
                  {finding.audit ? (
                    <Link href={`/audits/${finding.audit.id}`} className="text-brand-700 hover:underline">
                      {finding.audit.auditNumber}
                    </Link>
                  ) : (
                    '—'
                  )}
                  <p className="text-slate-400">{finding.category || ''}</p>
                </Td>
                <Td>
                  <MetaBadge meta={FINDING_SEVERITY[finding.severity]} fallback={finding.severity} />
                </Td>
                <Td>
                  <MetaBadge meta={FINDING_STATUS[finding.status]} fallback={finding.status} />
                </Td>
                <Td className="text-xs">
                  {fullName(finding.responsiblePerson)}
                  <p className="text-slate-400">{finding.responsibleDepartment?.name || '—'}</p>
                </Td>
                <Td className="text-xs text-slate-500">
                  {formatDate(finding.dueDate)}
                  <p className={dueLabel(finding.dueDate).includes('overdue') ? 'text-rose-600' : 'text-slate-400'}>
                    {dueLabel(finding.dueDate)}
                  </p>
                </Td>
                <Td className="text-xs">
                  {finding.correctiveAction ? (
                    <Link
                      href={`/corrective-actions/${finding.correctiveAction.id}`}
                      className="text-brand-700 hover:underline"
                    >
                      {finding.correctiveAction.actionNumber}
                    </Link>
                  ) : (
                    <span className="text-slate-400">Not raised</span>
                  )}
                </Td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <Td className="py-8 text-center text-xs text-slate-400">
                  No findings match the current filters
                </Td>
                <Td /> <Td /> <Td /> <Td /> <Td /> <Td />
              </tr>
            ) : null}
          </Table>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Raise a finding"
        width="max-w-2xl"
        footer={
          <>
            <Button tone="neutral" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={submit.submitting}
              disabled={!form.auditId || !form.description.trim()}
              onClick={createFinding}
            >
              Create finding
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {submit.error ? <Alert tone="error">{submit.error}</Alert> : null}

          <Field label="Audit" required>
            <Select
              value={form.auditId}
              onChange={(event) => setForm((current) => ({ ...current, auditId: event.target.value }))}
            >
              <option value="">Select the audit…</option>
              {(audits.data ?? []).map((audit) => (
                <option key={audit.id} value={audit.id}>
                  {audit.auditNumber} · {truncate(audit.title, 40)}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Description of the non-conformity" required>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="What was found, where and why it does not meet the requirement."
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Severity" required>
              <Select
                value={form.severity}
                onChange={(event) =>
                  setForm((current) => ({ ...current, severity: event.target.value as FindingSeverity }))
                }
              >
                {(Object.keys(FINDING_SEVERITY) as FindingSeverity[]).map((key) => (
                  <option key={key} value={key}>
                    {FINDING_SEVERITY[key].label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Category / clause">
              <Input
                value={form.category}
                onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                placeholder="e.g. Document Control"
              />
            </Field>

            <Field label="Responsible department">
              <Select
                value={form.responsibleDepartmentId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, responsibleDepartmentId: event.target.value }))
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
                value={form.responsiblePersonId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, responsiblePersonId: event.target.value }))
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

            <Field label="Target closure date">
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
