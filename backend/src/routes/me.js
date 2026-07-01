import { Hono } from 'hono';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';

// Account-scoped self routes. All require auth; a user only ever reads their own
// profile and ratings. Credential changes go through supabase-js on the frontend.
const me = new Hono();
me.use('*', requireAuth);

/** GET /me — the caller's account details (profile + email + rating count). */
me.get('/', async (c) => {
  const user = c.get('user');

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, created_at')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw new AppError(500, 'INTERNAL_ERROR', 'Could not load profile');
  if (!profile) throw new AppError(404, 'NOT_FOUND', 'Profile not found');

  const { count } = await supabase
    .from('ratings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);

  // Each rating earns 10 ice cubes (accumulating points), derived from the
  // rating count — never stored, so it can't drift.
  const ratingsCount = count ?? 0;
  return c.json({
    profile: {
      ...profile,
      email: user.email,
      ratings_count: ratingsCount,
      ice_cubes: ratingsCount * 10,
    },
  });
});

/** GET /me/ratings — the caller's own ratings, with the rated bar attached. */
me.get('/ratings', async (c) => {
  const user = c.get('user');

  const { data, error } = await supabase
    .from('ratings')
    .select(
      'id, bar_id, prezzo, qualita_alcol, socialita, commento, created_at, updated_at, bars(id, name, address, city)',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, 'INTERNAL_ERROR', 'Could not load ratings');
  return c.json({ ratings: data ?? [] });
});

export default me;
