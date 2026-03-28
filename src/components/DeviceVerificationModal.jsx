import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';

export default function DeviceVerificationModal({ email, tempToken, onClose, onSuccess }) {
  const { verifyDevice } = useAuth();
  const toast = useToast();
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');

    if (!verificationCode || verificationCode.length !== 6) {
      const errorMsg = 'Please enter the 6-character verification code.';
      setError(errorMsg);
      return;
    }

    if (!tempToken) {
      const errorMsg = 'Verification session is missing or expired. Please log in again.';
      setError(errorMsg);
      return;
    }

    setLoading(true);
    try {
      const result = await verifyDevice(verificationCode, tempToken);

      if (result.success) {
        // User is now authenticated - close modal and let React Router handle navigation
        onSuccess();
      } else {
        const errorMsg = result.error || 'Invalid or expired verification code.';
        setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = err.message || 'Failed to verify device. Please try again.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = () => {
    setError('');
    toast.info('Please log out and log in again to receive a new verification code.');
  };

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#000', // Solid background, no transparency
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {!tempToken && (
          <div className="px-6 pt-4 text-sm text-red-600 dark:text-red-400">
            Verification session has expired. Please close this dialog and log in again.
          </div>
        )}
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Device Verification
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            A verification code has been sent to:
          </p>
          <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
            {email}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleVerify} className="px-6 py-4">
          <div className="mb-4">
            <label
              htmlFor="verificationCode"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              Enter the 6-character code:
            </label>
            <input
              id="verificationCode"
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
              placeholder="e.g., A1B2C3"
              maxLength={6}
              autoFocus
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       text-center text-lg tracking-widest uppercase
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {error ? <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg
                     transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify Device'}
          </button>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-2">
          <button
            type="button"
            onClick={handleResendCode}
            disabled={loading}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
          >
            Didn&apos;t receive the code?
          </button>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-sm text-gray-600 dark:text-gray-400 hover:underline disabled:opacity-50"
          >
            Cancel and Logout
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}





