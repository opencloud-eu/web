# Aktenplan — Typen, Schutz und FolderViews

## Hierarchie

```
Space (Typ: aktenplan)
└── Aktenplan-Ebenen (protected, beliebig tief verschachtelt)
    └── Aktenschrank (shielded = letztes Blatt des Aktenplans)
        └── Akte (der "Leitzordner")
            ├── Variante leer: Dokumente direkt in der Akte
            ├── Variante thematisiert: Vorgang → Dokumente
            └── Variante voll: Vorgang → Register → Dokumente
```

## Typen (4 Stück, je ein FolderView)

| Typ | `.type_` | FolderView | Kinder | Schutz |
|-----|----------|-----------|--------|--------|
| **Aktenplan** | `.type_aktenplan` | Sachgruppen-Listing | Bei protected: aktenplan. Bei shielded: akte | protected / shielded |
| **Akte** | `.type_akte` | Akten-Ansicht | vorgang, dokument | — |
| **Vorgang** | `.type_vorgang` | Vorgangs-Ansicht | register, dokument | — |
| **Register** | `.type_register` | Register-Ansicht | dokument | — |

### Aktenplan: Zwei Modi über immutableState

Gleicher Typ `.type_aktenplan`, unterschiedliches Verhalten je nach Schutzstatus:

| immutableState | Bedeutung | Erlaubte Kinder | Actions |
|---------------|-----------|----------------|---------|
| `protected` | Sachgruppe (Struktur fixiert) | aktenplan (nur Manager) | "Neue Sachgruppe" (Manager) |
| `shielded` | Aktenschrank (letztes Blatt) | akte | "Neue Akte" (Editor+) |
| keiner | Ungeschützter Aktenplan-Ordner | aktenplan, akte | "Neue Sachgruppe", "Neue Akte" |

## Aktencode-Syntax

Jeder Ordnername: **`<Aktencode> <Titel>`**

```
Ebene           Code             Trennzeichen    Beispiel
─────────────────────────────────────────────────────────────
Sachgruppe 1    11               (Startcode)     11 Innere Verwaltung
Sachgruppe 2    11.12            . (Punkt)       11.12 Kommunalverwaltung
Sachgruppe n    11.12.01         . (Punkt)       11.12.01 Organisationsang.
Aktenschrank    11.12.01.03      . (Punkt)       11.12.01.03 Satzungen
Akte            11.12.01.03-01   - (Bindestrich) 11.12.01.03-01 Entschädigungssatzung
Vorgang         11.12.01.03-01/1 / (Schrägstrich) 11.12.01.03-01/1 Fassung 2016
Register        11.12.01.03-01/1#1 # (Raute)    11.12.01.03-01/1#1 Vorlagen
```

## FolderViews und Schema-Dateien

Jeder Typ hat eine Schema-Datei unter `.space/views/` und einen zugehörigen FolderView.

### .space/views/aktenplan.json
```json
{
  "label": "Aktenplan",
  "icon": "archive",
  "children": {
    "protected": ["aktenplan"],
    "shielded": ["akte"],
    "default": ["aktenplan", "akte"]
  },
  "columns": ["name", "aktencode", "typ", "anzahl"],
  "namePattern": "{parentCode}.{seq:2} {title}",
  "metadata": {
    "aktencode": { "label": "Aktencode", "type": "string", "auto": true }
  }
}
```

**FolderView Aktenplan** zeigt:
- Spalten: Name, Aktencode, Untertyp (Sachgruppe/Aktenschrank), Anzahl Kinder
- Action-Button: "Neue Sachgruppe" (wenn protected, nur Manager) oder "Neue Akte" (wenn shielded)
- Icon: Ordner mit Schild (protected) oder offener Ordner (shielded)

### .space/views/akte.json
```json
{
  "label": "Akte",
  "icon": "folder-open",
  "children": ["vorgang"],
  "columns": ["name", "aktencode", "status", "abgelegt-von", "abgelegt-am"],
  "namePattern": "{parentCode}-{seq:2} {title}",
  "metadata": {
    "aktencode": { "label": "Aktenzeichen", "type": "string", "auto": true },
    "status": {
      "label": "Status", "type": "enum",
      "values": ["offen", "gespeichert", "geschlossen"],
      "default": "offen"
    }
  }
}
```

**FolderView Akte** zeigt:
- Spalten: Name, Aktenzeichen, Status, abgelegt von/am
- Action-Button: "Neuer Vorgang", "Dokument hinzufügen"
- Status-Badge (offen/gespeichert/geschlossen)

### .space/views/vorgang.json
```json
{
  "label": "Vorgang",
  "icon": "file-list",
  "children": ["register"],
  "columns": ["name", "aktencode", "version", "abgelegt-von", "abgelegt-am"],
  "namePattern": "{parentCode}/{seq} {title}",
  "metadata": {
    "aktencode": { "label": "Aktenzeichen", "type": "string", "auto": true },
    "version": { "label": "Version", "type": "string" }
  }
}
```

