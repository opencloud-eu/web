# Aktenplan — Typen und Struktur

## Hierarchie

```
Space (Typ: aktenplan)
└── Aktenplan (Sachgruppen, beliebig tief, protected)
    └── ... (weitere Sachgruppen, protected)
        └── Aktenschrank (letztes Blatt, shielded)
            └── Akte (der "Leitzordner")
                ├── Variante 1: leer (nur Dokumente direkt in der Akte)
                ├── Variante 2: thematisiert
                │   └── Vorgang → Dokumente
                └── Variante 3: voll
                    └── Vorgang → Register → Dokumente
```

## Typen

| Typ | `.type_` | Beschreibung | Kinder | Schutz |
|-----|----------|-------------|--------|--------|
| **Aktenplan** | `.type_aktenplan` | Sachgruppen-Hierarchie (beliebig tief), inkl. Aktenschrank als letztes Blatt | aktenplan, akte | protected (Aktenschrank: shielded) |
| **Akte** | `.type_akte` | Leitzordner | vorgang, dokument | — |
| **Vorgang** | `.type_vorgang` | Thematische Gruppierung | register, dokument | — |
| **Register** | `.type_register` | Feingliederung innerhalb eines Vorgangs | dokument | — |

Der **Aktenplan** ist ein einziger Typ für die gesamte Sachgruppen-Hierarchie. Der **Aktenschrank**
ist kein eigener Typ sondern das letzte Blatt des Aktenplans — er trägt ebenfalls `.type_aktenplan`,
ist aber `shielded` (geerbt) statt `protected`, weil darin Akten angelegt werden dürfen.

**Register ist optional** — eine Akte kann sein:
- **leer**: nur Dokumente direkt in der Akte
- **thematisiert**: Vorgänge mit Dokumenten
- **voll**: Vorgänge → Register → Dokumente

**Dokumente** liegen je nach Variante direkt unter Akte, Vorgang oder Register.

## Aktenplan und Schutz

Die gesamte Sachgruppen-Hierarchie ist ein einziger Typ `.type_aktenplan`. Die oberen
Ebenen sind `protected` (Struktur fixiert). Das letzte Blatt (Aktenschrank) ist `shielded`
(geerbt) — darin dürfen Akten angelegt werden:

```
11 Innere Verwaltung/                          ← .type_aktenplan, protected
├── 11.11 Verwaltungssteuerung/                ← .type_aktenplan, protected
├── 11.12 Kommunalverwaltung/                  ← .type_aktenplan, protected
│   ├── 11.12.01 Organisationsangelegenheiten/ ← .type_aktenplan, protected
│   │   ├── 11.12.01.03 Satzungen/             ← .type_aktenplan, shielded (Aktenschrank)
│   │   │   ├── 11.12.01.03-01 Entschädigungssatzung/  ← .type_akte
│   │   │   └── 11.12.01.03-02 Feuerwehrsatzung/       ← .type_akte
```

- **Aktenplan protected**: Sachgruppen-Struktur ist fixiert, keine neuen Ordner
- **Aktenschrank shielded**: Letztes Blatt, erbt Schutz vom Parent, Akten dürfen angelegt werden
- **Akte/Vorgang/Register**: Nicht automatisch protected

## Aktencode (Syntax)

Jeder Ordnername besteht aus: **`<Aktencode> <Titel>`**

Der Aktencode verlängert sich hierarchisch:

```
Ebene           Aktencode        Syntax-Regel
─────────────────────────────────────────────────
Hauptgruppe     11               2-stellig
Sachgruppe 1    11.12            + "." + 2-stellig
Sachgruppe 2    11.12.01         + "." + 2-stellig
Sachgruppe 3    11.12.01.03      + "." + 2-stellig
Akte            11.12.01.03-01   + "-" + 2-stellig (laufend)
Vorgang         11.12.01.03-01/1 + "/" + laufend
Register        11.12.01.03-01/1#1  + "#" + laufend
```

### Trennzeichen

| Übergang | Trennzeichen | Beispiel |
|----------|-------------|----------|
| Sachgruppe → Sachgruppe | `.` (Punkt) | 11 → 11.12 |
| Sachgruppe → Akte | `-` (Bindestrich) | 11.12.01.03 → 11.12.01.03-01 |
| Akte → Vorgang | `/` (Schrägstrich) | 11.12.01.03-01 → 11.12.01.03-01/1 |
| Vorgang → Register | `#` (Raute) | 11.12.01.03-01/1 → 11.12.01.03-01/1#1 |

