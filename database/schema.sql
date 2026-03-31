-- ============================================
-- SIDEKICK DATABASE SCHEMA
-- Créer toutes les tables dans cet ordre
-- ============================================

-- 1. TABLE PRINCIPALE: LOGEMENTS
CREATE TABLE IF NOT EXISTS logements (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500) NOT NULL,
  postal_code VARCHAR(20),
  type VARCHAR(50) NOT NULL, -- 'appartement', 'maison', 'studio'
  rooms INTEGER NOT NULL DEFAULT 1,
  price INTEGER NOT NULL, -- Prix total (loyer + charges OU prix nuit selon type)
  description TEXT,
  location_type VARCHAR(20) DEFAULT 'longterm', -- 'longterm' ou 'shortterm'
  
  -- Informations longterm
  rent_without_charges INTEGER, -- Loyer HC
  monthly_charges INTEGER, -- Charges
  surface INTEGER, -- m²
  deposit_guarantee INTEGER, -- Dépôt de garantie
  
  -- Spécifications générales
  heating VARCHAR(255),
  water VARCHAR(255),
  internet BOOLEAN DEFAULT FALSE,
  parking BOOLEAN DEFAULT FALSE,
  furnished BOOLEAN DEFAULT FALSE,
  notes TEXT,
  
  -- Spécifications shortterm
  price_per_night NUMERIC(10,2), -- Prix à la nuitée
  cleaning_fees NUMERIC(10,2), -- Frais de ménage
  concierge_commission NUMERIC(5,2), -- Pourcentage
  check_in_type VARCHAR(50), -- 'boîtier', 'serrure', 'accueil'
  key_location TEXT,
  building_code VARCHAR(100),
  wifi_code VARCHAR(100),
  water_meter_location TEXT,
  electricity_meter_location TEXT,
  garbage_info TEXT,
  specific_equipment TEXT,
  cleaning_checklist TEXT,
  linage_storage TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TABLE: LOCATIONS/RENTALS (locataires)
