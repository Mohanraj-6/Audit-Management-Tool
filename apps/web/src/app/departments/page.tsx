'use client';

import { useMemo, useState } from 'react';
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
import { api, qs } from '@/lib/api';
import { formatDate, fullName, truncate } from '@/lib/format';
import { useApi, useSubmit, useUsers } from '@/lib/hooks';
import type { Department, User } from '@/lib/types';

interface DepartmentForm {
  id?: string;
  name: string;
  code: string;
  description: string;
  managerId: string;
}

export default function DepartmentsPage() {
  const [search, setSearch] = useState('');

  const users = useUsers();
  const managers = useMemo(
    () =>
      (users.data ?? [])
        .filter((u: User) => Boolean(u.isActive))
        .sort((a, b) =>
          `${a.firstName ?? ''} ${a.lastName ?? ''}`.localeCompare(
            `${b.firstName ?? ''} ${b.lastName ?? ''}`,
          ),
        ),
    [users.data],
  );

  const path = useMemo(() => `/departments${qs({ search })}`, [search]);
  const departments = useApi<Department[]>(path);
  const submit = useSubmit();
  const [editing, setEditing] = useState<DepartmentForm | null>(null);

  const openCreate = () =>
    setEditing({ name: '', code: '', description: '', managerId: '' });
  const openEdit = (dept: Department) =>
    setEditing({
      id: dept.id,
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      managerId: dept.managerId || '',
    });

  const save = async () => {
    if (!editing) return;
    const payload: Record<string, unknown> = {
      name: editing.name,
      code: editing.code,
      // Explicit null clears optional values; omitted values would preserve them server-side.
      description: editing.description.trim() || null,
      managerId: editing.managerId || null,
    };
    const result = editing.id
      ? await submit.run(() => api.patch(`/departments/${editing.id}`, payload))
      : await submit.run(() => api.post('/departments', payload));
    if (result !== null) {
      setEditing(null);
      departments.reload();
    }
  };

  const remove = async (dept: Department) => {
    if (!window.confirm(`Delete department "${dept.name}"?`)) return;
    const result = await submit.run(() => api.delete(`/departments/${dept.id}`));
    if (result !== null) departments.reload();
  };

  const rows = departments.data ?? [];

  return (
    <div>
      <PageHeader
        title="Departments"
        subtitle="Organisational units that own audits and findings"
        actions={<Button onClick={openCreate}>Add department</Button>}
      />

      {submit.error ? (
        <Alert tone="error" className="mb-4">
          {submit.error}
        </Alert>
      ) : null}

      <Card className="mb-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field label="Search" className="md:col-span-2">
            <Input
              placeholder="Department name, code or description"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          <div className="flex items-end gap-2">
            <Button tone="neutral" onClick={() => setSearch('')}>
              Clear
            </Button>
            <Button tone="neutral" onClick={departments.reload}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {departments.error ? (
        <ErrorBlock message={departments.error} onRetry={departments.reload} />
      ) : departments.loading ? (
        <LoadingBlock label="Loading departments…" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No departments yet"
          description="Departments group users and assign ownership of audits and corrective actions."
          action={<Button onClick={openCreate}>Add department</Button>}
        />
      ) : (
        <Card padded={false}>
          <Table
            head={
              <tr>
                <Th>Department</Th>
                <Th>Code</Th>
                <Th>Manager</Th>
                <Th>Users</Th>
                <Th>Created</Th>
                <Th>Actions</Th>
              </tr>
            }
          >
            {rows.map((dept) => (
              <tr key={dept.id} className="hover:bg-slate-50">
                <Td>
                  <p className="font-medium text-slate-800">{dept.name}</p>
                  {dept.description ? (
                    <p className="text-xs text-slate-500">{truncate(dept.description, 60)}</p>
                  ) : null}
                </Td>
                <Td className="text-xs">{dept.code}</Td>
                <Td className="text-xs">{dept.manager ? fullName(dept.manager) : '—'}</Td>
                <Td className="text-xs text-slate-600">{dept.users?.length ?? 0}</Td>
                <Td className="text-xs text-slate-500">{formatDate(dept.createdAt)}</Td>
                <Td>
                  <div className="flex gap-2">
                    <Button tone="neutral" size="sm" onClick={() => openEdit(dept)}>
                      Edit
                    </Button>
                    <Button tone="danger" size="sm" onClick={() => remove(dept)}>
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
        title={editing?.id ? 'Edit department' : 'Add department'}
        footer={
          <>
            <Button tone="neutral" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              loading={submit.submitting}
              disabled={!editing?.name || !editing?.code}
              onClick={save}
            >
              {editing?.id ? 'Save changes' : 'Create department'}
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="space-y-4">
            {submit.error ? <Alert tone="error">{submit.error}</Alert> : null}

            <Field label="Name" required>
              <Input
                value={editing.name}
                onChange={(event) => setEditing({ ...editing, name: event.target.value })}
              />
            </Field>
            <Field label="Code" hint="Short unique identifier (e.g. FIN, HR)">
              <Input
                value={editing.code}
                onChange={(event) => setEditing({ ...editing, code: event.target.value })}
              />
            </Field>
            <Field label="Description">
              <Textarea
                rows={3}
                value={editing.description}
                onChange={(event) =>
                  setEditing({ ...editing, description: event.target.value })
                }
              />
            </Field>
            <Field label="Manager">
              <Select
                value={editing.managerId}
                onChange={(event) => setEditing({ ...editing, managerId: event.target.value })}
              >
                <option value="">None</option>
                {managers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {fullName(user)} ({user.email})
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
