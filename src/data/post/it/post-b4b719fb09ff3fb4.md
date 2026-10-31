---
title: "Come correggere l’errore 500 dei webhook Stripe"
description: "Diagnosi e correzione degli errori 500 nei webhook Stripe, con controlli su endpoint, firma, registri e gestione dei tentativi."
publishDate: 2026-10-31T10:40:00.000Z
image: "/images/billing-photo/billing-07.jpg"
category: 'troubleshooting'
tags: ["Pagamenti Globali","Fatturazione Elettronica","Gateway Pagamento","Risoluzione Errori"]
---

## 1. Decidere da dove iniziare con un webhook Stripe in errore 500

Quando Stripe segnala un `500 Internal Server Error`, la prima decisione è capire se il problema si trova nell’applicazione che riceve il webhook oppure in una componente che gestisce la richiesta prima che raggiunga il codice. Da dove partirei? Dalla singola consegna nella **Dashboard**, verificando endpoint, ambiente, evento, orario, codice HTTP e risposta registrata. Il 500 indica che il server destinatario ha segnalato un errore interno; da solo non identifica la causa e non dimostra che il pagamento sia fallito.

Terrei distinti tre stati: quello del pagamento in Stripe, quello della consegna del webhook e quello dei dati aggiornati nell’applicazione. Un pagamento può risultare riuscito mentre il webhook che dovrebbe aggiornare un ordine non viene elaborato. Viceversa, una consegna fallita non significa necessariamente che l’applicazione non abbia già svolto una parte del lavoro. Eviterei quindi di ripetere un pagamento per “sbloccare” il problema: prima confronterei l’ID dell’evento, la relativa risposta e i registri applicativi, così da capire se manca un aggiornamento o se è già avvenuto.



![Troubleshooting Guide](/images/billing-photo/billing-13.jpg)

## 2. Individuare la causa del 500 nei registri e nell’endpoint

Una causa frequente è un’eccezione nel codice eseguito alla ricezione: un campo trattato come obbligatorio che in quell’evento è assente, una conversione di dati non valida, una query al database non riuscita o una dipendenza esterna temporaneamente indisponibile. Anche un cambiamento recente della logica del gestore o della versione API può rendere il codice incompatibile con i dati ricevuti. Per restringere la diagnosi, assocerei l’orario della consegna ai log del server e cercherei l’ID evento, il tipo di evento, l’endpoint e lo stato HTTP. I registri dovrebbero contenere informazioni sufficienti per seguire l’errore, senza memorizzare dati di pagamento o altri dati personali non necessari.

Controllerei anche il percorso della richiesta. L’URL deve puntare all’endpoint previsto e la route deve accettare `POST`; un proxy, un firewall, un middleware o una funzione serverless può respingere o modificare la richiesta prima che il gestore la elabori. Un errore di firma, spesso causato da un secret errato o associato a un endpoint diverso, non è di per sé un errore 500: tuttavia, una gestione scorretta dell’eccezione può trasformarlo in tale risposta. La firma va verificata usando il corpo originale della richiesta e il secret corretto per quello specifico endpoint e ambiente. Non disattiverei la verifica per eliminare l’errore: cercherei invece il punto in cui la richiesta viene alterata o il controllo viene configurato male.

## 3. Correggere l’endpoint e verificare le impostazioni Stripe

1. **Dashboard:** apri la sezione dei webhook e seleziona l’endpoint che mostra la consegna fallita. Controlla URL, modalità di test o live, eventi sottoscritti, orario, codice HTTP, contenuto della risposta e numero dei tentativi. Copia l’ID dell’evento per cercarlo nei log del server e confrontare le informazioni disponibili. Se hai endpoint distinti per ambienti o funzioni diverse, verifica di esaminare quello effettivamente chiamato: correggere un endpoint di test non risolve un problema sull’endpoint live.

