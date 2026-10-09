'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  ErrorBlock,
  Field,
  Input,
  LoadingBlock,
  MetaBadge,
  PageHeader,
  ProgressBar,
  Select,
  Table,
  Td,
  Th,
} from '@/components/ui';
import { qs } from '@/lib/api';
import { AUDIT_STATUS, AUDIT_TYPES } from '@/lib/constants';
import { dueLabel, formatDate, fullName, percent, truncate } from '@/lib/format';
import { useApi, useDepartments, useQueryParam } from '@/lib/hooks';
import type { Audit, AuditStatus } from '@/lib/types';

export default function AuditsPage() {
  const queryStatus = useQueryParam('status');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(queryStatus);
  const [departmentId, setDepartmentId] = useState('');

  // Dashboard cards link here with ?status=closed; keep the list synchronized.
  useEffect(() => {
    if (queryStatus) setStatus(queryStatus);
  }, [queryStatus]);

  const departments = useDepartments();
  const path = useMemo(
    () => `/audits${qs({ search, status, departmentId })}`,
    [search, status, departmentId],
  );
  const audits = useApi<Audit[]>(path);
  const rows = audits.data ?? [];

  return (
    <div>
      <PageHeader
        title="Audits"
        subtitle="Plan, execute and review internal audits"
        actions={
          <Link href="/audits/new">
            <Button>New Audit</Button>
          </Link>
        }
      />

      <Card className="mb-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Field label="Search">
            <Input
              placeholder="Audit number or title"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              {(Object.keys(AUDIT_STATUS) as AuditStatus[]).map((key) => (
                <option key={key} value={key}>
                  {AUDIT_STATUS[key].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Department">
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
                setStatus('');
                setDepartmentId('');
              }}
            >
              Clear filters
            </Button>
            <Button tone="neutral" onClick={audits.reload}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {audits.error ? (
        <ErrorBlock message={audits.error} onRetry={audits.reload} />
      ) : audits.loading ? (
        <LoadingBlock label="Loading audits…" />
      ) : (
        <Card padded={false}>
          <Table
            head={
              <tr>
                <Th>Audit</Th>
                <Th>Type / Template</Th>
                <Th>Department</Th>
                <Th>Auditor</Th>
                <Th>Status</Th>
                <Th className="w-40">Progress</Th>
                <Th>Due date</Th>
              </tr>
            }
          >
            {rows.map((audit) => (
              <tr key={audit.id} className="hover:bg-slate-50">
                <Td>
                  <Link href={`/audits/${audit.id}`} className="font-medium text-brand-700 hover:underline">
                    {audit.auditNumber}
                  </Link>
                  <p className="text-xs text-slate-500">{truncate(audit.title, 52)}</p>
                </Td>
                <Td className="text-xs">
                  <span className="capitalize">{audit.auditType || '—'}</span>
                  <p className="text-slate-400">{audit.template?.name || '—'}</p>
                </Td>
                <Td className="text-xs">
                  {audit.department?.name || '—'}
                  <p className="text-slate-400">{audit.location?.name || ''}</p>
                </Td>
                <Td className="text-xs">{fullName(audit.auditor)}</Td>
                <Td>
                  <MetaBadge meta={AUDIT_STATUS[audit.status]} fallback={audit.status} />
                </Td>
                <Td>
                  <div className="mb-1 flex justify-between text-xs text-slate-500">
                    <span>
                      {audit.answeredQuestions}/{audit.totalQuestions} answered
                    </span>
                    <span>{percent(audit.compliancePercentage)}</span>
                  </div>
                  <ProgressBar
                    value={
                      audit.totalQuestions
                        ? (Number(audit.answeredQuestions) / Number(audit.totalQuestions)) * 100
                        : 0
                    }
                    tone={Number(audit.compliancePercentage) >= 80 ? 'success' : 'warning'}
                  />
                </Td>
                <Td className="text-xs text-slate-500">
                  {formatDate(audit.dueDate)}
                  <p className="text-slate-400">{dueLabel(audit.dueDate)}</p>
                </Td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <Td className="py-8 text-center text-xs text-slate-400">No audits match the current filters</Td>
                <Td /> <Td /> <Td /> <Td /> <Td /> <Td />
              </tr>
            ) : null}
          </Table>
        </Card>
      )}
    </div>
  );
}
