// Lightweight navigation and historical-range controls, independent of the live API.
document.addEventListener('DOMContentLoaded', () => {
  const graphic = document.getElementById('forecastOutlook');
  const controls = document.querySelectorAll('[data-forecast-range]');
  controls.forEach(button => {
    button.addEventListener('click', () => {
      const range = button.dataset.forecastRange;
      graphic.src = range === 'full' ? 'images/cosecha-2026-27-full.svg' : 'images/cosecha-2026-27-recent.svg';
      document.getElementById('forecastOutlookMobile').srcset = `images/cosecha-2026-27-${range === 'full' ? 'full' : 'recent'}-mobile.svg`;
      controls.forEach(control => control.setAttribute('aria-pressed', String(control === button)));
    });
  });

  const navigation = document.querySelector('.top-nav');
  const links = Array.from(document.querySelectorAll('.top-nav a[href^="#"]'));
  if(navigation && 'ResizeObserver' in window){
    new ResizeObserver(() => {
      document.documentElement.style.setProperty('--nav-height', `${navigation.offsetHeight}px`);
    }).observe(navigation);
  }
  const progress = document.querySelector('.scroll-progress');
  if(progress){
    let queued = false;
    const update = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${total > 0 ? Math.min(1, Math.max(0, window.scrollY / total)) : 0})`;
      const sections = Array.from(document.querySelectorAll('main > section[id]'));
      const threshold = (navigation?.offsetHeight || 0) + 60;
      const current = sections.filter(section => section.getBoundingClientRect().top <= threshold).at(-1) || sections[0];
      links.forEach(link => {
        if(current && link.hash === `#${current.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      queued = false;
    };
    window.addEventListener('scroll', () => {
      if(!queued){ queued = true; requestAnimationFrame(update); }
    }, {passive: true});
    window.addEventListener('resize', update);
    update();
  }
});
