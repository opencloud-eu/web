# FolderViewPlus — Architektur

## Übersicht

FolderViewPlus erweitert OpenCloud Web um **typisierte Ordneransichten**. Ordner bekommen
einen Typ der bestimmt: welche Kinder erlaubt sind, welche Spalten angezeigt werden,
welche Aktionen verfügbar sind und welche Metadaten gepflegt werden.

Designed für **DMS/Aktenplan-Szenarien** (z.B. WINYARD/Archikart), aber generisch nutzbar
für jede hierarchische Strukturierung.

## Kernprinzip: Dateisystem-native Typisierung

```
Projekt-Space/
├── .type_aktenplan                    ← Space-Root ist ein Aktenplan
├── .space/
│   └── views/
│       ├── aktenplan.json             ← Schema: was darf auf Root-Ebene?
│       ├── sachgruppe.json
│       ├── akte.json
│       ├── register.json
│       └── vorgang.json
├── 11 Innere Verwaltung/
│   ├── .type_sachgruppe
│   └── 11.12 Kommunalverwaltung/
│       ├── .type_sachgruppe
│       └── 11.12.01.03 Satzungen/
│           ├── .type_akte
│           ├── 11.12.01.03-01/
│           │   ├── .type_vorgang
│           │   ├── Bescheid.pdf
│           │   └── Antrag.docx
│           └── 11.12.01.03-02/
│               ├── .type_vorgang
│               └── Entwurf.odt
└── 12 Sicherheit und Ordnung/
    └── .type_sachgruppe
```

### Warum `.type_*` statt xattr?

| Kriterium | xattr | .type_ Datei |
|-----------|-------|-------------|
| Nativ sichtbar | Nein (braucht getfattr) | Ja (ls -a) |
| NFS/SMB kompatibel | Teilweise (Attribut-Support variiert) | Ja |
| Desktop-Client | Braucht spezielle API | Sieht Datei direkt |
| Backup-sicher | Oft verloren | Immer dabei |
| CLI-Zugriff | `getfattr -n user.oc.md.type` | `ls .type_*` |
| Setzen | `setfattr` oder API | `touch .type_akte` |
| Suche | Nicht durchsuchbar | `find . -name ".type_*"` |
| Performance | Extra xattr-Read | Kommt im PROPFIND-Listing gratis mit |

## Schichten

```
┌─────────────────────────────────────────────────────────┐
│  FolderView Handler (generisch oder spezifisch)         │
│  → rendert Spalten, Actions, Metadaten pro Typ          │
├─────────────────────────────────────────────────────────┤
│  Schema-Loader (useTypedFolderSchema)                   │
│  → lädt .space/views/<type>.json, cacht pro Space       │
├─────────────────────────────────────────────────────────┤
│  Typ-Erkennung (useTypedFolderDetect)                   │
│  → erkennt .type_* in PROPFIND-Listing                  │
├─────────────────────────────────────────────────────────┤
│  GenericSpace.vue                                       │
│  → entscheidet: normaler View oder Typed View           │
├─────────────────────────────────────────────────────────┤
│  OpenCloud Web Runtime                                  │
│  → PROPFIND, Extension Points, Module Federation        │
└─────────────────────────────────────────────────────────┘
```

## Schema (`<type>.json`)

Jeder Typ wird durch eine JSON-Datei in `.space/views/` beschrieben:

```json
{
  "label": "Akte",
  "icon": "folder-archive",
  "children": ["register", "vorgang"],
  "columns": [
    { "key": "name", "label": "Name" },
    { "key": "aktz", "label": "Aktenzeichen", "source": "metadata" },
    { "key": "version", "label": "Version", "source": "metadata" },
    { "key": "status", "label": "Status", "source": "metadata" },
    { "key": "mdate", "label": "Letzte Änderung" }
  ],
  "namePattern": "{parentAktz}-{seq}",
  "metadata": {
    "aktz": { "label": "Aktenzeichen", "type": "string", "auto": true },
    "status": {
      "label": "Status",
      "type": "enum",
      "values": ["offen", "gespeichert", "geschlossen"],
      "default": "offen"
    }
  }
}
```

### Felder

| Feld | Beschreibung |
|------|-------------|
| `label` | Anzeigename des Typs |
| `icon` | RemixIcon-Name für Ordner dieses Typs |
| `children` | Erlaubte Kind-Typen (für "Neu"-Button) |
| `columns` | Spalten in der Tabellenansicht |
| `namePattern` | Auto-Name bei Neuerstellung (optional) |
| `metadata` | Typ-spezifische Metadaten-Felder (in Sidebar editierbar) |

