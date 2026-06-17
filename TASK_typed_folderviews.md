# TASK: Typed Folder Views (Aktenplan)

## Ziel

Hierarchisch typisierte Ordneransichten für OpenCloud. Jeder Ordner kann einen Typ tragen,
der bestimmt welche Kinder erlaubt sind, welche Spalten angezeigt werden und welche Aktionen
verfügbar sind. Die Typisierung muss auch ohne WebDAV/API funktionieren — z.B. bei nativem
Dateisystemzugriff (NFS, SMB, lokaler Mount).

## Referenz

- xx1.png: WINYARD DMS Baumansicht + Register-Dialog (Typ-Auswahl, Aktenzeichen)
- xx2.png: Kontextmenü "Neu" mit typspezifischen Kind-Elementen (AK4-Typen)

## Architektur

### Typ-Marker: `.type_<name>` Datei

**Statt xattr** wird der Typ über eine versteckte Marker-Datei im Ordner signalisiert:

```
11.12.01 Kommunalverwaltung/
  .type_akte              ← leere Datei, markiert Ordner als Typ "akte"
  11.12.01.03-01/
    .type_vorgang
    Bescheid.pdf
    Antrag.docx
  11.12.01.03-02/
    .type_vorgang
    ...
```

**Vorteile gegenüber xattr:**
- **Nativ sichtbar**: Jeder Dateisystem-Client (NFS, SMB, Explorer, Finder) sieht den Typ
- **Kein API nötig**: Desktop-Client kann Typ erkennen ohne WebDAV/Graph-API
- **Einfach zu setzen**: `touch .type_akte` — kein spezielles Tool nötig
- **Backup-sicher**: Typ überlebt jeden Backup/Restore-Vorgang (xattrs oft nicht)
- **Grep-bar**: `find . -name ".type_*"` zeigt die gesamte Typ-Hierarchie

**Konvention:**
- Genau eine `.type_*` Datei pro Ordner (die erste gefundene zählt)
- Keine `.type_*` = untypisierter Ordner → normaler FolderView
- Die Datei ist leer (0 Bytes) oder kann optionale JSON-Daten enthalten (Overrides)

### Typ-Schema im Space-Root

```
.space/
  views/
    aktenplan.json     ← Root-Typ des Space
    sachgruppe.json
    akte.json
    register.json
    vorgang.json
```

**Format `<type>.json`:**
```json
{
  "label": "Akte",
  "icon": "folder-archive",
  "children": ["register", "vorgang"],
  "columns": ["name", "aktz", "version", "status", "abgelegt-von", "abgelegt-am"],
  "namePattern": "{parentAktz}-{seq}",
  "actions": ["neues-register", "neuer-vorgang", "dokument-hinzufuegen"],
  "metadata": {
    "aktz": { "label": "Aktenzeichen", "type": "string", "auto": true },
    "status": { "label": "Status", "type": "enum", "values": ["offen", "gespeichert", "geschlossen"] }
  }
}
```

### `.special/` für individuelle Ordner-Anpassungen

`.type_*` definiert die **Klasse** des Ordners (gleicher Typ = gleiches Verhalten).
`.special/` bleibt für **individuelle** Anpassungen pro Ordner:

```
11.12.01 Kommunalverwaltung/
  .type_sachgruppe
  .special/
    icon.svg              ← individuelles Icon für diesen Ordner
    view.json             ← Override: andere Spalten, andere Actions
    data.json             ← ordnerspezifische Hilfsdaten
```

`.special/` ist optional und selten. Die meisten Ordner brauchen nur `.type_*`.

### Space-Typ

Der Space-Root hat ebenfalls eine `.type_*` Datei (z.B. `.type_aktenplan`).
**Wenn keine `.type_*` im Space-Root** → normaler OpenCloud FolderView, kein Typed-View-System.
Bestehende Spaces sind nicht betroffen — Opt-in pro Space.

### Typ-Erkennung im Web UI

Der Typ wird aus der **PROPFIND-Dateiliste** erkannt — kein zusätzlicher API-Call:

1. PROPFIND liefert alle Kinder des Ordners (wie bisher)
2. Client sucht in der Liste nach `.type_*` Einträgen
3. Gefunden → `type = name.substring(6)` (nach `.type_`)
4. Lade `.space/views/<type>.json` (gecacht pro Space)
5. Render: Spalten, Actions, Kind-Typen

**Kein Performance-Impact** — die `.type_*` Datei kommt im normalen Listing mit.

### Typ-Erkennung für nativen Desktop-Client

Ein nativer Desktop-Client (z.B. erweiterter Dateimanager) kann:
1. Ordner öffnen → `.type_akte` sehen → Typ erkannt
2. Space-Root `.space/views/akte.json` lesen → Schema bekannt
3. "Neuer Vorgang" anbieten → Ordner erstellen + `touch .type_vorgang`
4. Spalten/Metadaten anzeigen basierend auf Schema

