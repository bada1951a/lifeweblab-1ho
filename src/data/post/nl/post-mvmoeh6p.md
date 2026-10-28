---
title: "Hoe je Stripe Error Code donothonor oplost zonder omzet te verliezen: Mijn ervaring op de Zuidas"
description: "Een praktijkverhaal over het oplossen van de Stripe 'do_not_honor' foutmelding en een dubbele afschrijving door een webhook-bug op de Amsterdamse Zuidas."
publishDate: 2026-10-24T17:25:23.387Z
image: '/images/billing-photo/billing-25.jpg'
category: 'troubleshooting'
tags: ["Troubleshooting", "Payment Issues", "Invoicing", "Business Guide"]
theme: "Resolution Emerald Guide"
---

## 1. Noodsituatie bij internationale betalingen en overboekingen

Het was een typische regenachtige dinsdagochtend op de Zuidas in Amsterdam. Ik zat achter mijn bureau op de twintigste verdieping met een dampende kop zwarte koffie, klaar om een flinke batch uitstaande facturen van onze internationale freelanceontwikkelaars weg te werken. Alles leek op rolletjes te lopen totdat mijn telefoon ontplofte met paniekerige Slack-berichten van onze hoofdinkoper. Een van onze grootste externe contractanten had zojuist een betaling geprobeerd te voldoen, maar werd geconfronteerd met de gevreesde 'do_not_honor' foutmelding van Stripe. Nog erger: door een rare webhook-bug in ons systeem was diezelfde mislukte transactie ergens op de achtergrond wél dubbel geregistreerd en afgeschreven. Twee keer hetzelfde hoge bedrag afgeschreven van een woedende partner, terwijl de status in ons dashboard bleef hangen op geweigerd. Mijn maag keerde zich om; we moesten dit direct oplossen voordat het onze reputatie zou schaden en we omzet zouden mislopen door afgehaakte partners.

De rillingen liepen over mijn rug toen ik het Dashboard opende en de rode foutmeldingen ons tegemoet blonken. In eerste instantie dacht ik dat het aan de bank van de freelancer lag, zoals zo vaak het geval is bij internationale overboekingen in de financiële sector hier in Amsterdam. Maar toen ik dieper groef in de logs, zag ik de ware nachtmerrie: de webhook-server had een time-out gekregen precies op het moment dat de 'do_not_honor' respons binnenkwam, waardoor de retry-logica van Stripe ten onrechte twee keer een poging had gedaan om de kaarten te belasten.

<div style="border-left: 4px solid #059669; background: #f8fafc; padding: 16px 20px; margin: 28px 0; border-radius: 8px; color: #111827; font-size: 0.96rem;">
<strong>[Key Point]:</strong> Een 'do_not_honor' code betekent simpelweg dat de uitgevende bank van de klant de transactie weigert zonder specifieke reden te geven. Combineer dat met een slecht geconfigureerde webhook en je hebt een recept voor dubbele afschrijvingen en pure paniek.
</div>

Ik herinner me nog goed dat ik wanhopig door de documentatie van Stripe aan het bladeren was, terwijl de accountmanager naast me stond te ijsberend omdat we diezelfde middag nog goedkeuring moesten geven voor een volgende fase van ons project. We moesten snel handelen, de administratie rechtzetten en vooral voorkomen dat onze betrouwbaarheid bij key-partners een deuk zou oplopen.

<div style="text-align: center; margin: 36px 0;"><img src="/images/billing-photo/billing-26.jpg" alt="Troubleshooting Guide" style="max-width: 100%; max-height: 460px; width: auto; height: auto; border-radius: 14px; object-fit: cover; display: inline-block; box-shadow: 0 4px 18px rgba(0,0,0,0.08);" loading="lazy" /></div>

## 2. De diepe duik in de hoofdoorzaken

Na een snelle adempauze ben ik samen met onze backend-specialist de systemen ingekenken om te begrijpen hoe dit in vredesnaam kon gebeuren. We hebben de situatie opgesplitst in drie fundamentele problemen die elkaar versterkten.

### Het probleem van de generieke bankweigering

De 'do_not_honor' code is de meest frustrerende melding in het hele Stripe-ecosysteem. Het vertelt je alsmerchant helemaal niets. De bank van de kaarthouder zegt eigenlijk: "Nee, en we vertellen je niet waarom." Vaak heeft dit te maken met fraudepreventie, limieten op buitenlandse transacties of simpele risicoprofielen van de bank in kwestie. Omdat wij opereren vanuit Amsterdam met internationale entiteiten, triggeren dit soort betalingen soms onterecht de alarmbellen bij conservatieve banken.

### De valkuil van asynchrone webhooks

Onze tweede fout zat in de architectuur. Toen de 'do_not_honor' melding binnenkwam, stuurde onze server automatisch een hertest-trigger uit via een webhook. Omdat de netwerkverbinding op dat moment haperde, dacht Stripe dat het eerste verzoek verloren was gegaan en vuurde het exact dezelfde betalingsintentie nogmaals af. Het resultaat? Twee identieke afschrijvingen binnen een milliseconde van elkaar.

