import React from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon, HomeIcon } from '@heroicons/react/24/outline';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-red-100 max-w-md w-full p-8 text-center space-y-5">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Something went wrong</h2>
            <p className="text-gray-500 text-sm mt-2 leading-relaxed">
              An unexpected error occurred on this page. Your data is safe — try refreshing or go back to the dashboard.
            </p>
            {this.state.error && (
              <details className="mt-3 text-left">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 select-none">
                  Show technical details
                </summary>
                <pre className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-red-700 overflow-auto max-h-32 border border-red-100 whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Try Again
            </button>
            <a
              href="/dashboard"
              className="flex items-center gap-2 px-5 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              <HomeIcon className="w-4 h-4" />
              Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }
}
