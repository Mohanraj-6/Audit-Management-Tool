'use client';

import { useMemo, useState } from 'react';
import {
  Alert, Badge, Button, Card, ErrorBlock, Field, Input, LoadingBlock, Modal, PageHeader, Select,
  Table, Td, Th,
} from '@/components/ui';
import { api } from '@/lib/api';
import { USER_ROLES, humanize } from '@/lib/constants';
import { formatDate, fullName } from '@/lib/format';
import { useApi, useDepartments, useRoles, useSubmit, useUsers } from '@/lib/hooks';
import type { User } from '@/lib/types';

interface UserForm {
  id?: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  roleId: string;
  departmentId: string;
  isActive: boolean;
}

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const departments = useDepartments();
  const roles = useRoles();
  const users = useUsers();
  const submit = useSubmit();
  const [editing, setEditing] = useState<UserForm | null>(null);

  const filtered = useMemo(() => {
    const rows = users.data ?? [];
    const term = search.trim().toLowerCase();
    return rows.filter((user) => {
      if (role && user.role?.name !== role) return false;
      if (!term) return true;
      return fullName(user).toLowerCase().includes(term) || user.email.toLowerCase().includes(term);
    });
  }, [users.data, search, role]);

  const openCreate = () =>
    setEditing({
      email: '', firstName: '', lastName: '', phone: '',
      roleId: (roles.data ?? [])[0]?.id || '', departmentId: '', isActive: true,
    });

  const openEdit = (user: User) =>
    setEditing({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || '',
      roleId: user.role?.id || '',
      departmentId: user.department?.id || '',
      isActive: user.isActive,
    });

  const save = async () => {
    if (!editing) return;
    const payload = {
      email: editing.email,
      firstName: editing.firstName,
      lastName: editing.lastName,
      phone: editing.phone || undefined,
      roleId: editing.roleId || undefined,
      departmentId: editing.departmentId || undefined,
      isActive: editing.id ? editing.isActive : undefined,
    };

    const result = editing.id
      ? await submit.run(() => api.patch(`/users/${editing.id}`, payload))
      : await submit.run(() => api.post('/users', payload));

    if (result !== null) {
      setEditing(null);
      users.reload();
    }
  };

  const deactivate = async (user: User) => {
    if (!window.confirm(`Deactivate ${fullName(user)}?`)) return;
    const result = await submit.run(() => api.delete(`/users/${user.id}`));
    if (result !== null) users.reload();
  };

  return (
    <div>
      <PageHeader title="Users" subtitle="People, their roles and departments"
        actions={<Button onClick={openCreate}>Add user</Button>} />

      {submit.error && !editing ? <Alert tone="error" className="mb-4">{submit.error}</Alert> : null}

      <Card className="mb-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Field label="Search" className="md:col-span-2">
            <Input placeholder="Name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
          </Field>
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="">All roles</option>
              {USER_ROLES.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-2">
            <Button tone="neutral" onClick={() => { setSearch(''); setRole(''); }}>Clear</Button>
            <Button tone="neutral" onClick={users.reload}>Refresh</Button>
          </div>
        </div>
      </Card>

      {users.error ? (
        <ErrorBlock message={users.error} onRetry={users.reload} />
      ) : users.loading ? (
        <LoadingBlock label="Loading users…" />
      ) : (
        <Card padded={false}>
          <Table head={
            <tr>
              <Th>User</Th><Th>Role</Th><Th>Department</Th><Th>Status</Th><Th>Joined</Th><Th>Actions</Th>
            </tr>
          }>
            {filtered.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50">
                <Td>
                  <p className="font-medium text-slate-800">{fullName(user)}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </Td>
                <Td>
                  <Badge className="bg-brand-50 text-brand-700 ring-brand-200">
                    {humanize(user.role?.name)}
                  </Badge>
                </Td>
                <Td className="text-xs">{user.department?.name || '—'}</Td>
                <Td>
                  {user.isActive ? (
                    <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">Active</Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-500 ring-slate-200">Inactive</Badge>
                  )}
                </Td>
                <Td className="text-xs text-slate-500">{formatDate(user.createdAt)}</Td>
                <Td>
                  <div className="flex gap-2">
                    <Button tone="neutral" size="sm" onClick={() => openEdit(user)}>Edit</Button>
                    {user.isActive ? (
                      <Button tone="danger" size="sm" onClick={() => deactivate(user)}>Deactivate</Button>
                    ) : null}
                  </div>
                </Td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <Td className="py-8 text-center text-xs text-slate-400">No users found</Td>
                <Td /> <Td /> <Td /> <Td /> <Td />
              </tr>
            ) : null}
          </Table>
        </Card>
      )}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Edit user' : 'Add user'}
        footer={
          <>
            <Button tone="neutral" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              loading={submit.submitting}
              disabled={!editing?.email || !editing?.firstName || !editing?.roleId}
              onClick={save}
            >
              {editing?.id ? 'Save changes' : 'Create user'}
            </Button>
          </>
        }
      >
        {editing ? (
          <div className="space-y-4">
            {submit.error ? <Alert tone="error">{submit.error}</Alert> : null}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="First name" required>
                <Input value={editing.firstName}
                  onChange={(e) => setEditing({ ...editing, firstName: e.target.value })} />
              </Field>
              <Field label="Last name" required>
                <Input value={editing.lastName}
                  onChange={(e) => setEditing({ ...editing, lastName: e.target.value })} />
              </Field>
              <Field label="Email" required>
                <Input type="email" value={editing.email}
                  onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
              </Field>
              <Field label="Phone">
                <Input value={editing.phone}
                  onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </Field>
              <Field label="Role" required>
                <Select value={editing.roleId}
                  onChange={(e) => setEditing({ ...editing, roleId: e.target.value })}>
                  <option value="">Select a role…</option>
                  {(roles.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {USER_ROLES.find((r) => r.value === item.name)?.label || humanize(item.name)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Department">
                <Select value={editing.departmentId}
                  onChange={(e) => setEditing({ ...editing, departmentId: e.target.value })}>
                  <option value="">Not specified</option>
                  {(departments.data ?? []).map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name} ({dept.code})
                    </option>
                  ))}
                </Select>
              </Field>
              {editing.id ? (
                <Field label="Status">
                  <Select
                    value={editing.isActive ? 'active' : 'inactive'}
                    onChange={(e) => setEditing({ ...editing, isActive: e.target.value === 'active' })}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </Field>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
