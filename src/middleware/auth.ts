import { createMiddleware } from 'hono/factory';
import { supabase } from '../lib/supabase.js';

export const authMiddleware = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ 
      success: false, 
      error: 'Authentication required. Please sign in.' 
    }, 401);
  }
  
  const accessToken = authHeader.split(' ')[1];
  
  try {
    // Verify JWT token with Supabase using anon key
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error) {
      console.error('Token verification error:', error.message);
      return c.json({ 
        success: false, 
        error: 'Session expired. Please sign in again.' 
      }, 401);
    }
    
    if (!user) {
      return c.json({ 
        success: false, 
        error: 'User not found' 
      }, 401);
    }
    
    // Add user to context
    c.set('user', user);
    c.set('accessToken', accessToken);
    
    await next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return c.json({ 
      success: false, 
      error: 'Authentication failed' 
    }, 401);
  }
});

// Optional: Admin middleware for sensitive operations
export const adminMiddleware = createMiddleware(async (c, next) => {
  const adminKey = c.req.header('X-Admin-Key');
  
  if (!adminKey || adminKey !== process.env.ADMIN_API_KEY) {
    return c.json({ 
      success: false, 
      error: 'Admin access required' 
    }, 403);
  }
  
  await next();
});