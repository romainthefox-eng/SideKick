'use client';

import { useState } from 'react';
import { useProperty, type Logement } from '../context/PropertyContext';
import PropertyTable from './PropertyTable';

type LocationType = 'longterm' | 'shortterm';

// Adapter function to convert nested form structure to flat Logement interface
function flattenLogementData(
  formData: any,
  locationType: LocationType
): Omit<Logement, 'id' | 'created_at' | 'updated_at'> {
  const flatData: any = {
    name: formData.name,
    address: formData.address,
    postal_code: formData.postal_code,
    type: formData.type,
    rooms: formData.rooms,
    price: formData.price,
    description: formData.description,
    location_type: locationType,
    
    // Common fields (from specifications for longterm, some from shortTermSpecifications for shortterm)
    heating: formData.specifications?.heating || null,
    water: formData.specifications?.water || null,
    internet: formData.specifications?.internet || false,
    parking: formData.specifications?.parking || false,
    furnished: formData.specifications?.furnished || false,
    notes: formData.specifications?.notes || null,
    
    // Longterm specific fields
    rent_without_charges: locationType === 'longterm' ? formData.specifications?.rentWithoutCharges || null : null,
    monthly_charges: locationType === 'longterm' ? formData.specifications?.monthlyCharges || null : null,
    surface: locationType === 'longterm' ? formData.specifications?.surface || null : null,
    deposit_guarantee: locationType === 'longterm' ? formData.specifications?.depositGuarantee || null : null,
    
    // Shortterm specific fields
    price_per_night: locationType === 'shortterm' ? formData.shortTermSpecifications?.pricePerNight || null : null,
    cleaning_fees: locationType === 'shortterm' ? formData.shortTermSpecifications?.cleaningFees || null : null,
    concierge_commission: locationType === 'shortterm' ? formData.shortTermSpecifications?.conciergeCommission || null : null,
    check_in_type: locationType === 'shortterm' ? formData.shortTermSpecifications?.checkInType || null : null,
    key_location: locationType === 'shortterm' ? formData.shortTermSpecifications?.keyLocation || null : null,
    building_code: locationType === 'shortterm' ? formData.shortTermSpecifications?.buildingCode || null : null,
    wifi_code: locationType === 'shortterm' ? formData.shortTermSpecifications?.wifiCode || null : null,
    water_meter_location: locationType === 'shortterm' ? formData.shortTermSpecifications?.waterMeterLocation || null : null,
    electricity_meter_location: locationType === 'shortterm' ? formData.shortTermSpecifications?.electricityMeterLocation || null : null,
    garbage_info: locationType === 'shortterm' ? formData.shortTermSpecifications?.garbageInfo || null : null,
    specific_equipment: locationType === 'shortterm' ? formData.shortTermSpecifications?.specificEquipment || null : null,
    cleaning_checklist: locationType === 'shortterm' ? formData.shortTermSpecifications?.cleaningChecklist || null : null,
    linage_storage: locationType === 'shortterm' ? formData.shortTermSpecifications?.linageStorage || null : null,
  };
  
  return flatData;
}

