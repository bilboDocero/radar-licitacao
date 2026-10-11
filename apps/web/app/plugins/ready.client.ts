export default defineNuxtPlugin(() => {
  onNuxtReady(() => { document.documentElement.dataset.radarReady = 'true'; });
});
