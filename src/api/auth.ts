import { Hono } from 'hono';
import { supabase, getAuthHeaders } from '../lib/supabase.js';

const authRouter = new Hono();

// ✅ SIGN UP - Create new user
authRouter.post('/signup', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password, name, phone, company_name } = body;
    
    // Validation
    if (!email || !email.includes('@')) {
      return c.json({
        success: false,
        error: 'Valid email is required'
      }, 400);
    }
    
    if (!password || password.length < 6) {
      return c.json({
        success: false,
        error: 'Password must be at least 6 characters'
      }, 400);
    }
    
    if (!name || name.trim().length < 2) {
      return c.json({
        success: false,
        error: 'Name is required (min 2 characters)'
      }, 400);
    }
    
    // Check if email exists using Supabase Auth
    const { data: existingUsers } = await supabase
      .from('users')
      .select('email')
      .eq('email', email.toLowerCase().trim())
      .limit(1);
    
    if (existingUsers && existingUsers.length > 0) {
      return c.json({ 
        success: false,
        error: 'Email already registered. Try signing in.' 
      }, 409);
    }
    
    // Create user with Supabase Auth (anon key can do this)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password: password.trim(),
      options: {
        data: {
          name: name.trim(),
          phone: phone?.trim() || null,
          company_name: company_name?.trim() || null
        },
        emailRedirectTo: `${process.env.SUPABASE_URL}/auth/v1/callback`
      }
    });
    
    if (authError) {
      console.error('Signup auth error:', authError);
      return c.json({ 
        success: false,
        error: authError.message || 'Failed to create account'
      }, 400);
    }
    
    if (!authData.user) {
      return c.json({ 
        success: false,
        error: 'Account creation failed. Please try again.' 
      }, 500);
    }
    
    // Auto-confirm for development (remove in production)
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment && !authData.user.email_confirmed_at) {
      console.log('Auto-confirming email for development');
      // In production, users should verify email
    }
    
    // Sign in immediately after signup
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password: password.trim()
    });
    
    if (signInError || !signInData.session) {
      // Still return success but ask user to sign in manually
      return c.json({
        success: true,
        message: 'Account created! Please sign in.',
        data: {
          user: {
            id: authData.user.id,
            email: authData.user.email,
            name: name.trim()
          },
          requires_signin: true
        }
      }, 201);
    }
    
    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', signInData.user.id)
      .single();
    
    return c.json({
      success: true,
      message: 'Account created and signed in successfully!',
      data: {
        user: {
          id: signInData.user.id,
          email: signInData.user.email,
          name: signInData.user.user_metadata?.name || name,
          phone: signInData.user.user_metadata?.phone || phone,
          company_name: signInData.user.user_metadata?.company_name || company_name,
          avatar_url: signInData.user.user_metadata?.avatar_url
        },
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          expires_at: signInData.session.expires_at
        }
      }
    }, 201);
    
  } catch (error: any) {
    console.error('Signup error:', error);
    return c.json({
      success: false,
      error: 'Server error. Please try again later.'
    }, 500);
  }
});

// ✅ SIGN IN - Login user
authRouter.post('/signin', async (c) => {
  try {
    const body = await c.req.json();
    const { email, password } = body;
    
    if (!email || !email.includes('@')) {
      return c.json({
        success: false,
        error: 'Valid email is required'
      }, 400);
    }
    
    if (!password) {
      return c.json({
        success: false,
        error: 'Password is required'
      }, 400);
    }
    
    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password: password.trim()
    });
    
    if (error) {
      // Check specific error types
      if (error.message.includes('Invalid login credentials')) {
        return c.json({
          success: false,
          error: 'Invalid email or password'
        }, 401);
      }
      
      if (error.message.includes('Email not confirmed')) {
        return c.json({
          success: false,
          error: 'Please verify your email first'
        }, 403);
      }
      
      return c.json({
        success: false,
        error: error.message || 'Sign in failed'
      }, 401);
    }
    
    if (!data.session || !data.user) {
      return c.json({
        success: false,
        error: 'Authentication failed'
      }, 401);
    }
    
    // Get or create user profile
    let profile = null;
    
    const { data: existingProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .single();
    
    if (!existingProfile) {
      // Create profile if doesn't exist
      const { data: newProfile } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata?.name || 'User',
          phone: data.user.user_metadata?.phone || null,
          company_name: data.user.user_metadata?.company_name || null,
          subscription_plan: 'free',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      profile = newProfile;
    } else {
      profile = existingProfile;
    }
    
    return c.json({
      success: true,
      message: 'Signed in successfully',
      data: {
        user: {
          id: data.user.id,
          email: data.user.email,
          name: profile?.name || data.user.user_metadata?.name,
          phone: profile?.phone || data.user.user_metadata?.phone,
          company_name: profile?.company_name || data.user.user_metadata?.company_name,
          subscription_plan: profile?.subscription_plan || 'free',
          avatar_url: data.user.user_metadata?.avatar_url,
          created_at: profile?.created_at
        },
        session: {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at,
          expires_in: data.session.expires_in
        }
      }
    });
    
  } catch (error) {
    console.error('Signin error:', error);
    return c.json({
      success: false,
      error: 'Server error. Please try again.'
    }, 500);
  }
});

