import { useNavigate } from 'react-router-dom';
import { HomeIcon, ArrowLeftIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <div className="text-center max-w-md space-y-6">
        {/* 404 graphic */}
        <div className="relative inline-block">
          <p className="text-[120px] font-black text-gray-100 leading-none select-none">404</p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center shadow-inner">
              <DocumentTextIcon className="w-10 h-10 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Page not found</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            The page you're looking for doesn't exist, may have been moved, or you may not have permission to view it.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-2 px-5 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-100 transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Go Back
          </button>
          <a
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
          >
            <HomeIcon className="w-4 h-4" />
            Go to Dashboard
          </a>
        </div>

        <p className="text-xs text-gray-400">
          MIT M&amp;E System · Ministry of Industry and Trade, Tanzania
        </p>
      </div>
    </div>
  );
}
