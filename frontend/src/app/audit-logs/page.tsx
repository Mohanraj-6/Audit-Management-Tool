'use client';

import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  ErrorBlock,
  Field,
  Input,
  LoadingBlock,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
} from '@/components/ui';
import { qs } from '@/lib/api';
import { LOG_ACTIONS, LOG_RECORD_TYPES, humanize } from '@/lib/constants';
import { formatDateTime, fullName } from '@/lib/format';
import { useApi, useQueryParam } from '@/lib/hooks';
import type { AuditLog } from '@/lib/types';

export default function AuditLogsPage() {
  const userIdParam = useQueryParam('userId');
  const [userId, setUserId] = useState(userIdParam);
  const [action, setAction] = useState('');
  const [recordType, setRecordType] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const path = useMemo(
    () =>
      `/audit-logs${qs({
        userId: userId || undefined,
        action,
        recordType,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: 100,
      })}`,
    [userId, action, recordType, dateFrom, dateTo],
  );
  const logs = useApi<AuditLog[]>(path);

  const rows = logs.data ?? [];

  return (
    <div>
      <PageHeader
        title="Audit Log"
        subtitle="Immutable record of every create, update, status change and approval"
        actions={
          <Button tone="neutral" onClick={logs.reload}>
            Refresh
          </Button>
        }
      />

      <Card className="mb-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          <Field label="User ID">
            <Input
              placeholder="Filter by user id"
              value={userId}
              onChange={(event) => setUserId(event.target.value)}
            />
          </Field>
          <Field label="Action">
            <Select value={action} onChange={(event) => setAction(event.target.value)}>
              <option value="">All actions</option>
              {LOG_ACTIONS.map((value) => (
                <option key={value} value={value}>
                  {humanize(value)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Record type">
            <Select
              value={recordType}
              onChange={(event) => setRecordType(event.target.value)}
            >
              <option value="">All types</option>
              {LOG_RECORD_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="From">
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
          </Field>
          <Field label="To">
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </Field>
        </div>
        <div className="mt-3 flex gap-2">
          <Button
            tone="neutral"
            size="sm"
            onClick={() => {
              setUserId('');
              setAction('');
              setRecordType('');
              setDateFrom('');
              setDateTo('');
            }}
          >
            Clear filters
          </Button>
        </div>
      </Card>

      {logs.error ? (
        <ErrorBlock message={logs.error} onRetry={logs.reload} />
      ) : logs.loading ? (
        <LoadingBlock label="Loading audit log…" />
      ) : (
        <Card padded={false}>
          <Table
            head={
              <tr>
                <Th>Action</Th>
                <Th>Record</Th>
                <Th>Description</Th>
                <Th>User</Th>
                <Th>Date</Th>
              </tr>
            }
          >
            {rows.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <Td className="text-xs">
                  <Badge className="bg-slate-100 text-slate-700 ring-slate-200">
                    {humanize(log.action)}
                  </Badge>
                </Td>
                <Td className="text-xs">
                  <span className="font-medium text-slate-800">{log.recordType}</span>
                  <p className="text-xs text-slate-500">{log.recordId || '—'}</p>
                </Td>
                <Td className="text-xs text-slate-600">{log.description || '—'}</Td>
                <Td className="text-xs">{log.user ? fullName(log.user) : '—'}</Td>
                <Td className="text-xs text-slate-500">{formatDateTime(log.createdAt)}</Td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <Td className="py-8 text-center text-xs text-slate-400">
                  No audit log entries
                </Td>
                <Td />
                <Td />
                <Td />
                <Td />
              </tr>
            ) : null}
          </Table>
        </Card>
      )}
    </div>
  );
}
