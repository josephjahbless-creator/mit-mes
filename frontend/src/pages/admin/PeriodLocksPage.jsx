import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  LockClosedIcon,
  LockOpenIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  UserCircleIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { periodLocksApi } from '../../api';
import useAuthStore from '../../store/authStore';
import { getCurrentFiscalYear, getFiscalYearOptions } from '../../utils/fiscalYear';

// ─── Constants ────────────────────────────────────────────────────────────────
const PERIODS = ['Q1', 'Q2', 'Q3', 'Q4', 'Annual'];

const CAN_LOCK_ROLES   = ['super_admin', 'me_officer'];
const CAN_UNLOCK_ROLES = ['super_admin'];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function periodLabel(p) {
  const map = { Q1: 'Quarter 1', Q2: 'Quarter 2', Q3: 'Quarter 3', Q4: 'Quarter 4', Annual: 'Annual' };
  return map[p] ?? p;
}

// ─── Confirm Modals ───────────────────────────────────────────────────────────
function LockConfirmModal({ period, fiscalYear, onClose, onConfirm, isLoading }) {
  const [notes, setNotes] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start gap-3">
          <LockClosedIcon className="w-8 h-8 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-gray-900">Lock Period: {period}</h3>
            <p className="text-sm text-gray-500 mt-1">
              This will <span className="font-semibold text-red-600">prevent all submissions and edits</span> for{' '}
              <span className="font-medium">{period} FY {fiscalYear}</span>. This action can be undone by a Super Admin.
            </p>
          </div>
        </div>
        <div>
          <label className="label">Notes (optional)</label>
          <textarea
            className="input"
            rows={3}
            placeholder="Reason for locking this period…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <button onClick={onClose} className="btn-secondary" disabled={isLoading}>Cancel</button>
          <button
            onClick={() => onConfirm(notes)}
            className="btn-danger flex items-center gap-2"
            disabled={isLoading}
          >
            <LockClosedIcon className="w-4 h-4" />
            {isLoading ? 'Locking…' : 'Lock Period'}
          </button>
        </div>
      </div>
    </div>
  );
}