### Ordnername

```
<Aktencode> <Titel>
11.12.01.03-01 Entschädigungssatzung
11.12.01.03-01/1 Fassung von 2016
11.12.01.03-01/1#1 Vorlagen und Vergleiche
```

## Schema-Dateien (.space/views/)

### aktenplan.json
```json
{
  "label": "Aktenplan",
  "icon": "archive",
  "children": ["aktenplan", "akte"],
  "columns": ["name", "aktencode", "anzahl-akten"],
  "namePattern": "{parentCode}.{seq:2} {title}",
  "metadata": {
    "aktencode": { "label": "Aktencode", "type": "string", "auto": true }
  }
}
```

### akte.json
```json
{
  "label": "Akte",
  "icon": "folder-open",
  "children": ["vorgang"],
  "variants": {
    "leer": { "label": "Leere Akte", "children": [] },
    "thematisiert": { "label": "Akte mit Vorgängen", "children": ["vorgang"] },
    "voll": { "label": "Akte mit Vorgängen und Registern", "children": ["vorgang"] }
  },
  "columns": ["name", "aktencode", "status", "abgelegt-von", "abgelegt-am"],
  "namePattern": "{parentCode}-{seq:2} {title}",
  "metadata": {
    "aktencode": { "label": "Aktenzeichen", "type": "string", "auto": true },
    "status": { "label": "Status", "type": "enum", "values": ["offen", "gespeichert", "geschlossen"], "default": "offen" }
  }
}
```

### vorgang.json
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

### register.json
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

## Beispiel: Komplette Struktur

```
Archikart DMS/                                              .type_aktenplan
├── .space/views/*.json
├── 11 Innere Verwaltung/                                   .type_aktenplan   protected
│   ├── 11.11 Verwaltungssteuerung/                         .type_aktenplan   protected
│   ├── 11.12 Innere Verwaltungsangelegenheiten/            .type_aktenplan   protected
│   │   ├── 11.12.01 Organisationsangelegenheiten/          .type_aktenplan   protected
│   │   │   ├── 11.12.01.00 Allg. Organisationsang./       .type_aktenplan shielded
│   │   │   ├── 11.12.01.03 Satzungen/                     .type_aktenplan shielded
│   │   │   │   ├── 11.12.01.03-01 Entschädigungssatzung/  .type_akte
│   │   │   │   │   ├── 11.12.01.03-01/1 Fassung 2016/     .type_vorgang
│   │   │   │   │   │   ├── 11.12.01.03-01/1#1 Vorlagen/   .type_register
│   │   │   │   │   │   │   ├── Vergleich_A.pdf
│   │   │   │   │   │   │   └── Arbeitshilfe.docx
│   │   │   │   │   │   ├── 11.12.01.03-01/1#2 Beanstandungen/  .type_register
│   │   │   │   │   │   └── Beschluss.pdf
│   │   │   │   │   └── 11.12.01.03-01/2 Fassung 2026/     .type_vorgang
│   │   │   │   └── 11.12.01.03-02 Feuerwehrsatzung/       .type_akte
│   │   │   └── 11.12.01.05 Landratsamt/                   .type_aktenplan shielded
│   │   └── 11.12.02 Personalangelegenheiten/               .type_aktenplan   protected
│   └── 11.13 Finanzverwaltung/                             .type_aktenplan   protected
├── 12 Sicherheit und Ordnung/                              .type_aktenplan   protected
└── 21 Schulträgeraufgaben/                                 .type_aktenplan   protected
```

## Aktencode-Generierung

Beim Anlegen eines neuen Ordners:

1. `namePattern` aus Schema lesen (z.B. `{parentCode}-{seq:2} {title}`)
2. `parentCode` aus dem Aktencode des Parent-Ordners extrahieren
3. `seq` = nächste freie Nummer (Scan der Geschwister-Ordner)
4. `title` = User-Eingabe im Dialog
5. Ergebnis: `11.12.01.03-03 Brandverhütungsschauordnung`

### Sequenz-Format

- `{seq}` = laufend ohne Padding: 1, 2, 3, ...
- `{seq:2}` = 2-stellig mit Nullen: 01, 02, 03, ...
- `{seq:3}` = 3-stellig: 001, 002, 003, ...
