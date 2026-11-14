import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function NotFoundPage() {
  const { pathname } = useLocation();

  useEffect(() => {
    const previous = document.title;
    document.title = 'Page not found · Smart Street';
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <main
      id="main-content"
      className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-orange-50 to-white px-4 text-center"
    >
      <p className="text-sm font-semibold uppercase tracking-widest text-orange-700">Error 404</p>
      <h1 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">We couldn&apos;t find that page</h1>
      <p className="mt-4 max-w-md text-slate-600">
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm text-slate-800">{pathname}</code>{' '}
        doesn&apos;t exist or may have moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center rounded-full bg-orange-700 px-6 font-semibold text-white hover:bg-orange-800"
        >
          Go to home
        </Link>
        <Link
          to="/auth"
          className="inline-flex min-h-11 items-center rounded-full border border-slate-300 px-6 font-semibold text-slate-800 hover:bg-slate-50"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
