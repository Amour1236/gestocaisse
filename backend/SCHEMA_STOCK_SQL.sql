-- ============================================
-- GESTOCAISSE — Module Stock Professionnel
-- Exécutez ce script APRÈS SCHEMA_SQL.sql initial
-- ============================================
-- Nouvelles fonctionnalités :
--   - Inventaires physiques avec détection des écarts
--   - Bons de réception et de sortie
--   - Alertes surstock
--   - Rapports imprimables A4
-- ============================================

-- ============================================
-- 1. AJOUTER stock_maximum À LA TABLE PRODUITS
-- ============================================
ALTER TABLE produits ADD COLUMN IF NOT EXISTS stock_maximum INTEGER DEFAULT NULL;

-- ============================================
-- 2. TABLE DES INVENTAIRES PHYSIQUES
-- ============================================
CREATE TABLE IF NOT EXISTS inventaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  utilisateur_id UUID NOT NULL REFERENCES users(id),
  date_inventaire TIMESTAMPTZ DEFAULT NOW(),
  statut TEXT DEFAULT 'en_cours' CHECK(statut IN ('en_cours', 'termine', 'annule')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE inventaires IS 'Inventaires physiques du stock avec détection des écarts';
COMMENT ON COLUMN inventaires.utilisateur_id IS 'Utilisateur qui a réalisé l inventaire';
COMMENT ON COLUMN inventaires.statut IS 'en_cours = en cours de comptage, termine = validé, annule = annulé';

-- ============================================
-- 3. TABLE DES LIGNES D'INVENTAIRE
-- ============================================
CREATE TABLE IF NOT EXISTS lignes_inventaire (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventaire_id UUID NOT NULL REFERENCES inventaires(id) ON DELETE CASCADE,
  produit_id UUID NOT NULL REFERENCES produits(id),
  stock_theorique INTEGER NOT NULL,
  stock_physique INTEGER NOT NULL,
  ecart INTEGER GENERATED ALWAYS AS (stock_physique - stock_theorique) STORED,
  date_comptage TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT DEFAULT ''
);

COMMENT ON TABLE lignes_inventaire IS 'Lignes de l inventaire physique avec stock théorique vs physique';
COMMENT ON COLUMN lignes_inventaire.stock_theorique IS 'Stock enregistré dans le système au moment de l inventaire';
COMMENT ON COLUMN lignes_inventaire.stock_physique IS 'Stock réellement compté';
COMMENT ON COLUMN lignes_inventaire.ecart IS 'Différence entre stock physique et théorique (positif = excédent, négatif = manquants)';

-- ============================================
-- 4. TABLE DES BONS (RÉCEPTION / SORTIE)
-- ============================================
CREATE TABLE IF NOT EXISTS bons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id UUID NOT NULL REFERENCES boutiques(id) ON DELETE CASCADE,
  utilisateur_id UUID NOT NULL REFERENCES users(id),
  type_bon TEXT NOT NULL CHECK(type_bon IN ('reception', 'sortie')),
  reference TEXT DEFAULT '',
  fournisseur TEXT DEFAULT '',
  client TEXT DEFAULT '',
  date_bon TIMESTAMPTZ DEFAULT NOW(),
  statut TEXT DEFAULT 'valide' CHECK(statut IN ('valide', 'annule')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE bons IS 'Bons de réception (entrées) et de sortie (pertes, casses, dons)';
COMMENT ON COLUMN bons.type_bon IS 'reception = entrée de marchandises, sortie = sortie de stock';
COMMENT ON COLUMN bons.fournisseur IS 'Nom du fournisseur pour les bons de réception';
COMMENT ON COLUMN bons.client IS 'Nom du client/destination pour les bons de sortie';

-- ============================================
-- 5. TABLE DES LIGNES DE BON
-- ============================================
CREATE TABLE IF NOT EXISTS lignes_bon (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bon_id UUID NOT NULL REFERENCES bons(id) ON DELETE CASCADE,
  produit_id UUID NOT NULL REFERENCES produits(id),
  nom_produit TEXT NOT NULL,
  quantite INTEGER NOT NULL CHECK(quantite > 0),
  prix_unitaire DECIMAL(12,2) DEFAULT 0,
  total DECIMAL(12,2) GENERATED ALWAYS AS (quantite * prix_unitaire) STORED
);

COMMENT ON TABLE lignes_bon IS 'Lignes de bon avec produit, quantité et prix';
COMMENT ON COLUMN lignes_bon.nom_produit IS 'Nom du produit au moment de la création (pour historique)';

-- ============================================
-- 6. INDEX DE PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_inventaires_boutique
  ON inventaires(boutique_id, date_inventaire DESC);
CREATE INDEX IF NOT EXISTS idx_inventaires_statut
  ON inventaires(boutique_id, statut, date_inventaire DESC);
CREATE INDEX IF NOT EXISTS idx_lignes_inventaire_inventaire
  ON lignes_inventaire(inventaire_id);
CREATE INDEX IF NOT EXISTS idx_lignes_inventaire_produit
  ON lignes_inventaire(produit_id);

CREATE INDEX IF NOT EXISTS idx_bons_boutique
  ON bons(boutique_id, date_bon DESC);
CREATE INDEX IF NOT EXISTS idx_bons_type
  ON bons(boutique_id, type_bon, date_bon DESC);
CREATE INDEX IF NOT EXISTS idx_bons_statut
  ON bons(boutique_id, statut, date_bon DESC);
CREATE INDEX IF NOT EXISTS idx_lignes_bon_bon
  ON lignes_bon(bon_id);

-- ============================================
-- 7. FONCTION RPC : Valider un inventaire
-- ============================================
CREATE OR REPLACE FUNCTION valider_inventaire(
  p_inventaire_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inventaire RECORD;
  v_ligne RECORD;
  v_stock_avant INTEGER;
  v_stock_apres INTEGER;
  v_result JSONB := jsonb_build_object('success', true, 'lignes_traitees', 0, 'ecarts_positifs', 0, 'ecarts_negatifs', 0);
  v_total_ecart INTEGER := 0;
BEGIN
  -- Vérifier que l'inventaire existe et est en cours
  SELECT * INTO v_inventaire
  FROM inventaires
  WHERE id = p_inventaire_id AND statut = 'en_cours';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Inventaire introuvable ou déjà terminé.');
  END IF;

  -- Vérifier qu'il y a des lignes
  IF NOT EXISTS (SELECT 1 FROM lignes_inventaire WHERE inventaire_id = p_inventaire_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Aucune ligne dans cet inventaire.');
  END IF;

  -- Traiter chaque ligne
  FOR v_ligne IN
    SELECT li.*, p.nom as produit_nom
    FROM lignes_inventaire li
    JOIN produits p ON p.id = li.produit_id
    WHERE li.inventaire_id = p_inventaire_id
  LOOP
    -- Récupérer le stock actuel du produit
    SELECT stock_actuel INTO v_stock_avant
    FROM produits
    WHERE id = v_ligne.produit_id;

    -- Calculer le nouveau stock (stock physique de l'inventaire)
    v_stock_apres := v_ligne.stock_physique;

    -- Mettre à jour le stock du produit
    UPDATE produits
    SET stock_actuel = v_stock_apres,
        updated_at = NOW()
    WHERE id = v_ligne.produit_id;

    -- Créer le mouvement de stock correspondant
    INSERT INTO mouvements_stock (boutique_id, produit_id, type, quantite, stock_avant, stock_apres, motif, reference_id)
    VALUES (
      v_inventaire.boutique_id,
      v_ligne.produit_id,
      CASE
        WHEN v_ligne.ecart > 0 THEN 'entree'
        WHEN v_ligne.ecart < 0 THEN 'sortie'
        ELSE 'ajustement'
      END,
      v_ligne.ecart,
      v_stock_avant,
      v_stock_apres,
      'Inventaire #' || LEFT(v_inventaire.id::TEXT, 8) || ' - ' || COALESCE(v_ligne.notes, 'Ajustement inventaire'),
      p_inventaire_id
    );

    -- Compter les écarts
    IF v_ligne.ecart > 0 THEN
      v_result := jsonb_set(v_result, '{ecarts_positifs}', (v_result->>'ecarts_positifs')::int + 1);
    ELSIF v_ligne.ecart < 0 THEN
      v_result := jsonb_set(v_result, '{ecarts_negatifs}', (v_result->>'ecarts_negatifs')::int + 1);
    END IF;

    v_result := jsonb_set(v_result, '{lignes_traitees}', (v_result->>'lignes_traitees')::int + 1);
  END LOOP;

  -- Marquer l'inventaire comme terminé
  UPDATE inventaires
  SET statut = 'termine'
  WHERE id = p_inventaire_id;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION valider_inventaire IS 'Valide un inventaire et met à jour les stocks avec les écarts détectés';

-- ============================================
-- 8. FONCTION RPC : Traiter un bon
-- ============================================
CREATE OR REPLACE FUNCTION traiter_bon(
  p_bon_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bon RECORD;
  v_ligne RECORD;
  v_stock_avant INTEGER;
  v_stock_apres INTEGER;
  v_type_mouvement TEXT;
BEGIN
  -- Vérifier que le bon existe et est valide
  SELECT * INTO v_bon
  FROM bons
  WHERE id = p_bon_id AND statut = 'valide';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Bon introuvable ou déjà annulé.');
  END IF;

  -- Vérifier qu'il y a des lignes
  IF NOT EXISTS (SELECT 1 FROM lignes_bon WHERE bon_id = p_bon_id) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Aucune ligne dans ce bon.');
  END IF;

  -- Déterminer le type de mouvement
  v_type_mouvement := CASE v_bon.type_bon
    WHEN 'reception' THEN 'entree'
    WHEN 'sortie' THEN 'sortie'
    ELSE 'ajustement'
  END;

  -- Traiter chaque ligne
  FOR v_ligne IN
    SELECT lb.*, p.nom as produit_nom
    FROM lignes_bon lb
    JOIN produits p ON p.id = lb.produit_id
    WHERE lb.bon_id = p_bon_id
  LOOP
    -- Récupérer le stock actuel
    SELECT stock_actuel INTO v_stock_avant
    FROM produits
    WHERE id = v_ligne.produit_id;

    -- Calculer le nouveau stock
    IF v_bon.type_bon = 'reception' THEN
      v_stock_apres := v_stock_avant + v_ligne.quantite;
    ELSE
      v_stock_apres := GREATEST(0, v_stock_avant - v_ligne.quantite);
    END IF;

    -- Mettre à jour le stock
    UPDATE produits
    SET stock_actuel = v_stock_apres,
        updated_at = NOW()
    WHERE id = v_ligne.produit_id;

    -- Créer le mouvement de stock
    INSERT INTO mouvements_stock (boutique_id, produit_id, type, quantite, stock_avant, stock_apres, motif, reference_id)
    VALUES (
      v_bon.boutique_id,
      v_ligne.produit_id,
      v_type_mouvement,
      CASE v_bon.type_bon WHEN 'reception' THEN v_ligne.quantite ELSE -v_ligne.quantite END,
      v_stock_avant,
      v_stock_apres,
      CASE v_bon.type_bon
        WHEN 'reception' THEN 'Bon réception #' || v_bon.reference || ' - ' || COALESCE(v_bon.fournisseur, 'Fournisseur')
        WHEN 'sortie' THEN 'Bon sortie #' || v_bon.reference || ' - ' || COALESCE(v_bon.client, v_bon.notes)
        ELSE 'Bon #' || v_bon.reference
      END,
      p_bon_id
    );
  END LOOP;

  -- Marquer le bon comme traité
  UPDATE bons
  SET statut = 'valide'
  WHERE id = p_bon_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Bon traité avec succès.',
    'type', v_bon.type_bon,
    'nb_lignes', (SELECT COUNT(*) FROM lignes_bon WHERE bon_id = p_bon_id)
  );
END;
$$;

COMMENT ON FUNCTION traiter_bon IS 'Traite un bon (réception ou sortie) et met à jour les stocks';

-- ============================================
-- 9. VÉRIFICATION
-- ============================================
DO $$
DECLARE
  table_name TEXT;
  column_name TEXT;
  expected_columns TEXT;
  missing_cols TEXT[];
BEGIN
  -- Vérifier que les colonnes existent
  SELECT column_name INTO STRICT column_name
  FROM information_schema.columns
  WHERE table_name = 'produits' AND column_name = 'stock_maximum';

  RAISE NOTICE '✅ Colonne stock_maximum ajoutée à produits';

EXCEPTION WHEN NO_DATA_FOUND THEN
  RAISE NOTICE '❌ Colonne stock_maximum non trouvée dans produits';
END $$;

-- Vérifier les tables
DO $$
DECLARE
  tables_to_check TEXT[] := ARRAY['inventaires', 'lignes_inventaire', 'bons', 'lignes_bon'];
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY tables_to_check
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = table_name AND table_schema = 'public'
    ) THEN
      RAISE NOTICE '✅ Table % créée avec succès', table_name;
    ELSE
      RAISE WARNING '❌ Table % non créée', table_name;
    END IF;
  END LOOP;
END $$;

-- Vérifier les fonctions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'valider_inventaire'
  ) THEN
    RAISE NOTICE '✅ Fonction valider_inventaire créée';
  ELSE
    RAISE WARNING '❌ Fonction valider_inventaire non créée';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'traiter_bon'
  ) THEN
    RAISE NOTICE '✅ Fonction traiter_bon créée';
  ELSE
    RAISE WARNING '❌ Fonction traiter_bon non créée';
  END IF;
END $$;

-- Succès!
SELECT 'Module Stock Professionnel installé avec succès !' AS resultat;

-- ============================================
-- NOTES
-- ============================================
--
-- 📋 UTILISATION :
--
-- 1. EXÉCUTER CE SCRIPT après SCHEMA_SQL.sql initial
--
-- 2. VÉRIFIER que toutes les tables sont créées :
--    SELECT table_name FROM information_schema.tables
--    WHERE table_schema = 'public'
--    AND table_name IN ('inventaires', 'lignes_inventaire', 'bons', 'lignes_bon');
--
-- 3. LES FONCTIONS RPC seront appelées par le backend :
--    - valider_inventaire(p_inventaire_id) : pour valider un inventaire
--    - traiter_bon(p_bon_id) : pour traiter un bon
--
-- 4. COLONNES AJOUTÉES :
--    - produits.stock_maximum : seuil maximum pour alerte surstock
--
-- 5. POUR SUPPRIMER CE MODULE (si nécessaire) :
--    DROP FUNCTION IF EXISTS valider_inventaire(UUID);
--    DROP FUNCTION IF EXISTS traiter_bon(UUID);
--    DROP TABLE IF EXISTS lignes_bon CASCADE;
--    DROP TABLE IF EXISTS bons CASCADE;
--    DROP TABLE IF EXISTS lignes_inventaire CASCADE;
--    DROP TABLE IF EXISTS inventaires CASCADE;
--    ALTER TABLE produits DROP COLUMN IF EXISTS stock_maximum;
--
-- ============================================
