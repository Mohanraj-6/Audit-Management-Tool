'use client';

import Link from 'next/link';
import { BarList, ColumnChart, Donut } from '@/components/charts';
import {
  Alert,
  Button,
  Card,
  EmptyState,
  ErrorBlock,
  LoadingBlock,
  MetaBadge,
  PageHeader,
  ProgressBar,
  StatCard,
  Table,
  Td,
  Th,
} from '@/components/ui';
import { api } from '@/lib/api';
import { AUDIT_STATUS, FINDING_SEVERITY } from '@/lib/constants';
import { dueLabel, formatDate, fullName, percent, truncate } from '@/lib/format';
import { useApi, useSubmit } from '@/lib/hooks';
import type { Audit, Finding } from '@/lib/types';

interface AuditStats {
  totalAudits: number;
  draftAudits: number;
  inProgressAudits: number;
  completedAudits: number;
  openFindings: number;
  criticalFindings: number;
  overdueFindings: number;
  openCorrectiveActions: number;
  overdueCorrectiveActions: number;
  compliancePercentage: number;
}

interface DashboardCharts {
  auditsByDepartment: Array<{ department: string | null; count: number }>;
  findingsBySeverity: Array<{ severity: string; count: number }>;
  monthlyCompletion: Array<{ month: string; total: number; completed: number }>;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  major: '#f97316',
  minor: '#eab308',
  observation: '#0ea5e9',
};

