'use client';

import { Logement, Rental } from '@/app/context/PropertyContext';

interface PropertyHeaderProps {
  logement: Logement;
  activeRental?: Rental;
}

export default function PropertyHeader({ logement, activeRental }: PropertyHeaderProps) {
  const isShortterm = logement.location_type === 'shortterm';
  const isLongterm = logement.location_type === 'longterm';

  return (
    <div className="ph-header">
      <div className="ph-header-top">
        <div className="ph-title-section">
          <h1>{logement.name}</h1>
          <span className={`ph-location-badge ${isShortterm ? 'ph-shortterm' : 'ph-longterm'}`}>
            {isShortterm ? '🏨 Courte Durée' : '🏠 Longue Durée'}
          </span>
        </div>
        <p className="ph-address">
          <i className="fas fa-map-marker-alt"></i>
          {logement.address}
          {logement.postal_code && `, ${logement.postal_code}`}
        </p>
      </div>

      <div className="ph-stats">
        <div className="ph-stat-item">
          <span className="ph-stat-label">Type de bien</span>
          <span className="ph-stat-value">{logement.type.charAt(0).toUpperCase() + logement.type.slice(1)}</span>
        </div>
        <div className="ph-stat-item">
          <span className="ph-stat-label">Nombre de pièces</span>
          <span className="ph-stat-value">{logement.rooms}</span>
        </div>

        {isLongterm && logement.surface && (
          <div className="ph-stat-item">
            <span className="ph-stat-label">Surface</span>
            <span className="ph-stat-value">{logement.surface} m²</span>
          </div>
        )}

        {isShortterm && (
          <div className="ph-stat-item">
            <span className="ph-stat-label">Prix / Nuit</span>
            <span className="ph-stat-value">{logement.price_per_night?.toLocaleString('fr-FR')}€</span>
          </div>
        )}

        {isLongterm && (
          <>
            <div className="ph-stat-item">
              <span className="ph-stat-label">Loyer HC</span>
              <span className="ph-stat-value">{logement.rent_without_charges?.toLocaleString('fr-FR')}€</span>
            </div>
            <div className="ph-stat-item">
              <span className="ph-stat-label">Total mensuel</span>
              <span className="ph-stat-value">{logement.price.toLocaleString('fr-FR')}€</span>
            </div>
          </>
        )}

        <div className="ph-stat-item">
          <span className="ph-stat-label">Statut</span>
          <span className={`ph-stat-value ${activeRental ? 'ph-status-occupied' : 'ph-status-available'}`}>
            {activeRental ? '● Occupé' : '● Libre'}
          </span>
        </div>
      </div>

      {isLongterm && !activeRental && logement.deposit_guarantee && (
        <div className="ph-info-cards">
          <div className="ph-info-card">
            <span className="ph-info-label">Dépôt de garantie</span>
            <span className="ph-info-value">{logement.deposit_guarantee.toLocaleString('fr-FR')}€</span>
          </div>
        </div>
      )}

      {isShortterm && (
        <div className="ph-info-cards">
          {logement.cleaning_fees && (
            <div className="ph-info-card">
              <span className="ph-info-label">Frais de ménage</span>
              <span className="ph-info-value">{logement.cleaning_fees.toLocaleString('fr-FR')}€</span>
            </div>
          )}
          {logement.concierge_commission && (
            <div className="ph-info-card">
              <span className="ph-info-label">Commission conciergerie</span>
              <span className="ph-info-value">{logement.concierge_commission}%</span>
            </div>
          )}
          {logement.check_in_type && (
            <div className="ph-info-card">
              <span className="ph-info-label">Type de check-in</span>
              <span className="ph-info-value">
                {logement.check_in_type === 'boîtier' ? '🔑 Boîtier' : logement.check_in_type === 'serrure' ? '🔐 Serrure' : '🚪 Accueil'}
              </span>
            </div>
          )}
        </div>
      )}

      {activeRental && (
        <div className="ph-rental-card">
          <div className="ph-rental-section">
            <h3>Locataire actif</h3>
            <p className="ph-tenant-name">{activeRental.tenant_name}</p>
            <p className="ph-tenant-email">
              <i className="fas fa-envelope"></i>
              {activeRental.email}
            </p>
          </div>
          <div className="ph-rental-divider"></div>
          <div className="ph-rental-section">
            <h3>Période de location</h3>
            <p className="ph-rental-date">
              <i className="fas fa-calendar"></i>
              {new Date(activeRental.start_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <p className="ph-rental-date">
              <i className="fas fa-arrow-right"></i>
              {new Date(activeRental.end_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      )}

    </div>
  );
}
