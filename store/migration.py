from uuid import uuid4
import json

old = [
    {
        "userData": {
            "hideCreateTowerButton": True
        },
        "towers": [
            {
                "name": "life",
                "baseColor": {
                    "l": 50,
                    "s": 100,
                    "h": 180
                },
                "blocks": [
                    {
                        "isDone": True,
                        "created": "2019-04-12T22:00:00.000Z",
                        "tag": "go home",
                        "description": "done it"
                    },
                    {
                        "isDone": True,
                        "created": "2019-05-12T22:00:00.000Z",
                        "tag": "go home"
                    },
                    {
                        "isDone": True,
                        "created": "2019-05-14T22:00:00.000Z",
                        "tag": "go to work",
                        "description": "done it"
                    },
                    {
                        "isDone": True,
                        "created": "2019-05-15T12:00:00.000Z",
                        "tag": "go to work"
                    },
                    {
                        "isDone": True,
                        "created": "2019-08-21T19:25:12.765Z",
                        "tag": "go home",
                        "description": "Df"
                    },
                    {
                        "isDone": True,
                        "created": "2019-08-21T19:25:17.014Z",
                        "tag": "Bruh",
                        "description": ""
                    },
                    {
                        "isDone": False,
                        "created": "2019-08-21T19:25:21.050Z",
                        "tag": "Bruh",
                        "description": "Xhsksj mentsd el"
                    },
                    {
                        "isDone": False,
                        "created": "2019-09-15T20:21:59.928Z",
                        "tag": "go home",
                        "description": "Ggggg"
                    }
                ]
            },
            {
                "name": "work",
                "baseColor": {
                    "l": 50,
                    "s": 100,
                    "h": 0
                },
                "blocks": [
                    {
                        "isDone": True,
                        "created": "2015-03-12T23:00:00.000Z",
                        "tag": "a",
                        "description": "done it"
                    },
                    {
                        "isDone": True,
                        "created": "2016-03-14T23:00:00.000Z",
                        "tag": "go to school",
                        "description": "done it"
                    },
                    {
                        "isDone": True,
                        "created": "2017-03-14T23:00:00.000Z",
                        "tag": "go to work"
                    },
                    {
                        "isDone": True,
                        "created": "2018-03-12T23:00:00.000Z",
                        "tag": "go to work",
                        "description": "done it"
                    },
                    {
                        "isDone": True,
                        "created": "2019-04-12T22:00:00.000Z",
                        "tag": "go to work"
                    },
                    {
                        "isDone": True,
                        "created": "2020-03-14T23:00:00.000Z",
                        "tag": "go to school",
                        "description": "done it"
                    },
                    {
                        "isDone": True,
                        "created": "2021-03-14T23:00:00.000Z",
                        "tag": "go to school"
                    }
                ]
            },
            {
                "name": "",
                "baseColor": {
                    "l": 50,
                    "s": 100,
                    "h": 294.9292268766079
                },
                "blocks": []
            },
            {
                "name": "",
                "baseColor": {
                    "l": 50,
                    "s": 100,
                    "h": 345.9634764049032
                },
                "blocks": []
            }
        ],
        "name": "Work & life"
    },
    {
        "userData": {
            "hideCreateTowerButton": True
        },
        "towers": [
            {
                "name": "barátok",
                "baseColor": {
                    "l": 50,
                    "s": 100,
                    "h": 172.2967317706582
                },
                "blocks": [
                    {
                        "isDone": True,
                        "created": "2019-08-19T07:25:28.918Z",
                        "tag": "szoba",
                        "description": "5. féléves szoba elintézése"
                    },
                    {
                        "isDone": True,
                        "created": "2019-08-20T11:06:38.851Z",
                        "tag": "szoba",
                        "description": "Kopaszi-gáton lőtt képek kiválogatása, szerkesztése."
                    },
                    {
                        "isDone": True,
                        "created": "2019-08-21T08:24:29.545Z",
                        "tag": "srácok",
                        "description": "Augusztus 20.-i tűzijáték"
                    },
                    {
                        "isDone": True,
                        "created": "2019-08-24T20:57:34.315Z",
                        "tag": "srácok",
                        "description": "Ádámmal sétáltunk a városban."
                    },
                    {
                        "isDone": True,
                        "created": "2019-08-25T20:40:58.238Z",
                        "tag": "srácok",
                        "description": "Ádámmal kondiztunk, bicikliztünk és filmeztünk is."
                    },
                    {
                        "isDone": False,
                        "created": "2019-09-01T10:30:43.397Z",
                        "tag": "barátnő",
                        "description": "Tinder?"
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-02T18:57:25.047Z",
                        "tag": "ismerősök",
                        "description": "Eljöttem inni az ismerőseinek (nem barátok)"
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-04T06:40:35.979Z",
                        "tag": "szoba",
                        "description": "Elmentünk IKEA-zni, ott vacsoráztunk, majd vettem pár apróságot."
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-11T21:50:06.110Z",
                        "tag": "srácok",
                        "description": "Balázs elhívott a félévnyitó bulijára, egész jó volt, több embert is megismertem."
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-11T21:51:45.161Z",
                        "tag": "srácok",
                        "description": "Elmentem az egyetemi napokra. Az NB zenekar megtetszett."
                    },
                    {
                        "isDone": False,
                        "created": "2019-09-15T20:20:59.632Z",
                        "tag": "barátok",
                        "description": "Judit"
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-20T19:58:32.223Z",
                        "tag": "szoba",
                        "description": "Olivér mellé feküdni."
                    }
                ]
            },
            {
                "name": "külföld",
                "baseColor": {
                    "l": 50,
                    "s": 100,
                    "h": 328.5326579421781
                },
                "blocks": [
                    {
                        "isDone": False,
                        "created": "2019-08-24T15:30:44.696Z",
                        "tag": "észak",
                        "description": "lista a lehetséges egyetemekről"
                    },
                    {
                        "isDone": False,
                        "created": "2019-08-26T18:33:14.150Z",
                        "tag": "vizsgák",
                        "description": "Szükséges vizsgák"
                    },
                    {
                        "isDone": False,
                        "created": "2019-09-03T05:48:10.664Z",
                        "tag": "svájc",
                        "description": "Lausanne"
                    }
                ]
            },
            {
                "name": "család",
                "baseColor": {
                    "l": 50,
                    "s": 100,
                    "h": 304.3554194102233
                },
                "blocks": [
                    {
                        "isDone": True,
                        "created": "2019-08-18T13:30:55.730Z",
                        "tag": "mama",
                        "description": "Segítettem megcsinálni a tabletét."
                    },
                    {
                        "isDone": True,
                        "created": "2019-08-18T20:59:51.241Z",
                        "tag": "anya",
                        "description": "Önéletrajz, grillezés, utóbbi nem volt túl élvezetes."
                    },
                    {
                        "isDone": True,
                        "created": "2019-08-19T17:39:45.406Z",
                        "tag": "anya",
                        "description": "A mai nap a Balatonra jöttünk, hazajövet mekiztünk is."
                    },
                    {
                        "isDone": True,
                        "created": "2019-08-26T18:29:49.887Z",
                        "tag": "mama",
                        "description": "Beszéltem mamával és anyával"
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-07T20:47:06.526Z",
                        "tag": "apa",
                        "description": "Elmentem a szüretre, jó volt, szeretek apukámmal találkozni."
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-18T20:42:40.300Z",
                        "tag": "apa",
                        "description": "Apukámmal találkoztunk, megnéztük a Westendben a Lego Bugatti Chiront."
                    }
                ]
            },
            {
                "name": "schdesign",
                "baseColor": {
                    "l": 50,
                    "s": 100,
                    "h": 126.70173577740843
                },
                "blocks": [
                    {
                        "isDone": True,
                        "created": "2019-08-18T13:43:35.783Z",
                        "tag": "mentorság",
                        "description": "Első közös fejlesztés megszervezése."
                    },
                    {
                        "isDone": True,
                        "created": "2019-08-21T19:24:49.641Z",
                        "tag": "mentorság",
                        "description": "Angular workshop tartása"
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-01T10:29:36.360Z",
                        "tag": "mentorság",
                        "description": "Tanfolyamoldalon dolgozni"
                    },
                    {
                        "isDone": False,
                        "created": "2019-09-01T10:29:54.133Z",
                        "tag": "mentorság",
                        "description": "Web workshop tartása"
                    },
                    {
                        "isDone": False,
                        "created": "2019-09-01T20:44:36.023Z",
                        "tag": "mentorság",
                        "description": "Felvételizők munkáinak átnézése."
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-15T20:20:28.031Z",
                        "tag": "mentorság",
                        "description": "Kiírtam egy poll-t angular webworkshopra, és meglepően gyorsan, meglepően sokan jeleztek vissza."
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-16T20:27:13.032Z",
                        "tag": "felvételi",
                        "description": "Kifejezetten jó érzés volt a felvételi bizottságban ülni, izgalmas volt vezényelni a történéseket és a felvételizőket jobban megismerni.\nA jövőben szívesen foglalkoznék ezzel is."
                    }
                ]
            },
            {
                "name": "új skillek",
                "baseColor": {
                    "l": 50,
                    "s": 100,
                    "h": 79.00679913000361
                },
                "blocks": [
                    {
                        "isDone": True,
                        "created": "2019-08-18T11:49:34.869Z",
                        "tag": "társasági",
                        "description": "Érdekes kérdések\n\nBemelegítés\n\nHol nőttél fel, mi volt az első háziállatod neve, milyen színű volt az első autód?\n\nKérdések\n\nHa egy idegen 24 órán át a helyedben lenne, az idő lejártával milyen kérdést tenne fel neked?\n\nHa meg lehetne téged idézni egy olyan pentagrammaval, aminek az 5 csúcsába 5 rád jellemző tárgyat helyezünk, mik lennének ezek a tárgyak?\n\nEgy varázsló jön a <városodba>, kipakol a főtéren és a következő ajánlatot adja; annyi pénzt adhatsz neki, amennyit szeretnél, és ezzel arányosan vonzóbbá fog téged tenni.\nEzt demonstrálja is, elvesz egy 200 forintost egy helyi hajléktalantól és elvégzi rajta a varázslatot. Nem tudod mi változott rajta, de egy kicsit tényleg szebb lett. Arra jutsz, hogy adsz neki egy esélyt. Mármint a varázslónak, nem a csövinek.\nMennyi pénzt adsz neki?\n(A csavar, hogy nem tudod előre, hogy a penzedert cserében mennyivel leszel vonzóbb, csak azt tudod, hogy a mennyiséggel pozitívan arányosan)\n\nEgyütt lennél egy transzneművel, ha minden szempontból olyan lenne, mint egy tieddel ellentétes nemű ember? Rövidtávon, vagy akár hosszútávon is működne?\n\nMivel töltöd a szabadidőd mostanában?"
                    },
                    {
                        "isDone": True,
                        "created": "2019-08-19T17:39:20.118Z",
                        "tag": "programozás",
                        "description": "Effective JS elolvasva."
                    },
                    {
                        "isDone": True,
                        "created": "2019-08-24T14:24:04.086Z",
                        "tag": "programozás",
                        "description": "learngitbranching.js.org végigcsinálása"
                    },
                    {
                        "isDone": True,
                        "created": "2019-08-26T18:29:15.447Z",
                        "tag": "pénzügyek",
                        "description": "Befektettem 1 milliót állampapírba."
                    },
                    {
                        "isDone": True,
                        "created": "2019-08-26T18:30:54.781Z",
                        "tag": "programozás",
                        "description": "A FLUX architektúrát megtanítottak nekem a munkahelyen."
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-01T10:30:07.643Z",
                        "tag": "programozás",
                        "description": "Observable gyakorlása a life oldalon."
                    },
                    {
                        "isDone": False,
                        "created": "2019-09-01T10:30:25.734Z",
                        "tag": "programozás",
                        "description": "PWA kipróbálása ezen az oldalon."
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-11T21:51:05.774Z",
                        "tag": "programozás",
                        "description": "rxjs"
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-15T20:16:10.740Z",
                        "tag": "programozás",
                        "description": "Tetszik a pagination absztrakció, amit az új platformhoz csináltam, kíváncsi vagyok, hogy mit fognak hozzá szólni a többiek."
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-15T20:18:04.862Z",
                        "tag": "pénzügyek",
                        "description": "A témalabor miatt elkezdtem megismerkedni a Forex-szel, egész érdekes, lehet érdemes lenne kipróbálni."
                    }
                ]
            }
        ],
        "name": "My life"
    },
    {
        "userData": {
            "hideCreateTowerButton": True
        },
        "towers": [
            {
                "name": "Jó dolgok",
                "baseColor": {
                    "l": 50,
                    "s": 100,
                    "h": 320.2226045855286
                },
                "blocks": [
                    {
                        "isDone": True,
                        "created": "2019-08-23T21:16:14.785Z",
                        "tag": "munka",
                        "description": "Azt mondta PG, hogy értékes tagja vagyok a csapatnak."
                    },
                    {
                        "isDone": True,
                        "created": "2019-08-24T21:00:19.375Z",
                        "tag": "filmek",
                        "description": "Nagyon tetszik az Euphoria képivilága."
                    },
                    {
                        "isDone": True,
                        "created": "2019-08-25T14:04:03.994Z",
                        "tag": "barátok",
                        "description": "Dorkával jót beszélgettünk."
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-01T10:29:12.381Z",
                        "tag": "programozás",
                        "description": "Az immutable fát, ami az app jelenlegi verziójában van, izgalmas kihívás volt elkészíteni."
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-02T15:36:57.236Z",
                        "tag": "munka",
                        "description": "Fogok kapni egy MacBook Pro-t, már alig várom. "
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-07T20:44:02.422Z",
                        "tag": "munka",
                        "description": "Nagyon tetszik a MacBook, biztos vagyok benne, hogy ilyen gépet szeretnék használni ezután is."
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-11T21:48:51.651Z",
                        "tag": "programozás",
                        "description": "Stöki megkért a fizika gyakorló oldal frissítésére, amiért azt sokan használják az érettségire való készüléshez."
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-11T21:53:59.384Z",
                        "tag": "barátok",
                        "description": "Szerintem jó döntést hozok azzal, hogy nem megyek el a hétvégi tanyaparádéra. Szerintem nem érezném jól magam, szükségem van egy kis emberek nélküli pihenésre."
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-12T21:07:39.213Z",
                        "tag": "munka",
                        "description": "Jó érzés, hogy értékelik a munkámat, és értékes része vagyok a csapatnak."
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-12T21:08:12.154Z",
                        "tag": "barátok",
                        "description": "Jó volt Ricsivel beszélgetni, kicsit jobban megismerni."
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-15T15:24:23.022Z",
                        "tag": "barátok",
                        "description": "Judit majdnem egy év után rám írt, hogy hiányzok neki, és szeretne találkozni, belementem. Kíváncsi vagyok, hogy mi a helyzet vele. "
                    }
                ]
            },
            {
                "name": "Emlékezetes dolgok",
                "baseColor": {
                    "h": 357.0621032334518,
                    "s": 100,
                    "l": 50
                },
                "blocks": [
                    {
                        "isDone": True,
                        "created": "2019-09-01T10:28:07.649Z",
                        "tag": "munka",
                        "description": "Keményen dolgoztam egész héten, hogy a demóra elkészüljünk. Rossz érzés volt nem minőségi kódot írni, azért hogy hamar elkészüljünk."
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-04T06:41:43.480Z",
                        "tag": "munka",
                        "description": "Reménytelennek érzem a cég jövőjét. Az is aggaszt, hogy hogyan fogok egyetem mellett ennyit dolgozni. Ezt még át kell gondolnom."
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-07T20:45:27.670Z",
                        "tag": "barátok",
                        "description": "Rosszul esik, hogy Balázs nem hívott meg a bulijára, nem tudom miért zavart ennyire, a FOMO kifog rajtam."
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-09T10:16:23.967Z",
                        "tag": "anya",
                        "description": "Nem értem, hogy miért akad ki apróságokon. Nem tud konfliktust kezelni."
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-11T21:52:54.984Z",
                        "tag": "egyetem",
                        "description": "Tiltakozásból nem mentem el az AB osztóra."
                    },
                    {
                        "isDone": True,
                        "created": "2019-09-11T21:56:01.110Z",
                        "tag": "barátnő",
                        "description": "Elég magányosnak érzem magam mostanában, irigykedem a boldog párokra, kezdek rájönni, hogy eddig milyen rossz barát voltam. Mit csináljak?"
                    }
                ]
            }
        ],
        "name": "Memorable"
    },
    {
        "userData": {},
        "towers": [
            {
                "name": "",
                "baseColor": {
                    "l": 50,
                    "s": 100,
                    "h": 17.635188105608712
                },
                "blocks": [
                    {
                        "isDone": False,
                        "created": "2019-08-25T14:05:41.560Z",
                        "tag": "Hjj",
                        "description": "Bjjfvjk fgjjj fjkkj ghnmn"
                    }
                ]
            },
            {
                "name": "",
                "baseColor": {
                    "l": 50,
                    "s": 100,
                    "h": 202.96345104830144
                },
                "blocks": [
                    {
                        "isDone": True,
                        "created": "2019-08-25T14:04:59.102Z",
                        "tag": "Vnj",
                        "description": None
                    },
                    {
                        "isDone": True,
                        "created": "2019-08-25T14:05:06.280Z",
                        "tag": "Vnj",
                        "description": "Vjkv"
                    }
                ]
            },
            {
                "name": "",
                "baseColor": {
                    "l": 50,
                    "s": 100,
                    "h": 244.5895191614271
                },
                "blocks": [
                    {
                        "isDone": True,
                        "created": "2019-08-25T14:05:30.137Z",
                        "tag": "Hh",
                        "description": None
                    }
                ]
            }
        ],
        "name": "test"
    },
    {
        "userData": {
            "hideCreateTowerButton": True
        },
        "towers": [
            {
                "name": "",
                "baseColor": {
                    "h": 284.3072429732195,
                    "s": 100,
                    "l": 50
                },
                "blocks": []
            },
            {
                "name": "",
                "baseColor": {
                    "h": 340.06459179946825,
                    "s": 100,
                    "l": 50
                },
                "blocks": []
            },
            {
                "name": "Akckflf",
                "baseColor": {
                    "h": 260.7613227015375,
                    "s": 100,
                    "l": 50
                },
                "blocks": []
            },
            {
                "name": "",
                "baseColor": {
                    "h": 302.87743163951694,
                    "s": 100,
                    "l": 50
                },
                "blocks": []
            }
        ],
        "name": "Xncm"
    }
]


data = {
    'pages': old
}


child_aliases = ['pages', 'towers', 'blocks']

def for_children(e, f):
    for child_alias in child_aliases:
        if child_alias in e:
            for child in e[child_alias]:
                f(child)


def add_id(e):
    e['id'] = str(uuid4())
    for_children(e, add_id)


objects = {}
def serialize(e):
    result = {p: ([c['id'] for c in e[p]] if p in child_aliases else e[p]) for p in e}
    objects[e['id']] = result
    for_children(e, serialize)


add_id(data)
serialize(data)

print(json.dumps(objects, indent=2))