// ✅ GET USER PROFILE (Protected)
authRouter.get('/profile', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: 'Not authenticated' 
      }, 401);
    }
    
    const accessToken = authHeader.split(' ')[1];
    
    // Verify token and get user
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (error || !user) {
      return c.json({ 
        success: false, 
        error: 'Session expired. Please sign in again.' 
      }, 401);
    }
    
    // Get user profile
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (!profile) {
      return c.json({
        success: false,
        error: 'Profile not found'
      }, 404);
    }
    
    return c.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: profile.name,
          phone: profile.phone,
          company_name: profile.company_name,
          subscription_plan: profile.subscription_plan,
          invoice_count: profile.invoice_count || 0,
          client_count: profile.client_count || 0,
          total_revenue: profile.total_revenue || 0,
          created_at: profile.created_at,
          updated_at: profile.updated_at
        }
      }
    });
    
  } catch (error) {
    console.error('Profile error:', error);
    return c.json({
      success: false,
      error: 'Failed to load profile'
    }, 500);
  }
});

// ✅ UPDATE PROFILE (Protected)
authRouter.put('/profile', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: 'Not authenticated' 
      }, 401);
    }
    
    const accessToken = authHeader.split(' ')[1];
    const body = await c.req.json();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser(accessToken);
    
    if (!user) {
      return c.json({ 
        success: false, 
        error: 'User not found' 
      }, 401);
    }
    
    // Update profile
    const updates: any = {
      updated_at: new Date().toISOString()
    };
    
    if (body.name) updates.name = body.name.trim();
    if (body.phone !== undefined) updates.phone = body.phone?.trim() || null;
    if (body.company_name !== undefined) updates.company_name = body.company_name?.trim() || null;
    
    const { data: profile, error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();
    
    if (updateError) {
      return c.json({
        success: false,
        error: updateError.message
      }, 400);
    }
    
    // Update auth metadata if name changed
    if (body.name) {
      await supabase.auth.updateUser({
        data: { name: body.name.trim() }
      });
    }
    
    return c.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: profile }
    });
    
  } catch (error) {
    console.error('Update profile error:', error);
    return c.json({
      success: false,
      error: 'Failed to update profile'
    }, 500);
  }
});

// ✅ SIGN OUT
authRouter.post('/signout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const accessToken = authHeader.split(' ')[1];
      
      // Invalidate session server-side
      await supabase.auth.signOut();
    }
    
    return c.json({
      success: true,
      message: 'Signed out successfully'
    });
    
  } catch (error) {
    console.error('Signout error:', error);
    return c.json({
      success: false,
      error: 'Sign out failed'
    }, 500);
  }
});

// ✅ REFRESH TOKEN
authRouter.post('/refresh', async (c) => {
  try {
    const body = await c.req.json();
    const { refresh_token } = body;
    
    if (!refresh_token) {
      return c.json({
        success: false,
        error: 'Refresh token is required'
      }, 400);
    }
    
    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });
    
    if (error || !data.session) {
      return c.json({
        success: false,
        error: 'Invalid or expired refresh token'
      }, 401);
    }
    
    return c.json({
      success: true,
      data: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        expires_in: data.session.expires_in
      }
    });
    
  } catch (error) {
    console.error('Refresh token error:', error);
    return c.json({
      success: false,
      error: 'Failed to refresh token'
    }, 500);
  }
});

// ✅ RESET PASSWORD - Request reset
authRouter.post('/reset-password', async (c) => {
  try {
    const body = await c.req.json();
    const { email } = body;
    
    if (!email || !email.includes('@')) {
      return c.json({
        success: false,
        error: 'Valid email is required'
      }, 400);
    }
    
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${process.env.SUPABASE_URL}/auth/v1/callback`
    });
    
    if (error) {
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
    
    // Always return success (security: don't reveal if email exists)
    return c.json({
      success: true,
      message: 'If an account exists with this email, you will receive reset instructions.'
    });
    
  } catch (error) {
    console.error('Reset password error:', error);
    return c.json({
      success: false,
      error: 'Failed to process reset request'
    }, 500);
  }
});

// ✅ UPDATE PASSWORD (Protected)
authRouter.put('/update-password', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        error: 'Authentication required' 
      }, 401);
    }
    
    const accessToken = authHeader.split(' ')[1];
    const body = await c.req.json();
    const { new_password, current_password } = body;
    
    if (!new_password || new_password.length < 6) {
      return c.json({
        success: false,
        error: 'New password must be at least 6 characters'
      }, 400);
    }
    
    // Get user email first
    const { data: { user } } = await supabase.auth.getUser(accessToken);
    
    if (!user || !user.email) {
      return c.json({ 
        success: false, 
        error: 'User not found' 
      }, 401);
    }
    
    // Verify current password by trying to sign in
    if (current_password) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: current_password
      });
      
      if (signInError) {
        return c.json({
          success: false,
          error: 'Current password is incorrect'
        }, 401);
      }
    }
    
    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: new_password.trim()
    });
    
    if (updateError) {
      return c.json({
        success: false,
        error: updateError.message
      }, 400);
    }
    
    return c.json({
      success: true,
      message: 'Password updated successfully'
    });
    
  } catch (error) {
    console.error('Update password error:', error);
    return c.json({
      success: false,
      error: 'Failed to update password'
    }, 500);
  }
});

// ✅ CHECK SESSION (Quick check if token is valid)
authRouter.get('/check', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ 
        success: false, 
        valid: false,
        error: 'No token provided' 
      });
    }
    
    const accessToken = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    return c.json({
      success: !error && !!user,
      valid: !error && !!user,
      user: user ? {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name
      } : null
    });
    
  } catch (error) {
    return c.json({
      success: false,
      valid: false,
      error: 'Session check failed'
    });
  }
});

export default authRouter;