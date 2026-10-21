// The sheets, in issue order. Each was researched, drawn, written, adversarially fact-checked
// and fixed. `estimated` lists drawing elements that rest on estimates rather than sources.
export const PUZZLES = [
  {
    "no": 1,
    "answer": "niteroi-contemporary-art-museum",
    "drawing": "001",
    "view": "ELEVATION",
    "pxPerM": 13,
    "typeLabel": "Art museum",
    "built": "1991–96",
    "credits": "Oscar Niemeyer, architect; Bruno Contarini, structural engineer; City of Niterói, client",
    "why": "Niemeyer conceived the MAC as one reinforced-concrete form in which structure and outline are the same thing. The building is 16 m high. Its saucer, 50 m across, rests on a single central cylinder and cantilevers about 20 m from it on every side. Niemeyer described the idea as a central support with the architecture rising around it like a flower. Bruno Contarini was the structural engineer. The museum stands on a headland above Guanabara Bay, and its main exhibition hall has no columns.",
    "readMore": "https://en.wikipedia.org/wiki/Niter%C3%B3i_Contemporary_Art_Museum",
    "architect": {
      "answer": "Oscar Niemeyer",
      "distractors": [
        "Lúcio Costa",
        "Affonso Eduardo Reidy",
        "Lina Bo Bardi",
        "Paulo Mendes da Rocha",
        "Ruy Ohtake"
      ],
      "note": "Accounts differ on whether the collector João Sattamini or Niemeyer's daughter Anna Maria first asked the city to take the collection. Bruno Contarini was the structural engineer."
    },
    "year": {
      "value": 1996,
      "tolerance": 2,
      "note": "The city of Niterói invited Niemeyer to design the museum in 1991, after agreeing to house João Sattamini's collection. It opened on 2 September 1996."
    },
    "dimension": {
      "label": "Saucer diameter",
      "value": 50,
      "unit": "m",
      "line": [
        315,
        352,
        965,
        352
      ],
      "source": "https://en.wikipedia.org/wiki/Niter%C3%B3i_Contemporary_Art_Museum"
    },
    "spec": {
      "answer": "painted-insitu",
      "distractors": [
        "precast-modules",
        "bush-hammered",
        "hypar-shell"
      ],
      "explain": "The MAC is cast-in-place reinforced concrete. A single central cylinder carries the saucer, which cantilevers about 20 m from it, and the smooth concrete is painted white."
    },
    "notes": {
      "truths": [
        {
          "text": "The museum was built to house the collection of João Sattamini, who lent it 1,217 works on a long-term loan.",
          "source": "https://periodicos.usp.br/geoliterart/article/download/185618/178384/531970"
        },
        {
          "text": "A continuous band of windows runs around the saucer, with the glass set at a 40-degree angle.",
          "source": "https://www.archdaily.com/417751/ad-classics-niteroi-contemporary-art-museum-oscar-niemeyer"
        }
      ],
      "lie": {
        "text": "The circular reflecting pool beneath the saucer covers 817 square metres and is 6 metres deep.",
        "correction": "The pool covers 817 m² but is only 60 cm deep.",
        "source": "https://www.archdaily.com/417751/ad-classics-niteroi-contemporary-art-museum-oscar-niemeyer"
      }
    },
    "sources": [
      "https://en.wikipedia.org/wiki/Niter%C3%B3i_Contemporary_Art_Museum",
      "https://www.redalyc.org/pdf/3517/351732308004.pdf",
      "https://designingbuildings.co.uk/wiki/Niteroi%20Contemporary%20Art%20Museum",
      "https://www.architectmagazine.com/?p=281154",
      "https://www2.fag.edu.br/coopex/arquivos/producao/15299282805b30da58afd41.pdf",
      "https://biblioteca.ibge.gov.br/visualizacao/periodicos/2/bn_1998_v6.pdf",
      "https://edisciplinas.usp.br/pluginfile.php/4940684/mod_resource/content/1/case%20caminho_niemeyer_1.pdf",
      "https://periodicos.usp.br/geoliterart/article/download/185618/178384/531970",
      "https://www.archdaily.com/417751/ad-classics-niteroi-contemporary-art-museum-oscar-niemeyer",
      "https://bmcnews.com.br/engenharia/com-fachada-futurista-e-curvas-impressionantes-o-predio-de-oscar-niemeyer-virou-referencia-da-arquitetura-moderna-no-brasil/",
      "https://bmcnews.com.br/ultimas-noticias/com-seu-formato-de-calice-de-16-metros-e-vista-para-a-baia-de-guanabara-o-mac-de-niteroi-virou-o-maior-simbolo-modernista-de-niemeyer/",
      "https://www.quintoandar.com.br/guias/?p=484602",
      "https://artsandculture.google.com/entity/m05jksp"
    ],
    "estimated": [
      "Profile between the verified extents: bowl rim and window sill at z=11.5 m, r=21.3 m; fascia 1.4 m deep (z 14.6 to 16 m). These follow from the 40-degree, 4.80 m pane and the 4 m stem but rest on the estimated fascia depth.",
      "Bowl drawn as a straight cone at about 24 degrees, with a 1.3 m tangent fillet where it meets the stem. Neiva & Perrone (Oculum Ensaios) give the bowl profile as 30 degrees to the ground (C). A 30-degree cone cannot be reconciled with the 4 m stem, the 4.80 m pane at 40 degrees and the 16 m height together: it overshoots 16 m by about 0.8 m even with no fascia.",
      "Stem diameter 9 m (Neiva & Perrone; BMC News). ArchDaily, Designing Buildings and Wikipedia give 2.7 m (C). 9 m matches the published cantilever of about 20 m and photographs.",
      "Stem height 4 m, taken to the corner where the stem face meets the cone line, from a single source (Neiva & Perrone).",
      "Window band leaning top outward (dossier E, about 75%). No source states the direction; Neiva & Perrone only say the smoked-glass frame is fixed to the inverted cone. This changes the L1 silhouette.",
      "Pool recess radius 16.5 m (derived from 817 m2). Stem foot drawn on the pool floor at -0.6 m.",
      "Mullion positions: 70 panes at an even spacing with a generic angular offset. Lines within 2.5 units of the silhouette edge are left out because they would merge.",
      "The whole ramp: projected start 50 m left of the axis (x=70), a fork at r=-40 m, entry decks at +5.2 m and +8.5 m meeting the bowl, 0.95 m parapet plus 0.4 m slab side face, red side faces, curved elevation profile, no supports drawn",
      "Plaza edge at r=+28 m (x=928), cliff 10 m high and its faceted profile, sea level at y=850",
      "Sugarloaf and Morro da Urca: schematic outlines, not to scale",
      "Position of the scale figure (r=+19 m, on the plaza under the rim)"
    ]
  },
  {
    "no": 2,
    "answer": "trellick-tower",
    "drawing": "002",
    "view": "ELEVATION",
    "pxPerM": 7.5,
    "typeLabel": "Council housing",
    "built": "1968–72",
    "credits": "Architect Ernő Goldfinger for the Greater London Council; contractor F G Minter & Sons",
    "why": "Trellick Tower shows how Ernő Goldfinger organised a council housing tower in concrete. Lifts, stairs and refuse chutes sit in a separate slim service tower, joined to the 31-storey slab by bridges at every third floor. Corridors run only on those floors, and two-bedroom flats above and below are reached from them by internal stairs. Goldfinger developed the scheme from his Balfron Tower in Poplar. The in-situ concrete is bush-hammered and the balconies are clad in timber. It was listed Grade II* in 1998.",
    "readMore": "https://en.wikipedia.org/wiki/Trellick_Tower",
    "architect": {
      "answer": "Ernő Goldfinger",
      "distractors": [
        "Alison and Peter Smithson",
        "Denys Lasdun",
        "Chamberlin, Powell and Bon",
        "Neave Brown",
        "Le Corbusier"
      ],
      "note": "Ernő Goldfinger designed the tower for the Greater London Council, as a taller sibling of his Balfron Tower in Poplar. Ian Fleming named the Bond villain Auric Goldfinger after him."
    },
    "year": {
      "value": 1972,
      "tolerance": 2,
      "note": "The Greater London Council commissioned the tower in 1966. It was built from 1968 to 1972 and officially opened on 28 June 1972."
    },
    "dimension": {
      "label": "Overall height",
      "value": 98,
      "unit": "m",
      "line": [
        334,
        790,
        334,
        55
      ],
      "source": "https://en.wikipedia.org/wiki/Trellick_Tower"
    },
    "spec": {
      "answer": "bush-hammered",
      "distractors": [
        "corduroy",
        "precast-modules",
        "fair-faced-ties"
      ],
      "explain": "The reinforced concrete was cast in place and bush-hammered, with some precast pebble-finished panels and timber cladding on the balconies. Precast panels mark the access corridors on the north face."
    },
    "notes": {
      "truths": [
        {
          "text": "The fully glazed boiler house projects from the service tower on the 32nd and 33rd floors.",
          "source": "https://historicengland.org.uk/listing/the-list/list-entry/1246688"
        },
        {
          "text": "Residents formed an association in 1984 and won a door-entry system, CCTV and a concierge.",
          "source": "https://en.wikipedia.org/wiki/Trellick_Tower"
        }
      ],
      "lie": {
        "text": "Corridors run on every second floor, each linked to the service tower by a glazed bridge.",
        "correction": "The corridors and their glazed bridges to the service tower are on every third floor.",
        "source": "https://historicengland.org.uk/listing/the-list/list-entry/1246688"
      }
    },
    "sources": [
      "https://en.wikipedia.org/wiki/Trellick_Tower",
      "https://historicengland.org.uk/listing/the-list/list-entry/1246688",
      "https://www.rbkc.gov.uk/planning/listedbuildings/listeddetails.asp?ID=471992",
      "https://www.rbkc.gov.uk/pdf/Trellick%20and%20Edenham%20listed%20status.pdf",
      "https://www.architecture.com/explore-architecture/inside-the-riba-collections/trellick-tower-turns-50",
      "https://www.modernism-in-metroland.co.uk/blog/the-future-passed-the-trellick-tower-at-50",
      "https://programme.openhouse.org.uk/listings/2203",
      "https://www.towerblock.eca.ed.ac.uk/node/55097.html",
      "https://britishlistedbuildings.co.uk/101246688-trellick-tower-cheltenham-estate-golborne-ward/maps",
      "https://www.balfrontower.org/document/17/a-sense-of-proportion-the-architects-journal",
      "https://c20society.org.uk/building-of-the-month/trellick-tower-london",
      "https://en.wikipedia.org/wiki/Auric_Goldfinger"
    ],
    "estimated": [
      "Service tower width 8 m and gap 4 m (no source; the 55.8 m total agrees with the Chisel & Mouse model check of about 56 m; Pevsner: the tower was turned 90 degrees to present a slender main front)",
      "Service tower at the west (Golborne Road) end, drawn at the viewer's left in this elevation of the south (balcony) face. The south face is verified (Dunnett, AJ 1997: the 'principal, south-facing facade'; listing: corridors on the north face). The west end is inferred, not stated by any source: the listing gives the address as 'Golborne Road (East side)', the Golborne Road entrance has the club room above it and Open House places the clubroom in the service tower, and the seven-storey Block B (19 Golborne Road) meets the slab at the service-tower corner of the L",
      "98 m taken as the top of the service tower. 35 storeys x 2.79 m = 97.7 m supports this",
      "Floor-to-floor height 2.79 m (86.5 m / 31)",
      "Bridge levels: UK floors 2, 5 ... 29 (storeys 3, 6 ... 30), 10 bridges, each one storey high with a single mullion. The every-third-floor rhythm is verified; the exact floors are not",
      "Boiler house on UK floors 32-33 (89.3-94.9 m), fully glazed (listing), 5 x 2 glazing panels, with floor 34 above it (94.9-98 m) drawn as blank concrete. The projection is drawn 4.6 m to the west, away from the slab along its long axis, with a curved soffit down to 85.3 m. Verified: projecting, cantilevered, fully glazed, on the 32nd and 33rd floors. Not verified: whether it projects along the slab axis or toward the viewer, its depth, the soffit shape (one popular source mentions the building's only curve), and what lies above it. The height band assumes British floor numbering (ground = 0); counting ground as storey 1 would give 86.5-92.1 m",
      "Six equal balcony bays (7.3 m), a balcony on every storey from UK floor 1 to 30 except the maisonette floors 23-24, where the listed break in the balcony pattern is shown by leaving out the balcony fronts (the real form of the break is unknown), a 1.0 m balcony front, one mullion per bay, and a plain ground storey",
      "Service tower slits: one 0.4 x 2.0 m slit per storey in a single central column, UK floors 1-30 (slit windows are verified; their pattern is not)",
      "Timber balcony cladding placed on the balcony fronts (shd band in layer 4)",
      "Seven-storey Block B (19 Golborne Road, 42 flats) left out. Its direction from the corner is unverified; one clue (the 2015 condition report pairs the Block A south and Block B east elevations) suggests it runs south, toward the viewer, where its end would hide the lower 7 storeys at the tower end. The partly demolished three-storey garage podium at the base is also left out",
      "Lift lines at every storey on the service tower, bush-hammer stipple, trees (all generic, layers 4-5)"
    ]
  },
  {
    "no": 3,
    "answer": "geisel-library",
    "drawing": "004",
    "view": "ELEVATION",
    "pxPerM": 12.5,
    "typeLabel": "University library",
    "built": "1968–70",
    "credits": "William L. Pereira & Associates, architects; Brandow & Johnston, structural engineers. Underground addition (1993): Gunnar Birkerts.",
    "why": "The library was first designed in steel and switched to reinforced concrete when steel prices rose in the 1960s. Exposed concrete also saved the cost of fireproofing and plastering steel. Sixteen angled cast-in-place piers rise at 45 degrees from the open forum deck to the sixth floor, the widest. They were first planned inside the building and moved outside to free floor space. About 300 steel rods at levels 5 and 6 tie each pier to the one opposite. The concrete carries the horizontal marks of rough form boards.",
    "readMore": "https://en.wikipedia.org/wiki/Geisel_Library",
    "architect": {
      "answer": "William L. Pereira",
      "distractors": [
        "Louis Kahn",
        "Paul Rudolph",
        "Marcel Breuer",
        "Welton Becket",
        "Kallmann McKinnell & Knowles"
      ],
      "note": "William L. Pereira & Associates designed what was then called the Central University Library. Gunnar Birkerts later added two underground levels that wrap around three sides of it. Louis Kahn's Salk Institute is about 1 km away."
    },
    "year": {
      "value": 1970,
      "tolerance": 2,
      "note": "Pereira's firm was commissioned in June 1965, and groundbreaking was set for 1 July 1968. The first books were moved in at the end of June 1970, students used the library from the fall 1970 quarter, and it was formally dedicated in 1971."
    },
    "dimension": {
      "label": "Overall height",
      "value": 33.5,
      "unit": "m",
      "line": [
        80,
        730,
        80,
        311.25
      ],
      "source": "https://libraries.ucsd.edu/about/geisel-library.html"
    },
    "spec": {
      "answer": "board-marked",
      "distractors": [
        "precast-aggregate",
        "precast-modules",
        "hypar-shell"
      ],
      "explain": "The cast-in-place concrete was poured against rough form boards and left exposed, so it shows their horizontal pattern."
    },
    "notes": {
      "truths": [
        {
          "text": "In 1995 the library was renamed for Theodor Geisel, better known as Dr. Seuss, and his wife Audrey.",
          "source": "https://libraries.ucsd.edu/about/geisel-library.html"
        },
        {
          "text": "Before construction began, a half-scale model of one of the outer columns was built and tested.",
          "source": "https://en.wikipedia.org/wiki/Geisel_Library"
        }
      ],
      "lie": {
        "text": "Level 3 was left as an empty floor because the designers had not allowed for the weight of the books.",
        "correction": "Level 3 is the open outdoor forum, and the stairwell landings on that level open onto it. The story that the floor was left empty because of the weight of the books is a campus legend.",
        "source": "https://sandiegomagazine.com/guides/inside-the-icon-geisel-library"
      }
    },
    "sources": [
      "https://exhibits.ucsd.edu/pdfs/id=16-2229",
      "https://libraries.ucsd.edu/about/geisel-library.html",
      "https://en.wikipedia.org/wiki/Geisel_Library",
      "https://www.oceanlight.com/spotlight.php?img=11275",
      "https://www.bjsce.com/geisel-library",
      "https://www.dci-engineers.com/blog/engineering-for-unique-structures",
      "https://pcad.lib.washington.edu/building/1132",
      "https://reference.org/facts/Geisel_Library/UNjkfCcv",
      "https://oac.cdlib.org/findaid/ark:/13030/c8pc395m/entire_text/",
      "https://library.ucsd.edu/dc/object/bb5572174f/_1.pdf",
      "https://library.ucsd.edu/dc/object/bb7543990t/_2.pdf",
      "https://exhibits.ucsd.edu/starlight/shaping_a_library/feature/construction",
      "https://exhibits.ucsd.edu/starlight/shaping_a_library/feature/expansion",
      "https://geisel50.ucsd.edu/about/construction.html",
      "https://today.ucsd.edu/story/five-decades-countless-memories",
      "https://www.archdaily.com/566563/ad-classics-geisel-library-william-l-pereira-and-associates",
      "https://docomomo-us.org/register/university-of-california-geisel-library",
      "https://archeyes.com/geisel-library-william-pereira-associates",
      "https://sandiegomagazine.com/guides/inside-the-icon-geisel-library",
      "https://www.garykent.com/2018/08/14/geisel-library"
    ],
    "estimated": [
      "Height datum: 33.5 m (110 ft) measured from the ground line at the forum deck (level 3). This is likely, not verified: it rests on the 1971 UCSD fact sheet ('Eight levels rising 110 feet above the ground') and is consistent with the 1968 design release (135 ft from basement to top, read from a search snippet). The forum sits 'slightly above the surrounding ground'; that small offset is ignored.",
      "Storey heights: forum (level 3) to the level 4 floor taken as 9.14 m (30 ft). UCSD Library says the five-level spheroid was 'raised 30 feet above a plaza level', taken here to mean the forum; 'plaza level' may instead be the surrounding ground, and the 30 ft may run to the underside of level 4. The remaining 24.36 m up to the 33.5 m roof is split evenly over levels 4 to 8, 4.87 m each. No per-floor heights were found; both the 30 ft and the even split are estimates.",
      "Levels 1 and 2 drawn as a hidden dashed box below the ground line (fact sheet: 'One and two - Below ground'; ArchDaily: 'two submerged floors'). Its depth of 7.62 m is derived from 135 ft basement-to-top minus 110 ft. The 1993 Birkerts underground addition is not drawn.",
      "Floor widths: floor 4 = floor 8 = 44.5 m and floor 5 = floor 7 = 54.3 m, from stepping 4.87 m per side per floor along the 45-degree pier face. Verified: floor 6 is the widest, and level 4 equals level 8 and level 5 equals level 7 (Docomomo).",
      "Floor 6 width 64.0 m (210 ft) is likely: UCSD figures read from search snippets, not quoted verbatim. Other figures: 214 ft square (1968 design release), 'over two hundred feet' (ArchDaily), 200 ft (Wikipedia).",
      "Podium width 75.6 m: the fact sheet's 248 ft 'widest point at ground level', applied to the hidden levels 1 and 2. The drawn tip-to-tip span (79.7 m, 261 ft) exceeds it; the two agree only if the 248 ft is measured at ground level, as the snippet says.",
      "Core width at forum level (17 m), its 8.24 m visible height and its shading. The core exists (V); its size and finish do not.",
      "Support geometry: the inner face runs at 45 degrees (V) through the floor-level outer corners of floors 4, 5 and 6 and the bottom edges of their slabs (ArchDaily: the diagonal 'joins the floor plates at their bottom edge'). The piers lean outward (V) and end at level 6 (V: UCSD 'to the sixth level'; ArchDaily 'extend beyond the width of the sixth floor'). Feet on the forum deck at ±13.1 m (inner face) and ±16.1 m (outer face), tips cut level with the roof of floor 6, 23.76 m above the forum, reaching 4.87 m past floor 6: all derived from the estimated storey heights (E). The band is 3 m wide horizontally, about 2.1 m thick (E).",
      "Only the side piers are drawn, in profile. Sixteen piers is likely (ArchDaily, Docomomo, BJSCE), not verified: UCSD counts four bents in all, 1,500 cubic yards each, tied in opposite pairs, and Atomic Ranch says 'eight legs'. Four piers per face is inferred from 16 / 4 bents. Their positions along each face are unknown, so the near-face and far-face piers are left out; they would show as vertical strips through the open forum storey.",
      "Slab edge bands 0.9 m deep; forum deck fascia 0.9 m",
      "Tie rods drawn as hidden lines at slab mid-depth on levels 5 and 6. Their existence and levels are V; their exact position in the slab is E.",
      "Mullions on a generic 1.525 m module (layer 3)",
      "Board-mark spacing 0.7 m on the piers and core (layer 4). The horizontal board-formed finish is V.",
      "Eucalyptus tree: generic form, about 21 m tall, kept clear of the right pier tip (layer 5)"
    ]
  },
  {
    "no": 4,
    "answer": "bruder-klaus-field-chapel",
    "drawing": "005",
    "view": "ELEVATION",
    "pxPerM": 55,
    "typeLabel": "Chapel",
    "built": "2005–07",
    "credits": "Peter Zumthor, architect; Jürg Buchli and Claus Jung, structural engineers; Hermann-Josef Scheidtweiler and his wife, clients and builders; Hans Josephsohn, bronze of the saint",
    "why": "The chapel's walls record how they were made. A tent of 112 spruce trunks was leaned together and an outer formwork set up on a pentagonal plan. Volunteers working with craftsmen rammed concrete between the two in 24 layers of about 50 cm. A smouldering fire then charred the trunks so they could be pulled out. Outside, the result is a plain 12 m block. Inside, it is a black cavity printed with the trunks and open to the sky.",
    "readMore": "https://nrw-skulptur.net/en/skulptur/bruder-klaus-feldkapelle/",
    "architect": {
      "answer": "Peter Zumthor",
      "distractors": [
        "Gottfried Böhm",
        "Peter Märkli",
        "Christian Kerez",
        "Valerio Olgiati",
        "Tadao Ando"
      ],
      "note": "Hermann-Josef Scheidtweiler and his wife asked Peter Zumthor to design the chapel. The chapel is dedicated to Nicholas of Flüe, the Swiss hermit saint known as Bruder Klaus."
    },
    "year": {
      "value": 2007,
      "tolerance": 2,
      "note": "The clients first contacted Zumthor in about 1998. Construction began in 2005, and Auxiliary Bishop Heiner Koch of Cologne consecrated the chapel on 19 May 2007."
    },
    "dimension": {
      "label": "Overall height",
      "value": 12,
      "unit": "m",
      "line": [
        370,
        780,
        370,
        120
      ],
      "source": "https://archi-vr.ti.bfh.ch/Scene/Index/11"
    },
    "spec": {
      "answer": "rammed-burnt",
      "distractors": [
        "bush-hammered",
        "slipformed",
        "precast-modules"
      ],
      "explain": "Concrete was rammed in layers between an outer formwork and a tent of 112 spruce trunks, and a smouldering fire then charred the trunks so they could be pulled out."
    },
    "notes": {
      "truths": [
        {
          "text": "350 mouth-blown glass plugs seal the holes left in the walls by the formwork ties.",
          "source": "https://nrw-skulptur.net/en/skulptur/bruder-klaus-feldkapelle/"
        },
        {
          "text": "The floor is a tin-lead alloy that was melted and spread on site.",
          "source": "https://www.archiweb.cz/en/b/polni-kaple-bruder-klaus"
        }
      ],
      "lie": {
        "text": "The walls were rammed in 12 layers, each about one metre high.",
        "correction": "There are 24 layers of about 50 cm each, which add up to the 12 m height.",
        "source": "https://archi-vr.ti.bfh.ch/Scene/Index/11"
      }
    },
    "sources": [
      "https://archi-vr.ti.bfh.ch/Scene/Index/11",
      "https://archi-vr.ti.bfh.ch/Scene/Index/8",
      "https://nrw-skulptur.net/en/skulptur/bruder-klaus-feldkapelle/",
      "https://www.archiweb.cz/en/b/polni-kaple-bruder-klaus",
      "https://mail.e-architect.com/germany/bruder-klaus-kapelle",
      "https://www.kuladig.de/Objektansicht/Drucken/O-3337-20101214-2",
      "https://www.eifelsteig.de/en/a-bruder-klaus-kapelle",
      "https://german-architects.com/ja/files/download/1a355e41-cc27-4474-aa8f-be66ef9d209b",
      "https://www.baunetzwissen.de/beton/fachwissen/betonarten/stampfbeton-1070141",
      "https://pia.sjtu.edu.cn/2008/PDF1/31-Bruder%20klaus.pdf",
      "https://gcatholic.org/churches/europe-west/153443"
    ],
    "estimated": [
      "L1/L2 projected width of the entrance view: 7.0 m (385 units), unverified. No measured plan was found. Only one article gives side lengths (Palacios, A x A 6, 2014: 4.6, 5, 7.5, 3.75 and 6.5 m, with the height as 12.5 m), and a student blog gives a different range (3.2-7.8 m). The order of the sides and the corner angles are unpublished; convex pentagons with these sides and a longest plan dimension of about 10 m (german-architects PDF) give projected widths anywhere from about 5 to 9 m. The silhouette does not meet the rule that L1 uses verified dimensions only",
      "L2 side faces: not drawn. Several secondary accounts put the door on the shortest or narrowest face (archeyes; R. Moody; Design Pendulum, 'narrowest face towards the south-east'), so foreshortened neighbouring faces are probably visible in this view. Their widths, and which side shows more, are unknown",
      "L3 hidden tent-shaped cavity (deliberately held back to layer 3 as the most iconic feature): about 4.4 m projected width at the floor, narrowing to about 1.2 m at the oculus, centred on the door. Only the shape is verified. One article gives the interior as about 3.75 m wide and 5 m long, but how it is oriented relative to this view is unknown, and so is its centring (the entrance passage curves)",
      "L3 triangular door: steel (stainless per komoot and Rheinische ART), about 15-20 cm thick, turning on a single point. Drawn 3.0 m high (SJTU student PDF, R. Moody, B. Galilee, PSU blog); ACS Forum gives 3.5 m, so the height is unresolved. The 1.4 m base and the centred position are estimated (no source). The triangular shape and its base on the ground are verified",
      "L4 cross above the door apex: presence verified (KuLaDig: 'ein hohes spitzes Dreieck, über dem ein Eisenkreuz hängt'). Drawn about 0.7 m tall and 0.35 m wide, 0.22 m above the apex; all three figures are estimated. Not drawn: the 350 glass-plugged tie holes (exterior pattern unknown)",
      "L5 context: low distant wooded skyline, 0.5 to 1.1 m above the ground line, generic"
    ]
  },
  {
    "no": 5,
    "answer": "church-of-the-light",
    "drawing": "003",
    "view": "SECTION",
    "pxPerM": 100,
    "typeLabel": "Protestant chapel",
    "built": "1988–89",
    "credits": "Tadao Ando Architect & Associates; structural engineer Ascoral Engineering Associates; contractor Tatsumi Construction",
    "why": "The chapel is a plain box of smooth in-situ concrete, left bare inside and out. The walls were cast against plywood panels the size of a tatami mat, and the tie holes stay visible in a regular grid. Behind the altar, two glazed slits run the full height and width of the wall to form a cross that lines up with the formwork joints. The budget was small, and the benches are scaffolding planks. It shows what precise fair-faced concrete and daylight can do with very little else.",
    "readMore": "https://en.wikipedia.org/wiki/Church_of_the_Light",
    "architect": {
      "answer": "Tadao Ando",
      "distractors": [
        "Le Corbusier",
        "Kenzo Tange",
        "Toyo Ito",
        "Fumihiko Maki",
        "Arata Isozaki"
      ],
      "note": "Tadao Ando designed it with his office, Tadao Ando Architect & Associates. It is often grouped with two other churches of his, the Chapel on Mount Rokko and the Church on the Water."
    },
    "year": {
      "value": 1989,
      "tolerance": 2,
      "note": "Ando designed the chapel in 1987–88. Construction was under way in 1988, and the chapel was completed in 1989. He added a Sunday school building on the same site in 1999."
    },
    "dimension": {
      "label": "Width of each of the chapel's three cubes",
      "value": 5.9,
      "unit": "m",
      "line": [
        305,
        100,
        895,
        100
      ],
      "source": "https://en.wikipedia.org/wiki/Church_of_the_Light"
    },
    "spec": {
      "answer": "fair-faced-ties",
      "distractors": [
        "board-marked",
        "bush-hammered",
        "precast-modules"
      ],
      "explain": "The walls were cast in place against smooth plywood panels about 90 by 180 cm, the size of a tatami mat, and the round recesses left by the form ties stay exposed in a regular grid."
    },
    "notes": {
      "truths": [
        {
          "text": "When money ran short, Ando considered leaving the chapel without a roof.",
          "source": "https://en.wikipedia.org/wiki/Church_of_the_Light"
        },
        {
          "text": "The benches in the chapel are made from scaffolding planks.",
          "source": "https://www.architecturelab.net/church-of-the-light-tadao-ando-architect-associates/"
        }
      ],
      "lie": {
        "text": "The cross has always been open to the air, with no glass in the slits.",
        "correction": "The slits are glazed. Ando had proposed leaving the cross open, and the church that commissioned it wanted glass. His full-size copy for a 2017 exhibition in Tokyo had no glass.",
        "source": "https://www.dezeen.com/?p=1146690"
      }
    },
    "sources": [
      "https://en.wikipedia.org/wiki/Church_of_the_Light",
      "https://www.archdaily.com/101260",
      "https://architectuul.com/architecture/church-of-the-light",
      "https://www.mooponto.com/?p=8548",
      "https://travel.sygic.com/en/poi/church-of-light-poi:22819",
      "https://www.urbipedia.org/hoja/Iglesia_de_la_Luz",
      "https://www.archiweb.cz/en/b/church-of-light",
      "https://www.dezeen.com/?p=1146690",
      "https://www.museum.or.jp/report/990",
      "https://www.architecturelab.net/church-of-the-light-tadao-ando-architect-associates/",
      "https://www.metalocus.es/en/news/shaping-light-church-light-tadao-ando",
      "https://artsandculture.google.com/story/2QVRGQpQrOQ8sQ",
      "https://bdt.degruyter.com/?p=18971",
      "https://www.studiomatrx.org/guides/church-of-the-light",
      "https://detail.de/de_en/sensory-masterpiece-church-of-the-light-by-tadao-ando-in-ibaraki-1991",
      "https://www.tarahunt.com/blog/2023/7/7/tadao-andos-church-of-light-commentary-on-jin-baeks-analysis",
      "https://www.christiantoday.co.jp/articles/24507/20170929/tadao-ando-exhibition.htm"
    ],
    "estimated": [
      "Wall thickness 0.38 m in L1/L2. Wikipedia gives it with 'citation needed'; it is consistent with 5.9 + 0.38 = 6.28 (outer box 18 x 6.28 x 6.28 m per De Gruyter)",
      "Roof slab 0.38 m thick",
      "Floor level drawn at exterior ground level. Floor flat at the cut. No floor slab or footings drawn",
      "Clear height at the altar wall drawn as 5.9 m (6.28 m outer box less the roof). DETAIL gives 7 m, and most sources say the floor steps down toward the altar, so the true clear height at this end may be greater (C)",
      "Horizontal arm of the cross 3.60-3.85 m above the floor (crossing at 0.63 of clear height, from photos)",
      "Cross centred on the wall width (photos; one source says the vertical arm runs down the centre)",
      "Formwork panels 1.8 x 0.9 m laid horizontally, set out from the slit edges. This leaves 0.835 m filler panels at the side walls and a 0.25 m strip under the roof",
      "Tie holes 6 per panel (3 across x 2 high, 0.6 x 0.45 m pitch, 0.3 / 0.225 m insets). Drawn r = 0.025 m, slightly enlarged to stay legible",
      "Dark altar-wall tone (shd)",
      "Two generic trees and earth hatch in L5",
      "Scale figure position (x 467.5, standing between two tie-hole columns)",
      "Dimension line placed between wall centrelines: reading the published 5.9 m cube size as a centreline grid is an inference (Studio Matrx calls 5.9 m the interior width), so the label names the cube rather than claiming centre-to-centre",
      "Coordinates come from two listings that may share one upstream source and were not checked against a map"
    ]
  }
];
