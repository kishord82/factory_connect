# FactoryConnect — Industry Sample Test Data & Connector Reference

**Purpose:** Real-world sample payloads for every source and target connector. Use these as test fixtures during development.

---

## PART A: SOURCE CONNECTORS (Indian Factory ERPs)

---

### A.1 Tally Prime — XML Request/Response Samples

#### A.1.1 Export Stock Summary (Inventory)
**Request → POST http://localhost:9000**
```xml
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Stock Summary</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>
```

**Response (Tally → Bridge Agent)**
```xml
<ENVELOPE>
  <BODY>
    <DATA>
      <TALLYMESSAGE>
        <STOCKITEM NAME="MS Flange DN150 PN16">
          <PARENT>Flanges</PARENT>
          <OPENINGBALANCE>500 Nos</OPENINGBALANCE>
          <CLOSINGBALANCE>423 Nos</CLOSINGBALANCE>
          <CLOSINGVALUE>847500.00</CLOSINGVALUE>
          <CLOSINGRATE>2005.00/Nos</CLOSINGRATE>
          <GODOWNNAME>Main Warehouse - Hyderabad</GODOWNNAME>
          <ADDITIONALDETAILS.LIST>
            <HSN>7307.91</HSN>
            <GSTRATE>18</GSTRATE>
          </ADDITIONALDETAILS.LIST>
        </STOCKITEM>
        <STOCKITEM NAME="SS 304 Pipe 2inch SCH40">
          <PARENT>Pipes</PARENT>
          <OPENINGBALANCE>200 MTR</OPENINGBALANCE>
          <CLOSINGBALANCE>145 MTR</CLOSINGBALANCE>
          <CLOSINGVALUE>435000.00</CLOSINGVALUE>
          <CLOSINGRATE>3000.00/MTR</CLOSINGRATE>
          <GODOWNNAME>Main Warehouse - Hyderabad</GODOWNNAME>
          <ADDITIONALDETAILS.LIST>
            <HSN>7304.41</HSN>
            <GSTRATE>18</GSTRATE>
          </ADDITIONALDETAILS.LIST>
        </STOCKITEM>
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>
```

#### A.1.2 Export Sales Order (Order)
**Request → POST http://localhost:9000**
```xml
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Export</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Sales Order Voucher</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
        <SVCURRENTCOMPANY>Rajesh Engineering Works Pvt Ltd</SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>
```

**Response**
```xml
<ENVELOPE>
  <BODY>
    <DATA>
      <TALLYMESSAGE>
        <VOUCHER VCHTYPE="Sales Order" REMOTEID="REWPL-SO-2026-0547">
          <VOUCHERNUMBER>SO/2026/0547</VOUCHERNUMBER>
          <DATE>20260328</DATE>
          <PARTYNAME>Samsung Electronics Co Ltd</PARTYNAME>
          <PARTYGSTIN>36AABCS1429B1Z2</PARTYGSTIN>
          <REFERENCENUMBER>PO-SAM-2026-8821</REFERENCENUMBER>
          <REFERENCEDATE>20260325</REFERENCEDATE>
          <NARRATION>Samsung PO for Q2 flange supply</NARRATION>
          <DUEDATE>20260415</DUEDATE>
          <ALLINVENTORYENTRIES.LIST>
            <STOCKITEMNAME>MS Flange DN150 PN16</STOCKITEMNAME>
            <ACTUALQTY>200 Nos</ACTUALQTY>
            <BILLEDQTY>200 Nos</BILLEDQTY>
            <RATE>2005.00/Nos</RATE>
            <AMOUNT>-401000.00</AMOUNT>
            <DISCOUNT>0</DISCOUNT>
            <GODOWNNAME>Main Warehouse - Hyderabad</GODOWNNAME>
            <BATCHNAME>BATCH-FL-2026-03</BATCHNAME>
          </ALLINVENTORYENTRIES.LIST>
          <ALLINVENTORYENTRIES.LIST>
            <STOCKITEMNAME>SS 304 Pipe 2inch SCH40</STOCKITEMNAME>
            <ACTUALQTY>50 MTR</ACTUALQTY>
            <BILLEDQTY>50 MTR</BILLEDQTY>
            <RATE>3000.00/MTR</RATE>
            <AMOUNT>-150000.00</AMOUNT>
            <GODOWNNAME>Main Warehouse - Hyderabad</GODOWNNAME>
          </ALLINVENTORYENTRIES.LIST>
          <LEDGERENTRIES.LIST>
            <LEDGERNAME>CGST 9%</LEDGERNAME>
            <AMOUNT>-49590.00</AMOUNT>
          </LEDGERENTRIES.LIST>
          <LEDGERENTRIES.LIST>
            <LEDGERNAME>SGST 9%</LEDGERNAME>
            <AMOUNT>-49590.00</AMOUNT>
          </LEDGERENTRIES.LIST>
        </VOUCHER>
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>
```

#### A.1.3 Export Sales Invoice
**Response**
```xml
<ENVELOPE>
  <BODY>
    <DATA>
      <TALLYMESSAGE>
        <VOUCHER VCHTYPE="Sales" REMOTEID="REWPL-INV-2026-1203">
          <VOUCHERNUMBER>INV/2026/1203</VOUCHERNUMBER>
          <DATE>20260401</DATE>
          <PARTYNAME>Samsung Electronics Co Ltd</PARTYNAME>
          <PARTYGSTIN>36AABCS1429B1Z2</PARTYGSTIN>
          <BASICBUYERNAME>Samsung Electronics Co Ltd</BASICBUYERNAME>
          <IRN>a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0</IRN>
          <IRNACKNO>112609876543210</IRNACKNO>
          <IRNACKDATE>20260401</IRNACKDATE>
          <EWBNO>331001234567</EWBNO>
          <EWBDATE>20260401</EWBDATE>
          <EWBVALIDTILL>20260416</EWBVALIDTILL>
          <ALLINVENTORYENTRIES.LIST>
            <STOCKITEMNAME>MS Flange DN150 PN16</STOCKITEMNAME>
            <HSN>7307.91</HSN>
            <ACTUALQTY>200 Nos</ACTUALQTY>
            <RATE>2005.00/Nos</RATE>
            <AMOUNT>-401000.00</AMOUNT>
          </ALLINVENTORYENTRIES.LIST>
          <LEDGERENTRIES.LIST>
            <LEDGERNAME>IGST 18%</LEDGERNAME>
            <AMOUNT>-99180.00</AMOUNT>
          </LEDGERENTRIES.LIST>
          <TOTALAMOUNT>-500180.00</TOTALAMOUNT>
        </VOUCHER>
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>
```