2. **Metodi di pagamento e gestore dell’evento:** individua nel codice il gestore corrispondente al tipo di evento registrato. Verifica che non presuma la presenza di campi opzionali, che gestisca in modo esplicito dati mancanti e che non dipenda da una pagina aperta dal cliente. Se l’elaborazione richiede chiamate lente a database o servizi esterni, valuta di salvare l’evento in una coda affidabile e rispondere rapidamente dopo averlo accettato. La risposta `2xx` dovrebbe indicare che il sistema ha preso in carico l’evento, non nascondere un errore o dichiarare completato un lavoro che non è stato salvato. Conserva l’ID evento anche nei processi in coda, così da poter risalire all’origine di eventuali problemi.

3. **Impostazioni e verifica:** confronta il secret di firma configurato sul server con quello dell’endpoint e dell’ambiente corretti. Non inserirlo in repository, ticket o log accessibili a persone non autorizzate; se sospetti che sia stato esposto, gestisci la rotazione seguendo le impostazioni disponibili in Stripe e aggiorna la configurazione applicativa in modo coordinato. Dopo aver corretto la causa, prova il flusso in ambiente di test e verifica dalla Dashboard una consegna successiva, controllando sia la risposta sia i log. Prima di riprovare un evento già fallito, accertati che non abbia già prodotto modifiche interne e che il gestore sia idempotente.

## 4. Gestire i tentativi senza duplicare operazioni

Stripe può ritentare una consegna quando l’endpoint non restituisce un esito di successo. Questi tentativi aiutano a recuperare da interruzioni temporanee, ma non garantiscono che l’applicazione elabori l’evento una sola volta. Lo stesso evento può arrivare più volte, per esempio se il server completa una modifica ma la risposta non raggiunge Stripe. Registrerei quindi gli ID degli eventi elaborati e farei in modo che l’applicazione riconosca quelli già gestiti. Le operazioni che aggiornano ordini, abbonamenti o accessi dovrebbero essere progettate per non creare un secondo effetto quando ricevono di nuovo lo stesso evento.

Per prevenire recidive, monitorerei le risposte diverse da `2xx`, i tempi di risposta, le eccezioni e le code che non avanzano; controllerei inoltre che credenziali e configurazioni siano coerenti fra test e produzione. Limiterei l’accesso ai secret e separerei i log tecnici dai dati di pagamento. Dopo una correzione, confronterei gli eventi in **Dashboard** con lo stato interno dell’applicazione, soprattutto per quelli già falliti: un nuovo tentativo può essere appropriato, ma solo dopo aver valutato i possibili effetti duplicati. Se la causa è un servizio dipendente, la coda e i tentativi interni devono consentire di recuperare il lavoro senza perdere l’evento né confermare prematuramente una lavorazione incompleta.

## 5. Risposte rapide sui webhook Stripe con errore 500

**Q1.** Un errore 500 significa che il pagamento è stato rifiutato?

**A1.** No: indica che l’endpoint del webhook ha restituito un errore interno, non che il pagamento sia necessariamente fallito. Verifica lo stato del pagamento nella Dashboard Stripe e confrontalo con i dati aggiornati dall’applicazione. Se necessario, cerca l’evento corrispondente usando l’ID registrato. Non avviare un nuovo addebito soltanto per correggere una consegna del webhook.

**Q2.** Posso rispondere sempre con `200` per fermare i tentativi?

**A2.** Solo quando l’evento è stato ricevuto e accettato in modo sicuro, per esempio dopo averlo salvato in una coda affidabile. Restituire `200` senza averlo elaborato o messo in coda può far perdere aggiornamenti importanti. Se l’elaborazione completa è lenta, separa la presa in carico dal lavoro successivo e monitora gli errori del processo. La risposta di successo non dovrebbe servire a mascherare un problema ancora presente.

**Q3.** Come posso riprovare un evento già fallito senza duplicare l’effetto?

**A3.** Prima controlla se l’evento ha già prodotto modifiche nell’applicazione, anche solo in parte. Usa l’ID evento per rilevare i duplicati e verifica che il gestore sia idempotente prima di chiedere una nuova consegna dalla Dashboard. Confronta lo stato interno con quello registrato in Stripe e annota gli eventuali passaggi già completati. Se non riesci a stabilire lo stato, evita di ripetere azioni irreversibili finché non hai riconciliato i dati.
