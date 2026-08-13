# Klasserommet

Verktøykasse for lærere i barne- og ungdomsskolen: klassekart med historikk,
gruppegenerator, navnetrekker og timer. Bygget for å være null hassle –
ingen innlogging, ingen server.

## Verktøyene

- **Klassekart** – dra og slipp pulter, ferdige oppsett (rekker, hestesko,
  firergrupper), tilfeldig fylling som respekterer «ikke sammen»-regler og
  unngår naboer fra tidligere lagrede kart. Historikk og utskrift.
- **Grupper** – tilfeldige grupper etter størrelse eller antall, med samme
  regler og historikk («unngå samme par som sist»).
- **Trekker** – trekk elevnavn uten tilbakelegging; alle trekkes én gang før
  noen trekkes igjen. Fravær kan markeres.
- **Timer** – stor nedtelling for tavla/projektoren, med tavlemodus.
- **Klasser** – lim inn klasselister (ett navn per linje), regler for hvem som
  ikke skal sammen, og eksport/import av sikkerhetskopi.

## Personvern

Alle data (klasselister, kart, historikk) lagres **kun lokalt i nettleseren**
(localStorage). Ingenting sendes til noen server, og repoet inneholder aldri
elevnavn.

## Teknisk

Ren HTML/CSS/JS uten byggesteg. PWA: legg til på Hjem-skjermen fra Safari på
iPad, så virker appen i fullskjerm og uten nett.

Kjør lokalt:

```bash
python3 -m http.server 8123
```

Deploy: statisk side – fungerer rett ut av boksen på Vercel/Netlify.