export default function Logement() {
  const { logements, addLogement, loading } = useProperty();
  
  const [showAddLogement, setShowAddLogement] = useState(false);
  const [locationType, setLocationType] = useState<LocationType>('longterm');
  
  const [newLogement, setNewLogement] = useState({
    name: '',
    address: '',
    postal_code: '',
    type: 'appartement' as const,
    rooms: 1,
    price: 0,
    description: '',
    locationType: 'longterm' as LocationType,
    specifications: {
      heating: '',
      water: '',
      internet: false,
      parking: false,
      furnished: false,
      notes: '',
      rentWithoutCharges: 0,
      monthlyCharges: 0,
      surface: 0,
      depositGuarantee: 0
    },
    shortTermSpecifications: {
      pricePerNight: 0,
      cleaningFees: 0,
      conciergeCommission: 0,
      checkInType: 'boîtier',
      keyLocation: '',
      buildingCode: '',
      wifiCode: '',
      waterMeterLocation: '',
      electricityMeterLocation: '',
      garbageInfo: '',
      specificEquipment: '',
      cleaningChecklist: '',
      linageStorage: ''
    }
  });

  const handleAddLogement = async () => {
    if (!newLogement.name || !newLogement.address || newLogement.price <= 0) {
      alert('Veuillez remplir tous les champs obligatoires (nom, adresse et prix > 0)');
      return;
    }

    if (locationType === 'longterm') {
      if (!newLogement.specifications.surface || newLogement.specifications.surface <= 0) {
        alert('Veuillez remplir la surface en m² pour une location longue durée');
        return;
      }
      if (!newLogement.specifications.rentWithoutCharges || newLogement.specifications.rentWithoutCharges <= 0) {
        alert('Veuillez remplir le loyer hors charges pour une location longue durée');
        return;
      }
    }

    if (locationType === 'shortterm') {
      if (!newLogement.shortTermSpecifications.pricePerNight || newLogement.shortTermSpecifications.pricePerNight <= 0) {
        alert('Veuillez remplir le prix par nuitée pour une location courte durée');
        return;
      }
      if (!newLogement.shortTermSpecifications.checkInType) {
        alert('Veuillez sélectionner un type de check-in pour une location courte durée');
        return;
      }
    }

    try {
      const flatLogement = flattenLogementData(newLogement, locationType);
      await addLogement(flatLogement);
      
      // Reset form
      setNewLogement({
        name: '',
        address: '',
        postal_code: '',
        type: 'appartement',
        rooms: 1,
        price: 0,
        description: '',
        locationType: 'longterm',
        specifications: {
          heating: '',
          water: '',
          internet: false,
          parking: false,
          furnished: false,
          notes: '',
          rentWithoutCharges: 0,
          monthlyCharges: 0,
          surface: 0,
          depositGuarantee: 0
        },
        shortTermSpecifications: {
          pricePerNight: 0,
          cleaningFees: 0,
          conciergeCommission: 0,
          checkInType: 'boîtier',
          keyLocation: '',
          buildingCode: '',
          wifiCode: '',
          waterMeterLocation: '',
          electricityMeterLocation: '',
          garbageInfo: '',
          specificEquipment: '',
          cleaningChecklist: '',
          linageStorage: ''
        }
      });
      setLocationType('longterm');
      setShowAddLogement(false);
      alert('Logement ajouté avec succès!');
    } catch (error) {
      console.error('Erreur lors de l\'ajout du logement:', error);
      alert('Erreur lors de l\'ajout du logement. Vérifiez la console pour plus de détails.');
    }
  };

  return (
    <div>
      <div className="header">
        <h1>Logement</h1>
        <p>Gérez vos logements avec la vue tableau et filtres avancés</p>
      </div>

      <div className="content-card">
        <div className="header-actions">
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddLogement(true)}
          >
            <i className="fas fa-plus"></i> Ajouter un logement
          </button>
        </div>

        {/* Tableau des logements */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            <i className="fas fa-spinner fa-spin" style={{ marginRight: '0.5rem' }}></i>
            Chargement des logements...
          </div>
        ) : (
          <PropertyTable />
        )}
      </div>

      {/* Modal Ajouter Logement */}
      {showAddLogement && (
        <div className="modal-overlay" onClick={() => setShowAddLogement(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Ajouter un logement</h3>
            
            {/* Type de location - Switch */}
            <div className="form-group location-type-switch">
              <label>Type de location</label>
              <div className="switch-container">
                <div className={`switch-option ${locationType === 'longterm' ? 'active' : ''}`} 
                     onClick={() => setLocationType('longterm')}>
                  <span>Longue durée</span>
                </div>
                <div className={`switch-option ${locationType === 'shortterm' ? 'active' : ''}`} 
                     onClick={() => setLocationType('shortterm')}>
                  <span>Courte durée</span>
                </div>
              </div>
            </div>

            {/* Informations de base (communes aux deux types) */}
            <div className="form-section">
              <h4>Informations de base</h4>
              
              <div className="form-group">
                <label>Nom du logement*</label>
                <input 
                  type="text"
                  value={newLogement.name}
                  onChange={(e) => setNewLogement({...newLogement, name: e.target.value})}
                  placeholder="ex: Appartement 1A"
                />
              </div>

              <div className="form-group">
                <label>Adresse*</label>
                <input 
                  type="text"
                  value={newLogement.address}
                  onChange={(e) => setNewLogement({...newLogement, address: e.target.value})}
                  placeholder="ex: 123 Rue de la Paix"
                />
              </div>

              <div className="form-group">
                <label>Code postal</label>
                <input 
                  type="text"
                  value={newLogement.postal_code}
                  onChange={(e) => setNewLogement({...newLogement, postal_code: e.target.value})}
                  placeholder="ex: 75000"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Type</label>
                  <select 
                    value={newLogement.type}
                    onChange={(e) => setNewLogement({...newLogement, type: e.target.value as any})}
                  >
                    <option value="appartement">Appartement</option>
                    <option value="maison">Maison</option>
                    <option value="studio">Studio</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Pièces</label>
                  <input 
                    type="number"
                    min="1"
                    value={newLogement.rooms}
                    onChange={(e) => setNewLogement({...newLogement, rooms: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea 
                  value={newLogement.description}
                  onChange={(e) => setNewLogement({...newLogement, description: e.target.value})}
                  placeholder="Description du logement"
                ></textarea>
              </div>
            </div>

            {/* LONGUE DURÉE */}
            {locationType === 'longterm' && (
              <div className="form-section">
                <h4>Configuration longue durée</h4>
                
                {/* Section Financière */}
                <div className="form-group">
                  <h5>Configuration Financière</h5>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Loyer hors charges (HC)*</label>
                    <input 
                      type="number"
                      min="0"
                      value={newLogement.specifications.rentWithoutCharges || 0}
                      onChange={(e) => {
                        const rent = parseInt(e.target.value) || 0;
                        const charges = newLogement.specifications.monthlyCharges || 0;
                        setNewLogement({
                          ...newLogement,
                          price: rent + charges,
                          specifications: {...newLogement.specifications, rentWithoutCharges: rent}
                        });
                      }}
                      placeholder="ex: 800"
                    />
                  </div>

                  <div className="form-group">
                    <label>Charges mensuelles</label>
                    <input 
                      type="number"
                      min="0"
                      value={newLogement.specifications.monthlyCharges || 0}
                      onChange={(e) => {
                        const charges = parseInt(e.target.value) || 0;
                        const rent = newLogement.specifications.rentWithoutCharges || 0;
                        setNewLogement({
                          ...newLogement,
                          price: rent + charges,
                          specifications: {...newLogement.specifications, monthlyCharges: charges}
                        });
                      }}
                      placeholder="ex: 150"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="total-label">Total mensuel</label>
                  <div className="total-display">
                    {((newLogement.specifications.rentWithoutCharges || 0) + (newLogement.specifications.monthlyCharges || 0))} €
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Surface (m²)*</label>
                    <input 
                      type="number"
                      min="0"
                      value={newLogement.specifications.surface || 0}
                      onChange={(e) => setNewLogement({
                        ...newLogement,
                        specifications: {...newLogement.specifications, surface: parseInt(e.target.value) || 0}
                      })}
                      placeholder="ex: 65"
                    />
                  </div>

                  <div className="form-group">
                    <label>Dépôt de garantie</label>
                    <input 
                      type="number"
                      min="0"
                      value={newLogement.specifications.depositGuarantee || 0}
                      onChange={(e) => setNewLogement({
                        ...newLogement,
                        specifications: {...newLogement.specifications, depositGuarantee: parseInt(e.target.value) || 0}
                      })}
                      placeholder="ex: 1600"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Chauffage</label>
                  <input 
                    type="text"
                    value={newLogement.specifications.heating}
                    onChange={(e) => setNewLogement({
                      ...newLogement,
                      specifications: {...newLogement.specifications, heating: e.target.value}
                    })}
                    placeholder="ex: Radiateurs, Chauffage central..."
                  />
                </div>

                <div className="form-group">
                  <label>Eau</label>
                  <input 
                    type="text"
                    value={newLogement.specifications.water}
                    onChange={(e) => setNewLogement({
                      ...newLogement,
                      specifications: {...newLogement.specifications, water: e.target.value}
                    })}
                    placeholder="ex: Eau chaude incluse..."
                  />
                </div>

                <div className="form-group">
                  <label>Notes importantes pour le concierge</label>
                  <textarea 
                    value={newLogement.specifications.notes}
                    onChange={(e) => setNewLogement({
                      ...newLogement,
                      specifications: {...newLogement.specifications, notes: e.target.value}
                    })}
                    placeholder="Notes importantes, alertes..."
                  ></textarea>
                </div>

                <div className="form-group checkbox-group">
                  <label>
                    <input 
                      type="checkbox"
                      checked={newLogement.specifications.internet}
                      onChange={(e) => setNewLogement({
                        ...newLogement,
                        specifications: {...newLogement.specifications, internet: e.target.checked}
                      })}
                    />
                    Internet inclus
                  </label>
                  <label>
                    <input 
                      type="checkbox"
                      checked={newLogement.specifications.parking}
                      onChange={(e) => setNewLogement({
                        ...newLogement,
                        specifications: {...newLogement.specifications, parking: e.target.checked}
                      })}
                    />
                    Parking disponible
                  </label>
                  <label>
                    <input 
                      type="checkbox"
                      checked={newLogement.specifications.furnished}
                      onChange={(e) => setNewLogement({
                        ...newLogement,
                        specifications: {...newLogement.specifications, furnished: e.target.checked}
                      })}
                    />
                    Meublé
                  </label>
                </div>
              </div>
            )}

            {/* COURTE DURÉE */}
            {locationType === 'shortterm' && (
              <>
                {/* Configuration Financière */}
                <div className="form-section">
                  <h4>Configuration Financière (Le "Combien")</h4>
                  
                  <div className="form-group">
                    <label>Prix de base à la nuitée*</label>
                    <input 
                      type="number"
                      min="0"
                      value={newLogement.shortTermSpecifications.pricePerNight}
                      onChange={(e) => setNewLogement({
                        ...newLogement,
                        price: Math.round(parseFloat(e.target.value)) || 0,
                        shortTermSpecifications: {...newLogement.shortTermSpecifications, pricePerNight: parseFloat(e.target.value)}
                      })}
                      placeholder="ex: 150"
                    />
                  </div>

                  <div className="form-group">
                    <label>Frais de ménage voyageurs</label>
                    <input 
                      type="number"
                      min="0"
                      value={newLogement.shortTermSpecifications.cleaningFees}
                      onChange={(e) => setNewLogement({
                        ...newLogement,
                        shortTermSpecifications: {...newLogement.shortTermSpecifications, cleaningFees: parseFloat(e.target.value)}
                      })}
                      placeholder="ex: 50"
                    />
                  </div>

                  <div className="form-group">
                    <label>Commission Conciergerie (%)</label>
                    <input 
                      type="number"
                      min="0"
                      max="100"
                      value={newLogement.shortTermSpecifications.conciergeCommission}
                      onChange={(e) => setNewLogement({
                        ...newLogement,
                        shortTermSpecifications: {...newLogement.shortTermSpecifications, conciergeCommission: parseFloat(e.target.value)}
                      })}
                      placeholder="ex: 20"
                    />
                  </div>
                </div>

                {/* Accès et Logistique */}
                <div className="form-section">
                  <h4>Accès et Logistique (Le "Comment")</h4>
                  
                  <div className="form-group">
                    <label>Type de Check-in*</label>
                    <select 
                      value={newLogement.shortTermSpecifications.checkInType}
                      onChange={(e) => setNewLogement({
                        ...newLogement,
                        shortTermSpecifications: {...newLogement.shortTermSpecifications, checkInType: e.target.value}
                      })}
                    >
                      <option value="boîtier">Boîtier à clés</option>
                      <option value="serrure">Serrure connectée</option>
                      <option value="accueil">Accueil physique</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Localisation des clés</label>
                    <input 
                      type="text"
                      value={newLogement.shortTermSpecifications.keyLocation}
                      onChange={(e) => setNewLogement({
                        ...newLogement,
                        shortTermSpecifications: {...newLogement.shortTermSpecifications, keyLocation: e.target.value}
                      })}
                      placeholder="ex: Boîtier noir derrière la gouttière à droite"
                    />
                  </div>

                  <div className="form-group">
                    <label>Code immeuble</label>
                    <input 
                      type="text"
                      value={newLogement.shortTermSpecifications.buildingCode}
                      onChange={(e) => setNewLogement({
                        ...newLogement,
                        shortTermSpecifications: {...newLogement.shortTermSpecifications, buildingCode: e.target.value}
                      })}
                      placeholder="ex: 1234"
                    />
                  </div>

                  <div className="form-group">
                    <label>Code Wi-Fi</label>
                    <input 
                      type="text"
                      value={newLogement.shortTermSpecifications.wifiCode}
                      onChange={(e) => setNewLogement({
                        ...newLogement,
                        shortTermSpecifications: {...newLogement.shortTermSpecifications, wifiCode: e.target.value}
                      })}
                      placeholder="ex: WiFi-123456"
                    />
                  </div>
                </div>

                {/* Maintenance & Technique */}
                <div className="form-section">
                  <h4>Maintenance & Technique (Le "Oups")</h4>
                  
                  <div className="form-group">
                    <label>Emplacement compteur eau</label>
                    <input 
                      type="text"
                      value={newLogement.shortTermSpecifications.waterMeterLocation}
                      onChange={(e) => setNewLogement({
                        ...newLogement,
                        shortTermSpecifications: {...newLogement.shortTermSpecifications, waterMeterLocation: e.target.value}
                      })}
                      placeholder="ex: Sous l'évier cuisine"
                    />
                  </div>

                  <div className="form-group">
                    <label>Emplacement compteur électricité</label>
                    <input 
                      type="text"
                      value={newLogement.shortTermSpecifications.electricityMeterLocation}
                      onChange={(e) => setNewLogement({
                        ...newLogement,
                        shortTermSpecifications: {...newLogement.shortTermSpecifications, electricityMeterLocation: e.target.value}
                      })}
                      placeholder="ex: Placard couloir entrée"
                    />
                  </div>

                  <div className="form-group">
                    <label>Gestion des poubelles</label>
                    <input 
                      type="text"
                      value={newLogement.shortTermSpecifications.garbageInfo}
                      onChange={(e) => setNewLogement({
                        ...newLogement,
                        shortTermSpecifications: {...newLogement.shortTermSpecifications, garbageInfo: e.target.value}
                      })}
                      placeholder="ex: Jours de passage : lundi et jeudi, local poubelle: couloir"
                    />
                  </div>

                  <div className="form-group">
                    <label>Équipements spécifiques</label>
                    <input 
                      type="text"
                      value={newLogement.shortTermSpecifications.specificEquipment}
                      onChange={(e) => setNewLogement({
                        ...newLogement,
                        shortTermSpecifications: {...newLogement.shortTermSpecifications, specificEquipment: e.target.value}
                      })}
                      placeholder="ex: Climatisation, Machine à café premium"
                    />
                  </div>
                </div>

                {/* Instructions de Ménage */}
                <div className="form-section">
                  <h4>Instructions de Ménage (Le "Propre")</h4>
                  
                  <div className="form-group">
                    <label>Checklist spécifique</label>
                    <textarea 
                      value={newLogement.shortTermSpecifications.cleaningChecklist}
                      onChange={(e) => setNewLogement({
                        ...newLogement,
                        shortTermSpecifications: {...newLogement.shortTermSpecifications, cleaningChecklist: e.target.value}
                      })}
                      placeholder="ex: &#10;- Vérifier les capsules de café&#10;- Arroser la plante du balcon&#10;- Nettoyer le four"
                      rows={4}
                    />
                  </div>

                  <div className="form-group">
                    <label>Lieu de stockage du linge</label>
                    <input 
                      type="text"
                      value={newLogement.shortTermSpecifications.linageStorage}
                      onChange={(e) => setNewLogement({
                        ...newLogement,
                        shortTermSpecifications: {...newLogement.shortTermSpecifications, linageStorage: e.target.value}
                      })}
                      placeholder="ex: Placard fermé à clé chambre principale"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddLogement(false)}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={handleAddLogement}>
                Ajouter le logement
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .header-actions {
          margin-bottom: 1.5rem;
          display: flex;
          justify-content: flex-end;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal {
          background: white;
          border-radius: 12px;
          max-width: 700px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .modal h3 {
          margin: 0 0 1rem 0;
          font-size: 1.3rem;
          color: #1f2937;
          padding: 1.5rem 1.5rem 0 1.5rem;
        }

        .form-section {
          padding: 0 1.5rem;
          margin-top: 1.5rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .form-section:last-of-type {
          border-bottom: none;
        }

        .form-section h4 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
          color: #374151;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .location-type-switch {
          padding: 1.5rem;
          padding-top: 0;
        }

        .location-type-switch label {
          display: block;
          margin-bottom: 0.75rem;
          font-weight: 600;
          color: #1f2937;
        }

        .switch-container {
          display: flex;
          gap: 0.5rem;
          background: #f3f4f6;
          padding: 0.25rem;
          border-radius: 8px;
          width: fit-content;
        }

        .switch-option {
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
          color: #6b7280;
          transition: all 0.2s;
          background: transparent;
          user-select: none;
        }

        .switch-option:hover {
          color: #374151;
        }

        .switch-option.active {
          background: white;
          color: #3b82f6;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          margin-bottom: 1rem;
        }

        .form-group label {
          font-weight: 600;
          color: #1f2937;
          font-size: 0.9rem;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 0.75rem;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          font-size: 0.95rem;
          font-family: inherit;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .form-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .checkbox-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .checkbox-group label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          cursor: pointer;
        }

        .checkbox-group input {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: #3b82f6;
        }

        .modal-footer {
          display: flex;
          gap: 0.75rem;
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
          justify-content: flex-end;
          position: sticky;
          bottom: 0;
          background: white;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 0.95rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }

        .btn-secondary {
          background: #e5e7eb;
          color: #1f2937;
        }

        .btn-secondary:hover {
          background: #d1d5db;
        }

        .form-section h5 {
          margin: 1rem 0 0.75rem 0;
          font-size: 0.85rem;
          color: #6b7280;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }

        .total-label {
          font-weight: 700 !important;
          color: #1f2937 !important;
          font-size: 0.95rem !important;
        }

        .total-display {
          padding: 1rem;
          background: linear-gradient(135deg, #f0f4ff 0%, #f9f5ff 100%);
          border: 2px solid #3b82f6;
          border-radius: 8px;
          font-size: 1.3rem;
          font-weight: 700;
          color: #667eea;
          text-align: center;
          margin-top: 0.5rem;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .modal {
            max-width: 95vw;
          }

          .switch-container {
            flex-direction: column;
          }

          .switch-option {
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}