function UnlockConfirmModal({ period, fiscalYear, onClose, onConfirm, isLoading }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start gap-3">
          <LockOpenIcon className="w-8 h-8 text-green-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-gray-900">Unlock Period: {period}</h3>
            <p className="text-sm text-gray-500 mt-1">
              This will <span className="font-semibold text-green-700">reopen</span> data entry and edits for{' '}
              <span className="font-medium">{period} FY {fiscalYear}</span>.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary" disabled={isLoading}>Cancel</button>
          <button
            onClick={onConfirm}
            className="btn-primary flex items-center gap-2"
            disabled={isLoading}
          >
            <LockOpenIcon className="w-4 h-4" />
            {isLoading ? 'Unlocking…' : 'Unlock Period'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Period Card ──────────────────────────────────────────────────────────────
function PeriodCard({ period, lockData, fiscalYear, canLock, canUnlock, onLock, onUnlock }) {
  const isLocked = lockData?.locked ?? false;

  return (
    <div className={`card p-5 flex flex-col gap-4 transition-all ${isLocked ? 'border-red-200 bg-red-50/40' : 'border-green-200 bg-green-50/20'}`}>
      {/* Period name + status icon */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{period}</p>
          <h3 className="text-lg font-bold text-gray-900 mt-0.5">{periodLabel(period)}</h3>
        </div>
        <div className={`p-3 rounded-xl ${isLocked ? 'bg-red-100' : 'bg-green-100'}`}>
          {isLocked
            ? <LockClosedIcon className="w-7 h-7 text-red-600" />
            : <LockOpenIcon   className="w-7 h-7 text-green-600" />
          }
        </div>
      </div>

      {/* Lock info */}
      <div className="flex-1">
        {isLocked ? (
          <div className="space-y-2">
            <span className="badge badge-red flex items-center gap-1 w-fit">
              <LockClosedIcon className="w-3 h-3" /> Locked
            </span>
            {lockData.lockedBy && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <UserCircleIcon className="w-3.5 h-3.5 shrink-0" />
                Locked by <span className="font-medium text-gray-700 ml-0.5">{lockData.lockedBy?.name ?? lockData.lockedBy}</span>
              </p>
            )}
            {lockData.lockedAt && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <CalendarDaysIcon className="w-3.5 h-3.5 shrink-0" />
                {fmtDate(lockData.lockedAt)}
              </p>
            )}
            {lockData.notes && (
              <p className="text-xs text-gray-600 bg-white/80 border border-gray-200 rounded-lg px-3 py-2 mt-1 italic">
                "{lockData.notes}"
              </p>
            )}
          </div>
        ) : (
          <div>
            <span className="badge badge-green flex items-center gap-1 w-fit">
              <LockOpenIcon className="w-3 h-3" /> Open
            </span>
            <p className="text-xs text-gray-400 mt-2">Open for submissions and edits</p>
          </div>
        )}
      </div>

      {/* Action button */}
      <div>
        {isLocked ? (
          canUnlock ? (
            <button
              onClick={() => onUnlock(period)}
              className="w-full btn-secondary text-sm flex items-center justify-center gap-2 hover:bg-green-50 hover:border-green-300 hover:text-green-700"
            >
              <LockOpenIcon className="w-4 h-4" />
              Unlock Period
            </button>
          ) : (
            <p className="text-xs text-center text-gray-400 py-1">Only Super Admin can unlock</p>
          )
        ) : (
          canLock ? (
            <button
              onClick={() => onLock(period)}
              className="w-full btn-secondary text-sm flex items-center justify-center gap-2 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
            >
              <LockClosedIcon className="w-4 h-4" />
              Lock Period
            </button>
          ) : (
            <p className="text-xs text-center text-gray-400 py-1">No permission to lock</p>
          )
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PeriodLocksPage() {
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const canLock   = CAN_LOCK_ROLES.includes(user?.role);
  const canUnlock = CAN_UNLOCK_ROLES.includes(user?.role);

  const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear);
  const fyOptions = getFiscalYearOptions(2, 1);

  // Modal state
  const [lockModal,   setLockModal]   = useState(null); // period string
  const [unlockModal, setUnlockModal] = useState(null); // period string

  // ── Query: all locks for fiscal year ──
  const { data: locksList = [], isLoading } = useQuery({
    queryKey: ['period-locks', fiscalYear],
    queryFn: () => periodLocksApi.list({ fiscalYear }).then(r => r.data),
  });

  // Build a lookup: period → lockRecord
  const locksMap = Object.fromEntries(
    locksList.map(l => [l.period, l])
  );

  // ── Lock mutation ──
  const lockMut = useMutation({
    mutationFn: ({ period, notes }) =>
      periodLocksApi.lock({ fiscalYear, period, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['period-locks'] });
      toast.success(`${lockModal} locked successfully`);
      setLockModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to lock period'),
  });

  // ── Unlock mutation ──
  const unlockMut = useMutation({
    mutationFn: ({ period }) =>
      periodLocksApi.unlock({ fiscalYear, period }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['period-locks'] });
      toast.success(`${unlockModal} unlocked successfully`);
      setUnlockModal(null);
    },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed to unlock period'),
  });

  const lockedCount = PERIODS.filter(p => locksMap[p]?.locked).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Period Locks</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Control which reporting periods are open for data submission
          </p>
        </div>
        <select
          className="input w-44 text-sm"
          value={fiscalYear}
          onChange={e => setFiscalYear(e.target.value)}
        >
          {fyOptions.map(fy => (
            <option key={fy} value={fy}>FY {fy}</option>
          ))}
        </select>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        <ShieldExclamationIcon className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
        <div>
          <span className="font-semibold">Important:</span>{' '}
          Locking a period will prevent all new submissions and edits for that period.
          {!canLock && !canUnlock && (
            <span className="ml-1 text-amber-600 font-medium">You have view-only access.</span>
          )}
        </div>
      </div>

      {/* Summary strip */}
      {!isLoading && (
        <div className="flex items-center gap-6 text-sm text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            <span className="font-semibold text-gray-800">{lockedCount}</span> locked
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            <span className="font-semibold text-gray-800">{PERIODS.length - lockedCount}</span> open
          </span>
        </div>
      )}

      {/* Cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {PERIODS.map(p => (
            <div key={p} className="card p-5 animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-1/2" />
              <div className="h-6 bg-gray-200 rounded w-3/4" />
              <div className="h-10 bg-gray-200 rounded-xl w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {PERIODS.map(period => (
            <PeriodCard
              key={period}
              period={period}
              lockData={locksMap[period]}
              fiscalYear={fiscalYear}
              canLock={canLock}
              canUnlock={canUnlock}
              onLock={setLockModal}
              onUnlock={setUnlockModal}
            />
          ))}
        </div>
      )}

      {/* Lock confirm modal */}
      {lockModal && (
        <LockConfirmModal
          period={lockModal}
          fiscalYear={fiscalYear}
          onClose={() => setLockModal(null)}
          onConfirm={(notes) => lockMut.mutate({ period: lockModal, notes })}
          isLoading={lockMut.isPending}
        />
      )}

      {/* Unlock confirm modal */}
      {unlockModal && (
        <UnlockConfirmModal
          period={unlockModal}
          fiscalYear={fiscalYear}
          onClose={() => setUnlockModal(null)}
          onConfirm={() => unlockMut.mutate({ period: unlockModal })}
          isLoading={unlockMut.isPending}
        />
      )}
    </div>
  );
}
