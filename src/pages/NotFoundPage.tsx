import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui';
import { MapPinOff } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-6">
        <MapPinOff size={48} />
      </div>
      <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">Page not found</h1>
      <p className="text-lg text-gray-500 mb-8 max-w-md mx-auto">
        We couldn't find the page you're looking for. It might have been moved or doesn't exist.
      </p>
      <Link to="/">
        <Button size="lg" className="px-8">
          Go Home
        </Button>
      </Link>
    </div>
  );
}
