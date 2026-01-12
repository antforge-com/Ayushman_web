// Burger menu logic. No Firebase imports needed here.
// Burger menu logic for drawer navigation
export function setupBurgerMenu() {
  const btn = document.getElementById('hamburgerBtn');
  const drawer = document.getElementById('drawerNav');
  const backdrop = document.getElementById('backdrop');
  function openDrawer() {
    drawer.classList.add('open');
    backdrop.classList.add('open');
    btn.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    btn.setAttribute('aria-expanded', 'true');
    const firstLink = drawer.querySelector('a');
    if (firstLink) firstLink.focus({ preventScroll: true });
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
    btn.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    btn.setAttribute('aria-expanded', 'false');
    btn.focus({ preventScroll: true });
    document.body.style.overflow = '';
  }
  btn.addEventListener('click', () => {
    if (drawer.classList.contains('open')) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });
  backdrop.addEventListener('click', closeDrawer);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer.classList.contains('open')) closeDrawer();
  });
  drawer.addEventListener('click', (e) => {
    if (e.target.closest('a[href]')) closeDrawer();
  });
}

document.addEventListener('DOMContentLoaded', setupBurgerMenu);