### Ontbrekende idempotentie-sleutels

Dit was de grootste technische omissie. We hadden geen `Idempotency-Key` headers meegeleverd in onze API-aanroepen. Zonder deze unieke sleutels kan Stripe een betalingsverzoek bij een netwerkstoring niet effectief dedupliceren, wat direct leidde tot deze dubbele financiële nachtmerrie.

## 3. Directe stappenplan om de crisis op te lossen

Geen tijd te verliezen; we moesten de schade beperken en de klant direct terugbetalen zonder administratieve chaos te veroorzaken. Hier is exact hoe we dit via het dashboard en onze systemen hebben aangepakt.

<div style="border-left: 4px solid #059669; background: #f8fafc; padding: 16px 20px; margin: 28px 0; border-radius: 8px; color: #111827; font-size: 0.96rem;">
<strong>[Key Point]:</strong> Ga nooit direct handmatig geld overmaken via je eigen bankrekening om dit soort fouten op te lossen. Gebruik altijd de ingebouwde refund-tools van Stripe om je belasting- en omzetrapportages waterdicht te houden.
</div>

### Stap 1: Controleer de transacties in het Dashboard

Navigeer direct naar het hoofdmenu van je Stripe-omgeving en klik op `Betalingen` (Payments). Zoek de dubbele transactie op aan de hand van het bedrag en de tijdstempels. Je zult zien dat beide betalingen de status `Gelukt` (Succeeded) hebben gekregen door die verdomde webhook-bug, ondanks de eerdere weigering.

### Stap 2: Voer een gedeeltelijke of volledige terugbetaling uit

Klik op de dubbele transactie die teveel is afgeschreven. Kies rechtsboven in het scherm voor de optie `Terugbetalen` (Refund). Selecteer als reden `Frauduleus` of `Gelijksoortige transactie` (Duplicate). Geef exact hetzelfde bedrag op en bevestig de actie. Dit zorgt ervoor dat het geld binnen enkele werkdagen automatisch terugkeert naar de betaalmethode van de freelancer.

### Stap 3: Pas de webhook-instellingen en Betaalmethoden aan

Ga naar `Ontwikkelaars` (Developers) en vervolgens naar `Webhooks`. Controleer of je endpoints correct reageren op `payment_intent.succeeded` en of je server dubbele events filtert op basis van `event.id`. Ga daarna naar `Instellingen` (Settings) en `Betaalmethoden` (Payment methods) om te zorgen dat alternatieve betaalmethoden zoals iDEAL of SEPA Direct Debit als fallback worden aangeboden wanneer creditcards een 'do_not_honor' weigering geven.

## 4. Checklist om rekeningblokkades en overmatige kosten te voorkomen om herhaling in de toekomst te voorkomen

Om te zorgen dat we nooit meer op een hectische ochtend op de Zuidas met dit bijltje hoeven te hakken, hebben we een strikte checklist opgesteld die nu wekelijks door ons finance-team wordt nagelopen.

- Implementeer altijd verplichte `Idempotency-Keys` voor elke `POST`-aanvraag naar de Stripe API. Dit garandeert dat identieke verzoeken nooit tweemaal worden uitgevoerd.
- Configureer automatische e-mailnotificaties via het dashboard onder `Facturen` (Invoices) en `Accountinstellingen` (Account settings) zodra een webhook faalt of vertraging oploopt.
- Controleer maandelijks de `Belastingformulieren` (Tax documents) en reconciliatie-rapporten om te verifiëren dat het aantal refunds overeenkomt met de administratieve correcties in het grootboek.
- Vraag klanten met een 'do_not_honor' melding direct om een alternatieve kaart te gebruiken of neem contact op met hun bank voordat je automatische retries activeert.

## 5. Veelgestelde vragen uit de praktijk (FAQ)

### Q1: Wat moet ik doen als de bank van de klant blijft weigeren ondanks meerdere pogingen?
**A1:** Vraag de klant om direct contact op te nemen met hun eigen bank om internationale online transacties goed te keuren. Vaak blokkeren banken automatische betalingen naar het buitenland uit veiligheidsoverwegingen. Als alternatief kun je een handmatige SEPA-overschrijving initiëren via je zakelijke bankrekening.

### Q2: Hoe voorkom ik dat webhooks dubbele betalingen veroorzaken tijdens netwerkstoringen?
**A2:** Zorg ervoor dat je server een database-lock gebruikt op basis van de `event.id` die Stripe meestuurt met elke webhook. Als een event al in je database staat als 'verwerkt', moet je server direct met een HTTP 200 reageren zonder de actie nogmaals uit te voeren.

### Q3: Verlies ik omzet als ik een dubbele betaling moet terugbetalen?
**A3:** Nee, een terugbetaling (refund) is geen omzetverlies, maar een correctie van een onterechte incasso. Houd er wel rekening mee dat de oorspronkelijke transactiekosten die Stripe rekent bij sommige betaalmethoden niet altijd volledig worden geretourneerd. Dit zie je direct terug in je maandelijkse afrekening.
