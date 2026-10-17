# OPSgame — La storia

Il documento di riferimento per la trama: chi c'è, cosa succede in ogni capitolo e come cresce Zio Nick.
La fonte di verità restano i file di gioco: `js/story/chapter-N/chapter-N.js` per gli obiettivi e `assets/characters/<id>/character.json` per posizioni, dialoghi, scontri e oggetti. **Quando cambi la storia, aggiorna anche questo file** e lancia il controllo automatico:

```bash
node --no-warnings tools/checks/story-check.mjs
```

---

## Premessa

**Zio Nick si sveglia nella sua camera (la 20, al primo piano) e i suoi due meloni sono spariti.** Ieri sera erano in frigo, stamattina no. Da quel momento, da vero sbirro di casa che si fa gli affari di tutti, interroga i coinquilini e segue ogni pista:
- **Gabbo**, che scappa all'Alcatraz con uno zaino sospetto;
- la sua banda: **Gatta**, che dice di portarli a Brescia, e **Mari**, che se la prende perché Fede non arriva.

Gli indizi portano a **Caue**: li aveva presi lui, perché «chi ha due meloni ne dia uno a chi non ne ha». Nello scontro finale Zio Nick si riprende i suoi due meloni.

## Come si gioca

| Tasto | Azione |
|---|---|
| Frecce o WASD | muoversi; nei menu, scegliere (frecce) |
| Spazio | parlare, far avanzare il dialogo, confermare. Se non hai nessuno davanti e sei su una sedia o uno sgabello, ti **siedi** |
| I | zaino: **HP di Zio Nick**, oggetti con i loro bonus, consumabili |
| P | telefono: la chat WhatsApp del gruppo **"Cucina di su"**, con la missione e il **dove andare** fissati in alto (↑/↓ o W/S per scorrere) |
| M | mappa del piano dove ti trovi, con gli obiettivi segnati (quelli sull'altro piano sono elencati come "altro piano") |
| Esc | pausa: *Riprendi* / *Ricomincia da capo* (chiude anche zaino, telefono e mappa) |

Spazio davanti a un mobile lo **esamina** (descrizioni da riscrivere a piacere in `js/core/furniture-catalog.js`). Un **"!"** giallo sopra un coinquilino vuol dire che serve alla missione in corso. In giro per casa ci sono **12 calzini spaiati** nascosti nei mobili: li trovi esaminandoli, li conti nello zaino e alla fine del gioco. All'inizio di ogni capitolo appare il suo titolo a tutto schermo, e il riquadro della missione ti dice sotto ogni obiettivo **chi** cercare e **dove**. In basso a sinistra c'è sempre il promemoria dei tasti. In alto a destra, sotto la missione, l'icona del telefono mostra in rosso quanti messaggi non hai ancora letto.

Il gioco **salva da solo**:
- a ogni progresso;
- a ogni cambio stanza;
- ogni 4 secondi;
- quando chiudi la scheda.

All'avvio puoi scegliere **Continua** o **Nuova partita**. La nuova partita chiede conferma se esiste già un salvataggio.

**Gli HP di Zio Nick restano tra uno scontro e l'altro.** Fuori dagli scontri si vedono solo nello zaino (I).
- per recuperarli ti siedi su una sedia o uno sgabello in cucina (+3 HP al secondo) e ti alzi con le frecce o Spazio;
- oppure dormi nel **letto di Zio Nick**, nella **camera 20** al primo piano: un pisolino e gli HP tornano al massimo;
- gli oggetti che aumentano gli HP massimi curano anche della stessa quantità;
- se perdi uno scontro ti risvegli **sul divano del salotto** con gli HP pieni, e puoi riprovare parlando di nuovo con il nemico.

**Regola d'oro delle missioni.** Un obiettivo conta solo se lo completi *mentre quel capitolo è attivo*. Parlare con qualcuno nel capitolo 1 non spunta "parla con X" del capitolo 8. Gli **oggetti** invece contano sempre: averli è uno stato, non un'azione.

## Personaggi

| Id | Nome | Ruolo nella storia | HP / ATK / DEF |
|---|---|---|---|
| `zionick` | Zio Nick | protagonista, lo sbirro di casa | 30 / 5 / 2 |
| `ema` | Emanuele | fa gli onori di casa | 28 / 4 / 2 |
| `sara` | Sara | fa il caffè e comanda in cucina | 30 / 5 / 3 |
| `nima` | Nima | vuole la cucina sempre pulita | 28 / 4 / 2 |
| `ana` | Ana | "gumba bro", presenza fissa nei corridoi | 26 / 5 / 2 |
| `gabbo` | Gabbo | il ricercato, sempre diretto al Plein | 34 / 8 / 3 |
| `gatta` | Gatta (Federico "Fede" Gatta) | complice di Gabbo, sogna Brescia | 34 / 9 / 3 |
| `mari` | Mari | complice, aspetta Fede Papi da sempre | 46 / 13 / 5 |
| `gaia` | Gaia | ama Alessio più di tutti | 28 / 5 / 2 |
| `caue` | Caue | il boss finale, cita i Colossesi | 70 / 17 / 6 |
| `timo` | Alessio | fornisce l'equipaggiamento a Zio Nick | 30 / 6 / 2 |
| `ernesto` | Ernesto, "Er Fresco" | piemontese, designer di prodotto (sta progettando un draghetto per gli ovetti Kinder), porta salame e formaggi in cucina | 28 / 5 / 2 |
| `lilia` | Lilia | sorella di Gaia, ospite: compare solo 3 volte (cap. 3, 7, 10), sempre con l'IQOS | 26 / 4 / 2 |

### Come parlano

Ogni personaggio ha un `persona.md` in `assets/characters/<id>/` con il suo modo di parlare: vale per dialoghi e messaggi nel gruppo.

| Personaggio | Come parla |
|---|---|
| Zio Nick | non parla mai: le sue manie le nominano gli altri (si fa gli affari di tutti, corre 10–15 km, due uova a colazione, lavora al museo) |
| Emanuele | "O Szio Nick...", "sz" al posto della "z", sempre "grszie", domande tipo "dov'è la farmacia?" |
| Ana | in inglese, invita agli aperitivi (guacamole) |
| Gabbo | "O fra" all'inizio di **ogni** frase e "diahane" alla fine |
| Alessio | taciturno, "O fra" solo all'inizio della prima frase |
| Gaia | "senza rispetto", sempre con Alessio; Zio Nick le chiede sempre di sua sorella Lilia |
| Ernesto | italiano normale, nessun tormentone; sempre down per vino e aperitivi, parla del suo cibo piemontese e del draghetto Kinder |
| Lilia | inizia spesso con "compa", dice "amunì" per "andiamo", ama Andrea Raineri (il suo ragazzo), si arrabbia se le chiedi una heets |
| Nima | inglese + italiano un po' rotto, apre spesso con *Buongiorns*, *Goodnights*, *Buonanots*; ogni tanto scritte in arabo; fissato con l'ordine in cucina |
| Mari | fiorellini ed emoji ovunque, manda sticker; aspetta sempre Fede |
| Gatta (Fede) | "pota" e Brescia |
| Sara | ogni tanto un "porco d\*o" |
| Caue | non scrive quasi mai nel gruppo; quando appare, predica con i versetti |

Nel gruppo "Cucina di su" arrivano **da 2 a 5 messaggi per capitolo**: il primo dà l'indizio della missione, gli altri sono chiacchiere di casa.

> Il personaggio `timo` nel gioco si chiama **Alessio** (Timo e Alessio sono la stessa persona).

## I capitoli

La partita comincia nella **camera di Zio Nick** (room-20, primo piano), appena sveglio. Anche caricando un salvataggio si riparte sempre da lì.

### Capitolo 1 — Il risveglio · *interazione*
- **Dove:** cucina del piano terra (`base-kitchen`).
- **Obiettivi:** chiedere dei meloni a **Emanuele**, **Sara** e **Nima**.
- **Cosa succede:**
  - Emanuele non li ha visti («giuro su Lameszia Terme») e chiede dov'è il fruttivendolo.
  - Nima conferma: ieri erano in frigo, due; ora il frigo è vuoto, ma almeno in ordine.
  - Sara: prima il caffè. Ti dà il **Caffè della moka** ×2, consumabile, cura 12 HP.
  - **Gabbo è nella room-7** e, se lo trovi, puoi già affrontarlo: «chiama Marius, tutti al Plein!». È uno scontro facoltativo.

### Capitolo 2 — Alcatraz · *interazione → scontro*
- **Dove:** corridoio principale del piano terra (`base-floor-main`).
- **Obiettivo:** **battere Gabbo**, che esce con uno zaino enorme.
- **Cosa succede:** «nello zaino c'è solo Jäger, non meloni, sbirro, diahane!».
- **Nota:** il capitolo si completa **solo vincendo** lo scontro. Se perdi ti risvegli in salotto e puoi riprovare. Averlo battuto nel capitolo 1 (scontro facoltativo) non conta.

### Capitolo 3 — Rinforzi · *ricerca*
- **Dove:** cucina del primo piano (`first-floor-kitchen`).
- **Obiettivi:** farsi dare qualcosa da **Alessio** («O fra. Meloni no.») e da **Sara**, che aggiunge una sessione di lamentele sui meloni.
- **Ricompense:** Trenbolone (+5 ATK), Palle a terra (+10 HP).
- **Extra:** nel corridoio del primo piano c'è **Lilia**, la sorella di Gaia, venuta a trovarla (prima apparizione).

### Capitolo 4 — La Banda · *scontro + minigioco*
- **Dove:** corridoio principale del piano terra (Gatta) e cucina del primo piano (il frigo). Sono le 23:00.
- **Obiettivi**, in qualsiasi ordine:
  - **sconfiggere Gatta**, che dice di portare i meloni a Brescia. Serve vincere. Dopo: «I meloni non ce li ho, giuro su Brescia».
  - **pulire il frigo di su.** Nima scrive nel gruppo che c'è un formaggio ammuffito pieno di mosche. Davanti al frigo (la parte destra dei pensili) parte il minigioco in prima persona: muovi il mirino con le frecce o WASD e con Spazio spruzzi detersivo bianco sulle **10 mosche**. Hai 3 spruzzi, poi 3 secondi di ricarica. Quando sono tutte giù, schermo nero per mezzo secondo e il frigo torna pulito.
  - **buttare il formaggio ammuffito** (ce l'hai nello zaino) nei bidoni della cucina.

### Capitolo 5 — L'Esame di Caue · *quiz*
- **Dove:** corridoio principale del primo piano.
- **Domanda:** «Completa la parola: Chi ha due meloni...» → **«...ne dia uno a chi non ne ha»**. È l'indizio che tornerà nel finale.

### Capitolo 6 — Ispezione · *esplorazione*
- **Obiettivi:** cercare i meloni nella **lavanderia** e nella **cucina del piano terra** (non quella di su, dove si prepara l'aperitivo). In lavatrice solo calzini spaiati.
- Nel gruppo Ana invita tutti all'aperitivo di stasera in cucina di su.

### Capitolo 7 — L'aperitivo · *scena*
- **Dove:** cucina del primo piano, alle 19:00. Ci sono tutti i coinquilini (tranne Caue e Gabbo), più Lilia ed Ernesto (vino e salame dal Piemonte).
- **Obiettivo:** raggiungere l'aperitivo di Ana. Entrando in cucina parte la scena: ognuno dice la sua, la visuale zooma su chi parla, che si gira verso la telecamera, e la battuta appare in grande con il resto dello schermo oscurato.
- **Alla fine:** 2 *Guacamole di Ana* (curano 25) e un cuore con ognuno dei presenti. Il capitolo si completa.

### Capitolo 8 — La Spesa · *ricerca*
- **Obiettivi:** senza meloni servono provviste: **Caffè** da Sara (cucina del piano terra) e **Birra** da Mari (1° piano).
- **Ricompense:** Caffè (+2 ATK), Birra (+2 DEF).

### Capitolo 9 — Gli indizi · *interazione*
- **Obiettivi:** chiedere in giro ad **Ana** e **Gaia** (corridoi del piano terra).
- **Cosa succede:**
  - Ana ha visto Caue salire con un sacchetto grosso;
  - Gaia (che mangia solo noodles) ha sentito qualcuno pregare in cucina di notte;
  - Emanuele ti regala i **Biscotti fatti in casa** ×2 (curano 15 HP).

### Capitolo 10 — Caccia Grossa · *misto, in qualsiasi ordine*
- **Obiettivi:**
  - **sconfiggere Mari**: «Fede non arriva e tu pensi solo ai meloni!»;
  - **rispondere al quiz di Gaia**: «Chi ama Gaia più di tutti?» → **Alessio**;
  - ottenere il **Verbale** da Alessio: «Meloni scomparsi. Tutto scritto.» (+3 DEF).
- Accanto a Gaia c'è di nuovo **Lilia**: chiederle una heets è un errore.

### Capitolo 11 — I due meloni · *finale*
- **Obiettivi:** il **Distintivo d'Oro** da Alessio e **sconfiggere Caue** (corridoio principale del piano terra).
- **Cosa succede:** Caue stringe i due meloni: «Sta scritto: chi ha due meloni ne dia uno a chi non ne ha. Tu ne avevi due, io nessuno». Vinci e te li riprendi.
- **Ricompensa:** Distintivo d'Oro (+5 ATK, +15 HP, +3 DEF).

### Capitolo 12 — Notte all'Alcatraz · *uscita* (epilogo, scheletro)
- **Quando:** dopo il finale, alle 23:30. I meloni sono tornati, ma Alessio non si fa più trovare: sta sempre con Gaia.
- **Obiettivi:**
  - trovare **Gabbo** nella hall del piano terra (il salotto): «O fra, Alessio non c'è, è sempre con Gaia… mi servi te per andare a pushare, diahane»;
  - uscire dalla **porta d'ingresso** (prima di parlare con Gabbo non si esce): parte il video dell'uscita e ti ritrovi all'**Alcatraz**, la discoteca di Milano;
  - **aiutare Gabbo a farsi dare un numero**: in pista, tra la folla di sagome che balla a tempo, ci sono 4 ragazze. Sopra ognuna c'è il suo umore (💃 ballare, 🍹 bere, 😂 ridere, 😒 non ora): parli con lei, Gabbo ti chiede cosa dire e scegli l'approccio. Quello giusto fa salire i ❤️, quello sbagliato li fa scendere; finiti i tentativi lei se ne va per un po'.
    - **Martina** (gonna leopardata): la più facile, 2 ❤️, ama ballare.
    - **Ludovica** (bionda) e **Vanessa** (rossa): alta autostima, 3 ❤️; Ludovica ama farsi offrire da bere, Vanessa ridere.
    - **Chiara** (castana con gli stivali): vuole **Gabbo** e gli chiede di andare a casa con lei. Gabbo chiede a te cosa fare: devi **scoraggiarlo**. Se lo lasci andare, **la missione è persa**: ti risvegli in camera e devi tornare da Gabbo e all'Alcatraz.
  - poi **salire sul palco** con Gabbo, nella sala principale.
- **Dopo:** il gioco finisce qui (titoli di coda). Dall'Alcatraz si torna a casa dalla porta della lobby.
- **Musica:** "Disco Party" di Aurec (Pixabay). Locale al buio con luci colorate che girano sulla pista.
- **Da completare:** il video (`assets/cutscenes/alcatraz.mp4`) e la grafica del locale (per ora pavimento scuro, palco e bar colorati).

## Crescita di Zio Nick

| Dopo il capitolo | Oggetti | HP / ATK / DEF |
|---|---|---|
| inizio | — | 30 / 5 / 2 |
| 3 | Trenbolone, Palle a terra | 40 / 10 / 2 |
| 7 | + Caffè, Birra | 40 / 12 / 4 |
| 9 | + Verbale | 40 / 12 / 7 |
| 10 | + Distintivo d'Oro | 55 / 17 / 10 |

## Scontri

**Le regole:**
- **Danno di Zio Nick:** potenza della mossa + ATK − DEF del nemico.
- **Danno del nemico:** usa a caso una delle sue mosse; potenza della mossa + ATK nemico − DEF di Zio Nick.
- **SEI IN ARRESTO** è il colpo di grazia: funziona solo sotto il **40%** degli HP del nemico, altrimenti fallisce e il turno è perso. Nel menu è grigia finché non è disponibile.
- **Zaino:** in battaglia puoi usare un consumabile (cura HP, ma usa il turno).
- **Niente fuga.**
- **Stati** (valgono per entrambi; li vedi sulla targhetta degli HP):
  - **Imbarazzo**: salti la prossima azione.
  - **Sonno**: per le prossime 2 azioni fai metà danno.

**Le mosse:**

| Chi | Mossa | Potenza | Effetto |
|---|---|---|---|
| Zio Nick | Spinta | 6 | — |
| Zio Nick | Insulto | 9 | 25%: imbarazzo |
| Zio Nick | Manette | 5 | 60%: imbarazzo |
| Zio Nick | SEI IN ARRESTO | — | KO se il nemico è sotto il 40% |
| Gabbo | Chiamata a Marius / Spintone da Plein / Shot di Jäger | 5 / 6 / 3 | Jäger 25%: sonno |
| Gatta | Pota! / Graffio / Vado a Brescia | 4 / 5 / 3 | Brescia 30%: imbarazzo |
| Mari | Sfuriata / Birra in testa / Attesa infinita di Fede | 5 / 6 / 3 | Fede 40%: sonno |
| Caue | Giudizio / Colossesi 3:13 / Predica | 6 / 4 / 3 | Colossesi 35%: imbarazzo · Predica 40%: sonno |

**Gli scontri della storia.** Ho simulato 20.000 scontri ciascuno, con le regole esatte del gioco, partendo con gli HP pieni e con gli oggetti che hai a quel punto della storia. Siccome i danni restano, conviene sedersi a riposare prima degli scontri importanti.

| Nemico | HP / ATK / DEF | Quando | Vittorie | HP rimasti in media |
|---|---|---|---|---|
| Gabbo | 34 / 8 / 3 | cap. 1 (facoltativo) / cap. 2 | 98% | 14 su 30: teso |
| Gatta | 34 / 9 / 3 | cap. 4 | 98% | 22 su 40 |
| Mari | 46 / 13 / 5 | cap. 10 | 100% | 23 su 40 |
| Caue | 70 / 17 / 6 | cap. 11, senza distintivo | 45% | 16 su 40 |
| Caue | 70 / 17 / 6 | cap. 11, con distintivo | 96% | 26 su 55 |

Ribilanciati leggermente il 14/10/2026 (prima Gatta, Mari e Caue si battevano sempre quasi senza danni): ora lasciano il segno e conviene sedersi o usare i consumabili tra uno scontro e l'altro; contro Caue il **Distintivo d'Oro** fa la differenza.

## Oltre la storia

- **Orologio e giorno/notte:** in alto a sinistra c'è l'ora del gioco (☀️ giorno, 🌅 alba, 🌆 sera, 🌙 notte), che scorre di un minuto ogni secondo di gioco. Di notte la casa si scurisce. Ogni capitolo comincia a un'ora sua (cap. 1 alle 7:30, cap. 2 alle 22:30, cap. 3 alle 11:00, cap. 4 alle 23:00, cap. 5 alle 16:00, cap. 6 alle 9:00, cap. 7 (aperitivo) alle 19:00, cap. 8 alle 17:30, cap. 9 alle 18:30, cap. 10 alle 10:30, cap. 11 alle 21:00) e i messaggi del telefono hanno orari coerenti.
- **Le scenette** (come l'aperitivo) sono "da film": bande nere, interfaccia nascosta, la visuale zooma su chi parla, che si gira verso la telecamera e fa un saltello; dopo mezzo secondo la battuta appare in grande, col ritratto alto mezzo schermo e il resto oscurato. Lo schermo trema sulle battute urlate.
- **Arredi nuovi:** l'aperitivo sul tavolo della cucina di su (solo nel capitolo 7), un armadio nell'anticamera di ogni camera singola, il divano visto da dietro nel soggiorno del piano terra.
- **Si riparte sempre dalla camera di Zio Nick**, qualunque sia il salvataggio.
- **Scegli capitolo** (schermata iniziale): riparti da un capitolo già raggiunto. Quel capitolo e i successivi si azzerano (obiettivi, oggetti e consumabili ricevuti lì, scene viste); restano calzini, favori, punti casa, affinità e indizi.

- **Telefono (P):** si apre sulla lista delle chat, come WhatsApp: il gruppo "Cucina di su" e le **chat private** coi coinquilini. Ognuna ha il suo pallino dei non letti, e accanto al nome ci sono i cuori di affinità.
- **Affinità ❤:** ogni coinquilino ha da 0 a 5 cuori. Li guadagni chiacchierando (il primo saluto di ogni capitolo), facendo favori, battendo Gabbo nelle rivincite e comprando da Alessio. A 2 e 4 cuori ti scrive un messaggio privato.
- **Favori ★ e punti casa:** Emanuele (la moka, dal cap. 2), Gaia (i noodles, cap. 3), Ana (l'avocado, cap. 4), Nima (il coperchio, cap. 5) e Sara (il detersivo, cap. 6) ti chiedono di trovare qualcosa nei mobili. Il "?" azzurro indica chi ha un favore. Riportandoglielo guadagni **punti casa**, da spendere nel **negozio di Alessio**: Proteine (cura 20), Pre-workout (+2 ATK), Cintura da palestra (+2 DEF).
- **Gabbo in giro ⚔:** dal capitolo 3 Gabbo gira per i corridoi, in un posto diverso a ogni capitolo. Una rivincita per capitolo, e se vinci prendi 8 punti casa.
- **L'indagine 🔍:** all'inizio una breve premessa sul caso dei meloni. Dal capitolo 3 l'indagine si apre: 4 indizi nascosti nei mobili (bidoni del piano terra, isola e pensili di su, comodino della camera 13), elencati nello zaino. Nel finale, prima dello scontro con Caue, puoi presentare una prova: quella giusta lo fa partire con il 30% di HP in meno, quella sbagliata ti costa 6 HP.
- **L'aperitivo di Ana 🥑:** è il capitolo 7 (vedi sopra).
- **La casa vive in cucina di su:** nei capitoli in cui non hanno un ruolo nella storia, i coinquilini stanno in cucina al primo piano.

## Il finale

Quando completi il capitolo 11 i due meloni tornano a casa 🍈🍈 e partono i **titoli di coda**, una volta sola, con:
- tempo di gioco;
- scontri vinti e persi;
- oggetti raccolti.

Poi con Spazio torni in casa e puoi continuare a girare.

## Il gruppo "Cucina di su"

Il telefono (P) è una chat stile WhatsApp del gruppo **Cucina di su**:
- in alto c'è il messaggio fissato 📌 con la missione attuale e dove andare per ogni obiettivo;
- sotto ci sono i messaggi, con un separatore per ogni capitolo.

A ogni capitolo arrivano 2–5 messaggi normali dai coinquilini: il primo dà l'indizio su dove andare, gli altri sono chiacchiere di casa. **Nessuno sa dei meloni di Zio Nick**: in chat non se ne parla mai, ne parlano solo i coinquilini che lui interroga di persona. I testi sono nei file `js/story/chapter-N/chapter-N.js`, alla voce `phone`. Sono **provvisori**: riscrivili con lo stile vero del vostro gruppo.

## Idee per i prossimi capitoli

- **L'indagine.** Raccogliere indizi esaminando stanze e oggetti, poi accusare il colpevole scegliendo le prove giuste: il "caso dei piatti nel lavandino".
- **Le camere.** Ogni camera diventa del suo inquilino, con oggetti caratteristici e magari una chiave per entrarci.
- **La raccolta differenziata.** Un minigioco nella trashbin-room, davanti alla room-9.
- **Fede Papi arriva davvero.** Una chiusura per la storyline di Mari.
- **La rivincita di Gabbo.** Gabbo torna dopo il finale, più forte.

Per aggiungere un capitolo, la procedura tecnica è in CLAUDE.md → *How-to recipes*.
