// Gamle hjemskjerm-installasjoner hadde appen på roten med hash-ruter.
// Send dem videre til /app/ med ruten intakt.
if (location.hash.startsWith('#/')) {
  location.replace('/app/' + location.hash);
}