#### A.1.4 Import Sales Order (Write-back to Tally)
**Request → POST http://localhost:9000**
```xml
<ENVELOPE>
  <HEADER>
    <VERSION>1</VERSION>
    <TALLYREQUEST>Import</TALLYREQUEST>
    <TYPE>Data</TYPE>
    <ID>Vouchers</ID>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVCURRENTCOMPANY>Rajesh Engineering Works Pvt Ltd</SVCURRENTCOMPANY>
      </STATICVARIABLES>
    </DESC>
    <DATA>
      <TALLYMESSAGE>
        <VOUCHER VCHTYPE="Sales Order" ACTION="Create">
          <DATE>20260401</DATE>
          <PARTYNAME>Samsung Electronics Co Ltd</PARTYNAME>
          <VOUCHERNUMBER>SO/2026/0548</VOUCHERNUMBER>
          <NARRATION>Auto-created from Samsung EDI PO# 850-2026-9901</NARRATION>
          <ALLINVENTORYENTRIES.LIST>
            <STOCKITEMNAME>MS Flange DN150 PN16</STOCKITEMNAME>
            <ACTUALQTY>300 Nos</ACTUALQTY>
            <RATE>2005.00/Nos</RATE>
            <AMOUNT>-601500.00</AMOUNT>
          </ALLINVENTORYENTRIES.LIST>
        </VOUCHER>
      </TALLYMESSAGE>
    </DATA>
  </BODY>
</ENVELOPE>
```

---

### A.2 Zoho Books — Webhook & API Samples

#### A.2.1 Sales Order Webhook Payload
```json
{
  "event_type": "salesorder.create",
  "organization_id": "60015878910",
  "salesorder": {
    "salesorder_id": "982000000567234",
    "salesorder_number": "SO-00145",
    "date": "2026-03-28",
    "status": "open",
    "customer_id": "982000000012345",
    "customer_name": "Bosch Automotive Components",
    "currency_code": "INR",
    "exchange_rate": 1.0,
    "delivery_date": "2026-04-15",
    "reference_number": "BOSCH-PO-2026-4412",
    "line_items": [
      {
        "item_id": "982000000098765",
        "name": "Precision CNC Machined Housing - Type A",
        "sku": "CNC-HSG-A-001",
        "description": "Aluminium 6061-T6 CNC machined housing, tolerance +/-0.02mm",
        "rate": 4500.00,
        "quantity": 500,
        "unit": "pcs",
        "tax_id": "982000000045678",
        "tax_name": "GST18",
        "tax_percentage": 18,
        "item_total": 2250000.00,
        "hsn_or_sac": "8483.30",
        "custom_fields": [
          { "label": "Material Grade", "value": "AL6061-T6", "api_name": "cf_material_grade" },
          { "label": "Drawing Number", "value": "DRW-HSG-A-REV-04", "api_name": "cf_drawing_number" },
          { "label": "Surface Treatment", "value": "Hard Anodize Type III", "api_name": "cf_surface_treatment" },
          { "label": "Tensile Strength (MPa)", "value": "310", "api_name": "cf_tensile_strength" }
        ]
      },
      {
        "item_id": "982000000098766",
        "name": "SS 316 Dowel Pin M8x30",
        "sku": "DP-SS316-M8-30",
        "rate": 85.00,
        "quantity": 2000,
        "unit": "pcs",
        "tax_percentage": 18,
        "item_total": 170000.00,
        "hsn_or_sac": "7318.24"
      }
    ],
    "sub_total": 2420000.00,
    "tax_total": 435600.00,
    "total": 2855600.00,
    "shipping_address": {
      "address": "Bosch Ltd, Adugodi",
      "city": "Bangalore",
      "state": "Karnataka",
      "zip": "560030",
      "country": "India"
    },
    "notes": "Quality cert required per ISO 9001:2015. Deliver in anti-static packaging."
  }
}
```

#### A.2.2 Zoho Inventory — Stock Level (API Response)
```json
{
  "items": [
    {
      "item_id": "982000000098765",
      "name": "Precision CNC Machined Housing - Type A",
      "sku": "CNC-HSG-A-001",
      "unit": "pcs",
      "rate": 4500.00,
      "purchase_rate": 2800.00,
      "stock_on_hand": 1250,
      "available_stock": 750,
      "committed_stock": 500,
      "reorder_level": 200,
      "hsn_or_sac": "8483.30",
      "tax_id": "982000000045678",
      "custom_fields": [
        { "api_name": "cf_material_grade", "value": "AL6061-T6" },
        { "api_name": "cf_drawing_number", "value": "DRW-HSG-A-REV-04" },
        { "api_name": "cf_surface_treatment", "value": "Hard Anodize Type III" }
      ],
      "warehouses": [
        { "warehouse_id": "982000000001111", "warehouse_name": "Chennai Plant", "warehouse_stock_on_hand": 800 },
        { "warehouse_id": "982000000001112", "warehouse_name": "Hosur Unit 2", "warehouse_stock_on_hand": 450 }
      ]
    }
  ]
}
```

---

### A.3 SAP Business One — Service Layer REST Samples

#### A.3.1 Login
**POST https://sapb1-server:50000/b1s/v1/Login**
```json
{
  "CompanyDB": "REWPL_PROD",
  "UserName": "fc_integration",
  "Password": "***"
}
```
**Response:** Sets `B1SESSION` cookie for subsequent calls.

#### A.3.2 Get Sales Orders
**GET /b1s/v1/Orders?$filter=DocDate ge '2026-03-01'&$select=DocEntry,DocNum,CardCode,CardName,DocDate,DocDueDate,DocTotal,DocumentLines**
```json
{
  "value": [
    {
      "DocEntry": 15234,
      "DocNum": "SO-15234",
      "CardCode": "C-SAMSUNG-001",
      "CardName": "Samsung Electronics Co Ltd",
      "DocDate": "2026-03-28",
      "DocDueDate": "2026-04-15",
      "DocTotal": 601500.00,
      "DocCurrency": "INR",
      "DocumentLines": [
        {
          "LineNum": 0,
          "ItemCode": "FLG-MS-DN150-PN16",
          "ItemDescription": "MS Flange DN150 PN16",
          "Quantity": 300,
          "UnitPrice": 2005.00,
          "LineTotal": 601500.00,
          "WarehouseCode": "WH-HYD-01",
          "TaxCode": "GST18",
          "HSNEntry": "7307.91"
        }
      ]
    }
  ]
}
```

