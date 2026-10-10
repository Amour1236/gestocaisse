import { Activity, AlertTriangle, BarChart3, Box, DollarSign, ShoppingCart, Users } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export default function EmptyState({
  title,
  description,
  icon = 'shopping',
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: EmptyStateProps) {
  // Fallback icon mapping (since keyof typeof lucideIcons doesn't work with dynamic import)
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    shopping: ShoppingCart,
    users: Users,
    chart: BarChart3,
    dollar: DollarSign,
    alert: AlertTriangle,
    box: Box,
    activity: Activity,
  };
  const Icon = iconMap[icon] || ShoppingCart;

  const baseClassName = 'flex flex-col items-center justify-center text-center py-12 px-6';

  return (
    <div className={`${baseClassName} ${className || ''}`}>
      <div className="mb-6 h-12 w-12 flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
        <Icon className="text-gray-400 h-5 w-5" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      <p className="mb-6 max-w-xl text-gray-600 dark:text-gray-400">{description}</p>
      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="flex-1 btn btn-primary btn-lg sm:px-8 py-3"
          >
            {actionLabel}
          </button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="flex-1 btn btn-outline btn-lg sm:px-8 py-3"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// Empty states prédéfinis pour les sections courantes
export function EmptyStock() {
  return (
    <EmptyState
      title="Votre stock est vide"
      description="Ajoutez vos premiers produits pour commencer à vendre."
      icon="shopping"
      actionLabel="Ajouter un produit"
      onAction={() => {/* Géré par le composant parent */}
      }
      secondaryActionLabel="Importer des produits"
      onSecondaryAction={() => {/* Géré par le composant parent */}
      }
    />
  );
}

export function EmptyVentes() {
  return (
    <EmptyState
      title="Aucune vente enregistrée"
      description="Effectuez vos premières ventes depuis la caisse."
      icon="dollar"
      actionLabel="Ouvrir la caisse"
      onAction={() => {/* Géré par le composant parent */}
      }
    />
  );
}

export function EmptyClients() {
  return (
    <EmptyState
      title="Aucun client enregistré"
      description="Commencez à construire votre base de données clients."
      icon="users"
      actionLabel="Ajouter un client"
      onAction={() => {/* Géré par le composant parent */}
      }
    />
  );
}

export function EmptyRapports() {
  return (
    <EmptyState
      title="Aucun rapport disponible"
      description="Les rapports apparaîtront après avoir enregistré des ventes et des mouvements de stock."
      icon="chart"
      actionLabel="Voir les ventes"
      onAction={() => {/* Géré par le composant parent */}
      }
    />
  );
}