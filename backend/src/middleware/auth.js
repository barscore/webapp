import { supabase } from '../lib/supabase.js';
import { AppError } from './errorHandler.js';

// Verifies the Supabase access token (Bearer) and attaches the user to context.
// Works for email/password and OAuth (Google) sessions alike.
export async function requireAuth(c, next) {
  const header = c.req.header('Authorization') || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'UNAUTHORIZED', 'Missing or malformed Authorization header');
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired access token');
  }

  // Role lives in the profiles table; loaded lazily by requireRole.
  c.set('user', { id: data.user.id, email: data.user.email });
  await next();
}

// Restricts a route to the given roles. Use after requireAuth.
// Fetches the caller's role from profiles (Supabase JWT carries no app role).
export function requireRole(...roles) {
  return async (c, next) => {
    const user = c.get('user');
    if (!user) throw new AppError(401, 'UNAUTHORIZED', 'Not authenticated');

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (error) throw new AppError(500, 'INTERNAL_ERROR', 'Could not verify role');
    if (!data || !roles.includes(data.role)) {
      throw new AppError(403, 'FORBIDDEN', 'Insufficient permissions');
    }

    c.set('user', { ...user, role: data.role });
    await next();
  };
}