CREATE TABLE IF NOT EXISTS rentals (
  id BIGSERIAL PRIMARY KEY,
  logement_id BIGINT NOT NULL REFERENCES logements(id) ON DELETE CASCADE,
  tenant_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_price INTEGER,
  status VARCHAR(50) DEFAULT 'pending', -- 'active', 'ended', 'pending'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TABLE: EXTERNAL LISTINGS (pour synchro Airbnb/Booking)
CREATE TABLE IF NOT EXISTS external_listings (
  id BIGSERIAL PRIMARY KEY,
  logement_id BIGINT NOT NULL REFERENCES logements(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL, -- 'airbnb', 'booking', 'airbnb_shortterm', etc
  platform_id VARCHAR(255) NOT NULL, -- L'ID chez Airbnb/Booking
  platform_url TEXT, -- Lien vers la liste externe
  sync_status VARCHAR(50) DEFAULT 'pending', -- 'synced', 'pending', 'error', 'paused'
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_direction VARCHAR(20) DEFAULT 'bidirectional', -- 'import', 'export', 'bidirectional'
  error_message TEXT,
  raw_data JSONB, -- Données brutes de la plateforme
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(platform, platform_id)
);

-- 4. TABLE: PRICE HISTORY (suivi des changements de prix)
CREATE TABLE IF NOT EXISTS price_history (
  id BIGSERIAL PRIMARY KEY,
  logement_id BIGINT NOT NULL REFERENCES logements(id) ON DELETE CASCADE,
  platform VARCHAR(50), -- NULL = notre app, 'airbnb', 'booking', etc
  date DATE NOT NULL,
  price_before INTEGER,
  price_after INTEGER NOT NULL,
  source VARCHAR(100), -- 'app', 'airbnb_sync', 'booking_sync', 'manual'
  changed_by VARCHAR(255), -- Utilisateur ou système
  reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  INDEX idx_logement_date (logement_id, date)
);

-- 5. TABLE: CALENDAR SYNC (synchronisation calendrier)
CREATE TABLE IF NOT EXISTS calendar_sync (
  id BIGSERIAL PRIMARY KEY,
  logement_id BIGINT NOT NULL REFERENCES logements(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'available', 'booked', 'blocked', 'pending_sync'
  source VARCHAR(100), -- 'our_app', 'airbnb', 'booking', 'both'
  
  -- Pour shortterm
  booking_id VARCHAR(255), -- ID de la réservation
  guest_name VARCHAR(255),
  guest_email VARCHAR(255),
  
  conflict_status VARCHAR(50), -- 'ok', 'conflict', 'resolved'
  conflict_note TEXT, -- Explication du conflit si 'conflict'
  
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(logement_id, date)
);

-- 6. TABLE: ACCESS INSTRUCTIONS (instructions d'accès)
CREATE TABLE IF NOT EXISTS access_instructions (
  id BIGSERIAL PRIMARY KEY,
  logement_id BIGINT NOT NULL REFERENCES logements(id) ON DELETE CASCADE,
  type VARCHAR(50), -- 'code_boite', 'digicode', 'parking', 'cles', 'autre'
  instruction TEXT NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. TABLE: TASKS (tâches de maintenance/ménage)
CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  logement_id BIGINT NOT NULL REFERENCES logements(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50), -- 'menage', 'maintenance', 'autre'
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  completed_date DATE,
  priority VARCHAR(20), -- 'low', 'medium', 'high'
  assigned_to VARCHAR(255),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. TABLE: INCIDENTS (problèmes/dégâts)
CREATE TABLE IF NOT EXISTS incidents (
  id BIGSERIAL PRIMARY KEY,
  logement_id BIGINT NOT NULL REFERENCES logements(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_date DATE,
  priority VARCHAR(20), -- 'low', 'medium', 'high'
  category VARCHAR(50), -- 'maintenance', 'damage', 'complaint', 'other'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. TABLE: DAILY EVENTS (agenda quotidien)
CREATE TABLE IF NOT EXISTS daily_events (
  id BIGSERIAL PRIMARY KEY,
  logement_id BIGINT NOT NULL REFERENCES logements(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  time TIME,
  type VARCHAR(50), -- 'visite', 'entretien', 'autre'
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES POUR PERFORMANCE
-- ============================================

CREATE INDEX idx_logements_location_type ON logements(location_type);
CREATE INDEX idx_rentals_logement ON rentals(logement_id);
CREATE INDEX idx_rentals_status ON rentals(status);
CREATE INDEX idx_external_listings_logement ON external_listings(logement_id);
CREATE INDEX idx_external_listings_platform ON external_listings(platform, platform_id);
CREATE INDEX idx_calendar_sync_logement ON calendar_sync(logement_id);
CREATE INDEX idx_calendar_sync_date ON calendar_sync(date);
CREATE INDEX idx_tasks_logement ON tasks(logement_id);
CREATE INDEX idx_incidents_logement ON incidents(logement_id);
CREATE INDEX idx_daily_events_logement ON daily_events(logement_id);

-- ============================================
-- ENABLE ROW LEVEL SECURITY (optionnel mais recommandé)
-- ============================================

ALTER TABLE logements ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INSERTION DE DONNÉES DE TEST (optionnel)
-- ============================================

-- Insérer un logement de test
INSERT INTO logements (
  name, address, type, rooms, price, location_type,
  rent_without_charges, monthly_charges, surface, deposit_guarantee,
  heating, water, internet, parking, furnished
) VALUES (
  'Appartement 1A - Paris 75000',
  '123 Rue de la Paix, Paris 75000',
  'appartement',
  2,
  950, -- 800 loyer + 150 charges
  'longterm',
  800,
  150,
  65,
  1600,
  'Radiateurs',
  'Eau chaude incluse',
  true,
  false,
  true
);

-- Insérer un logement shortterm de test
INSERT INTO logements (
  name, address, type, rooms, price, location_type,
  price_per_night, cleaning_fees, check_in_type,
  surface, heating, internet, furnished
) VALUES (
  'Studio Luxe - Marais',
  '456 Rue du Temple, Paris 75004',
  'studio',
  1,
  150,
  'shortterm',
  150,
  50,
  'serrure',
  25,
  'Chauffage central',
  true,
  true
);

COMMIT;