### Typ setzen/ändern

**Im Web UI** (Manager+):
- Sidebar Dropdown "Typ" → zeigt verfügbare Typen aus `.space/views/`
- Setzt Typ: alte `.type_*` löschen + neue `.type_<typ>` erstellen
- Kein Typ: `.type_*` löschen → normaler FolderView

**Nativ / CLI:**
```bash
rm .type_*; touch .type_vorgang
```

**Beim Anlegen neuer Ordner:**
- "Neuer [Kind-Typ]" Action erstellt Ordner + `.type_<typ>` in einem Schritt

### Flow (Web UI)

1. User öffnet Ordner → PROPFIND liefert Kinder
2. Client prüft: Gibt es `.type_*` in der Liste?
3. Nein → normaler FolderView
4. Ja → Typ extrahieren, `.space/views/<type>.json` laden (Cache)
5. Render: Spalten aus `columns`, Actions aus `children`
6. "Neu"-Button bietet nur die in `children` definierten Typen an
7. Beim Anlegen: Ordner erstellen + `.type_<kind>` anlegen

### Skelett / Initialisierung

- Space-Root bekommt `.type_aktenplan` + `.space/views/*.json` aus Vorlage
- Admin-Action "Aktenplan initialisieren" oder Template-Space
- Langfristig: Schema-Editor im UI

### Deployment

Typed FolderView Handler unter `views/` (neben `core/` und `apps/`):
```
/var/lib/opencloud/web/assets/
  core/          ← OpenCloud Web Runtime
  apps/          ← Web Extensions (htmlviewer, etc.)
  views/         ← Typed FolderView Handler
    aktenplan/
      manifest.json
      remoteEntry.mjs
```

### Generischer vs. Spezifischer Handler

- **Generischer Handler**: Interpretiert `<type>.json` dynamisch. Reicht für 80% der Fälle.
- **Spezifischer Handler**: Eigene Vue-Komponente für Sonderfälle (z.B. Aktenzeichen-Generator).
- Fallback: Generischer Handler wenn kein spezifischer gefunden.

## Implementierung (Schritte)

### Phase 1: Grundgerüst ✅ (teilweise, muss auf .type_ umgestellt werden)
1. ~~Schema-Loader: `useTypedFolderSchema(space, type)` → lädt + cacht `.space/views/<type>.json`~~
2. ~~Typed Actions: `useTypedFolderActions` → erstellt Kind-Ordner~~ (muss `.type_` statt xattr setzen)
3. ~~GenericSpace.vue Integration~~ (muss von Metadata API auf PROPFIND-Dateiliste umgestellt werden)
4. ~~Typ-Definitionen~~

### Phase 1b: Umstellung auf .type_ (aktuell)
5. Typ-Erkennung aus PROPFIND-Dateiliste statt Metadata API
6. `useTypedFolderTypes` — Typ-Liste per PROPFIND `.space/views/` laden
7. Sidebar Dropdown "Typ" → löscht/erstellt `.type_*` Dateien
8. "Neuer [Kind-Typ]" Action → erstellt Ordner + `.type_<kind>`

### Phase 2: Rendering
9. Typed FolderView Komponente: Spalten aus Schema
10. "Neues [Kind-Typ]" Dialog
11. Aktenzeichen-Generierung: `namePattern` + Sequenz-Counter
12. Typ-spezifische Metadaten in Sidebar

### Phase 3: Views-Deployment
13. Module Federation Extension Handler unter `views/`
14. Extension Point für typed views
15. Admin-UI: Schema-Editor für `.space/views/`

### Phase 4: Baumansicht
16. Treeview-Sidebar
17. Navigation via Baumstruktur
18. Breadcrumb mit Aktenzeichen-Pfad

## Offene Fragen

- **Performance**: `.type_*` kommt im Listing gratis mit — kein Extra-Call
- **Schema-Cache**: Invalidieren per etag auf `.space/views/`?
- **Rechte**: `.space/views/` editieren → Space-Manager
- **Vererbung**: Sub-Space Schema vom Parent erben?
- **Migration**: Bestehende Ordner typisieren → `find . -type d -exec touch {}/.type_default \;`
- **Kollision**: Mehrere `.type_*` im gleichen Ordner? → erste Datei zählt, Warning loggen
- **Versteckte Dateien**: `.type_*` wird im normalen UI ausgeblendet (wie `.space/`)

## Abhängigkeiten

- WebDAV createFile / deleteFile für `.type_*` Management
- Metadata API GET+PUT (opencloud#2960) für typ-spezifische Metadaten
- Module Federation Extension SDK 7.x für View-Handler
