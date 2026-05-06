'use server';

// Auth-related Server Actions.

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** Sign the current user out and bounce to the home page. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/');
}
