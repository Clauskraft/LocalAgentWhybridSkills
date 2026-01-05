import React, { useState, memo } from 'react';
import { IconX, IconChevronDown, IconChevronRight } from './icons';

interface ErrorToastProps {
  message: string;
  stack?: string;
  onClose: () => void;
  timestamp?: string;
}

export const ErrorToast = memo(function ErrorToast({
  message,
  stack,
  onClose,
  timestamp
}: ErrorToastProps) {
  const [showStack, setShowStack] = useState(false);

  const handleLogError = () => {
    // Log to HyperLog via IPC
    if (window.electron?.log) {
      window.electron.log.error('ui.error.user_reported', message, {
        stack: stack,
        timestamp: timestamp || new Date().toISOString(),
        userAction: 'reported_error'
      });
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className="bg-red-500 text-white rounded-lg shadow-lg border border-red-600 max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-300 rounded-full" />
            <span className="font-semibold">Error</span>
          </div>
          <button
            onClick={onClose}
            className="text-red-200 hover:text-white transition-colors"
            aria-label="Close error"
          >
            <IconX className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 pb-4">
          <p className="text-sm mb-3">{message}</p>

          {timestamp && (
            <p className="text-xs text-red-200 mb-2">
              {new Date(timestamp).toLocaleString()}
            </p>
          )}

          {/* Stack trace toggle */}
          {stack && (
            <button
              onClick={() => setShowStack(!showStack)}
              className="flex items-center gap-1 text-xs text-red-200 hover:text-white mb-2 transition-colors"
            >
              {showStack ? (
                <IconChevronDown className="w-3 h-3" />
              ) : (
                <IconChevronRight className="w-3 h-3" />
              )}
              {showStack ? 'Hide' : 'Show'} stack trace
            </button>
          )}

          {showStack && stack && (
            <pre className="text-xs bg-red-600 p-2 rounded overflow-auto max-h-32 mb-2">
              {stack}
            </pre>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={handleLogError}
              className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 rounded transition-colors"
            >
              Log Error
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${message}${stack ? '\n\nStack:\n' + stack : ''}`);
              }}
              className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 rounded transition-colors"
            >
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});
