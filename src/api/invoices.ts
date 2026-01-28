import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.js';
import { supabase } from '../lib/supabase.js';

const invoicesRouter = new Hono();

// Apply auth middleware to all invoice routes
invoicesRouter.use('*', authMiddleware);

// GET all invoices for authenticated user
invoicesRouter.get('/', async (c) => {
  try {
    const user = c.get('user');
    
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      return c.json({
        success: false,
        error: 'Failed to fetch invoices'
      }, 500);
    }
    
    return c.json({
      success: true,
      data: invoices || []
    });
    
  } catch (error) {
    console.error('Get invoices error:', error);
    return c.json({
      success: false,
      error: 'Server error'
    }, 500);
  }
});

// GET single invoice
invoicesRouter.get('/:id', async (c) => {
  try {
    const user = c.get('user');
    const invoiceId = c.req.param('id');
    
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();
    
    if (error) {
      return c.json({
        success: false,
        error: 'Invoice not found'
      }, 404);
    }
    
    return c.json({
      success: true,
      data: invoice
    });
    
  } catch (error) {
    console.error('Get invoice error:', error);
    return c.json({
      success: false,
      error: 'Server error'
    }, 500);
  }
});

// CREATE new invoice
invoicesRouter.post('/', async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    
    // Validation
    if (!body.client_name || !body.amount) {
      return c.json({
        success: false,
        error: 'Client name and amount are required'
      }, 400);
    }
    
    const invoiceData = {
      user_id: user.id,
      client_name: body.client_name.trim(),
      client_email: body.client_email?.trim() || null,
      client_phone: body.client_phone?.trim() || null,
      invoice_number: body.invoice_number || `INV-${Date.now()}`,
      amount: parseFloat(body.amount),
      tax_rate: body.tax_rate ? parseFloat(body.tax_rate) : 0,
      tax_amount: body.tax_amount ? parseFloat(body.tax_amount) : 0,
      total_amount: body.total_amount ? parseFloat(body.total_amount) : parseFloat(body.amount),
      currency: body.currency || 'USD',
      status: body.status || 'draft',
      due_date: body.due_date || null,
      items: body.items || [],
      notes: body.notes?.trim() || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: invoice, error } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single();
    
    if (error) {
      console.error('Create invoice error:', error);
      return c.json({
        success: false,
        error: 'Failed to create invoice'
      }, 500);
    }
    
    // Update user stats
    await supabase.rpc('increment_invoice_count', { user_id: user.id });
    
    return c.json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice
    }, 201);
    
  } catch (error) {
    console.error('Create invoice error:', error);
    return c.json({
      success: false,
      error: 'Server error'
    }, 500);
  }
});

// UPDATE invoice
invoicesRouter.put('/:id', async (c) => {
  try {
    const user = c.get('user');
    const invoiceId = c.req.param('id');
    const body = await c.req.json();
    
    // Check if invoice exists and belongs to user
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .single();
    
    if (!existingInvoice) {
      return c.json({
        success: false,
        error: 'Invoice not found'
      }, 404);
    }
    
    const updates: any = {
      updated_at: new Date().toISOString()
    };
    
    // Only update provided fields
    if (body.client_name !== undefined) updates.client_name = body.client_name.trim();
    if (body.client_email !== undefined) updates.client_email = body.client_email?.trim() || null;
    if (body.client_phone !== undefined) updates.client_phone = body.client_phone?.trim() || null;
    if (body.amount !== undefined) updates.amount = parseFloat(body.amount);
    if (body.status !== undefined) updates.status = body.status;
    if (body.due_date !== undefined) updates.due_date = body.due_date;
    if (body.items !== undefined) updates.items = body.items;
    if (body.notes !== undefined) updates.notes = body.notes?.trim() || null;
    
    const { data: invoice, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', invoiceId)
      .eq('user_id', user.id)
      .select()
      .single();
    
    if (error) {
      return c.json({
        success: false,
        error: 'Failed to update invoice'
      }, 500);
    }
    
    return c.json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice
    });
    
  } catch (error) {
    console.error('Update invoice error:', error);
    return c.json({
      success: false,
      error: 'Server error'
    }, 500);
  }
});

// DELETE invoice
invoicesRouter.delete('/:id', async (c) => {
  try {
    const user = c.get('user');
    const invoiceId = c.req.param('id');
    
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', invoiceId)
      .eq('user_id', user.id);
    
    if (error) {
      return c.json({
        success: false,
        error: 'Failed to delete invoice'
      }, 500);
    }
    
    // Update user stats
    await supabase.rpc('decrement_invoice_count', { user_id: user.id });
    
    return c.json({
      success: true,
      message: 'Invoice deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete invoice error:', error);
    return c.json({
      success: false,
      error: 'Server error'
    }, 500);
  }
});

// GET invoice stats
invoicesRouter.get('/stats/summary', async (c) => {
  try {
    const user = c.get('user');
    
    // Get counts by status
    const { data: statusCounts } = await supabase
      .from('invoices')
      .select('status')
      .eq('user_id', user.id);
    
    // Get total amounts
    const { data: amounts } = await supabase
      .from('invoices')
      .select('total_amount, status')
      .eq('user_id', user.id)
      .eq('status', 'paid');
    
    const stats = {
      total: statusCounts?.length || 0,
      paid: statusCounts?.filter(i => i.status === 'paid').length || 0,
      pending: statusCounts?.filter(i => i.status === 'pending').length || 0,
      overdue: statusCounts?.filter(i => i.status === 'overdue').length || 0,
      draft: statusCounts?.filter(i => i.status === 'draft').length || 0,
      total_revenue: amounts?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0,
      this_month: 0, // You can calculate this
      last_month: 0  // You can calculate this
    };
    
    return c.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    return c.json({
      success: false,
      error: 'Server error'
    }, 500);
  }
});

export default invoicesRouter;