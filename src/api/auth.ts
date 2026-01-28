import { Hono } from 'hono';
import { supabase } from '../lib/supabase.js';

const authRouter = new Hono();

// ============================================
// GOOGLE AUTHENTICATION
// ============================================

// ✅ INITIATE GOOGLE SIGN IN (Web)
authRouter.post('/google', async (c) => {
  try {
    const body = await c.req.json();
    const { redirect_to } = body;
    
    // Generate Google OAuth URL
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirect_to || `${c.req.header('origin') || 'http://localhost:3000'}/api/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });
    
    if (error) {
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
    
    return c.json({
      success: true,
      data: {
        url: data.url
      }
    });
    
  } catch (error) {
    console.error('Google auth error:', error);
    return c.json({
      success: false,
      error: 'Google authentication failed'
    }, 500);
  }
});

// ✅ GET GOOGLE AUTH URL (Mobile)
authRouter.get('/google/url', async (c) => {
  try {
    const redirectTo = c.req.query('redirect_to') || 'myapp://auth-callback';
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });
    
    if (error) {
      return c.json({
        success: false,
        error: error.message
      }, 400);
    }
    
    return c.json({
      success: true,
      data: {
        auth_url: data.url,
        redirect_to: redirectTo
      }
    });
    
  } catch (error) {
    console.error('Google URL error:', error);
    return c.json({
      success: false,
      error: 'Failed to generate Google auth URL'
    }, 500);
  }
});

// ✅ GOOGLE CALLBACK HANDLER (Web)
authRouter.get('/callback', async (c) => {
  try {
    const { code } = c.req.query();
    
    if (!code) {
      return c.html(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 50px; }
            .success { color: green; }
            .error { color: red; }
          </style>
        </head>
        <body>
          <h1 class="error">Authentication Error</h1>
          <p>No authentication code provided.</p>
          <p><a href="/login">Return to Login</a></p>
        </body>
        </html>
      `);
    }
    
    // Exchange code for session
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error || !data.session) {
      return c.html(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Error</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 50px; }
            .success { color: green; }
            .error { color: red; }
          </style>
        </head>
        <body>
          <h1 class="error">Authentication Failed</h1>
          <p>${error?.message || 'Session creation failed'}</p>
          <p><a href="/login">Return to Login</a></p>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'google-auth-error',
                error: '${error?.message || 'Session creation failed'}'
              }, '*');
            }
          </script>
        </body>
        </html>
      `);
    }
    
    // Get or create user profile
    const user = data.user;
    let profile = null;
    
    const { data: existingProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (!existingProfile) {
      // Create profile if doesn't exist
      const { data: newProfile } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || 'Google User',
          avatar_url: user.user_metadata?.avatar_url,
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
    
    // Return success page with tokens
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 50px; }
          .success { color: green; }
          .token { 
            background: #f3f4f6; 
            padding: 10px; 
            border-radius: 5px; 
            margin: 10px 0;
            font-family: monospace;
            word-break: break-all;
          }
          .btn {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            text-decoration: none;
            margin-top: 20px;
          }
        </style>
        <script>
          // Send message to opener window
          if (window.opener) {
            window.opener.postMessage({
              type: 'google-auth-success',
              tokens: {
                access_token: '${data.session.access_token}',
                refresh_token: '${data.session.refresh_token}',
                expires_at: ${data.session.expires_at}
              },
              user: {
                id: '${user.id}',
                email: '${user.email}',
                name: '${profile?.name || user.user_metadata?.name}',
                avatar_url: '${user.user_metadata?.avatar_url || ''}'
              }
            }, '*');
            
            // Auto-close after 1 second
            setTimeout(() => {
              window.close();
            }, 1000);
          }
          
          // Store tokens in localStorage for same-page access
          localStorage.setItem('access_token', '${data.session.access_token}');
          localStorage.setItem('refresh_token', '${data.session.refresh_token}');
          localStorage.setItem('user', JSON.stringify({
            id: '${user.id}',
            email: '${user.email}',
            name: '${profile?.name || user.user_metadata?.name}',
            avatar_url: '${user.user_metadata?.avatar_url || ''}'
          }));
        </script>
      </head>
      <body>
        <h1 class="success">✅ Authentication Successful!</h1>
        <p>You will be redirected shortly...</p>
        <p>If this window doesn't close automatically, <a href="#" onclick="window.close()">click here</a>.</p>
        <p><a href="/login" class="btn">Return to Login Page</a></p>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error('Callback error:', error);
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Error</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 50px; }
          .error { color: red; }
        </style>
      </head>
      <body>
        <h1 class="error">Authentication Error</h1>
        <p>An unexpected error occurred.</p>
        <p><a href="/login">Return to Login</a></p>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'google-auth-error',
              error: 'An unexpected error occurred'
            }, '*');
          }
        </script>
      </body>
      </html>
    `);
  }
});

