-- FactoryConnect — Comprehensive Test Seed Data
-- Covers: 3 factories (Tally/Zoho/SAP B1), 3 buyers (Walmart EDI/Ariba cXML/Coupa REST)
-- Full saga lifecycle, mapping configs, shipments, invoices, calendar, escalations

-- ═══════════════════════════════════════════════════════════════════
-- FACTORIES (3 tenants — one per ERP type)
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO core.factories (id, name, slug, factory_type, contact_email, contact_phone, address, preferences, timezone) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Rajesh Textiles Pvt Ltd',  'rajesh-textiles', 1, 'rajesh@textiles.in',  '+919876543210',
   '{"line1": "Plot 45, MIDC Bhosari", "city": "Pune", "state": "Maharashtra", "pin": "411026", "country": "IN"}'::jsonb,
   '{"language": "en", "currency": "INR", "date_format": "DD-MM-YYYY"}'::jsonb, 'Asia/Kolkata'),

  ('b0000000-0000-0000-0000-000000000002', 'Sunrise Auto Components',  'sunrise-auto',    2, 'ops@sunriseauto.in',  '+919123456789',
   '{"line1": "Survey No 12, Peenya Industrial Area", "city": "Bengaluru", "state": "Karnataka", "pin": "560058", "country": "IN"}'::jsonb,
   '{"language": "en", "currency": "INR", "date_format": "YYYY-MM-DD"}'::jsonb, 'Asia/Kolkata'),

  ('c0000000-0000-0000-0000-000000000003', 'Gujarat Pharma Works',     'gujarat-pharma',   3, 'admin@gujpharma.in',  '+919988776655',
   '{"line1": "GIDC Phase II, Plot 78", "city": "Ahmedabad", "state": "Gujarat", "pin": "382445", "country": "IN"}'::jsonb,
   '{"language": "en", "currency": "INR", "date_format": "DD/MM/YYYY"}'::jsonb, 'Asia/Kolkata');

-- ═══════════════════════════════════════════════════════════════════
-- BUYERS (3 global procurement systems)
-- ═══════════════════════════════════════════════════════════════════

-- Walmart (EDI X12 AS2) → linked to Rajesh Textiles (Tally)
INSERT INTO core.buyers (id, factory_id, name, buyer_identifier, edi_qualifier, edi_id, as2_id, as2_url, protocol, config) VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Walmart Inc.', 'WALMART-US-001', '01', '999999999', 'WALMART-AS2',
   'https://as2.walmart.com/receive', 'edi_x12',
   '{"isa_qualifier": "01", "isa_id": "999999999      ", "gs_id": "WALMART", "version": "004010", "test_indicator": "T"}'::jsonb);

-- SAP Ariba (cXML) → linked to Sunrise Auto (Zoho)
INSERT INTO core.buyers (id, factory_id, name, buyer_identifier, protocol, config) VALUES
  ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002',
   'BMW Group Procurement', 'BMW-ARIBA-001', 'cxml',
   '{"ariba_network_id": "AN01234567890", "endpoint": "https://service.ariba.com/OrderRequest", "shared_secret": "dev-secret-bmw", "domain": "bmw.ariba.com"}'::jsonb);

-- Coupa (REST JSON) → linked to Gujarat Pharma (SAP B1)
INSERT INTO core.buyers (id, factory_id, name, buyer_identifier, protocol, config) VALUES
  ('f0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003',
   'Johnson & Johnson Procurement', 'JNJ-COUPA-001', 'rest_json',
   '{"api_url": "https://jnj.coupahost.com/api", "api_key": "dev-key-jnj", "webhook_url": "https://jnj.coupahost.com/webhooks"}'::jsonb);

-- ═══════════════════════════════════════════════════════════════════
-- CONNECTIONS (factory ↔ buyer with SLA configs)
-- ═══════════════════════════════════════════════════════════════════

-- Connection 1: Rajesh Textiles ↔ Walmart (Tally + EDI X12)
INSERT INTO core.connections (id, factory_id, buyer_id, mode, source_type, sla_config, tax_config) VALUES
  ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
   'uat', 'tally',
   '{"ack_hours": 2, "asn_hours": 24, "invoice_hours": 48}'::jsonb,
   '{"type": "GST", "components": ["CGST", "SGST"], "rate": 18}'::jsonb);

-- Connection 2: Sunrise Auto ↔ BMW Ariba (Zoho + cXML)
INSERT INTO core.connections (id, factory_id, buyer_id, mode, source_type, sla_config, tax_config) VALUES
  ('20000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002',
   'uat', 'zoho',
   '{"ack_hours": 4, "asn_hours": 48, "invoice_hours": 72}'::jsonb,
   '{"type": "GST", "components": ["IGST"], "rate": 18}'::jsonb);

-- Connection 3: Gujarat Pharma ↔ J&J Coupa (SAP B1 + REST)
INSERT INTO core.connections (id, factory_id, buyer_id, mode, source_type, sla_config, tax_config) VALUES
  ('30000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000003',
   'sandbox', 'sap_b1',
   '{"ack_hours": 1, "asn_hours": 12, "invoice_hours": 24}'::jsonb,
   '{"type": "GST", "components": ["CGST", "SGST"], "rate": 12}'::jsonb);

-- ═══════════════════════════════════════════════════════════════════
-- ITEM MASTER (products per factory)
-- ═══════════════════════════════════════════════════════════════════

