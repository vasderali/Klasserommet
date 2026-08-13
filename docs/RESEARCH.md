# Markedsresearch: Hva lærere savner i hverdagsverktøyene

*Nettresearch august 2026. Målgruppe: barne- og ungdomsskolen i Norge.
Grunnlag for veikartet til Klasserommet.*

## Topp smertepunkter lærere nevner igjen og igjen

1. **Oppsettet forsvinner – alt må bygges opp på nytt hver time.** Vanligste
   klage på Classroomscreen: gratisversjonen lagrer ikke skjermoppsett.
   Lagring er hovedgrunnen til at folk betaler for Pro.
   (classroomscreen.com/helpcenter, sageteachers.com/classroomscreen-alternative, G2-anmeldelser)
2. **For mange plattformer, innlogginger og teknisk friksjon.** 80 % av
   norske lærere støter på hindringer: påloggingstrøbbel, ustabilt utstyr,
   for mange plattformbytter. Verktøy som «bare virker» uten konto er et
   reelt konkurransefortrinn. (utdanningsnytt.no, uio.no/forskning)
3. **Uro og arbeidsro er største hverdagsproblem.** 2 av 3 elever forstyrres
   av bråk; TALIS 2024 viser økende uro. Verktøy som støtter struktur,
   overganger og forutsigbarhet treffer rett i dette.
   (uv.uio.no/isp, udir.no/TALIS, forskning.no)
4. **Klassekart er viktig, men arbeidskrevende – og byttes ofte.** Lærere
   bytter kart per periode, bruker det til å lære navn og til å gjøre
   tilrettelagt plassering usynlig for klassen. Norske brukere av
   klassekartet.no roser nettopp preferanseregler og «hvor lenge siden
   satt de sammen»-oversikt. (thebrokencopier.substack.com, klassekartet.no)
5. **Personvern-usikkerhet og dobbeltarbeid.** Halvparten av kommunene
   mangler personvernrutiner; Datatilsynets gjennomgang av 38 gratistjenester
   i skolen: 28 samler persondata, 14 deler med tredjeparter. Lærere er
   usikre på hva de har lov å bruke. (datatilsynet.no 2025/2026, barnevakten.no)
6. **Reklame, blokkerte sider og støy i gratisverktøy.** Gratis timer-/
   spinnersider gir annonser, treg lasting og blokkeringer på skolenettverk.
7. **Skjermtrøtthet – på elevsiden.** 6 av 10 lærere mener det brukes for mye
   skjerm. Klasserommets modell (kun lærerens skjerm/projektor, ingen
   elev-enheter) er riktig posisjonering – si det høyt.

## Funksjonsforslag rangert (verdi × enkelhet uten backend)

1. **Lagrede oppsett + dagsplan-widget på storskjerm.** Dagsplan med
   klokkeslett/symboler er standard i barneskolen. Classroomscreen tar
   $36/år primært for lagring – vi kan gi ubegrenset lokal lagring gratis.
2. **Støymåler / arbeidsro-trafikklys.** Web Audio API, null backend.
   Too Noisy Pro selges alene for $7.99. Gi justerbar følsomhet og
   tid-før-alarm (det brukerne etterlyser).
3. **Vikar-eksport:** klassekart + dagsplan + klasseregler i ett utskrivbart
   ark. Dokumentert behov, ingen norsk konkurrent fremhever det.
4. **Stasjonsmodus:** grupper × stasjoner med rotasjonstimer på tavla.
   Kombinerer tre ting vi har (grupper, timer, storskjerm).
5. **Klasseromsjobber/ordenselev-rotasjon.** Rettferdig ukesrotasjon uten
   gjentak – samme algoritme som nabohistorikken.
6. **Rikere kartregler:** «må sitte foran», «må sitte sammen», lås pult,
   samarbeidsstatistikk. Dette ligger bak Pro-mur hos klassekartet.no.
7. **Lynrask import** fra Excel/regneark (har vi). 
8. **Eksport/synk uten backend:** klassefil + ev. QR-deling mellom egne
   enheter (delvis på plass).
9. **Klassebelønning på klassenivå** (marmorkrukke/klassemål) – ALDRI
   individuelle atferdspoeng (se fallgruver).
10. **Fremføringsrekkefølge / stille opp-velger.** Billig påbygg på trekkeren.

## Konkurrentbildet (priser per aug. 2026)

| Verktøy | Pris | Hovedklager |
|---|---|---|
| Classroomscreen | $36/år, skoler fra $135/5 lisenser | Ingen lagring gratis, «dyrt for det det er», lærere betaler selv |
| ClassDojo | Gratis; Plus $59.99/år (foreldre) | Overvåkning, atferdspoeng, datainnsamling |
| Klassekartet.no | Pro 39 kr/mnd; Feide-skoleavtaler | Kjernefunksjoner bak betalingsmur |
| Skolara (norsk) | Gratis foreløpig | Skybasert, krever konto |
| TeacherKit | $0.70/elev/mnd | For dyrt, klønete |
| Too Noisy Pro | $7.99 engangs | Lite justerbart |

Prisnivå i markedet: 300–470 kr/år per lærer. Skolesalg går i praksis via
kommunen, med Feide-innlogging som vanlig krav.

## Fallgruver – ting lærere IKKE vil ha

- **Individuelle atferdspoeng** (ClassDojo-modellen) – faglig kritisert og
  passer dårlig i norsk skolekultur. Belønning på klassenivå, aldri
  per-elev-logging.
- **Elevdata i skyen / tredjepartsdeling / sporing / annonser.** Datatilsynet
  er tydelig. Ingen analytics på elevdata, noensinne.
- **Viktig nyanse:** lokal lagring fritar ikke for dokumentasjon – elevnavn i
  localStorage er fortsatt personopplysninger kommunen har ansvar for. Skriv
  en tydelig personvernerklæring («ingen data forlater enheten»), tilby
  initialmodus og slett alt-knapp. Det gjør kommunens DPIA-vurdering triviell
  – et salgsargument.
- **Databehandleravtale-fellen:** i det øyeblikket vi legger til konto/synk/
  Feide kreves databehandleravtale med hver kommune. Strategisk mulighet:
  behold «null persondata hos oss» som arkitektur (lisensnøkkel uten
  elevdata) – da selger vi uten DPA-friksjon. Unikt i markedet.
- **Enda en innlogging / mer elevskjermtid.** Ikke bygg elevvendte apper,
  ikke krev konto for kjernefunksjoner.
- **Betalingsmur på det basale.** Ta ev. betalt for skolefunksjoner (deling i
  kollegiet, vikarpakker, Feide), aldri for kjerneflyten eller lagring.
- **Ikke lag felter som frister til sensitive notater** (diagnoser,
  tilrettelegging) i klartekst.
