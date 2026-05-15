import { notFound, redirect } from 'next/navigation';
import type { ReactNode } from 'react';
import { requireAdmin, getUser } from '@/lib/auth-helpers';
import { AdminSidebar } from '@/components/admin/AdminSidebar';

// Admin lives outside the locale tree on purpose:
//   - English-only operator UI (not customer-facing).
//   - 404'ing non-admins instead of "Forbidden" hides the route's existence.
//   - Middleware excludes /admin/* from next-intl rewriting (see middleware.ts).
//   - Inherits <html>/<body> from app/layout.tsx — no global wrappers here.
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    if (auth.status === 401) {
      // Not signed in — bounce through the public login.
      redirect('/login?returnTo=/admin');
    }
    // Signed in but not on the allowlist — pretend the route doesn't exist.
    notFound();
  }

  // Get full user profile for the sidebar avatar/name.
  const user = await getUser();
  const userMeta = {
    email: user?.email ?? null,
    displayName:
      (user?.user_metadata?.full_name as string | undefined) ||
      (user?.user_metadata?.name as string | undefined) ||
      (user?.email ? user.email.split('@')[0] : 'Admin'),
    avatarUrl:
      (user?.user_metadata?.avatar_url as string | undefined) ||
      (user?.user_metadata?.picture as string | undefined) ||
      null,
  };

  return (
    <div className="flex min-h-screen">
      <AdminSidebar user={userMeta} />
      <main className="flex-1 min-w-0 px-6 md:px-10 py-7 md:py-8 pb-20">
        {children}
      </main>
    </div>
  );
}

export const metadata = {
  title: 'AllureTV Admin',
  description: 'Operator dashboard for AllureTV.',
  robots: { index: false, follow: false }, // never index the admin
};
