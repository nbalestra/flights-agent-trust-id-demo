import Link from 'next/link';
import { Home, Plane } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-easyjet-orange to-easyjet-orange-dark flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        <div className="space-y-4">
          <div className="flex justify-center">
            <Plane className="w-24 h-24 text-white/20 transform rotate-45" />
          </div>
          <h1 className="text-8xl font-bold text-white">404</h1>
          <h2 className="text-2xl font-semibold text-white">
            Flight Not Found
          </h2>
          <p className="text-white/80">
            Oops! This page seems to have taken off without us.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex items-center space-x-2 bg-white text-easyjet-orange px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
        >
          <Home className="w-5 h-5" />
          <span>Return Home</span>
        </Link>
      </div>
    </div>
  );
}
