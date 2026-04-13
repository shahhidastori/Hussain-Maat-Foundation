-- Hussain Maat Foundation (HMF) - Community Fund Management App
-- PostgreSQL Schema for Supabase
-- Created: 2026-04-09

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    pin_hash VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin', 'super_admin')),
    is_disabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fee configuration table
CREATE TABLE IF NOT EXISTS fee_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    year INTEGER NOT NULL,
    monthly_amount DECIMAL(12,2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    set_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fee submissions table
CREATE TABLE IF NOT EXISTS fee_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    user_name VARCHAR(200) NOT NULL,
    user_phone VARCHAR(20),
    fee_type VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (fee_type IN ('monthly', 'yearly')),
    months INTEGER[] NOT NULL DEFAULT '{}',
    year INTEGER NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    defined_amount DECIMAL(12,2) NOT NULL,
    extra_donation DECIMAL(12,2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_by UUID NOT NULL REFERENCES users(id),
    submitted_by_name VARCHAR(200) NOT NULL,
    approvals JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fund allocations table
CREATE TABLE IF NOT EXISTS fund_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_name VARCHAR(200) NOT NULL,
    recipient_phone VARCHAR(20),
    category VARCHAR(50) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_by UUID NOT NULL REFERENCES users(id),
    requested_by_name VARCHAR(200) NOT NULL,
    approvals JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(100) NOT NULL,
    performed_by UUID NOT NULL REFERENCES users(id),
    target_id VARCHAR(100),
    details TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_fee_submissions_user_id ON fee_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_fee_submissions_status ON fee_submissions(status);
CREATE INDEX IF NOT EXISTS idx_fee_submissions_year ON fee_submissions(year);
CREATE INDEX IF NOT EXISTS idx_fund_allocations_status ON fund_allocations(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_fee_config_year ON fee_config(year, is_active);
