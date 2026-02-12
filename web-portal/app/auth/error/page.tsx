'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Home, ShieldX, ArrowLeft } from 'lucide-react';
import { signOut } from 'next-auth/react';

export default function AuthError() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const isAccessDenied = error === 'AccessDenied';

  const getErrorContent = () => {
    switch (error) {
      case 'AccessDenied':
        return {
          icon: <ShieldX className="w-12 h-12 text-red-600" />,
          title: 'Access Denied',
          message: 'You do not have permission to access this application.',
          details: 'Your access token does not include Jetlag Airlines in its audience.',
          requiredAudience: 'jetlag-app',
        };
      case 'Configuration':
        return {
          icon: <AlertCircle className="w-12 h-12 text-yellow-600" />,
          title: 'Configuration Error',
          message: 'There is a problem with the server configuration.',
          details: 'Please contact your administrator.',
        };
      case 'Verification':
        return {
          icon: <AlertCircle className="w-12 h-12 text-yellow-600" />,
          title: 'Verification Failed',
          message: 'The verification link may have expired or has already been used.',
          details: 'Please try signing in again.',
        };
      default:
        return {
          icon: <AlertCircle className="w-12 h-12 text-red-600" />,
          title: 'Authentication Error',
          message: 'An error occurred during authentication.',
          details: error || 'Unknown error',
        };
    }
  };

  const content = getErrorContent();

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-easyjet-orange to-easyjet-orange-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="card text-center space-y-6">
          <div className="flex justify-center">
            <div className={`rounded-full p-4 ${isAccessDenied ? 'bg-red-100' : 'bg-yellow-100'}`}>
              {content.icon}
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">
              {content.title}
            </h1>
            <p className="text-gray-600">{content.message}</p>
          </div>

          {/* Details section */}
          <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
            <p className="text-sm text-gray-700">{content.details}</p>
            {content.requiredAudience && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Required audience:</p>
                <code className="text-xs bg-gray-200 px-2 py-1 rounded text-gray-700">
                  {content.requiredAudience}
                </code>
              </div>
            )}
          </div>

          {isAccessDenied && (
            <div className="bg-blue-50 rounded-lg p-4 text-left">
              <p className="text-sm text-blue-700">
                Please contact your administrator to request access to the Jetlag Airlines application.
              </p>
            </div>
          )}

          <div className="space-y-3 pt-4">
            <button
              onClick={handleSignOut}
              className="block w-full btn-primary"
            >
              <div className="flex items-center justify-center space-x-2">
                <ArrowLeft className="w-5 h-5" />
                <span>Sign Out and Try Again</span>
              </div>
            </button>

            <Link href="/" className="block w-full btn-secondary">
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
