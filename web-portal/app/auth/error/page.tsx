'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Home } from 'lucide-react';

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'Access denied. You do not have permission to sign in.',
    Verification: 'The verification link may have expired or has already been used.',
    Default: 'An error occurred during authentication.',
  };

  const errorMessage = error
    ? errorMessages[error] || errorMessages.Default
    : errorMessages.Default;

  return (
    <div className="min-h-screen bg-gradient-to-br from-easyjet-orange to-easyjet-orange-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-red-100 rounded-full p-4">
              <AlertCircle className="w-12 h-12 text-red-600" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Authentication Error
            </h1>
            <p className="text-gray-600">{errorMessage}</p>
          </div>

          <div className="space-y-3 pt-4">
            <Link href="/" className="block w-full btn-primary">
              <div className="flex items-center justify-center space-x-2">
                <Home className="w-5 h-5" />
                <span>Return to Home</span>
              </div>
            </Link>

            <p className="text-sm text-gray-500">
              If the problem persists, please contact support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
