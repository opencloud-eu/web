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

### Flow

1. User öffnet Ordner → PROPFIND liefert `type` (aus xattr, via DavProperty)
2. FolderView prüft: Hat der Ordner einen `type`?
3. Ja → Lade `.space/views/<type>.json` via WebDAV getFileContents (gecacht pro Space)
4. Render: Spalten aus `columns`, Actions aus `children`
5. "Neu"-Button bietet nur die in `children` definierten Typen an
6. Beim Anlegen: Ordner erstellen + `type` xattr setzen via Metadata PUT

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

### Phase 1: Grundgerüst
1. `DavProperty.FolderType` → xattr `user.oc.md.type` via PROPFIND
2. Schema-Loader Composable: `useTypedFolderSchema(space, type)` → lädt + cacht `.space/views/<type>.json`
3. Typed FolderView Komponente: rendert Spalten + "Neu"-Actions basierend auf Schema
4. Integration in GenericSpace.vue: wenn `type` vorhanden → Typed View statt Default

### Phase 2: Aktionen
5. "Neues [Kind-Typ]" Action: Erstellt Ordner + setzt `type` xattr
6. Aktenzeichen-Generierung: `namePattern` aus Schema, Sequenz-Counter per xattr am Parent
7. Typ-spezifische Metadaten: Sidebar zeigt `metadata`-Felder aus Schema

### Phase 3: Views-Deployment
8. View-Handler als Module Federation Extension unter `views/`
9. Extension Point für typed views
10. Admin-UI: Schema-Editor (JSON) für `.space/views/`

### Phase 4: Baumansicht
11. Treeview-Sidebar (siehe TASK_treeview.md)
12. Navigation via Baumstruktur
13. Breadcrumb zeigt Aktenzeichen-Pfad

## Offene Fragen

- **Performance**: Schema-Cache pro Space — wie invalidieren? (etag auf .space/views/ ?)
- **Rechte**: Wer darf `.space/views/` editieren? → Space-Manager
- **Vererbung**: Soll ein Sub-Space das Schema vom Parent erben?
- **Migration**: Bestehende Ordner typisieren → Batch-Script das type-xattr setzt
- **PROPFIND für type**: Gleiche Namespace-Problematik wie bei notice — type über Metadata API laden oder PROPFIND fixen?

## Abhängigkeiten

- Metadata API GET+PUT (opencloud#2960) — zum Setzen von `type` xattr
- DavProperty für `type` im PROPFIND (oder Metadata API Fallback)
- Module Federation Extension SDK 7.x für View-Handler Deployment
