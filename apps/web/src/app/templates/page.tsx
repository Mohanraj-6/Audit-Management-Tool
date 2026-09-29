'use client';

import Link from 'next/link';
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
} from '@/components/ui';
import { qs } from '@/lib/api';
import { AUDIT_TYPES, humanize } from '@/lib/constants';
import { formatDate, truncate } from '@/lib/format';
import { useApi, useTemplates } from '@/lib/hooks';
import type { AuditTemplate, AuditType } from '@/lib/types';

export default function TemplatesPage() {
  const [search, setSearch] = useState('');
  const [auditType, setAuditType] = useState('');

  const path = useMemo(
    () => `/templates${qs({ search, auditType, isActive: 'true' })}`,
    [search, auditType],
  );
  const templates = useApi<AuditTemplate[]>(path);
  const rows = templates.data ?? [];

  return (
    <div>
      <PageHeader
        title="Audit templates"
        subtitle="Reusable checklists that drive the audits"
        actions={
          <Link href="/templates/new">
            <Button>New template</Button>
          </Link>
        }
      />

      <Card className="mb-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Field label="Search" className="md:col-span-2">
            <Input
              placeholder="Template name or description"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          <Field label="Audit type">
            <Select value={auditType} onChange={(event) => setAuditType(event.target.value)}>
              <option value="">All types</option>
              {AUDIT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-2">
            <Button
              tone="neutral"
              onClick={() => {
                setSearch('');
                setAuditType('');
              }}
            >
              Clear
            </Button>
            <Button tone="neutral" onClick={templates.reload}>
              Refresh
            </Button>
          </div>
        </div>
      </Card>

      {templates.error ? (
        <ErrorBlock message={templates.error} onRetry={templates.reload} />
      ) : templates.loading ? (
        <LoadingBlock label="Loading templates…" />
      ) : rows.length === 0 ? (
        <Card>
          <p className="py-6 text-center text-sm text-slate-500">No templates yet — create the first one.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {rows.map((template) => {
            const questionCount =
              template.questions?.length ||
              (template.categories ?? []).reduce((sum, cat) => sum + (cat.questions?.length ?? 0), 0);

            return (
              <Link key={template.id} href={`/templates/${template.id}`} className="block">
                <div className="h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300 hover:shadow">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-400">{template.templateNumber}</span>
                    <Badge className="bg-brand-50 text-brand-700 ring-brand-200">
                      {humanize(template.auditType)}
                    </Badge>
                  </div>
                  <h3 className="mt-2 text-sm font-semibold text-slate-800">
                    {template.name} <span className="text-slate-400">v{template.versionNumber}</span>
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">{truncate(template.description, 110)}</p>

                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-slate-50 py-2">
                      <dt className="text-slate-400">Questions</dt>
                      <dd className="font-semibold text-slate-700">{questionCount}</dd>
                    </div>
                    <div className="rounded-lg bg-slate-50 py-2">
                      <dt className="text-slate-400">Categories</dt>
                      <dd className="font-semibold text-slate-700">{template.categories?.length ?? 0}</dd>
                    </div>
                    <div className="rounded-lg bg-slate-50 py-2">
                      <dt className="text-slate-400">Effective</dt>
                      <dd className="font-semibold text-slate-700">{formatDate(template.effectiveDate)}</dd>
                    </div>
                  </dl>

                  {template.department ? (
                    <p className="mt-3 text-xs text-slate-400">
                      Owner: {template.department.name} ({template.department.code})
                    </p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <p className="mt-4 text-xs text-slate-400">
        Templates are versioned — cloning creates a new version and keeps completed audits linked to the
        version they were executed against.
      </p>
    </div>
  );
}