### Spalten-Source

- Kein `source` oder `source: "resource"` → Standard-Resource-Feld (name, mdate, size)
- `source: "metadata"` → Wert aus `user.oc.md.<key>` xattr (via Metadata API)
- `source: "type"` → Abgeleitet aus `.type_*` des Kindes

## Drei Ebenen der Anpassung

```
1. Typ-Schema (.space/views/<type>.json)
   → Gilt für ALLE Ordner dieses Typs im Space
   → Spalten, erlaubte Kinder, Metadaten-Felder

2. .special/ (pro Ordner, optional, selten)
   → Individuelle Anpassung EINES Ordners
   → Override-Spalten, eigenes Icon, Hilfsdaten

3. FolderView Handler (views/<handler>/)
   → Komplett eigene Render-Logik
   → Module Federation Extension
   → Für Spezialfälle (Aktenzeichen-Generator, Formular-View)
```

## Flow: Ordner öffnen

```
User klickt Ordner
    │
    ▼
PROPFIND (normal, wie bisher)
    │
    ▼
Kinder-Liste durchsuchen
    │
    ├── .type_* gefunden?
    │   │
    │   ├── Nein → Normaler FolderView (Standard OpenCloud)
    │   │
    │   └── Ja → Typ = Dateiname nach ".type_"
    │           │
    │           ▼
    │       .space/views/<typ>.json geladen? (Cache)
    │           │
    │           ├── Nein → Laden via WebDAV getFileContents
    │           │
    │           └── Ja → Schema anwenden
    │                   │
    │                   ▼
    │               Typed FolderView rendern
    │               - Spalten aus schema.columns
    │               - "Neu"-Button: schema.children
    │               - Icon: schema.icon
    │               - Metadaten: schema.metadata
    │
    └── .special/ gefunden?
            │
            ▼
        .special/view.json laden (Override)
```

## Flow: Neuen typisierten Ordner anlegen

```
User klickt "Neuer Vorgang"
    │
    ▼
Name-Dialog (ggf. auto aus namePattern)
    │
    ▼
WebDAV: createFolder("11.12.01.03-03")
    │
    ▼
WebDAV: putFileContents(".type_vorgang", "")     ← leere Datei
    │
    ▼
Optional: Metadata PUT für Initialwerte
    │
    ▼
Listing refresh → neuer Ordner mit Typ sichtbar
```

## Flow: Typ ändern (Manager)

```
Manager öffnet Sidebar → Dropdown "Typ"
    │
    ▼
Typ-Liste aus .space/views/ (gecacht)
    │
    ▼
Auswahl: "register"
    │
    ▼
WebDAV: deleteFile(".type_akte")       ← alten Marker löschen
WebDAV: putFileContents(".type_register", "")   ← neuen setzen
    │
    ▼
View aktualisiert sich (anderes Schema)
```

## Performance

- **Kein Extra-Call für Typ-Erkennung**: `.type_*` kommt im normalen PROPFIND-Listing mit
- **Schema-Cache pro Space**: `.space/views/*.json` wird einmal geladen, dann aus Memory
- **Lazy Schema-Load**: Nur der aktuelle Typ wird geladen, nicht alle
- **Cache-Invalidierung**: Per etag auf `.space/views/` oder manueller Refresh

## Dateien im Web-Repo

```
packages/web-app-files/src/
  composables/
    typedFolder/
      types.ts                      ← TypedFolderSchema, TypedFieldDef
      useTypedFolderSchema.ts       ← Schema laden + cachen
      useTypedFolderDetect.ts       ← .type_* aus Listing erkennen
      useTypedFolderTypes.ts        ← verfügbare Typen aus .space/views/
      useTypedFolderActions.ts      ← "Neuer [Kind-Typ]" + Typ setzen
      index.ts
  components/
    FilesList/
      TypedFolderView.vue           ← Generischer Typed View (Tabelle + Actions)
      TypedNewDialog.vue            ← "Neues [Kind]" Dialog
  views/
    spaces/
      GenericSpace.vue              ← Integration: Typ erkennen → View switchen
```

## Kompatibilität

- **Untypisierte Spaces**: Keine Änderung, normaler FolderView
- **Untypisierte Ordner in typisiertem Space**: Normaler View (kein `.type_*` = kein Typ)
- **Nativer Zugriff**: `.type_*` Dateien sind sichtbar, Schema lesbar aus `.space/views/`
- **Ältere Clients**: Ignorieren `.type_*` und `.space/` — keine Probleme
