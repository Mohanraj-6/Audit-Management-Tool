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
import { formatDate, truncate } from '@/lib/format';
import { useApi, useDepartments, useSubmit } from '@/lib/hooks';
import type { Location } from '@/lib/types';

interface LocationForm {
  id?: string;
  name: string;
  code: string;
  address: string;
  latitude: string;
  longitude: string;
  departmentId: string;
  isActive: boolean;
}

export default function LocationsPage() {
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState('');

  const departments = useDepartments();
  const path = useMemo(
    () => `/locations${qs({ search, departmentId })}`,
    [search, departmentId],
  );
  const locations = useApi<Location[]>(path);
  const submit = useSubmit();
  const [editing, setEditing] = useState<LocationForm | null>(null);

  const openCreate = () =>
    setEditing({
      name: '',
      code: '',
      address: '',
      latitude: '',
      longitude: '',
      departmentId: '',
      isActive: true,
    });
  const openEdit = (loc: Location) =>
    setEditing({
      id: loc.id,
      name: loc.name,
      code: loc.code,
      address: loc.address || '',
      latitude: loc.latitude?.toString() || '',
      longitude: loc.longitude?.toString() || '',
      departmentId: loc.departmentId || '',
      isActive: loc.isActive,
    });

  const save = async () => {
    if (!editing) return;
    const payload: Record<string, unknown> = {
      name: editing.name,
      code: editing.code,
      address: editing.address || undefined,
      departmentId: editing.departmentId || undefined,
      isActive: editing.isActive,
    };
    if (editing.latitude) payload.latitude = Number(editing.latitude);
    if (editing.longitude) payload.longitude = Number(editing.longitude);

    const result = editing.id
      ? await submit.run(() => api.patch(`/locations/${editing.id}`, payload))
      : await submit.run(() => api.post('/locations', payload));
    if (result !== null) {
      setEditing(null);
      locations.reload();
    }
  };

  const remove = async (loc: Location) => {
    if (!window.confirm(`Delete location "${loc.name}"?`)) return;
    const result = await submit.run(() => api.delete(`/locations/${loc.id}`));
    if (result !== null) locations.reload();
  };

  const rows = locations.data ?? [];

  return (
    <div>
      <PageHeader
        title="Locations"
        subtitle="Physical sites where audits are conducted"
        actions={<Button onClick={openCreate}>Add location</Button>}
      />

      {submit.error ? (
        <Alert tone="error" className="mb-4">
          {submit.error}
        </Alert>
      ) : null}

      <Card className="mb-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Field label="Search" className="md:col-span-2">
            <Input
              placeholder="Location name, code or address"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          <Field label="Department">
            <Select
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
            >
              <option value="">All departments</option>
              {(departments.data ?? []).map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-2">
            <Button tone="neutral" onClick={() => { setSearch(''); setDepartmentId(''); }}>
              Clear
            </Button>
            <Button tone="neutral" onClick={locations.reload}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {locations.error ? (
        <ErrorBlock message={locations.error} onRetry={locations.reload} />
      ) : locations.loading ? (
        <LoadingBlock label="Loading locations…" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No locations yet"
          description="Locations represent the physical sites where audits take place."
          action={<Button onClick={openCreate}>Add location</Button>}
        />
      ) : (
        <Card padded={false}>
          <Table
            head={
              <tr>
                <Th>Location</Th>
                <Th>Code</Th>
                <Th>Department</Th>
                <Th>Active</Th>
                <Th>Created</Th>
                <Th>Actions</Th>
              </tr>
            }
          >
            {rows.map((loc) => (
              <tr key={loc.id} className="hover:bg-slate-50">
                <Td>
                  <p className="font-medium text-slate-800">{loc.name}</p>
                  {loc.address ? (
                    <p className="text-xs text-slate-500">{truncate(loc.address, 60)}</p>
                  ) : null}
                </Td>
                <Td className="text-xs">{loc.code}</Td>
                <Td className="text-xs">{loc.department?.name || '—'}</Td>
                <Td className="text-xs">
                  {loc.isActive ? (
                    <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-200">
                      Active
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-100 text-slate-500 ring-slate-200">
                      Inactive
                    </Badge>
                  )}
                </Td>
                <Td className="text-xs text-slate-500">{formatDate(loc.createdAt)}</Td>
                <Td>
                  <div className="flex gap-2">
                    <Button tone="neutral" size="sm" onClick={() => openEdit(loc)}>
                      Edit
                    </Button>
                    <Button tone="danger" size="sm" onClick={() => remove(loc)}>
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
        title={editing?.id ? 'Edit location' : 'Add location'}
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
              {editing?.id ? 'Save changes' : 'Create location'}
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
            <Field label="Code" hint="Short unique identifier">
              <Input
                value={editing.code}
                onChange={(event) => setEditing({ ...editing, code: event.target.value })}
              />
            </Field>
            <Field label="Address">
              <Textarea
                rows={2}
                value={editing.address}
                onChange={(event) => setEditing({ ...editing, address: event.target.value })}
              />
            </Field>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Latitude">
                <Input
                  type="number"
                  step="any"
                  value={editing.latitude}
                  onChange={(event) =>
                    setEditing({ ...editing, latitude: event.target.value })
                  }
                />
              </Field>
              <Field label="Longitude">
                <Input
                  type="number"
                  step="any"
                  value={editing.longitude}
                  onChange={(event) =>
                    setEditing({ ...editing, longitude: event.target.value })
                  }
                />
              </Field>
            </div>
            <Field label="Department">
              <Select
                value={editing.departmentId}
                onChange={(event) =>
                  setEditing({ ...editing, departmentId: event.target.value })
                }
              >
                <option value="">None</option>
                {(departments.data ?? []).map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Active">
              <Select
                value={editing.isActive ? 'yes' : 'no'}
                onChange={(event) =>
                  setEditing({ ...editing, isActive: event.target.value === 'yes' })
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
