import { supabase } from './supabaseClient';
import { authService } from './authService';

export const logService = {
  async logBlock({ url, domain, category, reason, confidence }) {
    try {
      const user = await authService.getCurrentUser();
      
      if (!user) {
        console.log('[RiseDefend] logBlock: No active user session — skipping DB log');
        return false;
      }

      const payload = {
        user_id: user.id,
        url,
        domain,
        category: category || 'SAFE',
        reason: reason || 'Unknown',
        confidence: confidence || 1.0,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase.from('block_logs').insert([payload]);
      if (error) {
        console.warn('[RiseDefend] logBlock insert warning:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[RiseDefend] logBlock exception:', err);
      return false;
    }
  }
};
