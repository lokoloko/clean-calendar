-- Analytics Platform Database Schema
-- This is separate from the calendar app database

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    pdf_name VARCHAR(255),      -- Name as it appears in PDF
    csv_name VARCHAR(255),      -- Name as it appears in CSV
    airbnb_url TEXT,            -- For future scraping
    status VARCHAR(20) DEFAULT 'unknown', -- active, inactive, seasonal
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Monthly data for each property
CREATE TABLE IF NOT EXISTS monthly_data (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    month DATE NOT NULL, -- First day of the month
    gross_earnings DECIMAL(10,2) DEFAULT 0,
    service_fees DECIMAL(10,2) DEFAULT 0,
    net_earnings DECIMAL(10,2) DEFAULT 0,
    nights_booked INTEGER DEFAULT 0,
    avg_night_stay DECIMAL(4,1) DEFAULT 0,
    total_reservations INTEGER DEFAULT 0,
    cancellations INTEGER DEFAULT 0,
    occupancy_rate DECIMAL(5,2),
    health_score INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(property_id, month)
);

-- File uploads tracking
CREATE TABLE IF NOT EXISTS uploads (
    id SERIAL PRIMARY KEY,
    month DATE NOT NULL,
    pdf_filename VARCHAR(255),
    pdf_path TEXT,
    csv_filename VARCHAR(255),
    csv_path TEXT,
    processed BOOLEAN DEFAULT FALSE,
    properties_found INTEGER,
    total_revenue DECIMAL(12,2),
    upload_date TIMESTAMP DEFAULT NOW(),
    processed_date TIMESTAMP
);

-- Property mapping (user confirms CSV to PDF name mapping)
CREATE TABLE IF NOT EXISTS property_mappings (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    source_name VARCHAR(255), -- Original name from file
    source_type VARCHAR(10), -- 'pdf' or 'csv'
    mapped_name VARCHAR(255), -- Standardized name
    confirmed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(source_name, source_type)
);

-- AI insights and recommendations
CREATE TABLE IF NOT EXISTS insights (
    id SERIAL PRIMARY KEY,
    property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    month DATE,
    insight_type VARCHAR(50), -- 'optimization', 'warning', 'opportunity'
    title VARCHAR(255),
    description TEXT,
    priority VARCHAR(20), -- 'high', 'medium', 'low'
    potential_impact DECIMAL(10,2), -- Estimated revenue impact
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'implemented', 'dismissed'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert initial property list (21 properties)
INSERT INTO properties (name, pdf_name, status) VALUES
('Unit 1', 'Unit 1', 'active'),
('Unit 2', 'Unit 2', 'active'),
('Unit 3', 'Unit 3', 'active'),
('Unit 4', 'Unit 4', 'active'),
('Unit A', 'Unit A', 'active'),
('Unit C', 'Unit C', 'active'),
('Unit D', 'Unit D', 'active'),
('Unit L1', 'Unit L1', 'active'),
('Unit L2', 'Unit L2', 'active'),
('Monrovia A', 'Monrovia A', 'inactive'),
('Monrovia B', 'Monrovia B', 'inactive'),
('Azusa E - Sunrise Getaway', 'Azusa E - Sunrise Getaway', 'inactive'),
('Azusa F - Getaway', 'Azusa F - Getaway', 'inactive'),
('Azusa G - Dream Getaway', 'Azusa G - Dream Getaway', 'inactive'),
('Azusa H - HomeAway', 'Azusa H - HomeAway', 'inactive'),
('Unit H', 'Unit H', 'inactive'),
('Glendora', 'Glendora', 'inactive'),
('Unit G', 'Unit G', 'inactive'),
('L3 - Trailer', 'L3 - Trailer', 'inactive')
ON CONFLICT (name) DO NOTHING;