**FolderView Vorgang** zeigt:
- Spalten: Name, Aktenzeichen, Version, abgelegt von/am
- Action-Button: "Neues Register", "Dokument hinzufügen"

### .space/views/register.json
```json
{
  "label": "Register",
  "icon": "bookmark",
  "children": [],
  "columns": ["name", "aktencode", "abgelegt-von", "abgelegt-am"],
  "namePattern": "{parentCode}#{seq} {title}",
  "metadata": {
    "aktencode": { "label": "Aktenzeichen", "type": "string", "auto": true }
  }
}
```

**FolderView Register** zeigt:
- Spalten: Name, Aktenzeichen, abgelegt von/am
- Action-Button: "Dokument hinzufügen" (kein weiterer Ordner-Typ)

## Action-Buttons

Jeder FolderView hat typ-spezifische Action-Buttons im AppBar:

```
┌─────────────────────────────────────────────────────────┐
│  ← 11.12.01.03 Satzungen                               │
│                                                         │
│  [+ Neue Akte]                          Filter  Ansicht │
│                                                         │
│  Name                    Aktenzeichen   Status    Datum  │
│  ─────────────────────────────────────────────────────── │
│  📁 11.12.01.03-01 Entschädigungssatzung  offen  ...   │
│  📁 11.12.01.03-02 Feuerwehrsatzung      gesp.  ...   │
└─────────────────────────────────────────────────────────┘
```

### Action-Button Logik

1. FolderView liest `children` aus Schema
2. Für jeden erlaubten Kind-Typ: lade dessen Schema (Label, Icon)
3. Zeige Action-Button: "Neue(r/s) {label}"
4. Click → Dialog: Titel eingeben → Aktencode wird automatisch generiert
5. Erstellt: Ordner + `.type_<kind>` + initiale Metadaten

### Aktencode-Generierung im Dialog

```
┌─────────────────────────────────────────┐
│  Neue Akte anlegen                      │
│                                         │
│  Aktenzeichen: 11.12.01.03-03           │
│  (automatisch, nächste freie Nummer)    │
│                                         │
│  Titel: [Brandverhütungsschauordnung ]  │
│                                         │
│  Ordnername: 11.12.01.03-03 Brandver... │
│                                         │
│            [Abbrechen]  [Anlegen]        │
└─────────────────────────────────────────┘
```

## Beispiel: Komplette Struktur

```
Archikart DMS/                                              .type_aktenplan
├── .space/views/{aktenplan,akte,vorgang,register}.json
├── 11 Innere Verwaltung/                                   .type_aktenplan  protected
│   ├── 11.12 Kommunalverwaltung/                           .type_aktenplan  protected
│   │   ├── 11.12.01 Organisationsangelegenheiten/          .type_aktenplan  protected
│   │   │   ├── 11.12.01.03 Satzungen/                     .type_aktenplan  shielded (Aktenschrank)
│   │   │   │   ├── 11.12.01.03-01 Entschädigungssatzung/  .type_akte
│   │   │   │   │   ├── 11.12.01.03-01/1 Fassung 2016/     .type_vorgang
│   │   │   │   │   │   ├── 11.12.01.03-01/1#1 Vorlagen/   .type_register
│   │   │   │   │   │   │   ├── Vergleich_A.pdf
│   │   │   │   │   │   │   └── Arbeitshilfe.docx
│   │   │   │   │   │   └── Beschluss.pdf
│   │   │   │   │   └── 11.12.01.03-01/2 Fassung 2026/     .type_vorgang
│   │   │   │   └── 11.12.01.03-02 Feuerwehrsatzung/       .type_akte
│   │   │   └── 11.12.01.05 Landratsamt/                   .type_aktenplan  shielded
│   │   └── 11.12.02 Personalangelegenheiten/               .type_aktenplan  protected
│   └── 11.13 Finanzverwaltung/                             .type_aktenplan  protected
├── 12 Sicherheit und Ordnung/                              .type_aktenplan  protected
└── 21 Schulträgeraufgaben/                                 .type_aktenplan  protected
```

## Implementierung

### Pro Typ ein FolderView

Jeder der 4 Typen bekommt eine eigene Vue-Komponente:

```
packages/web-app-files/src/components/TypedViews/
  AktenplanView.vue      ← Sachgruppen/Aktenschrank-Listing
  AkteView.vue           ← Akten-Ansicht mit Status
  VorgangView.vue        ← Vorgangs-Listing mit Version
  RegisterView.vue       ← Register-Listing (Blatt-Ebene)
  TypedNewDialog.vue     ← "Neuer [Typ]" Dialog mit Aktencode-Generator
```

### Integration in GenericSpace.vue

```
PROPFIND → Kinder-Liste
  │
  ├── .type_* gefunden?
  │   ├── Nein → Standard FolderView
  │   └── Ja → Typ erkennen
  │           ├── immutableState prüfen (protected/shielded)
  │           ├── Schema laden (.space/views/<typ>.json)
  │           └── Typed FolderView rendern
  │               ├── Typ-spezifische Spalten
  │               ├── Typ-spezifische Action-Buttons
  │               └── Typ-spezifisches Icon/Styling
```
