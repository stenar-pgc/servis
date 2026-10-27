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

Admins open **Meritve pregleda** or **Uvoz pregleda iz Excela** under an order’s saved **Jadralno padalo** equipment. Reserves open their own inspection/repacking checklist and SL/EN/DE certificate. Harnesses and other gear open a general service record and their existing report documents. The Excel importer previews fixed-template readings and equipment differences before saving. Results include porosity, condition scores, line-deviation charts and colored matrices. The editor supports keyboard-style laser readings (Enter/Tab, traversal direction, mm/cm/m and batch paste). Saved inspections can generate a private PDF preview and attach it to the existing service documents.

Existing reserve PDFs can supply draft certificate fields through the PHP `smalot/pdfparser` Composer dependency. Saving preserves source evidence; merely opening a report writes nothing. Deploy the updated Composer files and run `composer install --no-dev` to enable extraction.

The workbook audit is stored in the backend `conf/inspection/audit.json`. The [renderer notes](docs/inspection-rendering.md) describe the recreated layouts and PDF dependencies.

Before deploying the frontend, apply the repeatable backend `conf/servis-upgrade-2026-10-26-inspections.sql`, then deploy `controllers/class.servis.php` and the entire `conf/inspection/` directory. Fresh definitions are in `conf/schema.sql`. The upgrade adds three inspection tables and `certification`/`manufactured` to existing equipment; it does not change customer identity.

PDF rendering runs entirely in PHP. Run `composer install --no-dev` on the backend if its existing TCPDF dependency is not installed, then deploy `controllers/class.servis.php` together with `conf/inspection/`. TCPDF draws the reconstructed layout and embeds the bundled fonts. The application’s small PHP formula interpreter calculates trusted definitions held in JSON. Rendering never opens an Excel workbook, starts a process or uses LibreOffice. The deterministic Excel importer still reads uploaded XLSX files. Existing PHP ZIP/DOM/GD/mbstring extensions are used; Composer checks the complete requirements.

The HTML results view uses a responsive web layout for porosity, ratings, charts and measurement matrices. The PHP-generated PDF independently recreates the workbook’s print layout, artwork and typography. Input remains under Vnos meritev. Allow at least 14 MB request bodies for encoded Excel/PDF uploads. Deploying only the SPA does not update the backend renderer.

The original workbook contains no saved print areas or macro/trigger source. The code recreates its artwork, text, geometry and charts; an authoritative technician export remains useful for comparing printer-specific typography and pagination. Physical laser connectivity remains untested. Recognized reserve PDF certificates already supply draft fields with source evidence; other PDF families remain available as documents until their field mappings are implemented.
