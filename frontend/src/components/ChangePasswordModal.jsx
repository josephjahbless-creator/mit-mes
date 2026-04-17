import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { EyeIcon, EyeSlashIcon, XMarkIcon, LockClosedIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { authApi } from '../api';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    { label: '8+ characters',         pass: password.length >= 8 },
    { label: 'Uppercase letter',       pass: /[A-Z]/.test(password) },
    { label: 'Number',                 pass: /[0-9]/.test(password) },
    { label: 'Special character',      pass: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
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

function PasswordInput({ id, placeholder, registration, error }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        className={`input pr-10 ${error ? 'border-red-400 focus:ring-red-300' : ''}`}
        {...registration}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow(v => !v)}
        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function ChangePasswordModal({ onClose }) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm();
  const { logout, refreshToken } = useAuthStore();
  const navigate = useNavigate();
  const newPw = watch('newPassword', '');

  async function onSubmit({ currentPassword, newPassword, confirmPassword }) {
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    try {
      await authApi.changePassword({ currentPassword, newPassword });
      toast.success('Password changed. Please log in again.');
      // Server invalidated all sessions — log out locally
      try { await authApi.logout(refreshToken); } catch {}
      logout();
      navigate('/login');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-2">
            <LockClosedIcon className="w-5 h-5 text-mit-blue" />
            <h3 className="text-base font-semibold text-gray-900">Change Password</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="label" htmlFor="currentPassword">Current Password</label>
            <PasswordInput
              id="currentPassword"
              placeholder="Enter your current password"
              registration={register('currentPassword', { required: 'Current password is required' })}
              error={errors.currentPassword}
            />
            {errors.currentPassword && <p className="text-red-500 text-xs mt-1">{errors.currentPassword.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="newPassword">New Password</label>
            <PasswordInput
              id="newPassword"
              placeholder="Enter a strong new password"
              registration={register('newPassword', {
                required: 'New password is required',
                minLength: { value: 8, message: 'At least 8 characters required' },
                validate: v => /^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?])/.test(v)
                  || 'Must include an uppercase letter, a number, and a special character',
              })}
              error={errors.newPassword}
            />
            <PasswordStrength password={newPw} />
            {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>}
          </div>

          <div>
            <label className="label" htmlFor="confirmPassword">Confirm New Password</label>
            <PasswordInput
              id="confirmPassword"
              placeholder="Re-enter your new password"
              registration={register('confirmPassword', {
                required: 'Please confirm your new password',
                validate: v => v === newPw || 'Passwords do not match',
              })}
              error={errors.confirmPassword}
            />
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <div className="pt-1 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary justify-center">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="flex-1 btn-primary justify-center">
              {isSubmitting ? 'Saving...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
