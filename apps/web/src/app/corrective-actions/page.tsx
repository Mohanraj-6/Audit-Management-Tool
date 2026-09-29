'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  ErrorBlock,
  Field,
  Input,
  LoadingBlock,
  MetaBadge,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
} from '@/components/ui';
import { qs } from '@/lib/api';
import { ACTION_STATUS } from '@/lib/constants';
import { dueLabel, formatDate, fullName, truncate } from '@/lib/format';
import { useApi, useQueryParam } from '@/lib/hooks';
import type { ActionStatus, CorrectiveAction } from '@/lib/types';

export default function CorrectiveActionsPage() {
  const assignedToParam = useQueryParam('assignedToId');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const path = useMemo(
    () => `/corrective-actions${qs({ search, status, assignedToId: assignedToParam || undefined })}`,
    [search, status, assignedToParam],
  );
  const actions = useApi<CorrectiveAction[]>(path);
  const rows = actions.data ?? [];

  return (
    <div>
      <PageHeader
        title="Corrective actions"
        subtitle="Resolution tracking for audit findings (CAPA)"
      />

      <Card className="mb-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Field label="Search">
            <Input
              placeholder="Action number or description"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              {(Object.keys(ACTION_STATUS) as ActionStatus[]).map((key) => (
                <option key={key} value={key}>
                  {ACTION_STATUS[key].label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-2 md:col-span-2">
            <Button
              tone="neutral"
              onClick={() => {
                setSearch('');
                setStatus('');
              }}
            >
              Clear filters
            </Button>
            <Button tone="neutral" onClick={actions.reload}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {actions.error ? (
        <ErrorBlock message={actions.error} onRetry={actions.reload} />
      ) : actions.loading ? (
        <LoadingBlock label="Loading corrective actions…" />
      ) : (
        <Card padded={false}>
          <Table
            head={
              <tr>
                <Th>Action</Th>
                <Th>Finding</Th>
                <Th>Corrective action</Th>
                <Th>Assigned to</Th>
                <Th>Status</Th>
                <Th>Due</Th>
              </tr>
            }
          >
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50">
                <Td>
                  <Link href={`/corrective-actions/${row.id}`} className="font-medium text-brand-700 hover:underline">
                    {row.actionNumber}
                  </Link>
                  <p className="text-xs text-slate-400">{formatDate(row.createdAt)}</p>
                </Td>
                <Td className="text-xs">
                  {row.finding ? (
                    <Link href={`/findings/${row.finding.id}`} className="text-brand-700 hover:underline">
                      {row.finding.findingNumber}
                    </Link>
                  ) : (
                    '—'
                  )}
                  {row.finding?.audit ? <p className="text-slate-400">{row.finding.audit.auditNumber}</p> : null}
                </Td>
                <Td className="text-xs text-slate-600">{truncate(row.correctiveAction, 70)}</Td>
                <Td className="text-xs">{fullName(row.assignedTo)}</Td>
                <Td>
                  <MetaBadge meta={ACTION_STATUS[row.status]} fallback={row.status} />
                </Td>
                <Td className="text-xs text-slate-500">
                  {formatDate(row.dueDate)}
                  <p className={dueLabel(row.dueDate).includes('overdue') ? 'text-rose-600' : 'text-slate-400'}>
                    {dueLabel(row.dueDate)}
                  </p>
                </Td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <Td className="py-8 text-center text-xs text-slate-400">
                  No corrective actions match the current filters
                </Td>
                <Td /> <Td /> <Td /> <Td /> <Td />
              </tr>
            ) : null}
          </Table>
        </Card>
      )}
    </div>
  );
}
