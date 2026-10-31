---
title: "Een Stripe-webhookfout 500 oplossen"
description: "Onderzoek waarom een Stripe-webhook HTTP 500 teruggeeft en herstel de endpoint veilig met logs, tests en idempotente verwerking."
publishDate: 2026-10-31T10:40:00.000Z
image: "/images/billing-photo/billing-08.jpg"
category: 'troubleshooting'
tags: ["Internationale Betalingen","Facturatie","Payment Gateway","Financiële Tips"]
---

## 1. Bepaal waar de Stripe-webhookstatus 500 ontstaat

Krijg je bij een webhook de status `500 Internal Server Error`, dan is de eerste beslissing of je de Stripe-configuratie moet aanpassen of juist je eigen applicatie moet onderzoeken. Een HTTP 500 betekent meestal dat de server die het verzoek ontvangt een interne fout tegenkwam. Ik zou daarom eerst de mislukte levering in het Stripe-dashboard vergelijken met de logs van de server die de endpoint uitvoert. Zo voorkom je dat je instellingen wijzigt terwijl het probleem bijvoorbeeld in een codepad, databaseverbinding of recente applicatierelease zit.

Noteer in Stripe het tijdstip, de endpoint-URL, het gebeurtenistype en de responsstatus. Zoek daarna rond hetzelfde tijdstip in de applicatie- en hostinglogs. Kijk of alle gebeurtenissen mislukken of alleen een bepaald type, zoals `payment_intent.succeeded`. Als slechts één type problemen geeft, kan dat wijzen op een specifieke verwerkingsroute of op gegevens waarop de code niet rekent. Controleer ook of test- en livemodus niet door elkaar lopen. Deel bij onderzoek geen volledige payloads of geheimen: beperk toegang tot logs en maskeer persoonsgegevens en betalingsgegevens.



![Troubleshooting Guide](/images/billing-photo/billing-17.jpg)

## 2. Herken oorzaken van een Stripe-webhookstatus 500

Een fout kan ontstaan terwijl je applicatie de webhook verwerkt. Mogelijke oorzaken zijn een niet-afgevangen uitzondering, een ontbrekende eigenschap in de gebeurtenis, een mislukte databasebewerking of een aanname dat gebeurtenissen altijd in een bepaalde volgorde binnenkomen. Stripe kan een gebeurtenis opnieuw aanbieden wanneer de endpoint geen succesvolle bevestiging terugstuurt. Als de verwerking niet idempotent is, kan dezelfde gebeurtenis meer dan eens door de applicatie gaan. Dat kan naast extra fouten ook dubbele administratieve handelingen of andere ongewenste gevolgen veroorzaken.

De fout kan ook in de omgeving zitten: een release met een regressie, een ontbrekende omgevingsvariabele, een onbereikbare database of een proxy die verzoeken verkeerd doorstuurt. Een verkeerd signing secret veroorzaakt doorgaans een fout bij de handtekeningcontrole; afhankelijk van de code kan die fout als `500` worden teruggegeven. Ook kan een endpoint vastlopen doordat de verwerking te lang duurt of een externe afhankelijkheid niet reageert. De status alleen vertelt niet welke oorzaak geldt en bewijst niet dat een betaling is mislukt. Gebruik daarom de foutdetails van de levering samen met de serverlogs. Let op de eerste fout in de keten; latere foutmeldingen kunnen alleen een gevolg daarvan zijn.

## 3. Controleer endpoint, handtekening en verwerking

1. **Controleer de endpoint in het dashboard.** Open de webhookinstellingen in Stripe en selecteer de endpoint die de fout meldt. Vergelijk de ingestelde URL met de actieve route in je applicatie en controleer of de benodigde gebeurtenistypen zijn geselecteerd. Bekijk de responsstatus en foutdetails van een mislukte levering. Controleer ook of de URL bereikbaar is vanuit de juiste omgeving en of test- en livemodus gescheiden zijn. Pas de endpoint niet lukraak aan: noteer eerst de bestaande configuratie, zodat je wijzigingen kunt terugdraaien.

