import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheckIcon, ShieldExclamationIcon, KeyIcon,
  QrCodeIcon, CheckCircleIcon, XCircleIcon,
  EyeIcon, EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { twoFactorApi, authApi } from '../../api';
import toast from 'react-hot-toast';

// ── Enable 2FA flow ────────────────────────────────────────────────────────────
function EnableTwoFAModal({ onClose }) {
  const [step, setStep] = useState('qr'); // 'qr' | 'verify' | 'done'
  const [qrData, setQrData] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  async function startSetup() {
    setLoading(true);
    try {
      const { data } = await twoFactorApi.setup();
      setQrData(data);
      setStep('qr');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start 2FA setup');
    } finally { setLoading(false); }
  }

  // Auto-start setup when modal opens
  useState(() => { startSetup(); });

  async function verifyCode() {
    if (code.length !== 6) { toast.error('Enter 6-digit code'); return; }
    setLoading(true);
    try {
      await twoFactorApi.verify({ token: code });
      qc.invalidateQueries(['2fa-status']);
      setStep('done');
      toast.success('Two-factor authentication enabled!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid code. Try again.');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
            <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Enable Two-Factor Authentication</h3>
            <p className="text-xs text-gray-500">Adds an extra layer of security to your account</p>
          </div>
        </div>

        {step === 'done' ? (
          <div className="text-center py-6">
            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-3" />
            <h4 className="text-lg font-semibold text-gray-900 mb-1">2FA Enabled!</h4>
            <p className="text-sm text-gray-500 mb-5">Your account is now protected with two-factor authentication.</p>
            <button onClick={onClose} className="btn-primary w-full justify-center">Done</button>
          </div>
        ) : step === 'qr' ? (
          <div className="space-y-4">
            <ol className="text-sm text-gray-600 space-y-2 mb-4">
              <li className="flex gap-2"><span className="font-bold text-blue-600">1.</span> Install an authenticator app (Google Authenticator, Authy, etc.)</li>
              <li className="flex gap-2"><span className="font-bold text-blue-600">2.</span> Scan the QR code below with your app</li>
              <li className="flex gap-2"><span className="font-bold text-blue-600">3.</span> Enter the 6-digit code to confirm setup</li>
            </ol>

            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : qrData?.qrCode ? (
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-white border-2 border-gray-200 rounded-xl">
                  <img src={qrData.qrCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
                <div className="w-full">
                  <p className="text-xs text-gray-500 text-center mb-1">Or enter this secret manually:</p>
                  <div className="bg-gray-50 rounded-lg px-3 py-2 font-mono text-xs text-gray-700 text-center break-all border border-gray-200">
                    {qrData.secret}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 btn-secondary justify-center">Cancel</button>
              <button type="button" onClick={() => setStep('verify')} className="flex-1 btn-primary justify-center" disabled={!qrData}>
                I've scanned it →
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Enter the 6-digit code from your authenticator app to confirm setup:</p>
            <div>
              <label className="label">Verification Code</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="input text-center text-2xl tracking-widest font-mono"
                placeholder="000000"
                value={code}
                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep('qr')} className="flex-1 btn-secondary justify-center">← Back</button>
              <button
                type="button" onClick={verifyCode}
                className="flex-1 btn-primary justify-center"
                disabled={loading || code.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Disable 2FA modal ─────────────────────────────────────────────────────────
function DisableTwoFAModal({ onClose }) {
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const qc = useQueryClient();

  async function handleDisable() {
    if (!password) { toast.error('Enter your current password'); return; }
    setLoading(true);
    try {
      await twoFactorApi.disable({ password });
      qc.invalidateQueries(['2fa-status']);
      toast.success('Two-factor authentication disabled');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to disable 2FA');
    } finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <ShieldExclamationIcon className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Disable 2FA</h3>
            <p className="text-xs text-gray-500">This will reduce your account security</p>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-800">
          Disabling two-factor authentication means your account will only be protected by your password.
        </div>
        <div className="mb-4">
          <label className="label">Confirm with your password</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              className="input pr-10"
              placeholder="Current password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600">
              {showPw ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 btn-secondary justify-center">Cancel</button>
          <button
            onClick={handleDisable}
            className="flex-1 py-2 px-4 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 flex items-center justify-center"
            disabled={loading || !password}
          >
            {loading ? 'Disabling...' : 'Disable 2FA'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Change Password Section ───────────────────────────────────────────────────
function ChangePasswordSection() {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [show, setShow] = useState({ cur: false, new: false, conf: false });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggle = (k) => setShow(s => ({ ...s, [k]: !s[k] }));

  const strength = (pw) => {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const pw = form.newPassword;
  const s = strength(pw);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][s];
  const strengthColor = ['', 'bg-red-500', 'bg-amber-400', 'bg-blue-500', 'bg-green-500'][s];

  async function handleSubmit(e) {
    e.preventDefault();
    if (form.newPassword !== form.confirm) { toast.error('Passwords do not match'); return; }
    if (s < 3) { toast.error('Please use a stronger password'); return; }
    setLoading(true);
    try {
      await authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword });
      toast.success('Password changed. Please log in again.');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally { setLoading(false); }
  }

  return (
    <div className="card space-y-5">
      <div className="flex items-center gap-3">
        <KeyIcon className="w-5 h-5 text-gray-500" />
        <div>
          <h2 className="font-semibold text-gray-900">Change Password</h2>
          <p className="text-xs text-gray-500">Update your account password</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        {[
          { key: 'currentPassword', label: 'Current Password', showKey: 'cur', placeholder: 'Enter current password' },
          { key: 'newPassword', label: 'New Password', showKey: 'new', placeholder: 'Min. 8 chars, uppercase, number, symbol' },
          { key: 'confirm', label: 'Confirm New Password', showKey: 'conf', placeholder: 'Re-enter new password' },
        ].map(({ key, label, showKey, placeholder }) => (
          <div key={key}>
            <label className="label">{label}</label>
            <div className="relative">
              <input
                type={show[showKey] ? 'text' : 'password'}
                className="input pr-10"
                placeholder={placeholder}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
              />
              <button type="button" onClick={() => toggle(showKey)}
                className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600">
                {show[showKey] ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
            {key === 'newPassword' && pw && (
              <div className="mt-1.5 flex items-center gap-2">
                <div className="flex gap-1 flex-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= s ? strengthColor : 'bg-gray-200'}`} />
                  ))}
                </div>
                <span className={`text-xs font-medium ${['', 'text-red-500', 'text-amber-500', 'text-blue-600', 'text-green-600'][s]}`}>
                  {strengthLabel}
                </span>
              </div>
            )}
          </div>
        ))}
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !form.currentPassword || !form.newPassword || !form.confirm}
        >
          {loading ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SecuritySettingsPage() {
  const [showEnable, setShowEnable] = useState(false);
  const [showDisable, setShowDisable] = useState(false);

  const { data: twoFaStatus, isLoading } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: () => twoFactorApi.status().then(r => r.data),
  });

  const enabled = twoFaStatus?.enabled;

  return (
    <div className="space-y-6">
      {showEnable && <EnableTwoFAModal onClose={() => setShowEnable(false)} />}
      {showDisable && <DisableTwoFAModal onClose={() => setShowDisable(false)} />}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheckIcon className="w-7 h-7 text-blue-600" />
          Security Settings
        </h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account security preferences</p>
      </div>

      {/* 2FA Card */}
      <div className="card">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${enabled ? 'bg-green-50' : 'bg-gray-100'}`}>
              {enabled
                ? <ShieldCheckIcon className="w-6 h-6 text-green-600" />
                : <ShieldExclamationIcon className="w-6 h-6 text-gray-400" />
              }
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="font-semibold text-gray-900">Two-Factor Authentication</h2>
                {isLoading ? (
                  <span className="inline-block w-14 h-5 bg-gray-200 rounded-full animate-pulse" />
                ) : (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {enabled
                      ? <><CheckCircleIcon className="w-3 h-3" /> Enabled</>
                      : <><XCircleIcon className="w-3 h-3" /> Disabled</>
                    }
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500">
                {enabled
                  ? 'Your account is protected with TOTP two-factor authentication. A code from your authenticator app is required at each login.'
                  : 'Add an extra layer of security by requiring a code from your authenticator app at each login.'
                }
              </p>
              {enabled && (
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <QrCodeIcon className="w-3 h-3" /> TOTP (Time-based One-Time Password) via Authenticator App
                </p>
              )}
            </div>
          </div>
          <div className="flex-shrink-0">
            {!isLoading && (
              enabled ? (
                <button
                  onClick={() => setShowDisable(true)}
                  className="px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
                >
                  Disable 2FA
                </button>
              ) : (
                <button
                  onClick={() => setShowEnable(true)}
                  className="btn-primary"
                >
                  Enable 2FA
                </button>
              )
            )}
          </div>
        </div>

        {/* How it works */}
        {!enabled && !isLoading && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">How it works</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { step: '1', icon: '📱', title: 'Install App', desc: 'Download Google Authenticator, Authy, or any TOTP app' },
                { step: '2', icon: '🔲', title: 'Scan QR Code', desc: 'Scan the QR code with your authenticator app to link it' },
                { step: '3', icon: '🔐', title: 'Enter Code', desc: 'Enter the 6-digit code shown in your app when you log in' },
              ].map(({ step, icon, title, desc }) => (
                <div key={step} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                  <span className="text-2xl">{icon}</span>
                  <div>
                    <p className="text-xs font-semibold text-gray-700">{title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Change Password */}
      <ChangePasswordSection />
    </div>
  );
}
