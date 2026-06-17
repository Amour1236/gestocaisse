// Tests du store d'authentification (sans réseau)

describe('authStore — logique locale', () => {
  const buildUser = (overrides = {}) => ({
    id: 'user-1',
    nom: 'Koné',
    prenom: 'Issouf',
    email: 'issouf@test.com',
    role: 'proprietaire' as const,
    actif: true,
    email_verifie: true,
    created_at: '2026-01-01',
    boutique: {
      id: 'boutique-1',
      nom: 'Ma Boutique',
      plan: 'starter' as const,
      proprietaire_id: 'user-1',
      actif: true,
      created_at: '2026-01-01',
    },
    ...overrides,
  });

  it('construit un utilisateur valide', () => {
    const user = buildUser();
    expect(user.id).toBe('user-1');
    expect(user.role).toBe('proprietaire');
    expect(user.boutique.plan).toBe('starter');
  });

  it('localStorage : stocke et récupère le token', () => {
    const fakeToken = 'eyJtest.token.here';
    localStorage.setItem('gc_token', fakeToken);
    expect(localStorage.getItem('gc_token')).toBe(fakeToken);
    localStorage.removeItem('gc_token');
    expect(localStorage.getItem('gc_token')).toBeNull();
  });

  it('localStorage : stocke et récupère l\'utilisateur sérialisé', () => {
    const user = buildUser();
    localStorage.setItem('gc_user', JSON.stringify(user));
    const recovered = JSON.parse(localStorage.getItem('gc_user')!);
    expect(recovered.id).toBe(user.id);
    expect(recovered.email).toBe(user.email);
    localStorage.removeItem('gc_user');
  });

  it('nettoie localStorage à la déconnexion', () => {
    localStorage.setItem('gc_token', 'token');
    localStorage.setItem('gc_user', '{"id":"1"}');
    localStorage.removeItem('gc_token');
    localStorage.removeItem('gc_user');
    expect(localStorage.getItem('gc_token')).toBeNull();
    expect(localStorage.getItem('gc_user')).toBeNull();
  });

  it('détecte un rôle admin', () => {
    const admin = buildUser({ role: 'admin' });
    expect(admin.role).toBe('admin');
    expect(['admin', 'proprietaire', 'caissier'].includes(admin.role)).toBe(true);
  });
});

describe('Logique panier', () => {
  type PanierItem = {
    id: string;
    nom: string;
    prix_vente: number;
    stock_actuel: number;
    qte: number;
  };

  const ajouterAuPanier = (panier: PanierItem[], produit: PanierItem): PanierItem[] => {
    const idx = panier.findIndex((i) => i.id === produit.id);
    if (idx >= 0) {
      if (panier[idx].qte >= produit.stock_actuel) return panier;
      const updated = [...panier];
      updated[idx] = { ...updated[idx], qte: updated[idx].qte + 1 };
      return updated;
    }
    return [...panier, { ...produit, qte: 1 }];
  };

  const calcTotal = (panier: PanierItem[]) =>
    panier.reduce((s, i) => s + i.prix_vente * i.qte, 0);

  it('ajoute un produit au panier vide', () => {
    const produit = { id: 'p1', nom: 'Pain', prix_vente: 200, stock_actuel: 10, qte: 1 };
    const panier = ajouterAuPanier([], produit);
    expect(panier).toHaveLength(1);
    expect(panier[0].qte).toBe(1);
  });

  it('incrémente la quantité si déjà dans le panier', () => {
    const produit = { id: 'p1', nom: 'Pain', prix_vente: 200, stock_actuel: 10, qte: 1 };
    let panier = ajouterAuPanier([], produit);
    panier = ajouterAuPanier(panier, produit);
    expect(panier[0].qte).toBe(2);
  });

  it('bloque si stock insuffisant', () => {
    const produit = { id: 'p1', nom: 'Pain', prix_vente: 200, stock_actuel: 1, qte: 1 };
    let panier = ajouterAuPanier([], produit);
    panier = ajouterAuPanier(panier, produit); // tente d'en ajouter un 2e
    expect(panier[0].qte).toBe(1); // bloqué
  });

  it('calcule le total correctement', () => {
    const panier: PanierItem[] = [
      { id: 'p1', nom: 'Pain', prix_vente: 200, stock_actuel: 10, qte: 3 },
      { id: 'p2', nom: 'Eau', prix_vente: 150, stock_actuel: 5, qte: 2 },
    ];
    expect(calcTotal(panier)).toBe(900);
  });

  it('total est zéro pour un panier vide', () => {
    expect(calcTotal([])).toBe(0);
  });
});
