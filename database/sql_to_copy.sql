CREATE TABLE IF NOT EXISTS logements (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500) NOT NULL,
  type VARCHAR(50) NOT NULL,
  rooms INTEGER NOT NULL DEFAULT 1,
  price INTEGER NOT NULL,
  description TEXT,
  location_type VARCHAR(20) DEFAULT 'longterm',
  rent_without_charges INTEGER,
  monthly_charges INTEGER,
  surface INTEGER,
  deposit_guarantee INTEGER,
  heating VARCHAR(255),
  water VARCHAR(255),
  internet BOOLEAN DEFAULT FALSE,
  parking BOOLEAN DEFAULT FALSE,
  furnished BOOLEAN DEFAULT FALSE,
  notes TEXT,
  price_per_night NUMERIC(10,2),
  cleaning_fees NUMERIC(10,2),
  concierge_commission NUMERIC(5,2),
  check_in_type VARCHAR(50),
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

CREATE TABLE IF NOT EXISTS rentals (
  id BIGSERIAL PRIMARY KEY,
  logement_id BIGINT NOT NULL REFERENCES logements(id) ON DELETE CASCADE,
  tenant_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  monthly_price INTEGER,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS external_listings (
  id BIGSERIAL PRIMARY KEY,
  logement_id BIGINT NOT NULL REFERENCES logements(id) ON DELETE CASCADE,
  platform VARCHAR(50) NOT NULL,
  platform_id VARCHAR(255) NOT NULL,
  platform_url TEXT,
  sync_status VARCHAR(50) DEFAULT 'pending',
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_direction VARCHAR(20) DEFAULT 'bidirectional',
  error_message TEXT,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(platform, platform_id)
);

CREATE TABLE IF NOT EXISTS price_history (
  id BIGSERIAL PRIMARY KEY,
  logement_id BIGINT NOT NULL REFERENCES logements(id) ON DELETE CASCADE,
  platform VARCHAR(50),
  date DATE NOT NULL,
  price_before INTEGER,
  price_after INTEGER NOT NULL,
  source VARCHAR(100),
  changed_by VARCHAR(255),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS calendar_sync (
  id BIGSERIAL PRIMARY KEY,
  logement_id BIGINT NOT NULL REFERENCES logements(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(50) NOT NULL,
  source VARCHAR(100),
  booking_id VARCHAR(255),
  guest_name VARCHAR(255),
  guest_email VARCHAR(255),
  conflict_status VARCHAR(50),
  conflict_note TEXT,
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(logement_id, date)
);

CREATE TABLE IF NOT EXISTS access_instructions (
  id BIGSERIAL PRIMARY KEY,
  logement_id BIGINT NOT NULL REFERENCES logements(id) ON DELETE CASCADE,
  type VARCHAR(50),
  instruction TEXT NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  logement_id BIGINT NOT NULL REFERENCES logements(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  due_date DATE,
  completed BOOLEAN DEFAULT FALSE,
  completed_date DATE,
  priority VARCHAR(20),
  assigned_to VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS incidents (
  id BIGSERIAL PRIMARY KEY,
  logement_id BIGINT NOT NULL REFERENCES logements(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_date DATE,
  priority VARCHAR(20),
  category VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_events (
  id BIGSERIAL PRIMARY KEY,
  logement_id BIGINT NOT NULL REFERENCES logements(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  time TIME,
  type VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
