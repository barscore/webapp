import { Hono } from 'hono';
import { supabase } from '../lib/supabase.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { myDrinkVotesQuerySchema } from '../schemas/drinkSchemas.js';

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
      'id, bar_id, prezzo, qualita_drinks, socialita, varieta, orari, commento, created_at, updated_at, bars(id, name, address, city)',
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw new AppError(500, 'INTERNAL_ERROR', 'Could not load ratings');
  return c.json({ ratings: data ?? [] });
});

/** GET /me/drink-votes — the caller's drink votes (optionally filtered by drink/bar). */
me.get('/drink-votes', async (c) => {
  const user = c.get('user');
  const { drink_id, bar_id } = myDrinkVotesQuerySchema.parse(
    Object.fromEntries(new URL(c.req.url).searchParams),
  );

  let query = supabase
    .from('drink_ratings')
    .select('drink_id, bar_id, rating')
    .eq('user_id', user.id);
  if (drink_id) query = query.eq('drink_id', drink_id);
  if (bar_id) query = query.eq('bar_id', bar_id);

  const { data, error } = await query;
  if (error) throw new AppError(500, 'INTERNAL_ERROR', 'Could not load votes');
  return c.json({ votes: data ?? [] });
});

/** DELETE /me — the caller erases their own account (GDPR art. 17). Deleting the
 *  auth user cascades to profiles + ratings + votes (ON DELETE CASCADE). */
me.delete('/', async (c) => {
  const user = c.get('user');
  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) throw new AppError(500, 'INTERNAL_ERROR', 'Eliminazione account fallita');
  return c.json({ success: true });
});

export default me;
