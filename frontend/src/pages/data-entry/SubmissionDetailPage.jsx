import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon,
  LockClosedIcon,
  UserCircleIcon,
  ChatBubbleLeftEllipsisIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { dataEntryApi, commentsApi } from '../../api';
import useAuthStore from '../../store/authStore';
import InsightPanel from '../../components/InsightPanel';

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  draft:              { cls: 'badge-gray',                               label: 'Draft' },
  submitted:          { cls: 'badge-yellow',                             label: 'Submitted' },
  pending_supervisor: { cls: 'badge bg-orange-100 text-orange-700',      label: 'Pending Supervisor' },
  pending_me:         { cls: 'badge bg-purple-100 text-purple-700',      label: 'Pending M&E' },
  approved:           { cls: 'badge-green',                              label: 'Approved' },
  rejected:           { cls: 'badge-red',                                label: 'Rejected' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? { cls: 'badge-gray', label: status ?? '—' };
  return <span className={cfg.cls}>{cfg.label}</span>;
}

function formatDateTime(dt) {
  if (!dt) return null;
  return new Date(dt).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function achievementColor(pct) {
  if (pct == null) return 'text-gray-500';
  if (pct >= 100) return 'text-green-600';
  if (pct >= 75)  return 'text-yellow-600';
  return 'text-red-600';
}

function achievementBarColor(pct) {
  if (pct == null) return 'bg-gray-300';
  if (pct >= 100) return 'bg-green-500';
  if (pct >= 75)  return 'bg-yellow-500';
  return 'bg-red-500';
}

// ── Workflow Step ─────────────────────────────────────────────────────────────
function WorkflowStep({ stepNumber, title, done, active, content }) {
  return (
    <div className="flex gap-4">
      {/* Connector column */}
      <div className="flex flex-col items-center">
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-bold flex-shrink-0 ${
            done
              ? 'border-green-500 bg-green-50 text-green-700'
              : active
              ? 'border-mit-blue bg-blue-50 text-mit-blue'
              : 'border-gray-200 bg-gray-50 text-gray-400'
          }`}
        >
          {done ? <CheckCircleIcon className="w-4 h-4 text-green-600" /> : stepNumber}
        </div>
        {/* Vertical line (not shown after last step) */}
        <div className="mt-1 w-px flex-1 bg-gray-200 min-h-[20px]" />
      </div>

      {/* Content */}
      <div className="pb-6 flex-1 min-w-0">
        <p className={`text-sm font-semibold mb-1 ${done ? 'text-green-700' : active ? 'text-mit-blue' : 'text-gray-400'}`}>
          {title}
        </p>
        {content && (
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-3 text-sm space-y-1">
            {content}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Comment Item ──────────────────────────────────────────────────────────────
function CommentItem({ comment, showInternal }) {
  const isInternal = comment.isInternal ?? comment.internal ?? false;
  if (isInternal && !showInternal) return null;

  const author = comment.author?.name ?? comment.authorName ?? 'Unknown';
  const createdAt = comment.createdAt ?? comment.created_at;

  return (
    <div className={`flex gap-3 ${isInternal ? 'opacity-90' : ''}`}>
      <div className="flex-shrink-0 mt-0.5">
        <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
          <UserCircleIcon className="w-5 h-5 text-gray-500" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-gray-800">{author}</span>
          {isInternal && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded-full border border-purple-100">
              <LockClosedIcon className="w-2.5 h-2.5" />
              Internal
            </span>
          )}
          {createdAt && (
            <span className="text-[11px] text-gray-400 ml-auto">
              {formatDateTime(createdAt)}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-700 leading-relaxed">{comment.content ?? comment.text ?? ''}</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SubmissionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const role = user?.role ?? '';
  const canSeeInternal = role === 'me_officer' || role === 'super_admin';

  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const actualQuery = useQuery({
    queryKey: ['actual', id],
    queryFn: () => dataEntryApi.getActual(id).then((r) => r.data),
    enabled: !!id,
  });

  const commentsQuery = useQuery({
    queryKey: ['comments', id],
    queryFn: () => commentsApi.list(id).then((r) => r.data),
    enabled: !!id,
  });

  const actual = actualQuery.data?.actual ?? actualQuery.data;
  const comments = commentsQuery.data?.comments ?? commentsQuery.data ?? [];

  // ── Add comment mutation ──────────────────────────────────────────────────────
  const addComment = useMutation({
    mutationFn: (data) => commentsApi.add(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', id] });
      setCommentText('');
      setIsInternal(false);
      toast.success('Comment added');
    },
    onError: (err) => {
      const msg = err?.response?.data?.message ?? 'Failed to add comment';
      toast.error(msg);
    },
  });

  function handleAddComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    addComment.mutate({ content: commentText.trim(), isInternal });
  }

  // ── Loading / Error states ────────────────────────────────────────────────────
  if (actualQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 gap-2">
        <ArrowPathIcon className="w-5 h-5 animate-spin" />
        <span className="text-sm">Loading submission…</span>
      </div>
    );
  }

  if (actualQuery.isError || !actual) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <ExclamationCircleIcon className="w-10 h-10 text-red-400" />
        <p className="text-sm text-gray-600">
          {actualQuery.isError
            ? 'Failed to load submission. It may not exist or you lack permission.'
            : 'Submission not found.'}
        </p>
        <button type="button" className="btn-secondary mt-1" onClick={() => navigate(-1)}>
          <ArrowLeftIcon className="w-4 h-4" />
          Go back
        </button>
      </div>
    );
  }

  // ── Computed values ───────────────────────────────────────────────────────────
  const indicatorName  = actual.indicator?.name ?? actual.indicatorName ?? 'Indicator';
  const institutionName = actual.institution?.name ?? actual.institutionName ?? '—';
  const submittedBy    = actual.submittedBy?.name ?? actual.submittedByName ?? '—';
  const submittedAt    = actual.submittedAt ?? actual.createdAt;

  const targetValue = actual.targetValue ?? actual.target ?? null;
  const actualValue = actual.value ?? actual.actualValue ?? actual.actual ?? null;
  const achievementPct =
    actual.achievementPercentage ??
    (targetValue && actualValue != null
      ? Math.round((Number(actualValue) / Number(targetValue)) * 100)
      : null);

  // Workflow
  const supervisedDone  = !!actual.supervisedAt;
  const approvedDone    = !!actual.approvedAt;
  const isRejected      = actual.status === 'rejected';

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Back button */}
      <button
        type="button"
        className="btn-secondary !py-1.5 !px-3 !text-xs"
        onClick={() => navigate(-1)}
      >
        <ArrowLeftIcon className="w-3.5 h-3.5" />
        Back
      </button>

      {/* ── Header card ── */}
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 leading-snug">
              {indicatorName}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
              <span>{institutionName}</span>
              {actual.period && (
                <span className="flex items-center gap-1">
                  <ClockIcon className="w-3.5 h-3.5" />
                  {actual.period}
                  {actual.fiscalYear ? ` · ${actual.fiscalYear}` : ''}
                </span>
              )}
            </div>
          </div>
          <StatusBadge status={actual.status} />
        </div>

        {/* Submission meta */}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-gray-500 border-t border-gray-50 pt-4">
          <span>Submitted by <strong className="text-gray-700">{submittedBy}</strong></span>
          {submittedAt && (
            <span>on <strong className="text-gray-700">{formatDateTime(submittedAt)}</strong></span>
          )}
        </div>
      </div>

      {/* ── Values card ── */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Performance Values</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="text-center p-4 rounded-lg bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Actual Value</p>
            <p className="text-2xl font-bold text-gray-900">
              {actualValue ?? '—'}
              {actual.unit ? (
                <span className="text-sm font-normal text-gray-500 ml-1">{actual.unit}</span>
              ) : null}
            </p>
          </div>
          <div className="text-center p-4 rounded-lg bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Target</p>
            <p className="text-2xl font-bold text-gray-600">
              {targetValue ?? '—'}
              {actual.unit ? (
                <span className="text-sm font-normal text-gray-500 ml-1">{actual.unit}</span>
              ) : null}
            </p>
          </div>
          <div className="text-center p-4 rounded-lg bg-gray-50 border border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Achievement</p>
            <p className={`text-2xl font-bold ${achievementColor(achievementPct)}`}>
              {achievementPct != null ? `${achievementPct}%` : '—'}
            </p>
          </div>
        </div>

        {/* Progress bar */}
        {achievementPct != null && (
          <div className="space-y-1">
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${achievementBarColor(achievementPct)}`}
                style={{ width: `${Math.min(achievementPct, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 text-right">{achievementPct}% of target</p>
          </div>
        )}

        {/* Narrative / notes */}
        {(actual.narrative ?? actual.notes) && (
          <div className="mt-4 pt-4 border-t border-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
              Narrative / Notes
            </p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {actual.narrative ?? actual.notes}
            </p>
          </div>
        )}
      </div>

      {/* ── Automated Insight Panel (shown only for approved submissions) ── */}
      {actual.status === 'approved' && (
        <InsightPanel
          actualId={actual.id}
          title="Context for this submission"
        />
      )}

      {/* ── Workflow timeline card ── */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-700 mb-5">Workflow Timeline</h2>

        {/* Step 1: Submission */}
        <WorkflowStep
          stepNumber={1}
          title="Data Submitted"
          done
          content={
            <>
              <div className="flex gap-2 text-gray-600">
                <span className="text-gray-400 w-20 flex-shrink-0">By</span>
                <span className="font-medium">{submittedBy}</span>
              </div>
              {submittedAt && (
                <div className="flex gap-2 text-gray-600">
                  <span className="text-gray-400 w-20 flex-shrink-0">At</span>
                  <span>{formatDateTime(submittedAt)}</span>
                </div>
              )}
            </>
          }
        />

        {/* Step 2: Supervisor review */}
        <WorkflowStep
          stepNumber={2}
          title={supervisedDone ? 'Supervisor Reviewed' : 'Awaiting Supervisor Review'}
          done={supervisedDone}
          active={!supervisedDone && !isRejected}
          content={
            supervisedDone ? (
              <>
                <div className="flex gap-2 text-gray-600">
                  <span className="text-gray-400 w-20 flex-shrink-0">By</span>
                  <span className="font-medium">
                    {actual.supervisedBy?.name ?? actual.supervisedByName ?? '—'}
                  </span>
                </div>
                <div className="flex gap-2 text-gray-600">
                  <span className="text-gray-400 w-20 flex-shrink-0">At</span>
                  <span>{formatDateTime(actual.supervisedAt)}</span>
                </div>
                {actual.supervisorNote && (
                  <div className="flex gap-2 text-gray-700 mt-1">
                    <span className="text-gray-400 w-20 flex-shrink-0">Note</span>
                    <span className="italic">{actual.supervisorNote}</span>
                  </div>
                )}
              </>
            ) : null
          }
        />

        {/* Step 3: M&E approval */}
        <WorkflowStep
          stepNumber={3}
          title={
            isRejected
              ? 'Rejected'
              : approvedDone
              ? 'M&E Approved'
              : 'Awaiting M&E Review'
          }
          done={approvedDone && !isRejected}
          active={!approvedDone && supervisedDone && !isRejected}
          content={
            approvedDone || isRejected ? (
              <>
                <div className="flex gap-2 text-gray-600">
                  <span className="text-gray-400 w-20 flex-shrink-0">By</span>
                  <span className="font-medium">
                    {actual.approvedBy?.name ?? actual.approvedByName ?? '—'}
                  </span>
                </div>
                {(actual.approvedAt ?? actual.rejectedAt) && (
                  <div className="flex gap-2 text-gray-600">
                    <span className="text-gray-400 w-20 flex-shrink-0">At</span>
                    <span>{formatDateTime(actual.approvedAt ?? actual.rejectedAt)}</span>
                  </div>
                )}
                {actual.remarks && (
                  <div className="flex gap-2 text-gray-700 mt-1">
                    <span className="text-gray-400 w-20 flex-shrink-0">Remarks</span>
                    <span className="italic">{actual.remarks}</span>
                  </div>
                )}
              </>
            ) : null
          }
        />
      </div>

      {/* ── Comments card ── */}
      <div className="card">
        <div className="flex items-center gap-2 mb-5">
          <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">
            Comments
            {comments.length > 0 && (
              <span className="ml-2 text-xs font-normal text-gray-400">({comments.length})</span>
            )}
          </h2>
        </div>

        {/* Comment list */}
        {commentsQuery.isLoading ? (
          <div className="flex items-center gap-2 py-6 text-gray-400 text-sm">
            <ArrowPathIcon className="w-4 h-4 animate-spin" /> Loading comments…
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No comments yet. Be the first to add one.</p>
        ) : (
          <div className="space-y-5 mb-6">
            {comments.map((c) => (
              <CommentItem
                key={c.id ?? c._id}
                comment={c}
                showInternal={canSeeInternal}
              />
            ))}
          </div>
        )}

        {/* Divider */}
        {comments.length > 0 && <div className="border-t border-gray-100 mb-5" />}

        {/* Add comment form */}
        <form onSubmit={handleAddComment} className="space-y-3">
          <label className="label">Add a comment</label>
          <textarea
            className="input min-h-[80px] resize-none"
            placeholder="Write a comment…"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
          />

          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Internal note checkbox: M&E only */}
            {canSeeInternal && (
              <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="w-4 h-4 accent-purple-600 rounded"
                />
                <LockClosedIcon className="w-3.5 h-3.5 text-purple-500" />
                <span>Internal note (M&amp;E only)</span>
              </label>
            )}

            <button
              type="submit"
              disabled={!commentText.trim() || addComment.isPending}
              className="btn-primary ml-auto"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
              {addComment.isPending ? 'Posting…' : 'Post Comment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