---

### A.4 WhatsApp Order Intake — Sample Messages

#### A.4.1 Hindi + English Mixed (Typical Indian SME)
```
Naresh bhai, humein 200 piece MS flange DN150 chahiye. Rate 2000 ke aas paas hona chahiye. 15 April tak delivery kar do Bangalore warehouse pe. PO number BOSCH-4412.
```

**Expected Claude NLP Output:**
```json
{
  "intent": "CREATE_ORDER",
  "confidence": 0.92,
  "extracted": {
    "buyer_name": "Naresh (likely Bosch reference)",
    "product": "MS Flange DN150",
    "quantity": 200,
    "unit": "pcs",
    "target_rate": 2000,
    "currency": "INR",
    "delivery_date": "2026-04-15",
    "delivery_location": "Bangalore warehouse",
    "buyer_po": "BOSCH-4412"
  },
  "clarification_needed": ["Confirm buyer_name maps to Bosch Automotive Components", "Confirm exact SKU: FLG-MS-DN150-PN16"]
}
```

#### A.4.2 Pure Hindi
```
Bhai 500 kg SS 304 pipe 2 inch schedule 40 bhejo. Rate batao. COD nahi chalega, 30 din credit chahiye.
```

**Expected Claude NLP Output:**
```json
{
  "intent": "REQUEST_QUOTE",
  "confidence": 0.88,
  "extracted": {
    "product": "SS 304 Pipe 2 inch Schedule 40",
    "quantity": 500,
    "unit": "KG",
    "payment_terms": "Net 30",
    "payment_mode": "Credit (not COD)"
  },
  "clarification_needed": ["Buyer name not provided", "Delivery date not specified", "Delivery location not specified"]
}
```

---

### A.5 CSV / Excel Upload — Sample Format

```csv
item_code,item_name,hsn_code,quantity,unit,rate_inr,buyer_name,buyer_po,delivery_date,warehouse
FLG-MS-DN150-PN16,MS Flange DN150 PN16,7307.91,200,Nos,2005.00,Samsung Electronics,PO-SAM-2026-8821,2026-04-15,Main Warehouse Hyderabad
PIPE-SS304-2IN-S40,SS 304 Pipe 2inch SCH40,7304.41,50,MTR,3000.00,Samsung Electronics,PO-SAM-2026-8821,2026-04-15,Main Warehouse Hyderabad
CNC-HSG-A-001,CNC Machined Housing Type A,8483.30,500,PCS,4500.00,Bosch Automotive,BOSCH-PO-2026-4412,2026-04-15,Chennai Plant
```

---

## PART B: CANONICAL DATA MODEL — Mapped Samples

### B.1 Canonical Order (from Tally SO above)
```json
{
  "fc_order_id": "fc-ord-2026-00547",
  "buyer_po_number": "PO-SAM-2026-8821",
  "buyer_id": "fc-buyer-samsung-001",
  "factory_id": "fc-factory-rewpl-001",
  "order_date": "2026-03-28T00:00:00Z",
  "required_delivery_date": "2026-04-15T00:00:00Z",
  "incoterms": "EXW",
  "currency": "INR",
  "ship_to_address": {
    "line1": "Samsung Electronics, KIADB Industrial Area",
    "city": "Bangalore",
    "state": "Karnataka",
    "pin": "560058",
    "country": "IN"
  },
  "bill_to_address": {
    "line1": "Samsung Electronics Co Ltd",
    "city": "Sriperumbudur",
    "state": "Tamil Nadu",
    "pin": "602105",
    "country": "IN"
  },
  "line_items": [
    {
      "fc_sku": "fc-sku-rewpl-flg-dn150",
      "source_ref": "MS Flange DN150 PN16",
      "description": "MS Flange DN150 PN16",
      "hsn_code": "7307.91",
      "quantity": 200,
      "unit_of_measure": "NOS",
      "unit_price_inr": 2005.00,
      "line_total_inr": 401000.00,
      "tax_rate": 18,
      "tax_amount_inr": 72180.00
    },
    {
      "fc_sku": "fc-sku-rewpl-pipe-ss304",
      "source_ref": "SS 304 Pipe 2inch SCH40",
      "description": "SS 304 Pipe 2 inch Schedule 40",
      "hsn_code": "7304.41",
      "quantity": 50,
      "unit_of_measure": "MTR",
      "unit_price_inr": 3000.00,
      "line_total_inr": 150000.00,
      "tax_rate": 18,
      "tax_amount_inr": 27000.00
    }
  ],
  "status": "RECEIVED",
  "source_ref": "SO/2026/0547",
  "buyer_ref": "PO-SAM-2026-8821",
  "total_amount_inr": 650180.00,
  "total_amount_usd": 7742.62,
  "idempotency_key": "fc-ord-rewpl-001-PO-SAM-2026-8821",
  "created_at": "2026-03-28T10:30:00Z",
  "updated_at": "2026-03-28T10:30:00Z"
}
```

### B.2 Canonical Product
```json
{
  "fc_sku": "fc-sku-rewpl-flg-dn150",
  "name": "MS Flange DN150 PN16",
  "description": "Mild Steel Flange DN150 PN16 as per IS 6392",
  "hsn_code": "7307.91",
  "hts_code": "7307.91.0000",
  "gst_rate": 18,
  "unit_of_measure": "NOS",
  "base_price_inr": 2005.00,
  "base_price_usd": 23.87,
  "min_order_qty": 50,
  "lead_time_days": 14,
  "origin_country": "India",
  "certifications": ["ISO 9001:2015", "IS 6392"],
  "attributes": {
    "material": "Mild Steel IS 2062 E250",
    "nominal_diameter": "DN150",
    "pressure_rating": "PN16",
    "flange_type": "Slip-On",
    "surface_finish": "Hot Dip Galvanized"
  },
  "factory_id": "fc-factory-rewpl-001",
  "source_ref": "MS Flange DN150 PN16"
}
```

