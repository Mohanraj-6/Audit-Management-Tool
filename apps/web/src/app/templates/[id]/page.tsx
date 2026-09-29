'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
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
  Textarea,
} from '@/components/ui';
import { api } from '@/lib/api';
import { AUDIT_TYPES, QUESTION_TYPES, humanize } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import { useApi, useDepartments, useSubmit } from '@/lib/hooks';
import type { AuditTemplate, QuestionType } from '@/lib/types';

export default function TemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const template = useApi<AuditTemplate>(`/templates/${id}`);
  const departments = useDepartments();
  const mutation = useSubmit();

  const [meta, setMeta] = useState<null | {
    name: string;
    auditType: string;
    departmentId: string;
    effectiveDate: string;
    description: string;
  }>(null);
  const [newCategory, setNewCategory] = useState('');
  const [questionForm, setQuestionForm] = useState<null | {
    categoryId: string;
    questionText: string;
    questionType: string;
    isMandatory: boolean;
    weight: string;
  }>(null);

  const record = template.data;

  const reload = () => template.reload();

  const cloneTemplate = async () => {
    const created = await mutation.run(() => api.patch<AuditTemplate>(`/templates/${id}/clone`));
    if (created) routerReload(created.id);
  };

  const routerReload = (newId: string) => {
    window.location.href = `/templates/${newId}`;
  };

  const deleteTemplate = async () => {
    if (!window.confirm('Delete this template? Audits created from it must be deleted first.')) return;
    await mutation.run(() => api.delete(`/templates/${id}`));
    window.location.href = '/templates';
  };

  const saveMeta = async () => {
    if (!meta) return;
    const payload: Record<string, unknown> = { name: meta.name, auditType: meta.auditType };
    if (meta.departmentId) payload.departmentId = meta.departmentId;
    if (meta.effectiveDate) payload.effectiveDate = meta.effectiveDate;
    payload.description = meta.description;

    const result = await mutation.run(() => api.patch(`/templates/${id}`, payload));
    if (result !== null) {
      setMeta(null);
      reload();
    }
  };

  const addCategory = async () => {
    if (!newCategory.trim()) return;
    const result = await mutation.run(() =>
      api.post(`/templates/${id}/categories`, { name: newCategory.trim() }),
    );
    if (result !== null) {
      setNewCategory('');
      reload();
    }
  };

  const removeCategory = async (categoryId: string) => {
    if (!window.confirm('Remove this category and its questions?')) return;
    const result = await mutation.run(() => api.delete(`/templates/${id}/categories/${categoryId}`));
    if (result !== null) reload();
  };

  const removeQuestion = async (questionId: string) => {
    const result = await mutation.run(() => api.delete(`/templates/${id}/questions/${questionId}`));
    if (result !== null) reload();
  };

  const addQuestion = async () => {
    if (!questionForm || !questionForm.questionText.trim()) return;

    const payload: Record<string, unknown> = {
      categoryId: questionForm.categoryId || undefined,
      questionText: questionForm.questionText.trim(),
      questionType: questionForm.questionType,
      isMandatory: questionForm.isMandatory,
      weight: Number(questionForm.weight) || 1,
    };

    const result = await mutation.run(() => api.post(`/templates/${id}/questions`, payload));
    if (result !== null) {
      setQuestionForm(null);
      reload();
    }
  };

  if (template.loading) return <LoadingBlock label="Loading template…" />;
  if (template.error) return <ErrorBlock message={template.error} onRetry={template.reload} />;
  if (!record) return <EmptyState title="Template not found" />;

  const categories = record.categories ?? [];
  const questionsWithoutCategory = categories.flatMap((category) => category.questions ?? []);

  return (
    <div>
      <PageHeader
        title={`${record.templateNumber} · ${record.name}`}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <Badge className="bg-brand-50 text-brand-700 ring-brand-200">
              {humanize(record.auditType)}
            </Badge>
            <span>Version {record.versionNumber}</span>
            <span className="text-slate-400">·</span>
            <span>Effective {formatDate(record.effectiveDate)}</span>
            {record.department ? <span>· {record.department.name}</span> : null}
          </span>
        }
        actions={
          <>
            <Button tone="neutral" size="sm" onClick={() => setMeta({
              name: record.name,
              auditType: record.auditType,
              departmentId: record.departmentId || '',
              effectiveDate: record.effectiveDate ? record.effectiveDate.slice(0, 10) : '',
              description: record.description || '',
            })}>
              Edit details
            </Button>
            <Button tone="info" size="sm" loading={mutation.submitting} onClick={cloneTemplate}>
              Clone new version
            </Button>
            <Button tone="danger" size="sm" onClick={deleteTemplate}>
              Delete
            </Button>
          </>
        }
      />

      {mutation.error ? <Alert tone="error" className="mb-4">{mutation.error}</Alert> : null}
      {record.description && !meta ? (
        <p className="mb-4 text-sm text-slate-600">{record.description}</p>
      ) : null}

      {meta ? (
        <Card title="Edit template details" className="mb-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Name" required>
              <Input value={meta.name} onChange={(event) => setMeta({ ...meta, name: event.target.value })} />
            </Field>
            <Field label="Audit type">
              <Select
                value={meta.auditType}
                onChange={(event) => setMeta({ ...meta, auditType: event.target.value })}
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
                value={meta.departmentId}
                onChange={(event) => setMeta({ ...meta, departmentId: event.target.value })}
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
                value={meta.effectiveDate}
                onChange={(event) => setMeta({ ...meta, effectiveDate: event.target.value })}
              />
            </Field>
            <Field label="Description" className="md:col-span-2">
              <Textarea
                value={meta.description}
                onChange={(event) => setMeta({ ...meta, description: event.target.value })}
              />
            </Field>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button tone="neutral" onClick={() => setMeta(null)}>
              Cancel
            </Button>
            <Button loading={mutation.submitting} onClick={saveMeta}>
              Save details
            </Button>
          </div>
        </Card>
      ) : null}

      <Card
        title="Checklist structure"
        subtitle={`${questionsWithoutCategory.length} questions across ${categories.length} categories`}
        className="mb-6"
        actions={
          <div className="flex items-center gap-2">
            <Input
              className="w-52"
              placeholder="New category name"
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
            />
            <Button size="sm" loading={mutation.submitting} onClick={addCategory}>
              Add category
            </Button>
          </div>
        }
      >
        {categories.length === 0 ? (
          <EmptyState
            title="No categories yet"
            description="Categories group related checklist questions. Add the first one above."
          />
        ) : (
          <div className="space-y-6">
            {categories.map((category) => (
              <div key={category.id} className="rounded-lg border border-slate-200">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{category.name}</p>
                    {category.description ? (
                      <p className="text-xs text-slate-400">{category.description}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      tone="neutral"
                      size="sm"
                      onClick={() =>
                        setQuestionForm({
                          categoryId: category.id,
                          questionText: '',
                          questionType: 'yes_no',
                          isMandatory: true,
                          weight: '1',
                        })
                      }
                    >
                      Add question
                    </Button>
                    <Button tone="danger" size="sm" onClick={() => removeCategory(category.id)}>
                      Remove
                    </Button>
                  </div>
                </div>

                {(category.questions ?? []).length === 0 ? (
                  <p className="px-4 py-3 text-xs text-slate-400">No questions in this category yet.</p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {(category.questions ?? []).map((question, index) => (
                      <li key={question.id} className="flex items-start justify-between gap-3 px-4 py-2">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 text-xs text-slate-400">{index + 1}.</span>
                          <div>
                            <p className="text-sm text-slate-700">{question.questionText}</p>
                            <p className="text-xs text-slate-400">
                              {humanize(question.questionType)} · weight {question.weight}
                              {question.isMandatory ? ' · mandatory' : ''}
                            </p>
                          </div>
                        </div>
                        <Button tone="danger" size="sm" onClick={() => removeQuestion(question.id)}>
                          Delete
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal
        open={questionForm !== null}
        onClose={() => setQuestionForm(null)}
        title="Add checklist question"
        footer={
          <>
            <Button tone="neutral" onClick={() => setQuestionForm(null)}>
              Cancel
            </Button>
            <Button
              loading={mutation.submitting}
              disabled={!questionForm || !questionForm.questionText.trim()}
              onClick={addQuestion}
            >
              Add question
            </Button>
          </>
        }
      >
        {questionForm ? (
          <div className="space-y-4">
            <Field label="Question text" required>
              <Textarea
                rows={2}
                value={questionForm.questionText}
                onChange={(event) =>
                  setQuestionForm({ ...questionForm, questionText: event.target.value })
                }
                placeholder="e.g. Are emergency exits clearly signposted?"
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Answer type">
                <Select
                  value={questionForm.questionType}
                  onChange={(event) =>
                    setQuestionForm({ ...questionForm, questionType: event.target.value })
                  }
                >
                  {QUESTION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Weight">
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={questionForm.weight}
                  onChange={(event) =>
                    setQuestionForm({ ...questionForm, weight: event.target.value })
                  }
                />
              </Field>

              <Field label="Mandatory">
                <Select
                  value={questionForm.isMandatory ? 'yes' : 'no'}
                  onChange={(event) =>
                    setQuestionForm({ ...questionForm, isMandatory: event.target.value === 'yes' })
                  }
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </Select>
              </Field>
            </div>

            <Field label="Category" hint="Determines where the question appears in the checklist">
              <Select
                value={questionForm.categoryId}
                onChange={(event) =>
                  setQuestionForm({ ...questionForm, categoryId: event.target.value })
                }
              >
                <option value="">Uncategorised</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
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