-- Rajesh Textiles items
INSERT INTO core.item_master (id, factory_id, factory_sku, buyer_sku, buyer_id, description, upc, hsn_code, default_uom, unit_price) VALUES
  ('11000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'RT-COTTON-001', 'WMT-SKU-78901', 'd0000000-0000-0000-0000-000000000001', '100% Cotton Fabric Roll - White 60"', '00123456789012', '5208', 'MTR', 450.00),
  ('11000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'RT-POLY-002', 'WMT-SKU-78902', 'd0000000-0000-0000-0000-000000000001', 'Polyester Blend Fabric - Blue 48"', '00123456789013', '5407', 'MTR', 320.00),
  ('11000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'RT-SILK-003', 'WMT-SKU-78903', 'd0000000-0000-0000-0000-000000000001', 'Silk Fabric Premium - Red 44"', '00123456789014', '5007', 'MTR', 1200.00);

-- Sunrise Auto items
INSERT INTO core.item_master (id, factory_id, factory_sku, buyer_sku, buyer_id, description, hsn_code, default_uom, unit_price) VALUES
  ('22000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'SA-BRK-001', 'BMW-PART-44201', 'e0000000-0000-0000-0000-000000000002', 'Brake Pad Assembly - Front LH', '8708', 'EA', 2800.00),
  ('22000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'SA-BRK-002', 'BMW-PART-44202', 'e0000000-0000-0000-0000-000000000002', 'Brake Pad Assembly - Front RH', '8708', 'EA', 2800.00),
  ('22000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 'SA-ROT-003', 'BMW-PART-44203', 'e0000000-0000-0000-0000-000000000002', 'Brake Rotor Disc 320mm', '8708', 'EA', 4500.00);

-- Gujarat Pharma items
INSERT INTO core.item_master (id, factory_id, factory_sku, buyer_sku, buyer_id, description, hsn_code, default_uom, unit_price) VALUES
  ('33000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'GP-PARA-001', 'JNJ-MED-90001', 'f0000000-0000-0000-0000-000000000003', 'Paracetamol IP 500mg - 10x10 Strip', '3004', 'BOX', 85.00),
  ('33000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'GP-AMOX-002', 'JNJ-MED-90002', 'f0000000-0000-0000-0000-000000000003', 'Amoxicillin 250mg Caps - 10x10', '3004', 'BOX', 145.00),
  ('33000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'GP-IBUP-003', 'JNJ-MED-90003', 'f0000000-0000-0000-0000-000000000003', 'Ibuprofen 400mg Tabs - 10x10', '3004', 'BOX', 92.00);

-- ═══════════════════════════════════════════════════════════════════
-- CANONICAL ORDERS (various saga states)
-- ═══════════════════════════════════════════════════════════════════

-- Order 1: Walmart → Rajesh (COMPLETED saga — full lifecycle done)
INSERT INTO orders.canonical_orders (id, factory_id, buyer_id, connection_id, buyer_po_number, factory_order_number, order_date, requested_ship_date, currency, subtotal, tax_amount, total_amount, source_type, status) VALUES
  ('aa000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'WMT-PO-2026-0001', 'RT/SO/2026/001', '2026-03-15 10:00:00+05:30', '2026-03-25 18:00:00+05:30',
   'INR', 225000.00, 40500.00, 265500.00, 'tally', 'COMPLETED');

-- Order 2: Walmart → Rajesh (PROCESSING — ASN pending)
INSERT INTO orders.canonical_orders (id, factory_id, buyer_id, connection_id, buyer_po_number, factory_order_number, order_date, requested_ship_date, currency, subtotal, tax_amount, total_amount, source_type, status) VALUES
  ('aa000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'WMT-PO-2026-0002', 'RT/SO/2026/002', '2026-03-28 09:30:00+05:30', '2026-04-05 18:00:00+05:30',
   'INR', 160000.00, 28800.00, 188800.00, 'tally', 'PROCESSING');

-- Order 3: BMW Ariba → Sunrise Auto (CONFIRMED — ack sent, awaiting shipment)
INSERT INTO orders.canonical_orders (id, factory_id, buyer_id, connection_id, buyer_po_number, factory_order_number, order_date, requested_ship_date, currency, subtotal, tax_amount, total_amount, source_type, status) VALUES
  ('bb000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
   'BMW-PO-2026-1001', 'SA/SO/2026/101', '2026-03-20 11:00:00+05:30', '2026-04-10 18:00:00+05:30',
   'INR', 56000.00, 10080.00, 66080.00, 'zoho', 'CONFIRMED');

-- Order 4: BMW Ariba → Sunrise Auto (DRAFT — just received)
INSERT INTO orders.canonical_orders (id, factory_id, buyer_id, connection_id, buyer_po_number, order_date, requested_ship_date, currency, subtotal, tax_amount, total_amount, source_type, status) VALUES
  ('bb000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
   'BMW-PO-2026-1002', '2026-04-01 08:00:00+05:30', '2026-04-20 18:00:00+05:30',
   'INR', 45000.00, 8100.00, 53100.00, 'zoho', 'DRAFT');

-- Order 5: J&J Coupa → Gujarat Pharma (SHIPPED — invoice pending)
INSERT INTO orders.canonical_orders (id, factory_id, buyer_id, connection_id, buyer_po_number, factory_order_number, order_date, requested_ship_date, currency, subtotal, tax_amount, total_amount, source_type, status) VALUES
  ('cc000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003',
   'JNJ-PO-2026-5001', 'GP/SO/2026/501', '2026-03-10 14:00:00+05:30', '2026-03-20 18:00:00+05:30',
   'INR', 32200.00, 3864.00, 36064.00, 'sap_b1', 'SHIPPED');

-- Order 6: J&J Coupa → Gujarat Pharma (INVOICED — awaiting completion)
INSERT INTO orders.canonical_orders (id, factory_id, buyer_id, connection_id, buyer_po_number, factory_order_number, order_date, requested_ship_date, currency, subtotal, tax_amount, total_amount, source_type, status) VALUES
  ('cc000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003',
   'JNJ-PO-2026-5002', 'GP/SO/2026/502', '2026-02-20 10:00:00+05:30', '2026-03-05 18:00:00+05:30',
   'INR', 27550.00, 3306.00, 30856.00, 'sap_b1', 'INVOICED');

-- Order 7: Walmart → Rajesh (CANCELLED)
INSERT INTO orders.canonical_orders (id, factory_id, buyer_id, connection_id, buyer_po_number, order_date, currency, subtotal, tax_amount, total_amount, source_type, status) VALUES
  ('aa000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'WMT-PO-2026-0003', '2026-03-01 08:00:00+05:30',
   'INR', 96000.00, 17280.00, 113280.00, 'tally', 'CANCELLED');

-- ═══════════════════════════════════════════════════════════════════
-- ORDER LINE ITEMS
-- ═══════════════════════════════════════════════════════════════════

-- Order 1 lines (Walmart - completed)
INSERT INTO orders.canonical_order_line_items (order_id, factory_id, line_number, buyer_sku, factory_sku, description, quantity_ordered, quantity_uom, unit_price, line_total) VALUES
  ('aa000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1, 'WMT-SKU-78901', 'RT-COTTON-001', '100% Cotton Fabric Roll - White 60"', 500, 'MTR', 450.00, 225000.00);

-- Order 2 lines (Walmart - processing)
INSERT INTO orders.canonical_order_line_items (order_id, factory_id, line_number, buyer_sku, factory_sku, description, quantity_ordered, quantity_uom, unit_price, line_total) VALUES
  ('aa000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 1, 'WMT-SKU-78901', 'RT-COTTON-001', '100% Cotton Fabric Roll - White 60"', 200, 'MTR', 450.00, 90000.00),
  ('aa000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 2, 'WMT-SKU-78902', 'RT-POLY-002', 'Polyester Blend Fabric - Blue 48"', 200, 'MTR', 320.00, 64000.00),
  ('aa000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 3, 'WMT-SKU-78903', 'RT-SILK-003', 'Silk Fabric Premium - Red 44"', 5, 'MTR', 1200.00, 6000.00);

-- Order 3 lines (BMW - confirmed)
INSERT INTO orders.canonical_order_line_items (order_id, factory_id, line_number, buyer_sku, factory_sku, description, quantity_ordered, quantity_uom, unit_price, line_total) VALUES
  ('bb000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 1, 'BMW-PART-44201', 'SA-BRK-001', 'Brake Pad Assembly - Front LH', 10, 'EA', 2800.00, 28000.00),
  ('bb000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 2, 'BMW-PART-44202', 'SA-BRK-002', 'Brake Pad Assembly - Front RH', 10, 'EA', 2800.00, 28000.00);

-- Order 4 lines (BMW - draft)
INSERT INTO orders.canonical_order_line_items (order_id, factory_id, line_number, buyer_sku, description, quantity_ordered, quantity_uom, unit_price, line_total) VALUES
  ('bb000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 1, 'BMW-PART-44203', 'Brake Rotor Disc 320mm', 10, 'EA', 4500.00, 45000.00);

-- Order 5 lines (J&J - shipped)
INSERT INTO orders.canonical_order_line_items (order_id, factory_id, line_number, buyer_sku, factory_sku, description, quantity_ordered, quantity_uom, unit_price, line_total) VALUES
  ('cc000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 1, 'JNJ-MED-90001', 'GP-PARA-001', 'Paracetamol IP 500mg', 200, 'BOX', 85.00, 17000.00),
  ('cc000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 2, 'JNJ-MED-90002', 'GP-AMOX-002', 'Amoxicillin 250mg Caps', 100, 'BOX', 145.00, 14500.00),
  ('cc000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 3, 'JNJ-MED-90003', 'GP-IBUP-003', 'Ibuprofen 400mg Tabs', 7, 'BOX', 100.00, 700.00);

-- Order 6 lines (J&J - invoiced)
INSERT INTO orders.canonical_order_line_items (order_id, factory_id, line_number, buyer_sku, factory_sku, description, quantity_ordered, quantity_uom, unit_price, line_total) VALUES
  ('cc000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 1, 'JNJ-MED-90001', 'GP-PARA-001', 'Paracetamol IP 500mg', 150, 'BOX', 85.00, 12750.00),
  ('cc000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 2, 'JNJ-MED-90002', 'GP-AMOX-002', 'Amoxicillin 250mg Caps', 100, 'BOX', 145.00, 14500.00),
  ('cc000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 3, 'JNJ-MED-90003', 'GP-IBUP-003', 'Ibuprofen 400mg Tabs', 3, 'BOX', 100.00, 300.00);

-- ═══════════════════════════════════════════════════════════════════
-- ORDER SAGAS (15-state lifecycle — various stages)
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO workflow.order_sagas (id, order_id, factory_id, current_step, completed_at) VALUES
  ('a1000000-0000-0000-0000-000000000011', 'aa000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'COMPLETED', NOW() - INTERVAL '5 days');

INSERT INTO workflow.order_sagas (id, order_id, factory_id, current_step, step_deadline) VALUES
  ('a2000000-0000-0000-0000-000000000022', 'aa000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'ASN_QUEUED', NOW() + INTERVAL '12 hours');

INSERT INTO workflow.order_sagas (id, order_id, factory_id, current_step, step_deadline) VALUES
  ('a3000000-0000-0000-0000-000000000033', 'bb000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'ACK_DELIVERED', NOW() + INTERVAL '2 days');

INSERT INTO workflow.order_sagas (id, order_id, factory_id, current_step) VALUES
  ('a4000000-0000-0000-0000-000000000044', 'bb000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'PO_RECEIVED');

INSERT INTO workflow.order_sagas (id, order_id, factory_id, current_step, step_deadline) VALUES
  ('a5000000-0000-0000-0000-000000000055', 'cc000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'ASN_DELIVERED', NOW() + INTERVAL '1 day');

INSERT INTO workflow.order_sagas (id, order_id, factory_id, current_step, step_deadline) VALUES
  ('a6000000-0000-0000-0000-000000000066', 'cc000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'INVOICE_DELIVERED', NOW() + INTERVAL '3 days');

INSERT INTO workflow.order_sagas (id, order_id, factory_id, current_step, error_code, error_message) VALUES
  ('a7000000-0000-0000-0000-000000000077', 'aa000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'FAILED', 'FC_ERR_ORDER_CANCELLED', 'Buyer cancelled PO before acknowledgment');

-- ═══════════════════════════════════════════════════════════════════
-- SHIPMENTS
-- ═══════════════════════════════════════════════════════════════════

-- Shipment for Order 1 (completed)
INSERT INTO orders.canonical_shipments (id, factory_id, order_id, connection_id, shipment_date, carrier_name, tracking_number, weight, status) VALUES
  ('ae100000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   '2026-03-22 10:00:00+05:30', 'Blue Dart Express', 'BD9876543210', 125.50, 'DELIVERED');

-- Shipment for Order 5 (shipped, pending delivery)
INSERT INTO orders.canonical_shipments (id, factory_id, order_id, connection_id, shipment_date, carrier_name, tracking_number, weight, status) VALUES
  ('ae200000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000003',
   '2026-03-18 14:00:00+05:30', 'DTDC Logistics', 'DTDC-2026-887654', 45.00, 'IN_TRANSIT');

-- Shipment for Order 6 (delivered)
INSERT INTO orders.canonical_shipments (id, factory_id, order_id, connection_id, shipment_date, carrier_name, tracking_number, weight, status) VALUES
  ('ae300000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003',
   '2026-03-02 11:00:00+05:30', 'Delhivery', 'DLV-2026-112233', 38.20, 'DELIVERED');

-- ═══════════════════════════════════════════════════════════════════
-- INVOICES
-- ═══════════════════════════════════════════════════════════════════

-- Invoice for Order 1 (completed)
INSERT INTO orders.canonical_invoices (id, factory_id, order_id, shipment_id, connection_id, invoice_number, invoice_date, due_date, subtotal, tax_amount, tax_breakdown, total_amount, status) VALUES
  ('1a100000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'ae100000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'RT/INV/2026/001', '2026-03-23 12:00:00+05:30', '2026-04-22 23:59:59+05:30',
   225000.00, 40500.00,
   '{"CGST": 20250.00, "SGST": 20250.00}'::jsonb,
   265500.00, 'PAID');

-- Invoice for Order 6 (sent, awaiting payment)
INSERT INTO orders.canonical_invoices (id, factory_id, order_id, shipment_id, connection_id, invoice_number, invoice_date, due_date, subtotal, tax_amount, tax_breakdown, total_amount, status) VALUES
  ('1a200000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000003', 'cc000000-0000-0000-0000-000000000002', 'ae300000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003',
   'GP/INV/2026/502', '2026-03-03 10:00:00+05:30', '2026-04-02 23:59:59+05:30',
   27550.00, 3306.00,
   '{"CGST": 1653.00, "SGST": 1653.00}'::jsonb,
   30856.00, 'SENT');

-- ═══════════════════════════════════════════════════════════════════
-- MAPPING CONFIGS
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO ai.mapping_configs (id, factory_id, connection_id, name, version, source_type, field_mappings, transform_rules, status, created_by) VALUES
  ('3c100000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Tally → Walmart EDI X12 Mapping', 1, 'tally',
   '[{"source": "VoucherNumber", "target": "buyer_po_number", "transform": "direct"},
     {"source": "Date", "target": "order_date", "transform": "format_date"},
     {"source": "PartyName", "target": "ship_to.name", "transform": "direct"},
     {"source": "Amount", "target": "subtotal", "transform": "direct"},
     {"source": "StockItemName", "target": "line_items[].description", "transform": "direct"},
     {"source": "Rate", "target": "line_items[].unit_price", "transform": "direct"},
     {"source": "Quantity", "target": "line_items[].quantity_ordered", "transform": "direct"}]'::jsonb,
   '[{"type": "format_date", "params": {"from": "DD-MMM-YYYY", "to": "YYYY-MM-DD"}}]'::jsonb,
   'active', 'kishor@factoryconnect.io'),

  ('3c200000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002',
   'Zoho → BMW Ariba cXML Mapping', 1, 'zoho',
   '[{"source": "salesorder_number", "target": "buyer_po_number", "transform": "direct"},
     {"source": "date", "target": "order_date", "transform": "direct"},
     {"source": "customer_name", "target": "ship_to.name", "transform": "direct"},
     {"source": "total", "target": "subtotal", "transform": "direct"}]'::jsonb,
   '[]'::jsonb,
   'active', 'kishor@factoryconnect.io'),

  ('3c300000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000003',
   'SAP B1 → J&J Coupa REST Mapping', 1, 'sap_b1',
   '[{"source": "DocNum", "target": "buyer_po_number", "transform": "direct"},
     {"source": "DocDate", "target": "order_date", "transform": "format_date"},
     {"source": "CardName", "target": "ship_to.name", "transform": "direct"},
     {"source": "DocTotal", "target": "total_amount", "transform": "direct"}]'::jsonb,
   '[{"type": "format_date", "params": {"from": "YYYYMMDD", "to": "YYYY-MM-DD"}}]'::jsonb,
   'active', 'kishor@factoryconnect.io');

-- Update connections with mapping config IDs
UPDATE core.connections SET mapping_config_id = '3c100000-0000-0000-0000-000000000001' WHERE id = '10000000-0000-0000-0000-000000000001';
UPDATE core.connections SET mapping_config_id = '3c200000-0000-0000-0000-000000000002' WHERE id = '20000000-0000-0000-0000-000000000002';
UPDATE core.connections SET mapping_config_id = '3c300000-0000-0000-0000-000000000003' WHERE id = '30000000-0000-0000-0000-000000000003';

-- ═══════════════════════════════════════════════════════════════════
-- MESSAGE LOG (EDI/AS2 message tracking)
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO orders.message_log (factory_id, connection_id, order_id, direction, message_type, edi_control_number, status, sent_at, delivered_at) VALUES
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'INBOUND', '850', '000000001', 'DELIVERED', '2026-03-15 10:00:00+05:30', '2026-03-15 10:01:00+05:30'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'OUTBOUND', '855', '000000002', 'DELIVERED', '2026-03-15 11:30:00+05:30', '2026-03-15 11:31:00+05:30'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'OUTBOUND', '856', '000000003', 'DELIVERED', '2026-03-22 10:30:00+05:30', '2026-03-22 10:31:00+05:30'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000001', 'OUTBOUND', '810', '000000004', 'DELIVERED', '2026-03-23 12:30:00+05:30', '2026-03-23 12:31:00+05:30'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000002', 'INBOUND', '850', '000000005', 'DELIVERED', '2026-03-28 09:30:00+05:30', '2026-03-28 09:31:00+05:30'),
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'aa000000-0000-0000-0000-000000000002', 'OUTBOUND', '855', '000000006', 'DELIVERED', '2026-03-28 10:00:00+05:30', '2026-03-28 10:01:00+05:30');

-- ═══════════════════════════════════════════════════════════════════
-- OUTBOX EVENTS (processed)
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO workflow.outbox (aggregate_type, aggregate_id, event_type, payload, processed_at) VALUES
  ('canonical_orders', 'aa000000-0000-0000-0000-000000000001', 'ORDER_CONFIRMED', '{"order_id": "aa000000-0000-0000-0000-000000000001", "po": "WMT-PO-2026-0001"}'::jsonb, NOW() - INTERVAL '10 days'),
  ('canonical_orders', 'aa000000-0000-0000-0000-000000000001', 'SHIPMENT_CREATED', '{"order_id": "aa000000-0000-0000-0000-000000000001", "shipment_id": "sh100000-0000-0000-0000-000000000001"}'::jsonb, NOW() - INTERVAL '8 days'),
  ('canonical_orders', 'aa000000-0000-0000-0000-000000000001', 'INVOICE_CREATED', '{"order_id": "aa000000-0000-0000-0000-000000000001", "invoice_id": "iv100000-0000-0000-0000-000000000001"}'::jsonb, NOW() - INTERVAL '7 days'),
  ('canonical_orders', 'aa000000-0000-0000-0000-000000000002', 'INBOUND_PO_RECEIVED', '{"order_id": "aa000000-0000-0000-0000-000000000002", "po": "WMT-PO-2026-0002"}'::jsonb, NOW() - INTERVAL '3 days');

-- ═══════════════════════════════════════════════════════════════════
-- OPERATIONAL PROFILES
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO platform.operational_profile (factory_id, business_hours, weekly_off, avg_orders_per_day, silence_threshold_hours) VALUES
  ('a0000000-0000-0000-0000-000000000001', '{"start": "09:00", "end": "18:00"}'::jsonb, '["Sunday"]'::jsonb, 12.5, 24),
  ('b0000000-0000-0000-0000-000000000002', '{"start": "08:30", "end": "17:30"}'::jsonb, '["Saturday", "Sunday"]'::jsonb, 8.0, 16),
  ('c0000000-0000-0000-0000-000000000003', '{"start": "09:30", "end": "18:30"}'::jsonb, '["Sunday"]'::jsonb, 15.0, 12);

-- ═══════════════════════════════════════════════════════════════════
-- CALENDAR ENTRIES
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO platform.calendar_entries (factory_id, title, entry_date, entry_type, source) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Gudi Padwa', '2026-03-28', 'holiday', 'manual'),
  ('a0000000-0000-0000-0000-000000000001', 'Good Friday', '2026-04-03', 'holiday', 'manual'),
  ('a0000000-0000-0000-0000-000000000001', 'Walmart Q2 Cutoff', '2026-04-15', 'deadline', 'buyer_sync'),
  ('b0000000-0000-0000-0000-000000000002', 'Ugadi', '2026-03-28', 'holiday', 'manual'),
  ('c0000000-0000-0000-0000-000000000003', 'Holi', '2026-03-17', 'holiday', 'manual'),
  ('c0000000-0000-0000-0000-000000000003', 'Maintenance Window', '2026-04-05', 'maintenance', 'manual');

-- ═══════════════════════════════════════════════════════════════════
-- ESCALATION RULES & LOG
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO platform.escalation_rules (factory_id, step_number, channel, wait_minutes, active) VALUES
  ('a0000000-0000-0000-0000-000000000001', 1, 'in_app', 60, true),
  ('a0000000-0000-0000-0000-000000000001', 2, 'email', 120, true),
  ('a0000000-0000-0000-0000-000000000001', 3, 'sms', 240, true);

INSERT INTO platform.escalation_log (factory_id, connection_id, trigger_reason, current_step, status) VALUES
  ('a0000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'SLA breach: ASN overdue for WMT-PO-2026-0002', 2, 'ACTIVE');

-- ═══════════════════════════════════════════════════════════════════
-- CONNECTOR CATALOG
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO core.connector_catalog (name, connector_type, protocol, supported_flows, description, status) VALUES
  ('Walmart EDI X12/AS2', 'target', 'edi_x12', '["850", "855", "856", "810"]'::jsonb, 'Walmart Retail Link EDI integration via AS2 transport', 'available'),
  ('SAP Ariba cXML', 'target', 'cxml', '["OrderRequest", "OrderConfirmation", "ShipNotice"]'::jsonb, 'SAP Ariba Network cXML procurement integration', 'available'),
  ('Coupa REST API', 'target', 'rest_json', '["PurchaseOrder", "OrderConfirmation", "ASN", "Invoice"]'::jsonb, 'Coupa Procurement REST API integration', 'available'),
  ('Tally Prime', 'source', 'tally_xml', '["SalesOrder", "DeliveryNote", "SalesInvoice"]'::jsonb, 'Tally Prime XML/ODBC integration via Bridge Agent', 'available'),
  ('Zoho Books', 'source', 'rest_json', '["SalesOrder", "Package", "Invoice"]'::jsonb, 'Zoho Books REST API integration', 'available'),
  ('SAP Business One', 'source', 'rest_json', '["Orders", "DeliveryNotes", "Invoices"]'::jsonb, 'SAP Business One Service Layer integration', 'available');

-- ═══════════════════════════════════════════════════════════════════
-- WEBHOOK SUBSCRIPTIONS
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO platform.webhook_subscriptions (factory_id, url, secret, events, active) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'https://hooks.rajesh-textiles.in/fc-events', 'wh_secret_rajesh_01', '["ORDER_CONFIRMED", "SHIPMENT_CREATED", "INVOICE_CREATED"]'::jsonb, true),
  ('c0000000-0000-0000-0000-000000000003', 'https://api.gujpharma.in/webhooks/fc', 'wh_secret_gujpharma_01', '["ORDER_CONFIRMED", "SHIPMENT_CREATED"]'::jsonb, true);

-- ═══════════════════════════════════════════════════════════════════
-- APP CONFIG
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO platform.app_config (config_key, config_value, description) VALUES
  ('MAX_RETRY_COUNT', '5'::jsonb, 'Maximum retry count for saga steps'),
  ('CLAIM_CHECK_THRESHOLD_BYTES', '262144'::jsonb, 'Payload size threshold for MinIO offload (256KB)'),
  ('CIRCUIT_BREAKER_THRESHOLD', '5'::jsonb, 'Number of failures before circuit opens'),
  ('CIRCUIT_BREAKER_RESET_MS', '30000'::jsonb, 'Circuit breaker half-open timeout in ms'),
  ('DEFAULT_TIMEZONE', '"Asia/Kolkata"'::jsonb, 'Default timezone for new factories'),
  ('SANDBOX_TEST_HARNESS', 'true'::jsonb, 'Enable sandbox test harness feature');

-- ═══════════════════════════════════════════════════════════════════
-- NOTIFICATION TEMPLATES
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO platform.notification_templates (template_key, channel, event_type, subject, body_template) VALUES
  ('po_received', 'in_app', 'INBOUND_PO_RECEIVED', 'New Purchase Order Received', 'New PO {{po_number}} received from {{buyer_name}}. Amount: {{currency}} {{total_amount}}.'),
  ('po_received', 'email', 'INBOUND_PO_RECEIVED', 'FactoryConnect: New PO {{po_number}} from {{buyer_name}}', 'Dear {{factory_name}},\n\nA new purchase order {{po_number}} has been received from {{buyer_name}}.\n\nTotal: {{currency}} {{total_amount}}\nShip by: {{ship_date}}\n\nPlease review and confirm in FactoryConnect.'),
  ('sla_breach', 'in_app', 'SLA_BREACH', 'SLA Breach Warning', 'Order {{po_number}} has breached the {{step}} SLA deadline. Escalation step {{escalation_step}} triggered.'),
  ('sla_breach', 'email', 'SLA_BREACH', 'URGENT: SLA Breach on {{po_number}}', 'Dear {{factory_name}},\n\nOrder {{po_number}} has exceeded the {{step}} SLA deadline of {{deadline_hours}} hours.\n\nPlease take action immediately to avoid further escalation.'),
  ('shipment_created', 'in_app', 'SHIPMENT_CREATED', 'Shipment Created', 'Shipment created for order {{po_number}}. Tracking: {{tracking_number}} via {{carrier}}.'),
  ('invoice_sent', 'in_app', 'INVOICE_SENT', 'Invoice Sent to Buyer', 'Invoice {{invoice_number}} for {{currency}} {{total_amount}} sent to {{buyer_name}}.');

-- ═══════════════════════════════════════════════════════════════════
-- RATE CARDS
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO core.rate_cards (factory_id, buyer_id, item_id, unit_price, currency, effective_from, effective_to) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', 450.00, 'INR', '2026-01-01', '2026-12-31'),
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000002', 320.00, 'INR', '2026-01-01', '2026-12-31'),
  ('b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', '22000000-0000-0000-0000-000000000001', 2800.00, 'INR', '2026-01-01', '2026-06-30'),
  ('c0000000-0000-0000-0000-000000000003', 'f0000000-0000-0000-0000-000000000003', '33000000-0000-0000-0000-000000000001', 85.00, 'INR', '2026-01-01', NULL);

-- ═══════════════════════════════════════════════════════════════════
-- BARCODE CONFIGS
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO core.barcode_configs (factory_id, barcode_type, prefix, next_sequence) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'SSCC-18', '0089012345', 100),
  ('c0000000-0000-0000-0000-000000000003', 'SSCC-18', '0089067890', 50);

-- Done! Test data covers all flows.

-- ═══════════════════════════════════════════════════════════════════
-- CA PLATFORM SEED DATA (compliance schema)
-- ═══════════════════════════════════════════════════════════════════

-- CA Firm
INSERT INTO compliance.ca_firms (id, firm_name, registration_number, gstin, pan, email, phone, address, subscription_tier, subscription_expires_at, max_clients, settings) VALUES
  ('ca000000-0000-0000-0000-000000000001', 'Sharma & Associates', 'FRN-012345S', '27AABCS1234A1ZP', 'AABCS1234A',
   'ca_admin@demo.in', '+919876500001',
   '{"line1": "302, Commerce House", "city": "Mumbai", "state": "Maharashtra", "pin": "400001", "country": "IN"}'::jsonb,
   'professional', '2027-03-31 23:59:59+05:30', 50,
   '{"auto_reminders": true, "reminder_days_before": 7, "whatsapp_enabled": true}'::jsonb);

-- CA Firm Staff (3 members)
INSERT INTO compliance.ca_firm_staff (id, ca_firm_id, name, email, phone, role, is_active) VALUES
  ('cs000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Anil Sharma', 'ca_admin@demo.in', '+919876500001', 'partner', true),
  ('cs000000-0000-0000-0000-000000000002', 'ca000000-0000-0000-0000-000000000001', 'Priya Mehta', 'ca_staff@demo.in', '+919876500002', 'manager', true),
  ('cs000000-0000-0000-0000-000000000003', 'ca000000-0000-0000-0000-000000000001', 'Ravi Kumar', 'ravi@sharma-ca.in', '+919876500003', 'associate', true);

-- CA Clients (8 clients with various statuses)
INSERT INTO compliance.ca_clients (id, ca_firm_id, business_name, trade_name, gstin, pan, contact_person, contact_email, contact_phone, entity_type, status, assigned_staff_id, onboarded_at) VALUES
  ('cl000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'Patel Electronics Pvt Ltd', 'Patel Electronics', '27AABCP5678B1ZQ', 'AABCP5678B', 'Vijay Patel', 'vijay@patelelectronics.in', '+919812340001', 'Private Limited', 'ACTIVE', 'cs000000-0000-0000-0000-000000000001', '2025-06-15 10:00:00+05:30'),
  ('cl000000-0000-0000-0000-000000000002', 'ca000000-0000-0000-0000-000000000001', 'Gupta Trading Co', 'Gupta Traders', '27AABCG9012C1ZR', 'AABCG9012C', 'Suresh Gupta', 'suresh@guptatrading.in', '+919812340002', 'Partnership', 'ACTIVE', 'cs000000-0000-0000-0000-000000000002', '2025-08-01 10:00:00+05:30'),
  ('cl000000-0000-0000-0000-000000000003', 'ca000000-0000-0000-0000-000000000001', 'Reddy Pharma Industries', 'Reddy Pharma', '36AABCR3456D1ZS', 'AABCR3456D', 'Anand Reddy', 'anand@reddypharma.in', '+919812340003', 'LLP', 'ACTIVE', 'cs000000-0000-0000-0000-000000000003', '2025-04-20 10:00:00+05:30'),
  ('cl000000-0000-0000-0000-000000000004', 'ca000000-0000-0000-0000-000000000001', 'Singh Textiles', NULL, '07AABCS7890E1ZT', 'AABCS7890E', 'Harpreet Singh', 'harpreet@singhtextiles.in', '+919812340004', 'Proprietorship', 'ACTIVE', 'cs000000-0000-0000-0000-000000000001', '2025-09-10 10:00:00+05:30'),
  ('cl000000-0000-0000-0000-000000000005', 'ca000000-0000-0000-0000-000000000001', 'Mumbai Food Works', 'MFW', '27AABCM2345F1ZU', 'AABCM2345F', 'Rahul Joshi', 'rahul@mumbaifoodworks.in', '+919812340005', 'Private Limited', 'ACTIVE', 'cs000000-0000-0000-0000-000000000002', '2025-11-01 10:00:00+05:30'),
  ('cl000000-0000-0000-0000-000000000006', 'ca000000-0000-0000-0000-000000000001', 'Deshmukh Constructions', NULL, '27AABCD6789G1ZV', 'AABCD6789G', 'Arun Deshmukh', 'arun@deshmukhcons.in', '+919812340006', 'Private Limited', 'ONBOARDING', NULL, NULL),
  ('cl000000-0000-0000-0000-000000000007', 'ca000000-0000-0000-0000-000000000001', 'Kapoor Jewellers', 'Kapoor Gold', '27AABCK1234H1ZW', 'AABCK1234H', 'Neha Kapoor', 'neha@kapoorjewellers.in', '+919812340007', 'Proprietorship', 'INACTIVE', 'cs000000-0000-0000-0000-000000000003', '2024-12-01 10:00:00+05:30'),
  ('cl000000-0000-0000-0000-000000000008', 'ca000000-0000-0000-0000-000000000001', 'Green Energy Solutions', 'GES', '29AABCG5678I1ZX', 'AABCG5678I', 'Prakash Rao', 'prakash@greenenergy.in', '+919812340008', 'Private Limited', 'CHURNED', 'cs000000-0000-0000-0000-000000000002', '2024-06-01 10:00:00+05:30');

-- Compliance Filings (20 filings across clients)
INSERT INTO compliance.compliance_filings (id, ca_firm_id, client_id, filing_type, period, due_date, filed_date, ack_number, status, assigned_to, tax_amount, penalty_amount, notes) VALUES
  ('fi000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000001', 'GSTR1', 'Mar-2026', '2026-04-11', '2026-04-08', 'ACK-GST1-001', 'FILED', 'cs000000-0000-0000-0000-000000000002', 125000.00, 0, 'Filed on time'),
  ('fi000000-0000-0000-0000-000000000002', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000001', 'GSTR3B', 'Mar-2026', '2026-04-20', NULL, NULL, 'IN_PROGRESS', 'cs000000-0000-0000-0000-000000000002', 98000.00, 0, 'Working on reconciliation'),
  ('fi000000-0000-0000-0000-000000000003', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000002', 'GSTR1', 'Mar-2026', '2026-04-11', '2026-04-10', 'ACK-GST1-002', 'FILED', 'cs000000-0000-0000-0000-000000000003', 85000.00, 0, NULL),
  ('fi000000-0000-0000-0000-000000000004', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000002', 'GSTR3B', 'Mar-2026', '2026-04-20', NULL, NULL, 'PENDING', 'cs000000-0000-0000-0000-000000000003', 72000.00, 0, NULL),
  ('fi000000-0000-0000-0000-000000000005', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000003', 'GSTR1', 'Mar-2026', '2026-04-11', NULL, NULL, 'OVERDUE', 'cs000000-0000-0000-0000-000000000001', 210000.00, 5000.00, 'Client delayed providing sales data'),
  ('fi000000-0000-0000-0000-000000000006', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000003', 'GSTR3B', 'Mar-2026', '2026-04-20', NULL, NULL, 'PENDING', 'cs000000-0000-0000-0000-000000000001', 180000.00, 0, NULL),
  ('fi000000-0000-0000-0000-000000000007', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000004', 'GSTR1', 'Mar-2026', '2026-04-11', '2026-04-09', 'ACK-GST1-004', 'ACKNOWLEDGED', 'cs000000-0000-0000-0000-000000000001', 45000.00, 0, 'Acknowledged by GST portal'),
  ('fi000000-0000-0000-0000-000000000008', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000004', 'GSTR3B', 'Mar-2026', '2026-04-20', NULL, NULL, 'PENDING', 'cs000000-0000-0000-0000-000000000001', 38000.00, 0, NULL),
  ('fi000000-0000-0000-0000-000000000009', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000005', 'GSTR1', 'Mar-2026', '2026-04-11', '2026-04-07', 'ACK-GST1-005', 'FILED', 'cs000000-0000-0000-0000-000000000002', 156000.00, 0, 'Filed early'),
  ('fi000000-0000-0000-0000-000000000010', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000005', 'GSTR3B', 'Mar-2026', '2026-04-20', NULL, NULL, 'IN_PROGRESS', 'cs000000-0000-0000-0000-000000000002', 132000.00, 0, 'ITC matching in progress'),
  ('fi000000-0000-0000-0000-000000000011', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000001', 'TDS_QUARTERLY', 'Q4-2025-26', '2026-04-30', NULL, NULL, 'PENDING', 'cs000000-0000-0000-0000-000000000003', 45000.00, 0, NULL),
  ('fi000000-0000-0000-0000-000000000012', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000002', 'TDS_QUARTERLY', 'Q4-2025-26', '2026-04-30', NULL, NULL, 'PENDING', 'cs000000-0000-0000-0000-000000000003', 32000.00, 0, NULL),
  ('fi000000-0000-0000-0000-000000000013', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000003', 'TDS_QUARTERLY', 'Q4-2025-26', '2026-04-30', NULL, NULL, 'PENDING', 'cs000000-0000-0000-0000-000000000001', 67000.00, 0, NULL),
  ('fi000000-0000-0000-0000-000000000014', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000001', 'GSTR1', 'Feb-2026', '2026-03-11', '2026-03-10', 'ACK-GST1-006', 'ACKNOWLEDGED', 'cs000000-0000-0000-0000-000000000002', 118000.00, 0, NULL),
  ('fi000000-0000-0000-0000-000000000015', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000001', 'GSTR3B', 'Feb-2026', '2026-03-20', '2026-03-18', 'ACK-3B-001', 'ACKNOWLEDGED', 'cs000000-0000-0000-0000-000000000002', 92000.00, 0, NULL),
  ('fi000000-0000-0000-0000-000000000016', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000002', 'GSTR1', 'Feb-2026', '2026-03-11', '2026-03-11', 'ACK-GST1-007', 'FILED', 'cs000000-0000-0000-0000-000000000003', 79000.00, 0, 'Filed on deadline'),
  ('fi000000-0000-0000-0000-000000000017', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000003', 'GSTR1', 'Feb-2026', '2026-03-11', NULL, NULL, 'REJECTED', 'cs000000-0000-0000-0000-000000000001', 195000.00, 2500.00, 'Rejected - HSN summary mismatch'),
  ('fi000000-0000-0000-0000-000000000018', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000004', 'IT_RETURN', 'AY-2025-26', '2026-07-31', NULL, NULL, 'PENDING', 'cs000000-0000-0000-0000-000000000001', 280000.00, 0, 'ITR-3 preparation'),
  ('fi000000-0000-0000-0000-000000000019', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000005', 'ROC_ANNUAL', 'FY-2025-26', '2026-10-30', NULL, NULL, 'PENDING', 'cs000000-0000-0000-0000-000000000002', 0, 0, 'AOC-4 and MGT-7'),
  ('fi000000-0000-0000-0000-000000000020', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000001', 'AUDIT_REPORT', 'FY-2025-26', '2026-09-30', NULL, NULL, 'PENDING', 'cs000000-0000-0000-0000-000000000001', 0, 0, 'Tax audit u/s 44AB');

-- Compliance Exceptions
INSERT INTO compliance.compliance_exceptions (id, ca_firm_id, client_id, filing_id, exception_type, description, severity, resolved) VALUES
  ('ex000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000003', 'fi000000-0000-0000-0000-000000000005', 'LATE_FILING', 'GSTR-1 for Mar-2026 not filed by due date', 'HIGH', false),
  ('ex000000-0000-0000-0000-000000000002', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000003', 'fi000000-0000-0000-0000-000000000017', 'REJECTION', 'GSTR-1 Feb-2026 rejected due to HSN mismatch', 'MEDIUM', false),
  ('ex000000-0000-0000-0000-000000000003', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000001', NULL, 'ITC_MISMATCH', 'ITC claimed exceeds GSTR-2B by Rs 15,000', 'MEDIUM', false);

-- Reconciliation Sessions
INSERT INTO compliance.reconciliation_sessions (id, ca_firm_id, client_id, recon_type, period, status, total_items, matched_items, mismatched_items, unmatched_items, started_at, completed_at, created_by) VALUES
  ('rs000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000001', 'GSTR2B', 'Mar-2026', 'IN_PROGRESS', 45, 38, 4, 3, '2026-04-05 10:00:00+05:30', NULL, 'cs000000-0000-0000-0000-000000000002'),
  ('rs000000-0000-0000-0000-000000000002', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000002', 'BANK', 'Mar-2026', 'COMPLETED', 120, 115, 3, 2, '2026-04-02 09:00:00+05:30', '2026-04-02 14:00:00+05:30', 'cs000000-0000-0000-0000-000000000003'),
  ('rs000000-0000-0000-0000-000000000003', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000003', 'TDS_26AS', 'Q3-2025-26', 'COMPLETED', 28, 25, 2, 1, '2026-03-15 11:00:00+05:30', '2026-03-15 16:00:00+05:30', 'cs000000-0000-0000-0000-000000000001'),
  ('rs000000-0000-0000-0000-000000000004', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000005', 'GSTR2B', 'Feb-2026', 'COMPLETED', 62, 60, 1, 1, '2026-03-08 10:00:00+05:30', '2026-03-08 15:00:00+05:30', 'cs000000-0000-0000-0000-000000000002'),
  ('rs000000-0000-0000-0000-000000000005', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000004', 'BANK', 'Mar-2026', 'PARTIAL', 85, 70, 10, 5, '2026-04-06 09:00:00+05:30', NULL, 'cs000000-0000-0000-0000-000000000001');

-- Reconciliation Items (sample items for session 1)
INSERT INTO compliance.reconciliation_items (ca_firm_id, session_id, source_ref, target_ref, source_amount, target_amount, difference, match_status) VALUES
  ('ca000000-0000-0000-0000-000000000001', 'rs000000-0000-0000-0000-000000000001', 'INV-2026-0145', 'GSTR2B-INV-0145', 12500.00, 12500.00, 0.00, 'MATCHED'),
  ('ca000000-0000-0000-0000-000000000001', 'rs000000-0000-0000-0000-000000000001', 'INV-2026-0150', 'GSTR2B-INV-0150', 8750.00, 8750.00, 0.00, 'MATCHED'),
  ('ca000000-0000-0000-0000-000000000001', 'rs000000-0000-0000-0000-000000000001', 'INV-2026-0163', 'GSTR2B-INV-0163', 25000.00, 24500.00, 500.00, 'MISMATCHED'),
  ('ca000000-0000-0000-0000-000000000001', 'rs000000-0000-0000-0000-000000000001', 'INV-2026-0178', NULL, 15200.00, NULL, 15200.00, 'UNMATCHED'),
  ('ca000000-0000-0000-0000-000000000001', 'rs000000-0000-0000-0000-000000000001', 'INV-2026-0182', 'GSTR2B-INV-0182', 6800.00, 7200.00, -400.00, 'MISMATCHED');

-- Document Requests
INSERT INTO compliance.document_requests (id, ca_firm_id, client_id, document_type, description, due_date, status, requested_by, reminder_count, last_reminder_at) VALUES
  ('dr000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000001', 'Bank Statement', 'HDFC Bank statement for March 2026', '2026-04-10', 'RECEIVED', 'cs000000-0000-0000-0000-000000000002', 0, NULL),
  ('dr000000-0000-0000-0000-000000000002', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000001', 'Sales Register', 'Tally sales register export for Q4', '2026-04-12', 'VERIFIED', 'cs000000-0000-0000-0000-000000000002', 0, NULL),
  ('dr000000-0000-0000-0000-000000000003', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000002', 'Purchase Register', 'Purchase register for Mar-2026', '2026-04-08', 'OVERDUE', 'cs000000-0000-0000-0000-000000000003', 3, '2026-04-07 10:00:00+05:30'),
  ('dr000000-0000-0000-0000-000000000004', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000003', 'TDS Certificates', 'Form 16A for Q3 FY2025-26', '2026-04-15', 'REQUESTED', 'cs000000-0000-0000-0000-000000000001', 1, '2026-04-06 09:00:00+05:30'),
  ('dr000000-0000-0000-0000-000000000005', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000003', 'Bank Statement', 'SBI bank statement for March 2026', '2026-04-10', 'REMINDER_SENT', 'cs000000-0000-0000-0000-000000000001', 2, '2026-04-08 10:00:00+05:30'),
  ('dr000000-0000-0000-0000-000000000006', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000004', 'Investment Proofs', 'Section 80C, 80D proofs for ITR', '2026-05-15', 'REQUESTED', 'cs000000-0000-0000-0000-000000000001', 0, NULL),
  ('dr000000-0000-0000-0000-000000000007', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000005', 'Sales Register', 'March 2026 sales register', '2026-04-10', 'RECEIVED', 'cs000000-0000-0000-0000-000000000002', 0, NULL),
  ('dr000000-0000-0000-0000-000000000008', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000005', 'Bank Statement', 'ICICI Bank statement March 2026', '2026-04-10', 'VERIFIED', 'cs000000-0000-0000-0000-000000000002', 0, NULL);

-- Notices
INSERT INTO compliance.notices (id, ca_firm_id, client_id, notice_type, authority, reference_number, received_date, response_due_date, subject, description, priority, status, assigned_to) VALUES
  ('nt000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000003', 'GST Notice', 'CGST Department', 'GST/MH/2026/N-0451', '2026-03-25', '2026-04-25', 'ITC mismatch for FY 2024-25', 'Discrepancy found between GSTR-3B ITC claimed and GSTR-2B available ITC for FY 2024-25. Difference of Rs 2,45,000.', 'HIGH', 'UNDER_REVIEW', 'cs000000-0000-0000-0000-000000000001'),
  ('nt000000-0000-0000-0000-000000000002', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000001', 'Income Tax Notice', 'Income Tax Department', 'IT/PAN/2026/143(1)', '2026-03-20', '2026-04-20', 'Intimation u/s 143(1) for AY 2024-25', 'Adjustment proposed for disallowance of expenses claimed under section 37.', 'MEDIUM', 'RESPONSE_DRAFTED', 'cs000000-0000-0000-0000-000000000002'),
  ('nt000000-0000-0000-0000-000000000003', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000004', 'TDS Notice', 'Income Tax Department', 'TDS/234E/2026/001', '2026-04-01', '2026-04-30', 'Late filing penalty for TDS return Q2', 'Penalty imposed under section 234E for late filing of TDS return for Q2 FY 2025-26.', 'LOW', 'RECEIVED', 'cs000000-0000-0000-0000-000000000001'),
  ('nt000000-0000-0000-0000-000000000004', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000002', 'GST Notice', 'SGST Department', 'GST/MH/2026/N-0523', '2026-04-05', '2026-04-15', 'E-way bill discrepancy', 'Notice regarding e-way bills not generated for inter-state supply transactions exceeding Rs 50,000.', 'CRITICAL', 'RECEIVED', 'cs000000-0000-0000-0000-000000000003'),
  ('nt000000-0000-0000-0000-000000000005', 'ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000001', 'ROC Notice', 'Ministry of Corporate Affairs', 'ROC/MH/2026/STK-7', '2026-02-15', '2026-03-15', 'Annual compliance pending', 'Notice for non-filing of annual returns for FY 2023-24.', 'MEDIUM', 'RESOLVED', 'cs000000-0000-0000-0000-000000000002');

-- Client Health Scores
INSERT INTO compliance.client_health_scores (ca_firm_id, client_id, score, filing_score, document_score, payment_score, communication_score, computed_at) VALUES
  ('ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000001', 85, 90, 80, 85, 85, '2026-04-07 00:00:00+05:30'),
  ('ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000002', 72, 75, 60, 80, 73, '2026-04-07 00:00:00+05:30'),
  ('ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000003', 45, 30, 40, 55, 55, '2026-04-07 00:00:00+05:30'),
  ('ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000004', 78, 85, 70, 75, 82, '2026-04-07 00:00:00+05:30'),
  ('ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000005', 91, 95, 90, 88, 91, '2026-04-07 00:00:00+05:30'),
  ('ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000006', 20, 0, 10, 40, 30, '2026-04-07 00:00:00+05:30'),
  ('ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000007', 35, 25, 30, 45, 40, '2026-04-07 00:00:00+05:30');

-- Communication Log
INSERT INTO compliance.communication_log (ca_firm_id, client_id, channel, direction, subject, body, sent_by, sent_at, status) VALUES
  ('ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000001', 'EMAIL', 'OUTBOUND', 'GSTR-1 Filed Successfully', 'Dear Vijay, your GSTR-1 for March 2026 has been filed successfully. Acknowledgment number: ACK-GST1-001.', 'cs000000-0000-0000-0000-000000000002', '2026-04-08 11:00:00+05:30', 'SENT'),
  ('ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000002', 'WHATSAPP', 'OUTBOUND', 'Document Reminder', 'Hi Suresh, gentle reminder to share the purchase register for March 2026. Due date: April 8.', 'cs000000-0000-0000-0000-000000000003', '2026-04-06 10:00:00+05:30', 'SENT'),
  ('ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000003', 'EMAIL', 'OUTBOUND', 'Urgent: GST Notice Received', 'Dear Anand, we have received a GST notice regarding ITC mismatch for FY 2024-25. Please call us to discuss.', 'cs000000-0000-0000-0000-000000000001', '2026-03-25 14:00:00+05:30', 'SENT'),
  ('ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000003', 'PHONE', 'INBOUND', 'Client call - Notice discussion', 'Anand called to discuss the GST notice. Will provide supporting documents by April 10.', 'cs000000-0000-0000-0000-000000000001', '2026-03-26 16:00:00+05:30', 'SENT'),
  ('ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000004', 'WHATSAPP', 'OUTBOUND', 'TDS Notice Info', 'Hi Harpreet, a TDS late filing penalty notice has been received. Penalty amount: Rs 600. We will handle the response.', 'cs000000-0000-0000-0000-000000000001', '2026-04-02 09:00:00+05:30', 'SENT'),
  ('ca000000-0000-0000-0000-000000000001', 'cl000000-0000-0000-0000-000000000005', 'EMAIL', 'OUTBOUND', 'Monthly Compliance Update', 'Dear Rahul, here is your compliance status for March 2026. GSTR-1: Filed. GSTR-3B: In Progress. All on track.', 'cs000000-0000-0000-0000-000000000002', '2026-04-08 09:00:00+05:30', 'SENT');

-- Done! CA platform test data complete.
