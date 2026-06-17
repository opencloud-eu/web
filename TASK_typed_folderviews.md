# TASK: Typed Folder Views (Aktenplan)

## Ziel

Hierarchisch typisierte Ordneransichten für OpenCloud — ein Ordner hat einen Typ (xattr `user.oc.md.type`), der bestimmt welche Kinder erlaubt sind, welche Spalten angezeigt werden und welche Aktionen verfügbar sind. Typ-Konfigurationen liegen als JSON im Space-Root unter `.space/views/<type>.json`.

## Referenz

- xx1.png: WINYARD DMS Baumansicht + Register-Dialog (Typ-Auswahl, Aktenzeichen)
- xx2.png: Kontextmenü "Neu" mit typspezifischen Kind-Elementen (AK4-Typen)

## Architektur

### Datenmodell

**Typ-xattr auf jedem Ordner:**
```
user.oc.md.type = "akte" | "register" | "vorgang" | "sachgruppe" | ...
```

**Typ-Konfiguration im Space-Root:**
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

### Space-Typ

Der `type` auf dem Space-Root (`.space`) ist der Einstieg. Wenn kein `type` gesetzt ist, wird der **normale OpenCloud FolderView** verwendet — kein Typed View, kein Schema-Lookup. Nur Spaces mit explizitem Typ aktivieren das Typed-View-System.

Bestehende Spaces sind nicht betroffen. Erst wenn ein Admin den Space-Root typisiert (z.B. `type=aktenplan`), schaltet der Space in den Typed-View-Modus um.

### Typ-Liste und Typ-Verwaltung

**Verfügbare Typen** eines Space ergeben sich aus den Dateinamen in `.space/views/`:
- PROPFIND auf `.space/views/` → Dateiliste → `aktenplan.json` = Typ "aktenplan"
- Gecacht pro Space beim ersten Zugriff
- Manager kann Cache manuell refreshen (z.B. nach Upload neuer Type-JSONs)

**Typ setzen/ändern** (Manager+):
- Dropdown "Typ" in der Sidebar (FileDetails.vue) unterhalb Notice
- Zeigt nur Typen aus der Space-Typ-Liste
- Setzt `user.oc.md.type` via `PUT /metadata { "type": "akte" }`
- Nur für Nutzer mit globaler Rolle Manager/SpaceAdmin/Admin sichtbar

**Betroffene Dateien für Typ-Verwaltung:**
1. `useTypedFolderTypes.ts` (neu) — Lädt Typ-Liste per PROPFIND `.space/views/`, cacht pro Space, Refresh-Methode
2. `FileDetails.vue` — Dropdown "Typ" in Sidebar, nur für Manager+
3. `GenericSpace.vue` — Liest type, übergibt an Schema-Loader (existiert bereits)
4. `useTypedFolderActions.ts` — "Neuer [Kind-Typ]" nutzt Typ-Liste für Labels/Icons

**Keine Backend-Änderung nötig** — PROPFIND für Dateiliste und Metadata PUT existieren bereits.

### Flow

1. User öffnet Ordner → Metadata API liefert `type` (aus xattr)
2. FolderView prüft: Hat der **Space-Root** einen `type`?
3. Nein → **normaler FolderView**, keine weitere Prüfung
4. Ja → Prüfe `type` des aktuellen Ordners
5. Lade `.space/views/<type>.json` via WebDAV getFileContents (gecacht pro Space)
6. Render: Spalten aus `columns`, Actions aus `children`
7. "Neu"-Button bietet nur die in `children` definierten Typen an
8. Beim Anlegen: Ordner erstellen + `type` xattr setzen via Metadata PUT

### Skelett / Initialisierung

- Space-Root bekommt `type` beim Erstellen (z.B. `type=aktenplan`)
- Die `views/*.json` werden aus einer Vorlage kopiert (Template-Space oder manueller Upload)
- Alternative: Admin-Action "Aktenplan initialisieren" die die JSONs + Root-Typ anlegt
- Langfristig: Schema-Editor im UI

### Deployment

Typed FolderView Handler werden unter `views/` abgelegt (neben `core/` und `apps/`):
```
/var/lib/opencloud/web/assets/
  core/          ← OpenCloud Web Runtime
  apps/          ← Web Extensions (htmlviewer, etc.)
  views/         ← Typed FolderView Handler
    aktenplan/
      manifest.json
      remoteEntry.mjs
```

Jeder View-Handler ist eine Module Federation Extension die sich am Extension Point `app.files.folder-views.special-typed` registriert.

### Generischer vs. Spezifischer Handler

- **Generischer Handler**: Interpretiert `<type>.json` und rendert Spalten/Actions dynamisch. Reicht für 80% der Fälle.
- **Spezifischer Handler**: Eigene Vue-Komponente pro Typ für Sonderfälle (z.B. Aktenzeichen-Generator, Formular-Ansicht).
- Fallback: Generischer Handler wenn kein spezifischer gefunden.

## Implementierung (Schritte)

### Phase 1: Grundgerüst ✅
1. ~~Schema-Loader Composable: `useTypedFolderSchema(space, type)` → lädt + cacht `.space/views/<type>.json`~~
2. ~~Typed Actions Composable: `useTypedFolderActions` → erstellt Kind-Ordner mit type-xattr~~
3. ~~Integration in GenericSpace.vue: type aus Metadata API laden~~
4. ~~Typ-Definitionen: `TypedFolderSchema`, `TypedFieldDef`~~

### Phase 1b: Typ-Verwaltung (aktuell)
5. `useTypedFolderTypes` — Typ-Liste per PROPFIND `.space/views/` laden + cachen
6. Sidebar Dropdown "Typ" in FileDetails.vue (Manager+)
7. Typ setzen via Metadata PUT
8. Cache-Refresh für Manager

### Phase 2: Rendering
9. Typed FolderView Komponente: rendert Spalten basierend auf Schema `columns`
10. "Neues [Kind-Typ]" Dialog mit Name-Input + Typ-Auswahl
11. Aktenzeichen-Generierung: `namePattern` aus Schema, Sequenz-Counter per xattr am Parent
12. Typ-spezifische Metadaten: Sidebar zeigt `metadata`-Felder aus Schema

### Phase 3: Views-Deployment
13. View-Handler als Module Federation Extension unter `views/`
14. Extension Point für typed views
15. Admin-UI: Schema-Editor (JSON) für `.space/views/`

### Phase 4: Baumansicht
16. Treeview-Sidebar (siehe TASK_treeview.md)
17. Navigation via Baumstruktur
18. Breadcrumb zeigt Aktenzeichen-Pfad

## Offene Fragen

- **Performance**: Schema-Cache pro Space — invalidieren per etag auf `.space/views/`?
- **Rechte**: Wer darf `.space/views/` editieren? → Space-Manager (reguläre Datei-Permissions)
- **Vererbung**: Soll ein Sub-Space das Schema vom Parent erben?
- **Migration**: Bestehende Ordner typisieren → Batch-Script das type-xattr setzt
- **PROPFIND für type**: Namespace-Problematik (wie bei notice) → type über Metadata API laden (aktueller Ansatz)
- **Typ löschen**: Was passiert wenn ein Typ entfernt wird aber Ordner ihn noch haben? → Fallback auf normalen View

## Abhängigkeiten

- Metadata API GET+PUT (opencloud#2960) — zum Setzen/Lesen von `type` xattr
- Module Federation Extension SDK 7.x für View-Handler Deployment
- Globale Manager-Rolle mit `Drives.ManageImmutable` für Typ-Verwaltungs-Berechtigung
