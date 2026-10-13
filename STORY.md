# OPSgame — La storia

Il documento di riferimento per la trama: chi c'è, cosa succede in ogni capitolo e come cresce Zio Nick.
La fonte di verità restano i file di gioco: `js/story/chapter-N/chapter-N.js` per gli obiettivi e `assets/characters/<id>/character.json` per posizioni, dialoghi, scontri e oggetti. **Quando cambi la storia, aggiorna anche questo file** e lancia il controllo automatico:

```bash
node --no-warnings tools/checks/story-check.mjs
```

---

## Premessa

**Zio Nick** si è appena trasferito nel co-housing e si comporta da "sbirro" della casa. Il primo giorno conosce i coinquilini, poi si mette sulle tracce di **Gabbo** e della sua banda: **Gatta** e **Mari**. Alla fine scopre che dietro a tutto c'era **Caue**, la mente insospettabile che cita le Scritture.

## Come si gioca

| Tasto | Azione |
|---|---|
| Frecce o WASD | muoversi; nei menu, scegliere (frecce) |
| Spazio | parlare, far avanzare il dialogo, confermare. Se non hai nessuno davanti e sei su una sedia o uno sgabello, ti **siedi** |
| I | zaino: **HP di Zio Nick**, oggetti con i loro bonus, consumabili |
| P | telefono: la chat WhatsApp del gruppo **"Cucina di su"**, con la missione e il **dove andare** fissati in alto (↑/↓ o W/S per scorrere) |
| M | mappa del piano dove ti trovi, con gli obiettivi segnati (quelli sull'altro piano sono elencati come "altro piano") |
| Esc | pausa: *Riprendi* / *Ricomincia da capo* (chiude anche zaino, telefono e mappa) |

In basso a sinistra c'è sempre il promemoria dei tasti.

Il gioco **salva da solo**:
- a ogni progresso;
- a ogni cambio stanza;
- ogni 4 secondi;
- quando chiudi la scheda.

All'avvio puoi scegliere **Continua** o **Nuova partita**. La nuova partita chiede conferma se esiste già un salvataggio.

**Gli HP di Zio Nick restano tra uno scontro e l'altro.** Fuori dagli scontri si vedono solo nello zaino (I).
- per recuperarli ti siedi su una sedia o uno sgabello in cucina (+3 HP al secondo) e ti alzi con le frecce o Spazio;
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
| `gatta` | Gatta | complice di Gabbo, sogna Brescia | 20 / 3 / 1 |
| `mari` | Mari | complice, aspetta Fede Papi da sempre | 30 / 6 / 3 |
| `gaia` | Gaia | ama Alessio più di tutti | 28 / 5 / 2 |
| `caue` | Caue | il boss finale, cita i Colossesi | 48 / 9 / 4 |
| `timo` | Timo (Alessio) | fornisce l'equipaggiamento a Zio Nick | 30 / 6 / 2 |

> Nel gioco il personaggio `timo` si chiama "Timo", ma le etichette delle missioni lo chiamano "Alessio". Va uniformato: è nella roadmap di CLAUDE.md.

## I capitoli

### Capitolo 1 — Moving In · *interazione*
- **Dove:** cucina del piano terra (`base-kitchen`).
- **Obiettivi:** salutare **Emanuele**, **Sara** e **Nima**.
- **Cosa succede:**
  - Emanuele dà il benvenuto, Nima si offre di aiutare.
  - Sara sta facendo il caffè e te ne dà: **Caffè della moka** ×2, consumabile, cura 12 HP.
  - Nei corridoi ci sono già Ana e Mari, con le loro frasi di sempre.
  - **Gabbo è nella room-7** e, se lo trovi, puoi già affrontarlo: «chiama Marius, tutti al Plein!». È uno scontro facoltativo.

### Capitolo 2 — Alcatraz · *interazione → scontro*
- **Dove:** corridoio principale del piano terra (`base-floor-main`).
- **Obiettivo:** affrontare **Gabbo**.
- **Cosa succede:** Gabbo annuncia la fuga all'Alcatraz e sfida lo sbirro.
- **Nota:** il capitolo si completa **appena parli con Gabbo**, prima dello scontro. Anche perdendo la battaglia, la storia va avanti.

### Capitolo 3 — Supplies · *ricerca*
- **Dove:** cucina del primo piano (`first-floor-kitchen`).
- **Obiettivi:** ottenere **Trenbolone** da Timo/Alessio e **Palle a terra** da Sara.
- **Ricompense:** Trenbolone (+5 ATK), Palle a terra (+10 HP). Sara te le dà dopo una «sessione di lamentele».
- **Comparse:**
  - Caue nella room-13;
  - Gaia nel corridoio principale del 1° piano;
  - Gatta e Nima nei corridoi verticali.

### Capitolo 4 — La Banda · *scontro*
- **Dove:** corridoio principale del piano terra.
- **Obiettivo:** **sconfiggere Gatta**. Serve vincere: perdere non basta.
- **Cosa succede:** «Pota, vuoi fare a botte bro?». Dopo la vittoria se ne va davvero a Brescia.

### Capitolo 5 — L'Esame di Caue · *quiz*
- **Dove:** corridoio principale del primo piano.
- **Obiettivo:** rispondere giusto alla domanda di **Caue**.
- **Domanda:** «Chi ha lasciato i piatti sporchi nel lavandino?» → risposta giusta: **Gabbo**.
- In caso di errore si può riprovare.

### Capitolo 6 — Ispezione · *esplorazione*
- **Obiettivi:** entrare nella **lavanderia** e nella **cucina del primo piano** durante questo capitolo.
- **Nota:** valgono solo le visite fatte a capitolo in corso. Se il capitolo inizia mentre sei già in una delle due stanze, quella stanza conta subito.

### Capitolo 7 — La Spesa · *ricerca*
- **Obiettivi:** **Caffè** da Sara (cucina del piano terra) e **Birra** da Mari (corridoio verticale del 1° piano).
- **Ricompense:** Caffè (+2 ATK), Birra (+2 DEF). Mari offre la birra mentre aspetta Fede.

### Capitolo 8 — Pace Fatta · *interazione*
- **Obiettivi:** parlare con **Ana** (corridoio verticale 2 del piano terra) e con **Gaia** (verticale 1).
- **Cosa succede:** il giro dei saluti dopo il caos. Emanuele e Nima commentano la pace ritrovata.
  - Emanuele ti regala i **Biscotti fatti in casa** ×2, consumabili, curano 15 HP: giusto in tempo per gli scontri finali.

### Capitolo 9 — Caccia Grossa · *misto, in qualsiasi ordine*
- **Obiettivi:**
  - **sconfiggere Mari** nel corridoio principale del 1° piano: «Fede non arriva mai per colpa tua!»;
  - **rispondere al quiz di Gaia** nel verticale 1 del 1° piano: «Chi ama Gaia più di tutti?» → **Alessio**;
  - ottenere il **Verbale** da Timo/Alessio, in cucina del 1° piano.
- **Ricompensa:** Verbale (+3 DEF).

### Capitolo 10 — Il Plein Finale · *finale*
- **Obiettivi:** ottenere il **Distintivo d'Oro** da Timo/Alessio (cucina del 1° piano) e **sconfiggere Caue** (corridoio principale del piano terra).
- **Cosa succede:** Caue rivela che era lui a tirare i fili «dall'inizio». Lo scontro finale è contro il boss più forte del gioco.
- **Ricompensa:** Distintivo d'Oro (+5 ATK, +15 HP, +3 DEF). L'ordine non è obbligato, ma conviene prendere il distintivo prima.

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

| Nemico | Quando | Vittorie | HP rimasti in media |
|---|---|---|---|
| Gabbo | cap. 1 (facoltativo) / cap. 2 | 96–98% | 18 su 30: teso |
| Gatta | cap. 4 | 100% | 38 su 40 |
| Mari | cap. 9 | 100% | 35 su 40 |
| Caue | cap. 10, senza distintivo | 100% | 31 su 40 |
| Caue | cap. 10, con distintivo | 100% | 52 su 55 |

Dal capitolo 4 in poi gli scontri sono troppo facili. Ribilanciare è nella roadmap di CLAUDE.md.

## Il finale

Quando completi il capitolo 10 partono i **titoli di coda**, una volta sola, con:
- tempo di gioco;
- scontri vinti e persi;
- oggetti raccolti.

Poi con Spazio torni in casa e puoi continuare a girare.

## Il gruppo "Cucina di su"

Il telefono (P) è una chat stile WhatsApp del gruppo **Cucina di su**:
- in alto c'è il messaggio fissato 📌 con la missione attuale e dove andare per ogni obiettivo;
- sotto ci sono i messaggi, con un separatore per ogni capitolo.

A ogni capitolo arriva un messaggio-indizio da un coinquilino. I testi sono nei file `js/story/chapter-N/chapter-N.js`, alla voce `phone`. Sono **provvisori**: riscrivili con lo stile vero del vostro gruppo.

## Idee per i prossimi capitoli

- **L'indagine.** Raccogliere indizi esaminando stanze e oggetti, poi accusare il colpevole scegliendo le prove giuste: il "caso dei piatti nel lavandino".
- **Le camere.** Ogni camera diventa del suo inquilino, con oggetti caratteristici e magari una chiave per entrarci.
- **La raccolta differenziata.** Un minigioco nella trashbin-room, davanti alla room-9.
- **Fede Papi arriva davvero.** Una chiusura per la storyline di Mari.
- **La rivincita di Gabbo.** Gabbo torna dopo il finale, più forte.

Per aggiungere un capitolo, la procedura tecnica è in CLAUDE.md → *How-to recipes*.
