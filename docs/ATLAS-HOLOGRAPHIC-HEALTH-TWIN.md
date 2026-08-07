# ATLAS Holographic Health Twin

## Purpose

A functional, safety-bounded digital-twin module that combines:

- a user-controlled holographic avatar;
- age, height, weight and optional anthropometric context;
- body-scan sessions from manual, LiDAR, optical or multicamera sources;
- vital-sign ingestion from manual entry, the Bluetooth Heart Rate GATT service, or a Web Serial gateway;
- test-specific results emitted by compatible in-vitro diagnostic (IVD) analyzers or cartridges;
- longitudinal trends, provenance, quality-control status, audit history and JSON export.

The active product mode is **wellness and longitudinal tracking**. Automatic diagnosis is intentionally disabled. Clinical claims require a defined intended use, validated hardware, clinical evidence, regulatory review, quality management, cybersecurity controls and human professional review.

## Local MVP

Open `atlas-holographic-health-twin.html` through the ATLAS local server. Data is stored in browser `localStorage`; do not enter real patient data in this prototype.

## Serial gateway contract

The page listens for newline-delimited JSON at 115200 baud. A gateway can send one or more fields per line.

### Vital signs

```json
{"source":"Approved monitor gateway","heartRate":72,"spo2":98,"systolic":118,"diastolic":76,"temperature":36.8,"respiratoryRate":16}
```

### Analyzer result

```json
{"source":"Authorized IVD gateway","analyzer":"Manufacturer model","assay":"Cartridge name","analyte":"Glucose","value":96,"unit":"mg/dL"}
```

ATLAS must not invent reference ranges. Reference intervals, specimen requirements, limitations, calibration and quality-control rules must come from the authorized laboratory, analyzer manufacturer and applicable protocol.

## Production requirements

1. Patient identity matching and consent by data category.
2. Encrypted transport and storage; organization and user isolation.
3. Device registry with manufacturer, model, serial number, firmware, calibration and authorization state.
4. Test catalog with assay identifier, specimen type, lot, expiration, QC, units and approved reference interval.
5. Immutable audit trail and algorithm-version traceability.
6. FHIR/HL7 integration where contractually and technically supported.
7. Clinical review workflow and escalation rules.
8. Validation against reference methods before any health or diagnostic claim.
9. Regulatory, CLIA and state-specific assessment before testing human specimens.
10. De-identification and explicit prohibition on unauthorized biometric reuse.