// ✅ HANDLE GOOGLE MOBILE CALLBACK
authRouter.post('/google/callback', async (c) => {
  try {
    const body = await c.req.json();
    const { access_token, refresh_token } = body;
    
    if (!access_token && !refresh_token) {
      return c.json({
        success: false,
        error: 'Access token or refresh token required'
      }, 400);
    }
    
    // Set the session
    let session;
    
    if (access_token) {
      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token
      });
      
      if (error) {
        return c.json({
          success: false,
          error: error.message
        }, 401);
      }
      
      session = data.session;
    } else if (refresh_token) {
      const { data, error } = await supabase.auth.refreshSession({
        refresh_token
      });
      
      if (error || !data.session) {
        return c.json({
          success: false,
          error: error?.message || 'Invalid refresh token'
        }, 401);
      }
      
      session = data.session;
    }
    
    if (!session) {
      return c.json({
        success: false,
        error: 'Session creation failed'
      }, 500);
    }
    
    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(session.access_token);
    
    if (userError || !user) {
      return c.json({
        success: false,
        error: 'User not found'
      }, 401);
    }
    
    // Get or create profile
    let profile = null;
    
    const { data: existingProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (!existingProfile) {
      const { data: newProfile } = await supabase
        .from('users')
        .insert({
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || 'Google User',
          avatar_url: user.user_metadata?.avatar_url,
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
      message: 'Google authentication successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: profile?.name || user.user_metadata?.name,
          avatar_url: user.user_metadata?.avatar_url,
          subscription_plan: profile?.subscription_plan || 'free',
          created_at: profile?.created_at,
          updated_at: profile?.updated_at
        },
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          expires_in: session.expires_in
        }
      }
    });
    
  } catch (error) {
    console.error('Google callback error:', error);
    return c.json({
      success: false,
      error: 'Google authentication failed'
    }, 500);
  }
});

// ============================================
// EXISTING EMAIL/PASSWORD AUTHENTICATION
// ============================================

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
    
    // Check if email exists in Supabase Auth (covers both email and social sign ups)
    const { data: existingUsers } = await supabase
      .from('users')
      .select('email')
      .eq('email', email.toLowerCase().trim())
      .limit(1);
    
    if (existingUsers && existingUsers.length > 0) {
      return c.json({ 
        success: false,
        error: 'Email already in use. This email may have been used with Google Sign-In. Please sign in instead.' 
      }, 409);
    }
    
    // Create user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password: password.trim(),
      options: {
        data: {
          name: name.trim(),
          phone: phone?.trim() || null,
          company_name: company_name?.trim() || null
        }
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
    
    // Sign in immediately after signup
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password: password.trim()
    });
    
    if (signInError || !signInData.session) {
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
    
    // Get or create user profile
    let profile = null;
    
    const { data: existingProfile } = await supabase
      .from('users')
      .select('*')
      .eq('id', signInData.user.id)
      .single();
    
    if (!existingProfile) {
      const { data: newProfile } = await supabase
        .from('users')
        .insert({
          id: signInData.user.id,
          email: signInData.user.email,
          name: signInData.user.user_metadata?.name || name,
          phone: signInData.user.user_metadata?.phone || phone,
          company_name: signInData.user.user_metadata?.company_name || company_name,
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
      message: 'Account created and signed in successfully!',
      data: {
        user: {
          id: signInData.user.id,
          email: signInData.user.email,
          name: signInData.user.user_metadata?.name || name,
          phone: signInData.user.user_metadata?.phone || phone,
          company_name: signInData.user.user_metadata?.company_name || company_name,
          subscription_plan: profile?.subscription_plan || 'free',
          created_at: profile?.created_at
        },
        session: {
          access_token: signInData.session.access_token,
          refresh_token: signInData.session.refresh_token,
          expires_at: signInData.session.expires_at,
          expires_in: signInData.session.expires_in
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
      if (error.message.includes('Invalid login credentials')) {
        // Check if user exists with this email via Google OAuth
        const { data: authUser } = await supabase.auth.admin.getUserById('') as any;
        
        const { data: existingProfile } = await supabase
          .from('users')
          .select('email, created_at')
          .eq('email', email.toLowerCase().trim())
          .single();
        
        if (existingProfile) {
          return c.json({
            success: false,
            error: 'This email is registered with Google Sign-In. Please use Google Sign-In instead or reset your password.'
          }, 401);
        }
        
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
          avatar_url: user.user_metadata?.avatar_url,
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
        name: user.user_metadata?.name,
        avatar_url: user.user_metadata?.avatar_url
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

// ✅ GET AUTH PROVIDERS (Check available auth methods)
authRouter.get('/providers', async (c) => {
  try {
    // In a real implementation, you might check Supabase for enabled providers
    // For now, return static list
    return c.json({
      success: true,
      data: {
        providers: ['email', 'google'],
        google_configured: !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY
      }
    });
  } catch (error) {
    return c.json({
      success: false,
      error: 'Failed to get auth providers'
    }, 500);
  }
});

export default authRouter;