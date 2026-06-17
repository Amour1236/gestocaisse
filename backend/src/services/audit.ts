import { Request } from 'express';
import { supabase } from '../database/supabase';

interface AuditParams {
  action: string;
  entity: string;
  entity_id?: string | number | null;
  before_data?: Record<string, unknown> | null;
  after_data?: Record<string, unknown> | null;
}

export const auditLog = async (req: Request, params: AuditParams): Promise<void> => {
  const { action, entity, entity_id = null, before_data = null, after_data = null } = params;
  try {
    const authReq = req as any;
    await supabase.from('audit_logs').insert({
      boutique_id: authReq.boutique_id || null,
      user_id: authReq.user?.id || null,
      action,
      entity,
      entity_id: entity_id ? String(entity_id) : null,
      before_data,
      after_data,
      ip: req.ip,
      user_agent: req.headers['user-agent'] || '',
    });
  } catch (err: any) {
    console.error('[audit]', err.message);
  }
};
