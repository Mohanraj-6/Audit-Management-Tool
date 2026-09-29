'use client';

import { useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
} from '@/components/ui';
import { DEFAULT_USER_ID, api } from '@/lib/api';
import { humanize } from '@/lib/constants';
import { formatDateTime } from '@/lib/format';
import { useApi, useSubmit } from '@/lib/hooks';
import type { Notification } from '@/lib/types';

const NOTIFICATION_TONES: Record<string, string> = {
  audit_assigned: 'bg-blue-50 text-blue-700 ring-blue-200',
  audit_due: 'bg-amber-50 text-amber-700 ring-amber-200',
  finding_created: 'bg-rose-50 text-rose-700 ring-rose-200',
  action_assigned: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  action_due_soon: 'bg-amber-50 text-amber-700 ring-amber-200',
  action_overdue: 'bg-red-100 text-red-800 ring-red-300',
  action_submitted_for_verification: 'bg-purple-50 text-purple-700 ring-purple-200',
  audit_approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  audit_rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
};

export default function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const submit = useSubmit();

  const path = useMemo(
    () => `/notifications?userId=${DEFAULT_USER_ID}${unreadOnly ? '&unreadOnly=true' : ''}`,
    [unreadOnly],
  );
  const notifications = useApi<Notification[]>(path);

  const rows = notifications.data ?? [];

  const markRead = async (id: string) => {
    const result = await submit.run(() => api.patch(`/notifications/${id}/read`));
    if (result !== null) notifications.reload();
  };

  const markAllRead = async () => {
    const result = await submit.run(() => api.patch(`/notifications/read-all/${DEFAULT_USER_ID}`));
    if (result !== null) notifications.reload();
  };

  const remove = async (n: Notification) => {
    if (!window.confirm('Dismiss this notification?')) return;
    const result = await submit.run(() => api.delete(`/notifications/${n.id}`));
    if (result !== null) notifications.reload();
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="System alerts about audits, findings and corrective actions"
        actions={
          <div className="flex flex-wrap items-end gap-2">
            <Select
              value={unreadOnly ? 'unread' : 'all'}
              onChange={(event) => setUnreadOnly(event.target.value === 'unread')}
            >
              <option value="all">All notifications</option>
              <option value="unread">Unread only</option>
            </Select>
            {!unreadOnly && rows.length > 0 ? (
              <Button tone="neutral" size="sm" onClick={markAllRead}>
                Mark all as read
              </Button>
            ) : null}
            <Button tone="neutral" size="sm" onClick={notifications.reload}>
              Refresh
            </Button>
          </div>
        }
      />

      {submit.error ? (
        <Alert tone="error" className="mb-4">
          {submit.error}
        </Alert>
      ) : null}

      {notifications.error ? (
        <ErrorBlock message={notifications.error} onRetry={notifications.reload} />
      ) : notifications.loading ? (
        <LoadingBlock label="Loading notifications…" />
      ) : rows.length === 0 ? (
        <EmptyState
          title={unreadOnly ? 'No unread notifications' : 'No notifications'}
          description="You're all caught up. New notifications arrive here as audits, findings and actions are created."
        />
      ) : (
        <Card padded={false}>
          <Table
            head={
              <tr>
                <Th>Type</Th>
                <Th>Notification</Th>
                <Th>Date</Th>
                <Th>Actions</Th>
              </tr>
            }
          >
            {rows.map((n) => (
              <tr key={n.id} className={`hover:bg-slate-50 ${n.isRead ? '' : 'bg-blue-50/40'}`}>
                <Td>
                  <Badge
                    className={
                      NOTIFICATION_TONES[n.type] ||
                      'bg-slate-100 text-slate-700 ring-slate-200'
                    }
                  >
                    {humanize(n.type)}
                  </Badge>
                </Td>
                <Td>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-slate-800">{n.title}</p>
                      <p className="text-xs text-slate-500">{n.message}</p>
                    </div>
                    <Badge className={n.isRead ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-blue-50 text-blue-700 ring-blue-200'}>
                      {n.isRead ? 'Read' : 'Unread'}
                    </Badge>
                  </div>
                </Td>
                <Td className="text-xs text-slate-500">{formatDateTime(n.createdAt)}</Td>
                <Td>
                  <div className="flex gap-2">
                    {!n.isRead ? (
                      <Button tone="neutral" size="sm" onClick={() => markRead(n.id)}>
                        Mark read
                      </Button>
                    ) : null}
                    <Button tone="danger" size="sm" onClick={() => remove(n)}>
                      Dismiss
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </div>
  );
}
