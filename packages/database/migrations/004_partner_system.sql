-- migrate:up
-- FactoryConnect Migration 004: Partner System Tables
-- Partners, referrals, and commission ledger for channel partner program

-- ═══════════════════════════════════════════════════════════════════
-- PARTNERS
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  partner_type VARCHAR(50) NOT NULL DEFAULT 'reseller',
  contact_email VARCHAR(255) NOT NULL,
  contact_phone VARCHAR(50),
  commission_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_partners
  BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_partners_status ON partners(status);

-- ═══════════════════════════════════════════════════════════════════
-- PARTNER REFERRALS
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE partner_referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  referral_code VARCHAR(50) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  referred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(partner_id, factory_id)
);

CREATE TRIGGER set_updated_at_partner_referrals
  BEFORE UPDATE ON partner_referrals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_referrals_partner ON partner_referrals(partner_id);
CREATE INDEX idx_referrals_factory ON partner_referrals(factory_id);
CREATE INDEX idx_referrals_code ON partner_referrals(referral_code);

-- ═══════════════════════════════════════════════════════════════════
-- COMMISSION LEDGER
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE commission_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  factory_id UUID NOT NULL REFERENCES factories(id) ON DELETE CASCADE,
  period VARCHAR(7) NOT NULL,  -- YYYY-MM format
  amount_inr NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'INR',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  payment_reference VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_updated_at_commission_ledger
  BEFORE UPDATE ON commission_ledger
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX idx_commission_partner ON commission_ledger(partner_id);
CREATE INDEX idx_commission_factory ON commission_ledger(factory_id);
CREATE INDEX idx_commission_period ON commission_ledger(period);
CREATE INDEX idx_commission_status ON commission_ledger(status);

-- History triggers for partner tables
CREATE TRIGGER trg_history_partners
  AFTER INSERT OR UPDATE OR DELETE ON partners
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_partner_referrals
  AFTER INSERT OR UPDATE OR DELETE ON partner_referrals
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();

CREATE TRIGGER trg_history_commission_ledger
  AFTER INSERT OR UPDATE OR DELETE ON commission_ledger
  FOR EACH ROW EXECUTE FUNCTION record_history_trigger();


-- migrate:down

DROP TRIGGER IF EXISTS trg_history_commission_ledger ON commission_ledger;
DROP TRIGGER IF EXISTS trg_history_partner_referrals ON partner_referrals;
DROP TRIGGER IF EXISTS trg_history_partners ON partners;

DROP TABLE IF EXISTS commission_ledger;
DROP TABLE IF EXISTS partner_referrals;
DROP TABLE IF EXISTS partners;
