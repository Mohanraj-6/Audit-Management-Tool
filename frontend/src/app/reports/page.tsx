'use client';

import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  DefinitionList,
  EmptyState,
  ErrorBlock,
  Field,
  LoadingBlock,
  MetaBadge,
  PageHeader,
  Select,
  Table,
  Td,
  Th,
} from '@/components/ui';
import { apiUrl } from '@/lib/api';
import { AUDIT_STATUS, FINDING_SEVERITY, FINDING_STATUS, humanize } from '@/lib/constants';
import { formatDate, percent, truncate } from '@/lib/format';
import { useApi, useQueryParam } from '@/lib/hooks';
import type { Audit } from '@/lib/types';

interface ReportQuestion {
  id: string;
  questionText: string;
  answer: string | null;
  comment: string;
}

interface ReportCategory {
  id: string | null;
  name: string;
  description?: string;
  sortOrder?: number;
  questions: ReportQuestion[];
}

interface ReportFinding {
  id: string;
  findingNumber: string;
  description: string;
  severity: string;
  status: string;
  category?: string;
  responsiblePerson?: { name: string } | null;
  responsibleDepartment?: { name: string } | null;
  dueDate?: string | null;
  correctiveAction?: {
    actionNumber: string;
    status: string;
  } | null;
}

interface ReportData {
  audit: {
    id: string;
    auditNumber: string;
    title: string;
    description?: string | null;
    auditType?: string | null;
    status: string;
    score: number;
    maxScore: number;
    compliancePercentage: number;
    totalQuestions: number;
    answeredQuestions: number;
    nonComplianceCount: number;
    scheduledDate?: string | null;
    dueDate?: string | null;
    auditor?: { name: string } | null;
    department?: { name: string; code: string } | null;
    location?: { name: string } | null;
    template: { name: string; version: number };
    approvedBy?: { name: string } | null;
    approvedAt?: string | null;
  };
  categories: ReportCategory[];
  findings: ReportFinding[];
}