### B.3 Canonical Inventory
```json
{
  "fc_sku": "fc-sku-rewpl-flg-dn150",
  "warehouse_id": "wh-hyd-main",
  "quantity_available": 423,
  "quantity_reserved": 200,
  "quantity_in_transit": 0,
  "reorder_level": 100,
  "available_to_promise": 223,
  "last_updated_at": "2026-04-01T06:00:00Z",
  "factory_id": "fc-factory-rewpl-001"
}
```

### B.4 Canonical Shipment
```json
{
  "fc_shipment_id": "fc-shp-2026-00189",
  "fc_order_id": "fc-ord-2026-00547",
  "dispatch_date": "2026-04-01T14:00:00Z",
  "transporter": "Delhivery",
  "vehicle_number": "TS 09 EA 4567",
  "lr_number": "DEL-HYD-BLR-20260401-001",
  "awb_number": "DEL2026040178901",
  "eway_bill_number": "331001234567",
  "eway_bill_validity": "2026-04-16T23:59:59Z",
  "packages": [
    {
      "package_id": "PKG-001",
      "sscc": "00843210012345678906",
      "weight_kg": 450,
      "dimensions": { "length_cm": 120, "width_cm": 80, "height_cm": 60 },
      "contents": [
        { "fc_sku": "fc-sku-rewpl-flg-dn150", "quantity": 200, "batch": "BATCH-FL-2026-03" }
      ]
    },
    {
      "package_id": "PKG-002",
      "sscc": "00843210012345678913",
      "weight_kg": 300,
      "contents": [
        { "fc_sku": "fc-sku-rewpl-pipe-ss304", "quantity": 50 }
      ]
    }
  ],
  "sscc_barcodes": ["00843210012345678906", "00843210012345678913"],
  "tracking_url": "https://www.delhivery.com/track/package/DEL2026040178901",
  "estimated_delivery_date": "2026-04-03T18:00:00Z",
  "status": "IN_TRANSIT",
  "factory_id": "fc-factory-rewpl-001",
  "buyer_id": "fc-buyer-samsung-001"
}
```

### B.5 Canonical Invoice
```json
{
  "fc_invoice_id": "fc-inv-2026-01203",
  "fc_order_id": "fc-ord-2026-00547",
  "fc_shipment_id": "fc-shp-2026-00189",
  "invoice_date": "2026-04-01T00:00:00Z",
  "gst_invoice_number": "INV/2026/1203",
  "irn_number": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0",
  "commercial_invoice_number": "REWPL-CI-2026-0547",
  "amount_inr": 500180.00,
  "amount_usd": 5954.52,
  "exchange_rate": 84.00,
  "tax_breakup": {
    "cgst": 0,
    "sgst": 0,
    "igst": 99180.00,
    "cess": 0
  },
  "payment_terms": "Net 45",
  "due_date": "2026-05-16T00:00:00Z",
  "payment_status": "PENDING",
  "factory_id": "fc-factory-rewpl-001",
  "buyer_id": "fc-buyer-samsung-001"
}
```

---

## PART C: TARGET CONNECTORS (Global Buyer Systems)

---

### C.1 EDI X12 — Full Transaction Set Samples

#### C.1.1 EDI 850 — Purchase Order (Inbound from Buyer)
```
ISA*00*          *00*          *ZZ*SAMSUNGEDI     *ZZ*FCPLATFORM     *260328*1030*U*00401*000012345*0*P*>~
GS*PO*SAMSUNGEDI*FCPLATFORM*20260328*1030*12345*X*004010~
ST*850*0001~
BEG*00*NE*PO-SAM-2026-8821**20260328~
REF*DP*DEPT-MFG-001~
REF*IA*SAMSUNG-VENDOR-REW-001~
DTM*002*20260415~
DTM*063*20260328~
N1*ST*Samsung Electronics KIADB*92*LOC-BLR-001~
N3*KIADB Industrial Area*Phase 2~
N4*Bangalore*KA*560058*IN~
N1*BT*Samsung Electronics Co Ltd*92*LOC-SPM-001~
N3*Plot No 2, SIPCOT Industrial Park~
N4*Sriperumbudur*TN*602105*IN~
PO1*001*200*EA*2005.00*PE*BP*FLG-MS-DN150-PN16*VP*7307.91~
PID*F****MS Flange DN150 PN16 IS 6392~
PO1*002*50*LM*3000.00*PE*BP*PIPE-SS304-2IN-S40*VP*7304.41~
PID*F****SS 304 Pipe 2inch Schedule 40~
CTT*2~
AMT*TT*551000.00~
SE*18*0001~
GE*1*12345~
IEA*1*000012345~
```

**Key field mapping:**
- ISA06 `SAMSUNGEDI` = Buyer's EDI ID (used for routing)
- ISA08 `FCPLATFORM` = FactoryConnect's EDI ID
- BEG03 `PO-SAM-2026-8821` = Buyer PO Number
- PO1-01 `001` = Line item number
- PO1-02 `200` = Quantity
- PO1-03 `EA` = Unit (Each)
- PO1-04 `2005.00` = Unit Price
- PO1-07 `FLG-MS-DN150-PN16` = Buyer's Part Number
- PO1-09 `7307.91` = HSN/HTS Code

#### C.1.2 EDI 855 — PO Acknowledgement (Outbound to Buyer)
```
ISA*00*          *00*          *ZZ*FCPLATFORM     *ZZ*SAMSUNGEDI     *260328*1430*U*00401*000012346*0*P*>~
GS*PR*FCPLATFORM*SAMSUNGEDI*20260328*1430*12346*X*004010~
ST*855*0001~
BAK*00*AC*PO-SAM-2026-8821*20260328****20260328~
REF*VR*REWPL~
DTM*002*20260415~
N1*ST*Samsung Electronics KIADB*92*LOC-BLR-001~
PO1*001*200*EA*2005.00*PE*BP*FLG-MS-DN150-PN16~
ACK*IA*200*EA*068*20260415~
PO1*002*50*LM*3000.00*PE*BP*PIPE-SS304-2IN-S40~
ACK*IA*50*LM*068*20260415~
CTT*2~
SE*12*0001~
GE*1*12346~
IEA*1*000012346~
```

**Key:** BAK02 `AC` = Acknowledge with Detail. ACK01 `IA` = Item Accepted.

