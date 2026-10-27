# OPSgame — La storia

Il documento di riferimento per la trama: chi c'è, cosa succede in ogni capitolo e come cresce Zio Nick.
La fonte di verità restano i file di gioco: `js/story/chapter-N/chapter-N.js` per gli obiettivi e `assets/characters/<id>/character.json` per posizioni, dialoghi, scontri e oggetti. **Quando cambi la storia, aggiorna anche questo file** e lancia il controllo automatico:

```bash
node --no-warnings tools/checks/story-check.mjs
```

---

## Premessa

**Zio Nick non si fa mai gli affari suoi.** Una mattina nel gruppo della cucina tutti parlano di **Gabbo l'allungamani** e delle sue mani lunghe, e Zio Nick va a "fare giustizia". Perde: «Aia, il ginocchio!». Si risveglia in cucina con i piselli surgelati di Mari sul ginocchio e una sola idea per riprendersi: **il suo chili**. Ma i suoi **due peperoni** sono spariti dal frigo.

Comincia la caccia: il riso di Antonella, i pomodorini di Emanuele, la camera 18 (e il frigo segreto di Alessio, che non c'è), la bilancia che ricorda tutto, il frigo con le mosche, una notte all'Alcatraz e un incubo. Alla fine la verità: **i peperoni li ha presi Gabbo**. La rivincita, stavolta vinta, e il chili per tutta la casa.

> Gabbo "allungamani": solo allusioni (le pacche citate, mai mostrate, le ragazze che dicono di stare attente), d'accordo con lui. Mai "stupratore".

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

All'avvio puoi scegliere **Continua**, **Scegli capitolo** o **Nuova partita**. La nuova partita chiede conferma se esiste già un salvataggio. Per le prove c'è anche **🛠 DEV · Scegli capitolo** (temporaneo, da togliere prima dell'uscita): parte da un capitolo qualsiasi come se i precedenti fossero fatti, con i loro oggetti nello zaino; è una partita nuova e sovrascrive il salvataggio.

**Gli HP di Zio Nick restano tra uno scontro e l'altro.** Fuori dagli scontri si vedono solo nello zaino (I).
- per recuperarli ti siedi su una sedia o uno sgabello in cucina (+3 HP al secondo) e ti alzi con le frecce o Spazio;
- oppure dormi nel **letto di Zio Nick**, nella **camera 20** al primo piano: un pisolino e gli HP tornano al massimo;
- gli oggetti che aumentano gli HP massimi curano anche della stessa quantità;
- se perdi uno scontro ti risvegli **sul divano del salotto** con gli HP pieni, e puoi riprovare parlando di nuovo con il nemico. (Fa eccezione il primo scontro con Gabbo, che si perde per copione: lì la storia va avanti.)

**Regola d'oro delle missioni.** Un obiettivo conta solo se lo completi *mentre quel capitolo è attivo*. Parlare con qualcuno nel capitolo 1 non spunta "parla con X" del capitolo 2. Gli **oggetti** invece contano sempre: averli è uno stato, non un'azione.

## Personaggi

| Id | Nome | Ruolo nella storia | HP / ATK / DEF |
|---|---|---|---|
| `zionick` | Zio Nick | protagonista: saccente, ingegnere mancato, non si fa mai gli affari suoi | 30 / 100 / 2 (ATK 100 messo dall'utente; il valore di gioco era 5) |
| `gabbo` | Gabbo | l'allungamani: batte Zio Nick all'inizio, ha preso i peperoni | 34 / 8 / 3 |
| `mari` | Mari | mette i piselli surgelati sul ginocchio, poi prepara la fascia | 46 / 13 / 5 |
| `antonella` | Antonella | nuova in casa, 19 anni, piccolina: l'International Rice | 24 / 4 / 2 |
| `ema` | Emanuele | vuole i pomodorini per la pasta al salmone («SCIMMIA!») | 28 / 4 / 2 |
| `gaia` | Gaia | sparita: è nella camera 18 con Alessio | 28 / 5 / 2 |
| `timo` | Alessio | camera 18; il frigo segreto (falsa pista); il negozio dei punti casa | 30 / 6 / 2 |
| `ernesto` | Ernesto, "Er Fresco" | piemontese, designer del draghetto Kinder: ha le pile | 28 / 5 / 2 |
| `nima` | Nima | fissato con la cucina; le mosche nel frigo | 28 / 4 / 2 |
| `sara` | Sara | il caffè della moka, sa dov'è Gaia | 30 / 5 / 3 |
| `ana` | Ana | "gumba bro", l'aperitivo col guacamole | 26 / 5 / 2 |
| `gatta` | Gatta (Federico "Fede" Gatta) | pota, Brescia | 34 / 9 / 3 |
| `lilia` | Lilia | sorella di Gaia, ospite: compare 3 volte (cap. 5, 6, 11), sempre con l'IQOS | 26 / 4 / 2 |
| `caue` | Caue | appare solo con un versetto nel gruppo (cap. 11) | — |

All'Alcatraz (capitolo 8) ci sono anche le ospiti **Martina**, **Ludovica**, **Vanessa**, **Chiara** e i **maranza**.

### Come parlano

Ogni personaggio ha un `persona.md` in `assets/characters/<id>/` con il suo modo di parlare: vale per dialoghi e messaggi nel gruppo.

| Personaggio | Come parla |
|---|---|
| Zio Nick | parla ogni tanto, da saccente: ingegneria meccanica/aerospaziale sopra tutto, gestionale «non fa una sega»; chiama Emanuele «SCIMMIA»; «Aia, il ginocchio!» |
| Antonella | bestemmia (censurata) in ogni frase, non sa l'inglese; l'abruzzese vero arriverà dall'utente |
| Emanuele | "O Szio Nick...", "sz" al posto della "z", sempre "grszie", domande tipo "dov'è la farmacia?" |
| Ana | in inglese, invita agli aperitivi (guacamole) |
| Gabbo | "O fra" all'inizio di **ogni** frase e "diahane" alla fine |
| Alessio | taciturno, "O fra" solo all'inizio della prima frase |
| Gaia | "senza rispetto" ogni tanto, sempre con Alessio; Zio Nick le chiede sempre di Lilia |
| Ernesto | italiano normale; vino, aperitivi, salame piemontese, il draghetto Kinder |
| Lilia | "compa", "amunì", Andrea Raineri, guai a chiederle una heets |
| Nima | inglese + italiano rotto, *Buongiorns*, *Goodnights*; scritte in arabo; fissato con la cucina |
| Mari | fiorellini ed emoji, sticker; aspetta sempre Fede |
| Gatta (Fede) | "pota" e Brescia |
| Sara | ogni tanto un "porco d\*o" |
| Caue | solo versetti, quasi mai |

Nel gruppo "Cucina di su" arrivano **da 2 a 5 messaggi per capitolo**: il primo dà l'indizio della missione, gli altri sono chiacchiere di casa.

> Il personaggio `timo` nel gioco si chiama **Alessio** (Timo e Alessio sono la stessa persona).

## I capitoli

La partita comincia nella **camera di Zio Nick** (room-20, primo piano), appena sveglio. Anche caricando un salvataggio si riparte sempre da lì. Quasi tutta la casa sta in **cucina di su** (cucina del primo piano).

### Capitolo 1 — La sconfitta · *scontro perso per copione*
- **Quando:** 7:30. Nel gruppo si parla delle mani lunghe di Gabbo.
- **Obiettivo:** affrontare **Gabbo** nel corridoio principale del primo piano. Zio Nick: «Gabbo! Basta con le mani lunghe.» / «Le pacche amichevoli si danno sulla spalla. Fisica di base.»
- **Lo scontro non si può vincere:** Gabbo non scende sotto il 60% degli HP, l'arresto non funziona e ogni suo colpo toglie un terzo degli HP. Zio Nick va giù: «Aia, il ginocchio!».
- In cucina Sara offre il **Caffè della moka** (×2, cura 12).

### Capitolo 2 — I piselli surgelati · *scena + interazione*
- **Quando:** 9:00. Zio Nick si risveglia in cucina di su, vicino ai divani.
- **Scena:** Mari gli tiene i **piselli surgelati** sul ginocchio; Zio Nick vuole il suo chili per riprendersi… ma **i due peperoni sono spariti**. Ricevi **Piselli surgelati** (cura 10).
- **Poi:** chiedere a **Sara** e a **Nima**. Nima: in frigo ieri c'erano, e manda da Antonella.

### Capitolo 3 — International Rice · *scena + oggetto*
- **Quando:** 12:30, pranzo in cucina di su.
- **Scena:** Antonella cucina il suo **International Rice** e tutta la cucina la prende in giro (Ana, Emanuele, Nima, Ernesto, Alessio, che si becca il «ti rispedisco in Moldavia»).
- **Obiettivo:** assaggiarlo: Antonella ti dà **International Rice** (cura 3) e la prima pista: ieri sera Emanuele frugava in frigo con una busta.

### Capitolo 4 — La pasta al salmone · *ricerca*
- **Quando:** 19:30.
- **Obiettivi:** parlare con **Emanuele** (vuole i pomodorini per la pasta al salmone; Zio Nick: «SCIMMIA!»); trovare i **pomodorini** sotto l'isola della **cucina di sotto**; riportarglieli. In cambio: **Pasta al salmone** (×2, cura 20) e la pista: Gaia è uscita dalla cucina con una busta e non si trova più.

### Capitolo 5 — La camera 18 · *esplorazione + falsa pista*
- **Quando:** 11:00. Gaia è sparita (Lilia la cerca nel corridoio).
- **Obiettivi:** trovare **Gaia** nella **camera 18**, con Alessio. Zio Nick la punzecchia («gestionale non fa una sega») e pensa: «Sono sicuro che quel bastardo ha un frigo in camera, ma ancora non l'ho colto con le mani nel sacco.» Poi **cercare il frigo** nell'armadio di Alessio: **niente** (falsa pista). Infine **Alessio**: la bilancia della cucina di su ha le pile scariche. Zio Nick, da ingegnere: le bilance digitali ricordano l'ultima pesata.

### Capitolo 6 — La bilancia · *oggetto + esamina*
- **Quando:** 18:00, la sera dell'aperitivo di Ana.
- **Obiettivi:** farsi dare le **Pile AAA** da Ernesto (le usa per i prototipi del draghetto); cambiarle alla **bilancia** sul bancone della cucina di su (zona invisibile a sinistra del frigo, finché non arriva un'immagine). In memoria: **480 g alle 03:12 di notte**. «Chi torna a casa alle tre di notte?»
- **Scena:** l'aperitivo di Ana, con il guacamole (×2, cura 25).

### Capitolo 7 — Il frigo con le mosche · *minigioco*
- **Quando:** 10:00. Nima protesta per il formaggio ammuffito.
- **Obiettivi:** pulire il frigo di su dalle mosche (minigioco in prima persona) e buttare il formaggio nei bidoni. Dietro il formaggio c'è un **braccialetto dell'Alcatraz**.

### Capitolo 8 — Notte all'Alcatraz · *uscita*
- **Quando:** alle 23:30. La pista del braccialetto porta all'Alcatraz, e Alessio non si fa più trovare (sta sempre con Gaia): Gabbo cerca qualcuno con cui uscire e Zio Nick ci va, per scoprire la verità.
- **Obiettivi:**
  - trovare **Gabbo** nella hall del piano terra (il salotto): «O fra, Alessio non c'è, è sempre con Gaia… mi servi te per andare a pushare, diahane»;
  - uscire dalla **porta d'ingresso** (prima di parlare con Gabbo non si esce): parte il video dell'uscita e ti ritrovi all'**Alcatraz**, la discoteca di Milano;
  - **aiutare Gabbo a farsi dare un numero**: in pista, tra la folla di sagome che balla a tempo, ci sono 4 ragazze. Sopra ognuna c'è il suo umore (💃 ballare, 🍹 bere, 😂 ridere, 😒 non ora): parli con lei, Gabbo ti chiede cosa dire e scegli l'approccio. Quello giusto fa salire i ❤️, quello sbagliato li fa scendere; finiti i tentativi lei se ne va per un po'.
    - **Gabbo ti segue** ovunque nel locale, come il Pokémon dietro al protagonista.
    - **🍹 Bar:** se lei vuole da bere, vai al **bar** (il bancone quadrato in fondo a destra, con il barista che gira dentro) e scegli il drink: 🍺 Birra (gratis), 🍹 Spritz (4 punti casa) o 🥃 Jäger bomb (8 punti casa): ogni drink vale +1 ❤️. Torni da lei entro 45 secondi. Lei beve… e **Gabbo beve lo stesso drink**: più è forte, più si ubriaca, e più è ubriaco più spesso dice la cosa sbagliata (e più rischia di cedere a Chiara).
    - **💃 Sfida di ballo:** se lei vuole ballare ti sfida. Frecce a tempo di musica: se balli bene guadagni **+1 ❤️**.
    - **😒** dura poco: qualche secondo, poi cambia umore.
    - **5 maranza** sparsi nel locale (2 nella seconda sala, 3 nella principale), ognuno nella sua zona: se ti vede gli spunta un **!** in testa e ti viene dietro per rubarti il telefono, ma non esce mai dalla sua zona. Da sobrio non ci riesce mai; più avete bevuto, più è probabile che ce la faccia. Se te lo ruba perdi 5 punti casa e resti senza telefono finché non esci dal locale.
    - Sul palco principale balla un **orso con gli occhiali da sole**, a tempo di musica.
    - **Martina** (gonna leopardata): la più facile, 3 ❤️, ama ballare.
    - **Ludovica** (bionda) e **Vanessa** (rossa), insieme nella seconda sala: alta autostima, 4 ❤️; Ludovica ama farsi offrire da bere, Vanessa ridere.
    - **Chiara** (castana con gli stivali): vuole **Gabbo** e **vi segue piano** per tutto il locale. Se lo raggiunge gli chiede di andare a casa con lei e Gabbo chiede a te cosa fare: devi **scoraggiarlo** (il rifiuto è già selezionato; per lasciarlo andare devi confermare due volte). Ma se Gabbo è ubriaco può andarci lo stesso. Se lo lasci andare, **la missione è persa**: ti risvegli in camera e devi tornare da Gabbo e all'Alcatraz.
  - poi **salire sul palco** con Gabbo: è rialzato, in fondo alla sala principale, e ci si sale dai **due gradini** al centro. Lassù Gabbo si tradisce: «O fra, sarà il chili che ho mangiato, diahane.» Zio Nick: «...Chili? Con quali peperoni?!» Anche la seconda sala ha il suo palco rialzato, gente che balla e luci.
- **Dopo:** si torna a casa dalla porta della lobby dell'Alcatraz e comincia il capitolo 9.
- **Musica:** "Disco Party" di Aurec (Pixabay). Locale al buio con luci colorate che girano sulla pista.
- **Da completare:** il video (`assets/cutscenes/alcatraz.mp4`) e la grafica del locale (per ora disegnata in codice: pavimento scuro, palchi in legno, bancone).

### Capitolo 9 — Il sogno di Zio Nick · *fuga*
- **Quando:** alle 4 di notte, dopo l'Alcatraz. In casa dormono tutti.
- **1. A letto:** Zio Nick va a dormire nel suo letto (camera 20). Chiude gli occhi…
- **2. La casa del sogno:** si "sveglia" in piedi davanti al suo letto, ma è tutto più strano, cupo e buio: colori spenti e si vede solo una bolla di luce intorno a lui. Zio Nick dice: «Oh cavolo...», «Ho dimenticato di buttare la spazzatura...», «C'è una puzza orribile...». **Nuovo obiettivo: vai nel locale spazzatura** (piano terra). Uscendo dalla camera prova ad accendere la luce: «...non va. Molto strano.» Nel corridoio: «Strano... non si accende la solita luce del corridoio.»
- **3. Il locale spazzatura:** la puzza è insopportabile… il pavimento sotto i bidoni si spalanca nel buio e Zio Nick precipita in un **labirinto**.
- **4. Il labirinto:** si vede **solo una piccola bolla di luce** intorno a Zio Nick, tutto il resto è nero. Le gambe sono pesanti. Zio Nick: «Dove sono? Devo trovare velocemente una via d'uscita... Questo posto mi dà i brividi.» Dopo tre passi tutto si ferma, lo schermo trema e alle sue spalle si alza un'**ombra** con la sagoma di Zio Nick; lui sobbalza («Cos'è quella cosa?!») e parte l'inseguimento. L'ombra conosce sempre la strada (ma non passa attraverso i muri) e accelera, ma resta un filo più lenta di te. La vedi solo quando entra nella tua luce; quando è vicina lo schermo si tinge di rosso e trema. **Si ha un solo tentativo:** se ti prende compare a tutto schermo il suo volto (jumpscare) per 5 secondi, con lo schermo che trema e un urlo; poi Zio Nick si sveglia urlando davanti al suo letto e il capitolo finisce comunque.
- **Interfaccia:** per tutto il sogno non c'è interfaccia (niente missione, telefono, orologio): solo Zio Nick e il buio.
- **Alla fine:** raggiunta la luce in alto a destra, Zio Nick si sveglia di soprassalto davanti al suo letto. «Era solo un sogno... forse.» Ed è ora della resa dei conti.
- **Musica:** una traccia per la casa del sogno, una per il labirinto, e un suono ogni volta che l'ombra si avvicina.

### Capitolo 10 — La rivincita · *scontro*
- **Quando:** 12:00. Zio Nick mette insieme gli indizi: la bilancia alle 03:12, il braccialetto in frigo, il chili sul palco.
- **Facoltativo, in cucina di su:** Mari ti dà la **Fascia per il ginocchio** (+2 DEF, +10 HP max), Alessio i **Guanti da palestra** (+3 ATK).
- **Obiettivo:** battere **Gabbo** nel corridoio principale del piano terra. Confessa («O fra… va bene, li ho presi io, diahane») e stavolta si può vincere. Dopo la vittoria ti ridà i **Due peperoni**: «E le mani a posto. Sempre.»

### Capitolo 11 — Il chili · *scena finale*
- **Quando:** 20:00.
- **Obiettivo:** andare in cucina di su: Zio Nick cucina il **chili** per tutta la casa, e ognuno dice la sua (Gabbo ne vuole un piatto: «Solo se tieni le mani a posto»). Poi i titoli di coda.

## Crescita di Zio Nick

| Quando | Oggetti | HP / ATK / DEF (con ATK base 5) |
|---|---|---|
| inizio | — | 30 / 5 / 2 |
| cap. 10, in cucina | Fascia per il ginocchio, Guanti da palestra | 40 / 8 / 4 |

Consumabili lungo la storia: Caffè della moka (cap. 1), Piselli surgelati (2), International Rice (3), Pasta al salmone (4), Guacamole di Ana (6). Nel negozio di Alessio: Proteine, Pre-workout (+2 ATK), Cintura da palestra (+2 DEF).

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

**I due scontri con Gabbo:**
- **Capitolo 1:** perso per copione (vedi sopra), qualunque cosa fai.
- **Capitolo 10:** scontro normale. Con ATK base 5 e senza oggetti, Insulto fa 11 danni: due colpi lo portano sotto il 40% e al terzo turno lo arresti, mentre lui ti toglie circa 21 HP su 30. Con fascia e guanti (14 danni a colpo, ~17 HP persi su 40) è sicuro. Se perdi ti risvegli sul divano del salotto e riprovi.

## Oltre la storia

- **Orologio e giorno/notte:** in alto a sinistra c'è l'ora del gioco (☀️ giorno, 🌅 alba, 🌆 sera, 🌙 notte), che scorre di un minuto ogni secondo di gioco. Di notte la casa si scurisce. Ogni capitolo comincia a un'ora sua (cap. 1 alle 7:30, cap. 2 alle 9:00, cap. 3 alle 12:30, cap. 4 alle 19:30, cap. 5 alle 11:00, cap. 6 alle 18:00, cap. 7 alle 10:00, cap. 8 alle 23:30, cap. 9 alle 4:00, cap. 10 alle 12:00, cap. 11 alle 20:00) e i messaggi del telefono hanno orari coerenti.
- **Le scenette** (i piselli, il riso, l'aperitivo, il chili) sono "da film": bande nere, interfaccia nascosta, la visuale zooma su chi parla, che si gira verso la telecamera e fa un saltello; dopo mezzo secondo la battuta appare in grande, col ritratto alto mezzo schermo e il resto oscurato. Lo schermo trema sulle battute urlate. Anche Zio Nick ha le sue battute.
- **Arredi nuovi:** l'aperitivo sul tavolo della cucina di su (solo nel capitolo 6), un armadio nell'anticamera di ogni camera singola, il divano visto da dietro nel soggiorno del piano terra.
- **Si riparte sempre dalla camera di Zio Nick**, qualunque sia il salvataggio.
- **Scegli capitolo** (schermata iniziale): riparti da un capitolo già raggiunto. Quel capitolo e i successivi si azzerano (obiettivi, oggetti e consumabili ricevuti lì, scene viste); restano calzini, favori, punti casa e affinità.

- **Telefono (P):** si apre sulla lista delle chat, come WhatsApp: il gruppo "Cucina di su" e le **chat private** coi coinquilini. Ognuna ha il suo pallino dei non letti, e accanto al nome ci sono i cuori di affinità.
- **Affinità ❤:** ogni coinquilino ha da 0 a 5 cuori. Li guadagni chiacchierando (il primo saluto di ogni capitolo), facendo favori e comprando da Alessio. A 2 e 4 cuori ti scrive un messaggio privato.
- **Favori ★ e punti casa:** Emanuele (la moka, dal cap. 2), Gaia (i noodles, cap. 3), Ana (l'avocado, cap. 4), Nima (il coperchio, cap. 5) e Sara (il detersivo, cap. 6) ti chiedono di trovare qualcosa nei mobili. Il "?" azzurro indica chi ha un favore. Riportandoglielo guadagni **punti casa**, da spendere nel **negozio di Alessio**: Proteine (cura 20), Pre-workout (+2 ATK), Cintura da palestra (+2 DEF).
- **L'aperitivo di Ana 🥑:** nel capitolo 6, in cucina di su: una scenetta con tutta la casa e 2 porzioni di guacamole (cura 25).
- **La casa vive in cucina di su:** nei capitoli in cui non hanno un ruolo nella storia, i coinquilini stanno in cucina al primo piano.

## Il finale

Quando completi l'ultimo capitolo (l'11, il chili) partono i **titoli di coda**, una volta sola, con:
- tempo di gioco;
- scontri vinti e persi;
- oggetti raccolti.

Poi con Spazio torni in casa e puoi continuare a girare.

## Il gruppo "Cucina di su"

Il telefono (P) è una chat stile WhatsApp del gruppo **Cucina di su**:
- in alto c'è il messaggio fissato 📌 con la missione attuale e dove andare per ogni obiettivo;
- sotto ci sono i messaggi, con un separatore per ogni capitolo.

A ogni capitolo arrivano 2–5 messaggi normali dai coinquilini: il primo dà l'indizio su dove andare, gli altri sono chiacchiere di casa. I testi sono nei file `js/story/chapter-N/chapter-N.js`, alla voce `phone`. Sono **provvisori**: riscrivili con lo stile vero del vostro gruppo.

## Da completare

- **Antonella in abruzzese:** servono 4–5 espressioni vere (per ora parla italiano).
- **Le camere di tutti:** per ora solo Alessio (camera 18) ha il campo `room`.
- **La bilancia:** un'immagine, se c'è (per ora è una zona invisibile sul bancone).
- **Il video dell'Alcatraz** e la grafica del locale.

Per aggiungere un capitolo, la procedura tecnica è in CLAUDE.md → *How-to recipes*.