export default function ReportsPage() {
  const auditIdParam = useQueryParam('auditId');
  const [auditId, setAuditId] = useState('');
  const audits = useApi<Audit[]>('/audits');

  useEffect(() => {
    if (auditIdParam) setAuditId(auditIdParam);
  }, [auditIdParam]);

  const report = useApi<ReportData>(auditId ? `/reports/audits/${auditId}` : null);

  return (
    <div>
      <PageHeader title="Reports" subtitle="Audit report data with PDF and Excel exports" />

      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Field label="Audit" className="md:col-span-3">
            <Select value={auditId} onChange={(event) => setAuditId(event.target.value)}>
              <option value="">Select an audit to build its report…</option>
              {(audits.data ?? []).map((audit) => (
                <option key={audit.id} value={audit.id}>
                  {audit.auditNumber} — {truncate(audit.title, 48)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end gap-2">
            <a href={auditId ? apiUrl(`/reports/audits/${auditId}/pdf`) : '#'} target="_blank" rel="noreferrer"
              className={auditId ? '' : 'pointer-events-none opacity-40'}>
              <Button tone="neutral" size="sm">PDF</Button>
            </a>
            <a href={auditId ? apiUrl(`/reports/audits/${auditId}/excel`) : '#'} target="_blank" rel="noreferrer"
              className={auditId ? '' : 'pointer-events-none opacity-40'}>
              <Button tone="neutral" size="sm">Excel</Button>
            </a>
          </div>
        </div>
      </Card>

      {!auditId ? (
        <EmptyState
          title="Select an audit"
          description="Pick an audit above to preview the complete report — checklist answers, findings and corrective actions."
        />
      ) : report.loading ? (
        <LoadingBlock label="Building report…" />
      ) : report.error ? (
        <ErrorBlock message={report.error} onRetry={report.reload} />
      ) : report.data ? (
        <div className="space-y-6">
          <Card title="Audit summary">
            <DefinitionList
              items={[
                { label: 'Audit number', value: report.data.audit.auditNumber },
                { label: 'Title', value: report.data.audit.title },
                {
                  label: 'Status',
                  value: <MetaBadge meta={AUDIT_STATUS[report.data.audit.status as keyof typeof AUDIT_STATUS]} fallback={report.data.audit.status} />,
                },
                { label: 'Audit type', value: humanize(report.data.audit.auditType) },
                { label: 'Template', value: `${report.data.audit.template?.name} (v${report.data.audit.template?.version})` },
                { label: 'Auditor', value: report.data.audit.auditor?.name || '—' },
                { label: 'Department', value: report.data.audit.department?.name || '—' },
                { label: 'Location', value: report.data.audit.location?.name || '—' },
                { label: 'Scheduled', value: formatDate(report.data.audit.scheduledDate) },
                { label: 'Due', value: formatDate(report.data.audit.dueDate) },
                { label: 'Score', value: `${report.data.audit.score} / ${report.data.audit.maxScore}` },
                { label: 'Compliance', value: percent(report.data.audit.compliancePercentage) },
                { label: 'Answered', value: `${report.data.audit.answeredQuestions} / ${report.data.audit.totalQuestions}` },
                { label: 'Non-compliances', value: report.data.audit.nonComplianceCount },
                { label: 'Approved by', value: report.data.audit.approvedBy?.name || '—' },
                { label: 'Approved at', value: formatDate(report.data.audit.approvedAt) },
              ]}
            />
          </Card>

          {(report.data.categories ?? []).map((category) => (
            <Card key={category.id ?? category.name} title={category.name} padded={false}>
              <Table
                head={
                  <tr>
                    <Th>Question</Th>
                    <Th>Answer</Th>
                    <Th>Comment</Th>
                  </tr>
                }
              >
                {category.questions.map((question) => (
                  <tr key={question.id}>
                    <Td className="text-sm">{question.questionText}</Td>
                    <Td className="text-xs">
                      {question.answer ? (
                        humanize(question.answer)
                      ) : (
                        <span className="text-slate-400">Not answered</span>
                      )}
                    </Td>
                    <Td className="text-xs text-slate-500">{question.comment || '—'}</Td>
                  </tr>
                ))}
              </Table>
            </Card>
          ))}

          <Card title="Findings" padded={false}>
            {report.data.findings.length === 0 ? (
              <p className="p-5 text-sm text-slate-500">No findings recorded for this audit.</p>
            ) : (
              <Table
                head={
                  <tr>
                    <Th>Finding</Th>
                    <Th>Severity</Th>
                    <Th>Status</Th>
                    <Th>Responsible</Th>
                    <Th>Due</Th>
                    <Th>Corrective action</Th>
                  </tr>
                }
              >
                {report.data.findings.map((finding) => (
                  <tr key={finding.id}>
                    <Td>
                      <span className="font-medium text-slate-800">{finding.findingNumber}</span>
                      <p className="text-xs text-slate-500">{finding.description}</p>
                    </Td>
                    <Td>
                      <MetaBadge
                        meta={FINDING_SEVERITY[finding.severity as keyof typeof FINDING_SEVERITY]}
                        fallback={finding.severity}
                      />
                    </Td>
                    <Td>
                      <MetaBadge
                        meta={FINDING_STATUS[finding.status as keyof typeof FINDING_STATUS]}
                        fallback={finding.status}
                      />
                    </Td>
                    <Td className="text-xs">
                      {finding.responsiblePerson?.name || finding.responsibleDepartment?.name || '—'}
                    </Td>
                    <Td className="text-xs text-slate-500">{formatDate(finding.dueDate)}</Td>
                    <Td className="text-xs">
                      {finding.correctiveAction ? (
                        <span>
                          {finding.correctiveAction.actionNumber} ·{' '}
                          {humanize(finding.correctiveAction.status)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
