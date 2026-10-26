# Stenar servis

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev
```

Development server: http://localhost:3000

```sh
npm run build
```

Production files are generated in `dist/spa`.

## Structured inspection reports

Admins open **Meritve pregleda** or **Uvoz pregleda iz Excela** under an order's saved equipment. The Excel importer previews fixed-template readings and equipment differences before saving. Results include porosity, condition scores, line-deviation charts and colored matrices. The editor supports keyboard-style laser readings (Enter/Tab, traversal direction, mm/cm/m and batch paste). Saved inspections can generate a private PDF preview and attach it to the existing service documents.

The [workbook audit](docs/inspection-workbook-audit.html) documents the 41 sheets, formulas, source inconsistencies, import contract and rendering limits.

Before deploying the frontend, apply the repeatable backend `conf/servis-upgrade-2026-10-26-inspections.sql`, then deploy `controllers/class.servis.php` and the entire `conf/inspection/` directory. Fresh definitions are in `conf/schema.sql`. The upgrade adds three inspection tables and `certification`/`manufactured` to existing equipment; it does not change customer identity.

PDF rendering requires `libreoffice-calc`, Roboto fonts, the supplied Roboto Slab fonts installed for the backend process, PHP ZIP/DOM/GD, enabled `proc_open`, and a writable private temporary directory. The default executable is `/usr/bin/libreoffice`; `SERVIS_LIBREOFFICE` may override it. Allow 90 seconds for PDF requests and at least 14 MB request bodies for base64 Excel/PDF uploads. Keep the template/source files private. Deploying only the SPA does not enable these endpoints.

The original workbook contains no saved print areas or macro/trigger source. PDF artwork and formulas come from the workbook; exact parity with the technician's Excel/Google Sheets PDF export still needs that reference export. Physical laser integration and future PDF data import are not claimed as tested. PDF import provenance columns are ready for the later report samples.
