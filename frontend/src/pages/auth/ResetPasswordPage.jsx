import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { EyeIcon, EyeSlashIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { authApi } from '../../api';
import toast from 'react-hot-toast';

function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    { label: '8+ characters',    pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Number',           pass: /[0-9]/.test(password) },
    { label: 'Special character',pass: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const bar = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1.5">
        {[0,1,2,3].map(i => (
          <div key={i} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i < score ? bar[score - 1] : 'bg-gray-200'}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {checks.map(c => (
          <span key={c.label} className={`text-xs flex items-center gap-1 ${c.pass ? 'text-green-600' : 'text-gray-400'}`}>
            <CheckCircleIcon className={`w-3 h-3 ${c.pass ? 'text-green-500' : 'text-gray-300'}`} />
            {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const [done, setDone] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const newPw = watch('newPassword', '');

  async function onSubmit({ newPassword, confirmPassword }) {
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    try {
      await authApi.resetPassword({ token, newPassword });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Reset failed. The link may have expired.');
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <p className="text-red-600 font-medium mb-4">Invalid or missing reset token.</p>
          <Link to="/login" className="btn-primary">Back to Login</Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <CheckCircleIcon className="w-14 h-14 text-green-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Password Reset!</h2>
          <p className="text-gray-500 text-sm">Your password has been updated. Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-sm overflow-hidden">
        <div className="bg-mit-blue px-6 py-5">
          <h1 className="text-white font-bold text-lg">Set New Password</h1>
          <p className="text-blue-300 text-xs mt-0.5">Ministry of Industry & Trade — M&amp;E System</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label">New Password</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                className="input pr-10"
                placeholder="Enter new password"
                {...register('newPassword', {
                  required: 'Required',
                  minLength: { value: 8, message: 'At least 8 characters' },
                  validate: v => /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/.test(v)
                    || 'Must include uppercase, number, and special character',
                })}
              />
              <button type="button" tabIndex={-1} onClick={() => setShowNew(v => !v)}
                className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
            <PasswordStrength password={newPw} />
            {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>}
          </div>

          <div>
            <label className="label">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                className="input pr-10"
                placeholder="Re-enter new password"
                {...register('confirmPassword', {
                  required: 'Required',
                  validate: v => v === newPw || 'Passwords do not match',
                })}
              />
              <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full justify-center mt-2">
            {isSubmitting ? 'Saving...' : 'Set New Password'}
          </button>
          <p className="text-center text-xs text-gray-400">
            <Link to="/login" className="text-mit-blue hover:underline">Back to Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