export default function DashboardPage() {
  const stats = useApi<AuditStats>('/audits/stats');
  const charts = useApi<DashboardCharts>('/audits/charts');
  const audits = useApi<Audit[]>('/audits');
  const findings = useApi<Finding[]>('/findings');
  const seed = useSubmit();

  const runSeed = async () => {
    const result = await seed.run(() => api.post<{ message: string }>('/seed?force=true'));
    if (result) {
      stats.reload();
      charts.reload();
      audits.reload();
      findings.reload();
    }
  };

  const recentAudits = (audits.data ?? []).slice(0, 6);
  const openFindings = (findings.data ?? [])
    .filter((finding) => finding.status !== 'closed')
    .slice(0, 6);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Live overview of audits, findings and corrective actions"
        actions={
          <>
            <Button tone="neutral" onClick={() => { stats.reload(); charts.reload(); audits.reload(); findings.reload(); }}>
              Refresh
            </Button>
            <Button tone="brand" onClick={() => (window.location.href = '/audits/new')}>
              New Audit
            </Button>
          </>
        }
      />

      {seed.error ? <Alert tone="error" className="mb-4">{seed.error}</Alert> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total audits" value={stats.data?.totalAudits ?? '—'} hint={`${stats.data?.inProgressAudits ?? 0} in progress`} href="/audits" />
        <StatCard label="Completed" value={stats.data?.completedAudits ?? '—'} tone="success" hint="Closed audits" href="/audits?status=closed" />
        <StatCard label="Open findings" value={stats.data?.openFindings ?? '—'} tone="warning" hint={`${stats.data?.criticalFindings ?? 0} critical`} href="/findings" />
        <StatCard label="Overdue findings" value={stats.data?.overdueFindings ?? '—'} tone="danger" hint={`${stats.data?.overdueCorrectiveActions ?? 0} actions overdue`} href="/findings" />
        <StatCard label="Avg. compliance" value={percent(stats.data?.compliancePercentage ?? null)} tone="info" hint="Across closed audits" />
      </div>

      {stats.error ? <div className="mt-4"><ErrorBlock message={stats.error} onRetry={stats.reload} /></div> : null}

      {(stats.data?.totalAudits ?? 0) === 0 && !stats.loading ? (
        <Card className="mt-6" title="Getting started">
          <EmptyState
            title="No audits yet"
            description="Load the demo dataset (templates, audits, findings and corrective actions) to explore the application, or create your first audit from a template."
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button loading={seed.submitting} onClick={runSeed}>
                  Load demo data
                </Button>
                <Button tone="neutral" onClick={() => (window.location.href = '/templates/new')}>
                  Create a template first
                </Button>
              </div>
            }
          />
        </Card>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card title="Audits by department" className="xl:col-span-1">
          {charts.loading ? (
            <LoadingBlock />
          ) : (
            <BarList
              items={(charts.data?.auditsByDepartment ?? []).map((row) => ({
                label: row.department || 'Unassigned',
                value: row.count,
              }))}
              emptyLabel="No audits recorded yet"
            />
          )}
        </Card>

        <Card title="Findings by severity" className="xl:col-span-1">
          {charts.loading ? (
            <LoadingBlock />
          ) : (
            <Donut
              slices={(charts.data?.findingsBySeverity ?? []).map((row) => ({
                label: row.severity,
                value: row.count,
                color: SEVERITY_COLORS[row.severity] || '#94a3b8',
              }))}
            />
          )}
        </Card>

        <Card title="Monthly audit activity" subtitle="Created vs completed (last 6 months)" className="xl:col-span-1">
          {charts.loading ? (
            <LoadingBlock />
          ) : (
            <ColumnChart
              data={(charts.data?.monthlyCompletion ?? []).map((row) => ({
                label: row.month,
                total: row.total,
                completed: row.completed,
              }))}
            />
          )}
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card
          title="Recent audits"
          actions={
            <Link href="/audits" className="text-xs font-medium text-brand-600 hover:underline">
              View all
            </Link>
          }
          padded={false}
        >
          {audits.loading ? (
            <div className="px-5 py-4"><LoadingBlock /></div>
          ) : audits.error ? (
            <div className="px-5 py-4"><ErrorBlock message={audits.error} onRetry={audits.reload} /></div>
          ) : (
            <Table
              head={
                <tr>
                  <Th>Audit</Th>
                  <Th>Status</Th>
                  <Th>Compliance</Th>
                  <Th>Due</Th>
                </tr>
              }
            >
              {recentAudits.map((audit) => (
                <tr key={audit.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/audits/${audit.id}`} className="font-medium text-brand-700 hover:underline">
                      {audit.auditNumber}
                    </Link>
                    <p className="text-xs text-slate-500">{truncate(audit.title, 48)}</p>
                  </Td>
                  <Td><MetaBadge meta={AUDIT_STATUS[audit.status]} fallback={audit.status} /></Td>
                  <Td className="w-32">
                    <div className="mb-1 text-xs text-slate-500">{percent(audit.compliancePercentage)}</div>
                    <ProgressBar value={Number(audit.compliancePercentage)} />
                  </Td>
                  <Td className="text-xs text-slate-500">{formatDate(audit.dueDate)}</Td>
                </tr>
              ))}
              {recentAudits.length === 0 ? (
                <tr>
                  <Td className="py-6 text-center text-xs text-slate-400">No audits yet</Td>
                  <Td /> <Td /> <Td />
                </tr>
              ) : null}
            </Table>
          )}
        </Card>

        <Card
          title="Open findings"
          actions={
            <Link href="/findings" className="text-xs font-medium text-brand-600 hover:underline">
              View all
            </Link>
          }
          padded={false}
        >
          {findings.loading ? (
            <div className="px-5 py-4"><LoadingBlock /></div>
          ) : findings.error ? (
            <div className="px-5 py-4"><ErrorBlock message={findings.error} onRetry={findings.reload} /></div>
          ) : (
            <Table
              head={
                <tr>
                  <Th>Finding</Th>
                  <Th>Severity</Th>
                  <Th>Responsible</Th>
                  <Th>Due</Th>
                </tr>
              }
            >
              {openFindings.map((finding) => (
                <tr key={finding.id} className="hover:bg-slate-50">
                  <Td>
                    <Link href={`/findings/${finding.id}`} className="font-medium text-brand-700 hover:underline">
                      {finding.findingNumber}
                    </Link>
                    <p className="text-xs text-slate-500">{truncate(finding.description, 48)}</p>
                  </Td>
                  <Td><MetaBadge meta={FINDING_SEVERITY[finding.severity]} fallback={finding.severity} /></Td>
                  <Td className="text-xs text-slate-600">
                    {fullName(finding.responsiblePerson)}
                    <p className="text-slate-400">{finding.responsibleDepartment?.name || '—'}</p>
                  </Td>
                  <Td className="text-xs text-slate-500">
                    {formatDate(finding.dueDate)}
                    <p className="text-slate-400">{dueLabel(finding.dueDate)}</p>
                  </Td>
                </tr>
              ))}
              {openFindings.length === 0 ? (
                <tr>
                  <Td className="py-6 text-center text-xs text-slate-400">No open findings</Td>
                  <Td /> <Td /> <Td />
                </tr>
              ) : null}
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