#### C.1.3 EDI 856 — Advance Ship Notice / ASN (Outbound)
```
ISA*00*          *00*          *ZZ*FCPLATFORM     *ZZ*SAMSUNGEDI     *260401*1500*U*00401*000012347*0*P*>~
GS*SH*FCPLATFORM*SAMSUNGEDI*20260401*1500*12347*X*004010~
ST*856*0001~
BSN*00*SHP-2026-00189*20260401*1500*0001~
DTM*011*20260401~
DTM*017*20260403~
HL*1**S~
TD1*CTN*2****G*750*KG~
TD5*O*2*DELV*D*Delhivery Express~
TD3*TL****TS09EA4567~
REF*BM*DEL-HYD-BLR-20260401-001~
REF*CN*DEL2026040178901~
N1*SF*Rajesh Engineering Works Pvt Ltd*92*REWPL-HYD~
N3*Plot 45, IDA Jeedimetla~
N4*Hyderabad*TS*500055*IN~
N1*ST*Samsung Electronics KIADB*92*LOC-BLR-001~
N3*KIADB Industrial Area~
N4*Bangalore*KA*560058*IN~
HL*2*1*O~
PRF*PO-SAM-2026-8821***20260328~
HL*3*2*P~
MAN*GM*00843210012345678906~
HL*4*3*I~
LIN*001*BP*FLG-MS-DN150-PN16*VP*7307.91~
SN1*001*200*EA~
HL*5*2*P~
MAN*GM*00843210012345678913~
HL*6*5*I~
LIN*002*BP*PIPE-SS304-2IN-S40*VP*7304.41~
SN1*002*50*LM~
CTT*6~
SE*30*0001~
GE*1*12347~
IEA*1*000012347~
```

**Key:** HL hierarchy: S(Shipment) > O(Order) > P(Pack) > I(Item). MAN*GM = SSCC barcode.

#### C.1.4 EDI 810 — Invoice (Outbound)
```
ISA*00*          *00*          *ZZ*FCPLATFORM     *ZZ*SAMSUNGEDI     *260401*1600*U*00401*000012348*0*P*>~
GS*IN*FCPLATFORM*SAMSUNGEDI*20260401*1600*12348*X*004010~
ST*810*0001~
BIG*20260401*REWPL-CI-2026-0547*20260328*PO-SAM-2026-8821~
REF*VR*REWPL~
REF*OQ*SO/2026/0547~
N1*ST*Samsung Electronics KIADB*92*LOC-BLR-001~
N1*RE*Rajesh Engineering Works Pvt Ltd*92*REWPL-HYD~
IT1*001*200*EA*2005.00**BP*FLG-MS-DN150-PN16*VP*7307.91~
TDS*55100000~
TXI*TX*99180.00****IGST 18%~
CAD*O*DELV***Delhivery Express~
ISS*200*EA~
CTT*1~
SE*13*0001~
GE*1*12348~
IEA*1*000012348~
```

#### C.1.5 EDI 820 — Payment Remittance (Inbound from Buyer)
```
ISA*00*          *00*          *ZZ*SAMSUNGEDI     *ZZ*FCPLATFORM     *260516*0900*U*00401*000012349*0*P*>~
GS*RA*SAMSUNGEDI*FCPLATFORM*20260516*0900*12349*X*004010~
ST*820*0001~
BPR*C*500180.00*C*ACH*CCD*01*SBIN0001234**DA*1234567890*01*HDFC0001234**DA*9876543210*20260516~
TRN*1*PAY-SAM-2026-05-8821*SAMSUNGEDI~
REF*IV*REWPL-CI-2026-0547~
DTM*009*20260516~
N1*PR*Samsung Electronics Co Ltd~
N1*PE*Rajesh Engineering Works Pvt Ltd~
RMR*IV*REWPL-CI-2026-0547**500180.00~
SE*10*0001~
GE*1*12349~
IEA*1*000012349~
```

---

### C.2 SAP Ariba cXML — Full Document Samples

#### C.2.1 OrderRequest (Inbound PO from Buyer via Ariba)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.056/cXML.dtd">
<cXML xml:lang="en-US" timestamp="2026-03-28T10:30:00+05:30" payloadID="PO-ARB-2026-7701@ariba.com">
  <Header>
    <From>
      <Credential domain="NetworkID">
        <Identity>AN01234567890</Identity>
      </Credential>
    </From>
    <To>
      <Credential domain="NetworkID">
        <Identity>AN09876543210</Identity>
      </Credential>
    </To>
    <Sender>
      <Credential domain="NetworkID">
        <Identity>AN01234567890</Identity>
        <SharedSecret>AribaSharedSecret123!</SharedSecret>
      </Credential>
      <UserAgent>SAP Ariba Procurement 2026.1</UserAgent>
    </Sender>
  </Header>
  <Request>
    <OrderRequest>
      <OrderRequestHeader orderID="PO-ARB-2026-7701" orderDate="2026-03-28T10:30:00+05:30" type="new">
        <Total>
          <Money currency="USD">7742.62</Money>
        </Total>
        <ShipTo>
          <Address>
            <Name xml:lang="en">Samsung Electronics KIADB</Name>
            <PostalAddress>
              <Street>KIADB Industrial Area Phase 2</Street>
              <City>Bangalore</City>
              <State>KA</State>
              <PostalCode>560058</PostalCode>
              <Country isoCountryCode="IN">India</Country>
            </PostalAddress>
          </Address>
        </ShipTo>
        <BillTo>
          <Address>
            <Name xml:lang="en">Samsung Electronics Co Ltd</Name>
            <PostalAddress>
              <Street>Plot No 2 SIPCOT Industrial Park</Street>
              <City>Sriperumbudur</City>
              <State>TN</State>
              <PostalCode>602105</PostalCode>
              <Country isoCountryCode="IN">India</Country>
            </PostalAddress>
          </Address>
        </BillTo>
        <Payment>
          <PCard number="" expiration="">
          </PCard>
        </Payment>
        <Comments>Q2 flange and pipe supply. Quality cert required per ISO 9001:2015.</Comments>
      </OrderRequestHeader>
      <ItemOut quantity="200" lineNumber="1">
        <ItemID>
          <SupplierPartID>FLG-MS-DN150-PN16</SupplierPartID>
          <SupplierPartAuxiliaryID>7307.91</SupplierPartAuxiliaryID>
        </ItemID>
        <ItemDetail>
          <UnitPrice>
            <Money currency="USD">23.87</Money>
          </UnitPrice>
          <Description xml:lang="en">MS Flange DN150 PN16 IS 6392</Description>
          <UnitOfMeasure>EA</UnitOfMeasure>
          <Classification domain="UNSPSC">40141700</Classification>
        </ItemDetail>
      </ItemOut>
      <ItemOut quantity="50" lineNumber="2">
        <ItemID>
          <SupplierPartID>PIPE-SS304-2IN-S40</SupplierPartID>
          <SupplierPartAuxiliaryID>7304.41</SupplierPartAuxiliaryID>
        </ItemID>
        <ItemDetail>
          <UnitPrice>
            <Money currency="USD">35.71</Money>
          </UnitPrice>
          <Description xml:lang="en">SS 304 Pipe 2 inch Schedule 40</Description>
          <UnitOfMeasure>MTR</UnitOfMeasure>
          <Classification domain="UNSPSC">40171500</Classification>
        </ItemDetail>
      </ItemOut>
    </OrderRequest>
  </Request>
