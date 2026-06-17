// Tests des utilitaires de formatage et validation métier

describe('Formatage FCFA', () => {
  const formatFCFA = (n: number | null | undefined): string => {
    if (n === null || n === undefined || isNaN(n)) return '0 FCFA';
    return Number(n).toLocaleString('fr-FR') + ' FCFA';
  };

  it('formate un nombre positif', () => {
    expect(formatFCFA(1000)).toContain('FCFA');
    expect(formatFCFA(1000)).toContain('1');
  });

  it('retourne 0 FCFA pour null', () => {
    expect(formatFCFA(null)).toBe('0 FCFA');
  });

  it('retourne 0 FCFA pour undefined', () => {
    expect(formatFCFA(undefined)).toBe('0 FCFA');
  });

  it('retourne 0 FCFA pour NaN', () => {
    expect(formatFCFA(NaN)).toBe('0 FCFA');
  });

  it('formate zéro', () => {
    expect(formatFCFA(0)).toContain('FCFA');
  });
});

describe('Validation inscription', () => {
  const validerInscription = (body: Record<string, string>) => {
    const erreurs: string[] = [];
    if (!body.nom) erreurs.push('Nom requis');
    if (!body.email) erreurs.push('Email requis');
    if (!body.mot_de_passe) erreurs.push('Mot de passe requis');
    if (body.mot_de_passe && body.mot_de_passe.length < 6)
      erreurs.push('Mot de passe minimum 6 caractères');
    if (body.mot_de_passe && body.confirm_mot_de_passe &&
        body.mot_de_passe !== body.confirm_mot_de_passe)
      erreurs.push('Les mots de passe ne correspondent pas');
    if (!body.nom_boutique) erreurs.push('Nom de boutique requis');
    return erreurs;
  };

  it('accepte une inscription valide', () => {
    const erreurs = validerInscription({
      nom: 'Koné', prenom: 'Issouf', email: 'test@test.com',
      mot_de_passe: 'secret123', confirm_mot_de_passe: 'secret123',
      nom_boutique: 'Ma Boutique',
    });
    expect(erreurs).toHaveLength(0);
  });

  it('détecte les champs manquants', () => {
    const erreurs = validerInscription({});
    expect(erreurs.length).toBeGreaterThan(0);
    expect(erreurs).toContain('Nom requis');
    expect(erreurs).toContain('Email requis');
  });

  it('détecte les mots de passe différents', () => {
    const erreurs = validerInscription({
      nom: 'Test', email: 'a@b.com',
      mot_de_passe: 'secret123', confirm_mot_de_passe: 'autre',
      nom_boutique: 'Boutique',
    });
    expect(erreurs).toContain('Les mots de passe ne correspondent pas');
  });

  it('détecte un mot de passe trop court', () => {
    const erreurs = validerInscription({
      nom: 'Test', email: 'a@b.com',
      mot_de_passe: '123', nom_boutique: 'Boutique',
    });
    expect(erreurs).toContain('Mot de passe minimum 6 caractères');
  });
});

describe('Logique de plans', () => {
  type Plan = 'starter' | 'pro' | 'business';
  const plans: Record<Plan, number> = { starter: 0, pro: 1, business: 2 };

  const peutAcceder = (planBoutique: Plan, planRequis: Plan): boolean =>
    (plans[planBoutique] ?? 0) >= (plans[planRequis] ?? 0);

  it('starter peut accéder aux fonctions starter', () => {
    expect(peutAcceder('starter', 'starter')).toBe(true);
  });

  it('starter ne peut pas accéder aux fonctions pro', () => {
    expect(peutAcceder('starter', 'pro')).toBe(false);
  });

  it('pro peut accéder aux fonctions starter et pro', () => {
    expect(peutAcceder('pro', 'starter')).toBe(true);
    expect(peutAcceder('pro', 'pro')).toBe(true);
  });

  it('business peut tout accéder', () => {
    expect(peutAcceder('business', 'starter')).toBe(true);
    expect(peutAcceder('business', 'pro')).toBe(true);
    expect(peutAcceder('business', 'business')).toBe(true);
  });
});
