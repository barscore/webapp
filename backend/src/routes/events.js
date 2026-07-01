import { Hono } from 'hono';
import { supabase } from '../lib/supabase.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  nearbyEventsQuerySchema,
  createEventSchema,
  updateEventSchema,
} from '../schemas/eventSchemas.js';

const events = new Hono();

/**
 * GET /events — upcoming events in a zone, soonest first.
 * With lat/lng: PostGIS `get_nearby_events` (distance + radius filter).
 * Without coords: all upcoming events (up to 500), still ordered by start.
 */
events.get('/', async (c) => {
  const { lat, lng, radius_km } = nearbyEventsQuerySchema.parse(
    Object.fromEntries(new URL(c.req.url).searchParams),
  );

  if (lat !== undefined && lng !== undefined) {
    const { data, error } = await supabase.rpc('get_nearby_events', {
      user_lat: lat,
      user_lng: lng,
      radius_km,
    });
    if (error) throw new AppError(500, 'INTERNAL_ERROR', 'Nearby events query failed');
    return c.json({ events: data ?? [] });
  }

  const { data, error } = await supabase
    .from('events')
    .select('id, bar_id, title, description, lat, lng, starts_at, ends_at, bars(name)')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(500);
  if (error) throw new AppError(500, 'INTERNAL_ERROR', 'Could not load events');

  const flattened = (data ?? []).map((e) => ({
    ...e,
    bar_name: e.bars?.name ?? null,
    bars: undefined,
  }));
  return c.json({ events: flattened });
});

/**
 * POST /events — create (admin/moderator only). Locale owners don't have a
 * dedicated role yet, so events are added on their behalf by staff; extend
 * `requireRole` here (or check `bars.created_by`) when an owner role lands.
 * When `bar_id` is given, lat/lng are backfilled from that bar.
 */
events.post('/', requireAuth, requireRole('admin', 'moderator'), async (c) => {
  const body = createEventSchema.parse(await c.req.json());
  const user = c.get('user');

  let { lat, lng } = body;
  if (body.bar_id) {
    const { data: bar, error: barErr } = await supabase
      .from('bars')
      .select('lat, lng')
      .eq('id', body.bar_id)
      .maybeSingle();
    if (barErr) throw new AppError(500, 'INTERNAL_ERROR', 'Could not load bar');
    if (!bar) throw new AppError(404, 'NOT_FOUND', 'Bar not found');
    if (lat == null || lng == null) {
      lat = bar.lat;
      lng = bar.lng;
    }
  }

  const { data, error } = await supabase
    .from('events')
    .insert({
      bar_id: body.bar_id ?? null,
      title: body.title,
      description: body.description ?? null,
      lat,
      lng,
      starts_at: body.starts_at,
      ends_at: body.ends_at ?? null,
      created_by: user.id,
    })
    .select('*')
    .single();

  if (error) throw new AppError(500, 'INTERNAL_ERROR', 'Could not create event');
  return c.json({ event: data }, 201);
});

/** PUT /events/:id — update (admin/moderator only). */
events.put('/:id', requireAuth, requireRole('admin', 'moderator'), async (c) => {
  const id = c.req.param('id');
  const body = updateEventSchema.parse(await c.req.json());

  const { data, error } = await supabase
    .from('events')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) throw new AppError(500, 'INTERNAL_ERROR', 'Could not update event');
  if (!data) throw new AppError(404, 'NOT_FOUND', 'Event not found');
  return c.json({ event: data });
});

/** DELETE /events/:id — delete (admin/moderator only). */
events.delete('/:id', requireAuth, requireRole('admin', 'moderator'), async (c) => {
  const id = c.req.param('id');
  const { data, error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error) throw new AppError(500, 'INTERNAL_ERROR', 'Could not delete event');
  if (!data) throw new AppError(404, 'NOT_FOUND', 'Event not found');
  return c.json({ success: true });
});

export default events;