</cXML>
```

#### C.2.2 ConfirmationRequest (PO ACK — Outbound)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.056/cXML.dtd">
<cXML xml:lang="en-US" timestamp="2026-03-28T14:30:00+05:30" payloadID="CONF-FC-2026-0547@factoryconnect.io">
  <Header>
    <From>
      <Credential domain="NetworkID">
        <Identity>AN09876543210</Identity>
      </Credential>
    </From>
    <To>
      <Credential domain="NetworkID">
        <Identity>AN01234567890</Identity>
      </Credential>
    </To>
    <Sender>
      <Credential domain="NetworkID">
        <Identity>AN09876543210</Identity>
        <SharedSecret>FCSecret456!</SharedSecret>
      </Credential>
      <UserAgent>FactoryConnect/1.0</UserAgent>
    </Sender>
  </Header>
  <Request>
    <ConfirmationRequest>
      <ConfirmationHeader type="accept" noticeDate="2026-03-28T14:30:00+05:30" confirmID="FC-CONF-0547">
        <Total>
          <Money currency="USD">7742.62</Money>
        </Total>
      </ConfirmationHeader>
      <OrderReference orderID="PO-ARB-2026-7701"/>
      <ConfirmationItem quantity="200" lineNumber="1">
        <UnitPrice>
          <Money currency="USD">23.87</Money>
        </UnitPrice>
        <ConfirmationStatus type="accept" quantity="200" deliveryDate="2026-04-15"/>
      </ConfirmationItem>
      <ConfirmationItem quantity="50" lineNumber="2">
        <UnitPrice>
          <Money currency="USD">35.71</Money>
        </UnitPrice>
        <ConfirmationStatus type="accept" quantity="50" deliveryDate="2026-04-15"/>
      </ConfirmationItem>
    </ConfirmationRequest>
  </Request>
</cXML>
```

#### C.2.3 ShipNoticeRequest (ASN — Outbound)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE cXML SYSTEM "http://xml.cxml.org/schemas/cXML/1.2.056/cXML.dtd">
<cXML xml:lang="en-US" timestamp="2026-04-01T15:00:00+05:30" payloadID="ASN-FC-2026-00189@factoryconnect.io">
  <Header>
    <From>
      <Credential domain="NetworkID"><Identity>AN09876543210</Identity></Credential>
    </From>
    <To>
      <Credential domain="NetworkID"><Identity>AN01234567890</Identity></Credential>
    </To>
    <Sender>
      <Credential domain="NetworkID">
        <Identity>AN09876543210</Identity>
        <SharedSecret>FCSecret456!</SharedSecret>
      </Credential>
      <UserAgent>FactoryConnect/1.0</UserAgent>
    </Sender>
  </Header>
  <Request>
    <ShipNoticeRequest>
      <ShipNoticeHeader shipmentID="SHP-2026-00189" noticeDate="2026-04-01T15:00:00+05:30"
                         shipmentDate="2026-04-01T14:00:00+05:30" deliveryDate="2026-04-03T18:00:00+05:30">
        <ServiceLevel>Express</ServiceLevel>
        <Contact role="shipFrom">
          <Name xml:lang="en">Rajesh Engineering Works Pvt Ltd</Name>
          <PostalAddress>
            <Street>Plot 45 IDA Jeedimetla</Street>
            <City>Hyderabad</City>
            <State>TS</State>
            <PostalCode>500055</PostalCode>
            <Country isoCountryCode="IN">India</Country>
          </PostalAddress>
        </Contact>
      </ShipNoticeHeader>
      <ShipNoticePortion>
        <OrderReference orderID="PO-ARB-2026-7701"/>
        <ShipNoticeItem shipNoticeLineNumber="1" quantity="200">
          <ItemID>
            <SupplierPartID>FLG-MS-DN150-PN16</SupplierPartID>
          </ItemID>
          <Packaging>
            <PackagingCode>CTN</PackagingCode>
            <Dimension quantity="1" type="weight">
              <UnitOfMeasure>KG</UnitOfMeasure>
              <Money>450</Money>
            </Dimension>
          </Packaging>
          <Batch>
            <BuyerBatchID>BATCH-FL-2026-03</BuyerBatchID>
          </Batch>
        </ShipNoticeItem>
        <ShipNoticeItem shipNoticeLineNumber="2" quantity="50">
          <ItemID>
            <SupplierPartID>PIPE-SS304-2IN-S40</SupplierPartID>
          </ItemID>
        </ShipNoticeItem>
      </ShipNoticePortion>
    </ShipNoticeRequest>
  </Request>
