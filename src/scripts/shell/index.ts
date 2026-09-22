let initialLoad = true;

document.addEventListener('astro:page-load', () => {
  // After client-side navigation, move focus into the new workspace; leave the initial load alone.
  if (!initialLoad) document.getElementById('main')?.focus({ preventScroll: true });
  initialLoad = false;
});
