import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-easyjet-orange to-easyjet-orange-dark">
      <div className="text-center space-y-4">
        <Loader2 className="w-12 h-12 text-white animate-spin mx-auto" />
        <p className="text-white text-lg">Loading EasyJetlag...</p>
      </div>
    </div>
  );
}