</cXML>
```

---

### C.3 Government APIs

#### C.3.1 NIC e-Invoice — Generate IRN Request
**POST https://einvoice1.gst.gov.in/eicore/v1.03/Invoice**
```json
{
  "Version": "1.1",
  "TranDtls": {
    "TaxSch": "GST",
    "SupTyp": "B2B",
    "RegRev": "N",
    "EcmGstin": null,
    "IgstOnIntra": "N"
  },
  "DocDtls": {
    "Typ": "INV",
    "No": "INV/2026/1203",
    "Dt": "01/04/2026"
  },
  "SellerDtls": {
    "Gstin": "36AABCR5678E1Z5",
    "LglNm": "Rajesh Engineering Works Pvt Ltd",
    "TrdNm": "Rajesh Engineering Works",
    "Addr1": "Plot 45, IDA Jeedimetla",
    "Loc": "Hyderabad",
    "Pin": 500055,
    "Stcd": "36",
    "Ph": "9876543210",
    "Em": "accounts@rajesheng.com"
  },
  "BuyerDtls": {
    "Gstin": "36AABCS1429B1Z2",
    "LglNm": "Samsung Electronics Co Ltd",
    "Addr1": "KIADB Industrial Area Phase 2",
    "Loc": "Bangalore",
    "Pin": 560058,
    "Stcd": "29"
  },
  "ItemList": [
    {
      "SlNo": "1",
      "PrdDesc": "MS Flange DN150 PN16",
      "IsServc": "N",
      "HsnCd": "73079100",
      "Qty": 200,
      "FreeQty": 0,
      "Unit": "NOS",
      "UnitPrice": 2005.00,
      "TotAmt": 401000.00,
      "Discount": 0,
      "PreTaxVal": 401000.00,
      "AssAmt": 401000.00,
      "GstRt": 18.00,
      "IgstAmt": 72180.00,
      "CgstAmt": 0,
      "SgstAmt": 0,
      "CesRt": 0,
      "CesAmt": 0,
      "TotItemVal": 473180.00
    }
  ],
  "ValDtls": {
    "AssVal": 551000.00,
    "IgstVal": 99180.00,
    "CgstVal": 0,
    "SgstVal": 0,
    "CesVal": 0,
    "Discount": 0,
    "OthChrg": 0,
    "TotInvVal": 650180.00
  }
}
```

#### C.3.2 NIC e-Way Bill — Generate Request
**POST https://ewaybillgst.gov.in/api/ewb/GetNewEWB**
```json
{
  "supplyType": "O",
  "subSupplyType": "1",
  "docType": "INV",
  "docNo": "INV/2026/1203",
  "docDate": "01/04/2026",
  "fromGstin": "36AABCR5678E1Z5",
  "fromTrdName": "Rajesh Engineering Works Pvt Ltd",
  "fromAddr1": "Plot 45, IDA Jeedimetla",
  "fromPlace": "Hyderabad",
  "fromPincode": 500055,
  "fromStateCode": 36,
  "toGstin": "29AABCS1429B1Z2",
  "toTrdName": "Samsung Electronics Co Ltd",
  "toAddr1": "KIADB Industrial Area Phase 2",
  "toPlace": "Bangalore",
  "toPincode": 560058,
  "toStateCode": 29,
  "totalValue": 551000.00,
  "cgstValue": 0,
  "sgstValue": 0,
  "igstValue": 99180.00,
  "totInvValue": 650180.00,
  "transporterId": "36AABCT1234F1Z5",
  "transporterName": "Delhivery Pvt Ltd",
  "transMode": "1",
  "transDistance": "570",
  "vehicleNo": "TS09EA4567",
  "vehicleType": "R",
  "itemList": [
    {
      "productName": "MS Flange DN150 PN16",
      "productDesc": "MS Flange DN150 PN16 IS 6392",
      "hsnCode": 73079100,
      "quantity": 200,
      "qtyUnit": "NOS",
      "taxableAmount": 401000.00,
      "igstRate": 18,
      "cgstRate": 0,
      "sgstRate": 0
    },
    {
      "productName": "SS 304 Pipe 2inch SCH40",
      "productDesc": "SS 304 Pipe 2 inch Schedule 40",
      "hsnCode": 73044100,
      "quantity": 50,
      "qtyUnit": "MTR",
      "taxableAmount": 150000.00,
      "igstRate": 18,
      "cgstRate": 0,
      "sgstRate": 0
    }
  ]
}
```

---

### C.4 Logistics API Samples

#### C.4.1 Delhivery — Create Shipment
**POST https://track.delhivery.com/api/cmu/create.json**
```json
{
  "shipments": [
    {
      "name": "Samsung Electronics KIADB",
      "add": "KIADB Industrial Area Phase 2",
      "pin": "560058",
      "city": "Bangalore",
      "state": "Karnataka",
      "country": "India",
      "phone": "9988776655",
      "order": "fc-ord-2026-00547",
      "payment_mode": "Pre-paid",
      "return_pin": "500055",
      "return_city": "Hyderabad",
      "return_phone": "9876543210",
      "return_add": "Plot 45 IDA Jeedimetla Hyderabad",
      "return_state": "Telangana",
      "return_country": "India",
      "products_desc": "MS Flanges DN150 PN16 + SS 304 Pipes",
      "hsn_code": "73079100",
      "cod_amount": "0",
      "order_date": "2026-04-01",
      "total_amount": "650180",
      "seller_name": "Rajesh Engineering Works Pvt Ltd",
      "seller_add": "Plot 45 IDA Jeedimetla",
      "seller_cst": "36AABCR5678E1Z5",
      "seller_tin": "36AABCR5678E1Z5",
      "quantity": 2,
      "weight": 750,
      "waybill": "",
      "shipment_width": 80,
      "shipment_height": 60,
      "shipment_length": 120,
      "ewbn": "331001234567"
    }
  ],
  "pickup_location": {
    "name": "REWPL Hyderabad",
    "add": "Plot 45 IDA Jeedimetla",
    "city": "Hyderabad",
    "pin_code": "500055",
    "country": "India",
    "phone": "9876543210"
  }
}
```

---

## PART D: MAPPING EXAMPLES

### D.1 Tally → Canonical Order (JSONata Expression)
```jsonata
{
  "fc_order_id": "fc-ord-" & $formatInteger($now() / 1000, '0'),
  "buyer_po_number": VOUCHER.REFERENCENUMBER,
  "factory_id": $factoryId,
  "order_date": $parseDate(VOUCHER.DATE, 'YYYYMMDD'),
  "required_delivery_date": $parseDate(VOUCHER.DUEDATE, 'YYYYMMDD'),
  "currency": "INR",
  "line_items": VOUCHER."ALLINVENTORYENTRIES.LIST".[{
    "source_ref": STOCKITEMNAME,
    "quantity": $number($substringBefore(ACTUALQTY, ' ')),
    "unit_of_measure": $trim($substringAfter(ACTUALQTY, ' ')),
    "unit_price_inr": $number($substringBefore(RATE, '/')),
    "line_total_inr": $abs($number(AMOUNT))
  }],
  "status": "RECEIVED",
  "source_ref": VOUCHER.VOUCHERNUMBER,
  "buyer_ref": VOUCHER.REFERENCENUMBER,
  "total_amount_inr": $abs($sum(VOUCHER."ALLINVENTORYENTRIES.LIST".AMOUNT.$number()))
}
```

### D.2 Canonical Order → EDI 850 Field Map
| Canonical Field | EDI 850 Segment/Element | Transform |
|----------------|------------------------|-----------|
| buyer_po_number | BEG03 | Direct |
| order_date | BEG05 | Format YYYYMMDD |
| required_delivery_date | DTM*002 | Format YYYYMMDD |
| ship_to_address.line1 | N3 (under N1*ST) | Direct |
| ship_to_address.city | N401 | Direct |
| ship_to_address.state | N402 | 2-char state code |
| ship_to_address.pin | N403 | Direct |
| line_items[].quantity | PO102 | Direct |
| line_items[].unit_of_measure | PO103 | Map: NOS→EA, MTR→LM, KG→KG |
| line_items[].unit_price_inr | PO104 | Convert to USD |
| line_items[].fc_sku | PO107 (BP qualifier) | Direct |
| line_items[].hsn_code | PO109 (VP qualifier) | Direct |
| total_amount_inr | AMT*TT | Convert to USD |

### D.3 Canonical Order → Ariba cXML Field Map
| Canonical Field | cXML Element | Transform |
|----------------|-------------|-----------|
| buyer_po_number | OrderRequestHeader/@orderID | Direct |
| order_date | OrderRequestHeader/@orderDate | ISO 8601 |
| total_amount_usd | Total/Money | Direct (already USD) |
| ship_to_address | ShipTo/Address/PostalAddress | Map fields |
| line_items[].fc_sku | ItemOut/ItemID/SupplierPartID | Direct |
| line_items[].hsn_code | ItemOut/ItemID/SupplierPartAuxiliaryID | Direct |
| line_items[].unit_price | ItemOut/ItemDetail/UnitPrice/Money | USD |
| line_items[].quantity | ItemOut/@quantity | Direct |
| line_items[].unit_of_measure | ItemOut/ItemDetail/UnitOfMeasure | Map: NOS→EA, MTR→MTR |

---

## PART E: CONNECTION REGISTRY — Sample Data

### E.1 Factory Record
```sql
INSERT INTO factories (factory_id, name, erp_type, api_key, tenant_schema, gstin, status)
VALUES (
  'fc-factory-rewpl-001',
  'Rajesh Engineering Works Pvt Ltd',
  'TALLY',
  'sk_live_rewpl_abc123def456',
  'tenant_rewpl',
  '36AABCR5678E1Z5',
  'ACTIVE'
);
```

### E.2 Buyer Record
```sql
INSERT INTO buyers (buyer_id, name, system_type, protocol, endpoint_url, edi_isa_qualifier, edi_isa_id, country_code, currency)
VALUES (
  'fc-buyer-samsung-001',
  'Samsung Electronics Co Ltd',
  'EDI_X12',
  'AS2',
  'https://as2.samsung.com/edi/receive',
  'ZZ',
  'SAMSUNGEDI',
  'IN',
  'INR'
);

