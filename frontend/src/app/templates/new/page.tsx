'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert, Button, Card, Field, Input, PageHeader, Select, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { AUDIT_TYPES } from '@/lib/constants';
import { useDepartments, useSubmit } from '@/lib/hooks';
import type { AuditTemplate } from '@/lib/types';

export default function NewTemplatePage() {
  const router = useRouter();
  const departments = useDepartments();
  const submit = useSubmit();
  const [form, setForm] = useState({
    name: '',
    auditType: 'internal',
    departmentId: '',
    effectiveDate: '',
    description: '',
  });

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const payload: Record<string, unknown> = {
      name: form.name,
      auditType: form.auditType,
    };
    if (form.departmentId) payload.departmentId = form.departmentId;
    if (form.effectiveDate) payload.effectiveDate = form.effectiveDate;
    if (form.description) payload.description = form.description;

    const created = await submit.run(() => api.post<AuditTemplate>('/templates', payload));
    if (created) router.push(`/templates/${created.id}`);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="New audit template"
        subtitle="Create the template first, then add categories and checklist questions."
      />

      {submit.error ? <Alert tone="error" className="mb-4">{submit.error}</Alert> : null}

      <form onSubmit={onSubmit}>
        <Card title="Template details">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Name" required className="md:col-span-2">
              <Input
                required
                placeholder="Annual Workplace Safety Audit"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </Field>

            <Field label="Audit type" required>
              <Select
                value={form.auditType}
                onChange={(event) => setForm((current) => ({ ...current, auditType: event.target.value }))}
              >
                {AUDIT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Owning department">
              <Select
                value={form.departmentId}
                onChange={(event) => setForm((current) => ({ ...current, departmentId: event.target.value }))}
              >
                <option value="">Not specified</option>
                {(departments.data ?? []).map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name} ({dept.code})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Effective date">
              <Input
                type="date"
                value={form.effectiveDate}
                onChange={(event) => setForm((current) => ({ ...current, effectiveDate: event.target.value }))}
              />
            </Field>

            <Field label="Description" className="md:col-span-2">
              <Textarea
                placeholder="What this template covers"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              />
            </Field>
          </div>
        </Card>

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button tone="neutral" onClick={() => router.push('/templates')}>
            Cancel
          </Button>
          <Button type="submit" loading={submit.submitting}>
            Create template
          </Button>
        </div>
      </form>
    </div>
  );
}
