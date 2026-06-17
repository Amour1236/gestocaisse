import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../database/supabase';
import { UserRow, AuthenticatedRequest, Plan } from '../types';

export const proteger = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Token manquant.' });
      return;
    }
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', decoded.id)
      .eq('actif', true)
      .maybeSingle();

    if (error || !user) {
      res.status(401).json({ success: false, message: 'Utilisateur introuvable.' });
      return;
    }

    delete (user as UserRow).mot_de_passe;
    (req as AuthenticatedRequest).user = user as UserRow;
    (req as AuthenticatedRequest).boutique_id = user.boutique_id;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token invalide ou expiré.' });
  }
};

export const autoriser = (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    if (!roles.includes(authReq.user.role)) {
      res.status(403).json({ success: false, message: 'Accès refusé.' });
      return;
    }
    next();
  };

export const checkPlan = (planRequis: Plan) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const plans: Record<Plan, number> = { starter: 0, pro: 1, business: 2 };
      const authReq = req as AuthenticatedRequest;

      const { data, error } = await supabase
        .from('boutiques')
        .select('plan')
        .eq('id', authReq.boutique_id)
        .maybeSingle();

      if (error) throw error;

      const plan = (data?.plan || 'starter') as Plan;
      if ((plans[plan] ?? 0) < (plans[planRequis] ?? 0)) {
        res.status(402).json({
          success: false,
          message: `Fonctionnalité réservée au plan ${planRequis}.`,
          requireUpgrade: true,
          planRequis,
        });
        return;
      }
      next();
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  };