INSERT INTO buyers (buyer_id, name, system_type, protocol, endpoint_url, ariba_network_id, country_code, currency)
VALUES (
  'fc-buyer-bosch-001',
  'Bosch Automotive Components India',
  'ARIBA',
  'HTTPS',
  'https://s1.ariba.com/Buyer/Main',
  'AN01234567890',
  'IN',
  'INR'
);
```

### E.3 Connection Record
```sql
INSERT INTO connections (connection_id, factory_id, buyer_id, status, factory_buyer_code, credentials)
VALUES (
  'fc-conn-rewpl-samsung-001',
  'fc-factory-rewpl-001',
  'fc-buyer-samsung-001',
  'ACTIVE',
  'Samsung Electronics Co Ltd',
  '{"as2_partner_id": "SAMSUNGEDI", "as2_url": "https://as2.samsung.com/edi/receive", "as2_cert_path": "/certs/samsung_public.pem", "mdn_url": "https://fc.example.com/as2/mdn"}'
);
```

### E.4 Routing Rule
```sql
INSERT INTO routing_rules (rule_id, buyer_id, factory_id, rule_type, rule_value, priority)
VALUES (
  'fc-rule-001',
  'fc-buyer-samsung-001',
  'fc-factory-rewpl-001',
  'EDI_ISA_RECEIVER',
  'FCPLATFORM',
  10
);
```

---

## PART F: TEST SCENARIOS MATRIX

| # | Scenario | Source | Target | Key Validation |
|---|----------|--------|--------|----------------|
| 1 | Tally factory receives Samsung EDI PO | EDI 850 inbound | Tally write-back SO | Routing by ISA08, SO created in Tally |
| 2 | Zoho factory receives Ariba PO | Ariba cXML OrderRequest | Zoho webhook trigger | Ariba NetworkID routing, Zoho SO created |
| 3 | Factory confirms PO → ACK sent | FC API confirm | EDI 855 / Ariba ConfirmationRequest | Correct buyer system gets ACK |
| 4 | Factory dispatches → ASN + e-way bill | Tally Delivery Note | EDI 856 + NIC e-way bill | SSCC barcodes, e-way bill number in ASN |
| 5 | Invoice generated → EDI 810 + IRN | Tally Sales Invoice | EDI 810 + NIC e-invoice | IRN generated, commercial invoice in USD |
| 6 | Payment received → reconciliation | EDI 820 inbound | Tally payment voucher | Amount matches, outstanding cleared |
| 7 | WhatsApp order → canonical order | WhatsApp webhook | FC canonical | Claude NLP extracts SKU, qty, date |
| 8 | CSV upload → inventory sync | CSV file | FC canonical inventory | Field mapping applied, stock levels updated |
| 9 | Multi-buyer routing | Same factory, 3 buyers | EDI/Ariba/Coupa | Correct adapter per buyer |
| 10 | Idempotency test | Duplicate PO submission | Reject duplicate | Same idempotency key = no duplicate order |
| 11 | CBAM carbon report | Factory dispatch to EU | CBAM XML report | Scope 1+2 emissions per product |

---

*Document version: 1.0 — April 2026*
*FactoryConnect Test Data Reference*