2. **Controleer het signing secret en de request body.** Gebruik het signing secret dat bij deze specifieke webhookendpoint hoort. Haal het veilig op uit een omgevingsvariabele of geheimenbeheerder; gebruik geen API-sleutel als vervanging en verwissel geen secrets tussen test- en livemodus. De handtekeningcontrole van Stripe vereist de oorspronkelijke, onbewerkte request body. Middleware die de inhoud vooraf wijzigt of omzet, kan controle daardoor laten mislukken. Log het secret nooit en zet het niet in broncode, foutmeldingen of gedeelde screenshots. Controleer na een rotatie of de applicatieconfiguratie het actuele secret gebruikt.

3. **Maak verwerking idempotent en testgericht.** Controleer de handtekening voordat je een gebeurtenis verwerkt en registreer het unieke gebeurtenis-ID. Gebruik bijvoorbeeld een unieke databasebeperking of een vergelijkbare controle om dubbele verwerking te voorkomen. Laat de endpoint na succesvolle acceptatie snel een passende `2xx`-status teruggeven. Als een taak lang kan duren, zet die dan waar passend in een wachtrij en verwerk haar asynchroon, met een manier om mislukte taken te onderzoeken. Test wijzigingen eerst in een veilige testomgeving met de webhooktestfunctie van Stripe of de Stripe CLI. Vergelijk daarna de leveringsdetails, serverlogs en de verwachte wijziging in je applicatie.

## 4. Voorkom terugkerende webhookfouten en dubbele acties

Ontwerp de verwerking voor herleveringen en gebeurtenissen die niet in de verwachte volgorde aankomen. Sla het gebeurtenis-ID duurzaam op en bepaal per gebeurtenistype welke informatie leidend is. Een webhook is een melding over een gebeurtenis; behandel elke aflevering daarom niet automatisch als een nieuwe betaling of unieke opdracht. Controleer bij een onduidelijke toestand zo nodig de actuele gegevens via de passende Stripe-functionaliteit. Geef een foutstatus terug als de verwerking werkelijk niet is gelukt, maar vang uitzonderingen niet stilzwijgend af met een successtatus: Stripe kan de gebeurtenis dan als afgeleverd beschouwen terwijl je applicatie niets heeft bijgewerkt.

Maak endpointwijzigingen, applicatiereleases en secretrotaties controleerbaar. Beperk wie toegang heeft tot de webhookinstellingen, sla secrets buiten broncode op en werk de configuratie zorgvuldig bij wanneer een secret wordt vervangen. Stel monitoring in voor herhaalde mislukte leveringen, time-outs en onverwachte pieken in fouten. Na herstel is het verstandig de openstaande leveringen te bekijken en te bepalen welke opnieuw verwerkt moeten worden. Houd daarbij rekening met idempotentie, zodat een herstelactie geen bestaande betaling of administratieve verwerking dubbel uitvoert. Bewaar voldoende loggegevens om oorzaken te onderzoeken, maar niet meer gevoelige informatie dan daarvoor nodig is.

## 5. Veelgestelde vragen over een Stripe-webhookstatus 500

**Q1.** Betekent een `500` dat de betaling is mislukt?

**A1.** Nee. De betaling en de aflevering van de webhook zijn afzonderlijke zaken. Controleer de betalingsstatus in Stripe en vergelijk die met de status in je eigen applicatie. Verander of verwerk een betaling niet uitsluitend op basis van de HTTP-status van de webhook.

**Q2.** Waarom biedt Stripe dezelfde gebeurtenis opnieuw aan?

**A2.** Stripe kan leveringen opnieuw proberen wanneer de endpoint geen succesvolle bevestiging geeft, bijvoorbeeld door een serverfout of time-out. Bekijk de leveringspogingen in het dashboard en onderzoek of de endpoint inmiddels correct reageert. Maak de verwerking idempotent, omdat dezelfde gebeurtenis meer dan één keer kan binnenkomen. Een herlevering is niet automatisch een nieuwe betaling.

**Q3.** Welke logs kan ik controleren zonder gevoelige gegevens bloot te leggen?

**A3.** Zoek op tijdstip, endpoint, gebeurtenistype en gebeurtenis-ID, en bekijk de relevante foutmelding en stacktrace. Bewaar alleen informatie die nodig is voor diagnose en maskeer persoonsgegevens en betalingsgegevens. Log nooit API-sleutels, signing secrets of onnodig volledige payloads. Beperk toegang tot logs en hanteer passende bewaartermijnen.
