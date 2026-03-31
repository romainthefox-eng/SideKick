'use client';

import { useState, useMemo } from 'react';
import { useProperty } from '../context/PropertyContext';
import Link from 'next/link';

interface FilterOptions {
  searchTerm: string;
  type: string;
  status: string;
  sortBy: string;
}

export default function PropertyTable() {
  const { logements, getRentalsByLogement } = useProperty();
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    type: 'tous',
    status: 'tous',
    sortBy: 'nom'
  });

  // Filtrer et trier les logements
  const filteredLogements = useMemo(() => {
    let result = [...logements];

    // Filtre par texte de recherche
    if (filters.searchTerm) {
      result = result.filter(l =>
        l.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        l.address.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }

    // Filtre par type
    if (filters.type !== 'tous') {
      result = result.filter(l => l.type === filters.type);
    }

    // Filtre par statut (occupé/libre)
    if (filters.status !== 'tous') {
      if (filters.status === 'occupe') {
        result = result.filter(l => getRentalsByLogement(l.id).some(r => r.status === 'active'));
      } else if (filters.status === 'libre') {
        result = result.filter(l => !getRentalsByLogement(l.id).some(r => r.status === 'active'));
      }
    }

    // Tri
    result.sort((a, b) => {
      switch (filters.sortBy) {
        case 'nom':
          return a.name.localeCompare(b.name);
        case 'prix-asc':
          return a.price - b.price;
        case 'prix-desc':
          return b.price - a.price;
        case 'adresse':
          return a.address.localeCompare(b.address);
        default:
          return 0;
      }
    });

    return result;
  }, [filters, logements, getRentalsByLogement]);

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="property-table-container">
      {/* Filtres */}
      <div className="filters-section">
        <div className="search-box">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Rechercher par nom ou adresse..."
            value={filters.searchTerm}
            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
          />
        </div>

        <div className="filters-grid">
          <div className="filter-group">
            <label>Type de bien</label>
            <select 
              value={filters.type} 
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="tous">Tous les types</option>
              <option value="appartement">Appartement</option>
              <option value="maison">Maison</option>
              <option value="studio">Studio</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Statut</label>
            <select 
              value={filters.status} 
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="tous">Tous les statuts</option>
              <option value="occupe">Occupé</option>
              <option value="libre">Libre</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Trier par</label>
            <select 
              value={filters.sortBy} 
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
            >
              <option value="nom">Nom</option>
              <option value="prix-asc">Prix (bas au haut)</option>
              <option value="prix-desc">Prix (haut au bas)</option>
              <option value="adresse">Adresse</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tableau */}
      <div className="table-wrapper">
        <table className="properties-table">
          <thead>
            <tr>
              <th>Ville</th>
              <th>Code Postal</th>
              <th>Quartier</th>
              <th>Bien</th>
              <th>Statut</th>
              <th>Prochain check-in</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogements.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-state">
                  Aucun logement correspondant aux critères de recherche
                </td>
              </tr>
            ) : (
              filteredLogements.map(logement => {
                const rentals = getRentalsByLogement(logement.id);
                const activeRental = rentals.find(r => r.status === 'active');
                const status = activeRental ? 'Occupé' : 'Libre';
                const upcomingRental = rentals.find(r => r.status === 'pending');
                const nextCheckIn = upcomingRental 
                  ? new Date(upcomingRental.start_date).toLocaleDateString('fr-FR')
                  : '-';

                return (
                  <tr key={logement.id}>
                    <td className="city">
                      {logement.address.split(',').pop()?.trim() || 'Paris'}
                    </td>
                    <td className="postal">
                      {logement.postal_code || '-'}
                    </td>
                    <td className="neighborhood">
                      {logement.address.split(',')[0]?.trim() || 'Centre'}
                    </td>
                    <td className="property-name">
                      <div className="property-info">
                        <span className="property-type">{logement.type}</span>
                        {logement.name}
                      </div>
                    </td>
                    <td className="status">
                      <span className={`status-badge ${status === 'Occupé' ? 'occupied' : 'available'}`}>
                        {status}
                      </span>
                    </td>
                    <td className="check-in">
                      {nextCheckIn}
                    </td>
                    <td className="actions">
                      <Link href={`/properties/${logement.id}`}>
                        <button className="btn-see">Voir</button>
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Résumé */}
      <div className="table-summary">
        <div className="summary-item">
          <span className="summary-label">Total:</span>
          <span className="summary-value">{filteredLogements.length} bien(s)</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Occupés:</span>
          <span className="summary-value">
            {filteredLogements.filter(l => getRentalsByLogement(l.id).some(r => r.status === 'active')).length}
          </span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Libres:</span>
          <span className="summary-value">
            {filteredLogements.filter(l => !getRentalsByLogement(l.id).some(r => r.status === 'active')).length}
          </span>
        </div>
      </div>

      <style jsx>{`
        .property-table-container {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding: 0;
        }

        .filters-section {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          border: 1px solid #ddd;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-box i {
          position: absolute;
          left: 12px;
          color: #999;
        }

        .search-box input {
          width: 100%;
          padding: 0.75rem 1rem 0.75rem 2.5rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.95rem;
          transition: all 0.2s;
        }

        .search-box input:focus {
          outline: none;
          border-color: #2c5aa0;
          box-shadow: 0 0 0 2px rgba(44, 90, 160, 0.1);
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 1rem;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        .filter-group label {
          font-size: 0.8rem;
          font-weight: 600;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .filter-group select {
          padding: 0.6rem;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 0.9rem;
          background-color: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-group select:focus {
          outline: none;
          border-color: #2c5aa0;
          box-shadow: 0 0 0 2px rgba(44, 90, 160, 0.1);
        }

        .table-wrapper {
          overflow-x: auto;
          background: white;
          border-radius: 8px;
          border: 1px solid #ddd;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .properties-table {
          width: 100%;
          border-collapse: collapse;
        }

        .properties-table thead {
          background-color: #f9f9f9;
          border-bottom: 1px solid #ddd;
        }

        .properties-table th {
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          color: #1a1a1a;
          font-size: 0.85rem;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          color: #999;
        }

        .properties-table td {
          padding: 1rem;
          border-bottom: 1px solid #eee;
          font-size: 0.95rem;
        }

        .properties-table tbody tr:hover {
          background-color: #f9f9f9;
        }

        .city {
          font-weight: 600;
          color: #1a1a1a;
        }

        .postal {
          color: #666;
          font-weight: 600;
          font-size: 0.95rem;
        }

        .neighborhood {
          color: #666;
          font-size: 0.9rem;
        }

        .property-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .property-type {
          background: rgba(44, 90, 160, 0.08);
          color: #2c5aa0;
          padding: 0.25rem 0.6rem;
          border-radius: 3px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.2px;
        }

        .status-badge {
          padding: 0.35rem 0.8rem;
          border-radius: 3px;
          font-size: 0.8rem;
          font-weight: 600;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.2px;
        }

        .status-badge.occupied {
          background-color: rgba(245, 124, 0, 0.1);
          color: #f57c00;
        }

        .status-badge.available {
          background-color: rgba(46, 125, 50, 0.1);
          color: #2e7d32;
        }

        .check-in {
          color: #666;
          font-size: 0.9rem;
        }

        .actions {
          display: flex;
          gap: 0.5rem;
        }

        .btn-see {
          padding: 0.5rem 1rem;
          background-color: #2c5aa0;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.2s;
          text-decoration: none;
        }

        .btn-see:hover {
          background-color: #1e3f5a;
          box-shadow: 0 2px 6px rgba(44, 90, 160, 0.2);
        }

        .empty-state {
          text-align: center;
          color: #999;
          padding: 2rem !important;
          font-style: italic;
        }

        .table-summary {
          display: flex;
          gap: 2rem;
          padding: 1rem;
          background: #f9f9f9;
          border-radius: 6px;
          justify-content: flex-start;
          border: 1px solid #eee;
        }

        .summary-item {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .summary-label {
          font-weight: 600;
          color: #1a1a1a;
          font-size: 0.9rem;
        }

        .summary-value {
          color: #2c5aa0;
          font-weight: 700;
          font-size: 1.1rem;
        }

        @media (max-width: 768px) {
          .filters-grid {
            grid-template-columns: 1fr;
          }

          .properties-table th,
          .properties-table td {
            padding: 0.75rem;
            font-size: 0.9rem;
          }

          .table-summary {
            flex-direction: column;
            gap: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
