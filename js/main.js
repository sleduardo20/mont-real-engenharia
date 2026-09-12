(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------------
  // Loading screen
  // ------------------------------------------------------------------
  var loadingScreen = document.getElementById('loading-screen');
  var loadingReleased = false;

  function releaseLoading() {
    if (loadingReleased) return;
    loadingReleased = true;
    loadingScreen.classList.add('hidden');
  }
  setTimeout(releaseLoading, 6000);

  // ------------------------------------------------------------------
  // Header background on scroll
  // ------------------------------------------------------------------
  var header = document.getElementById('header');
  function updateHeader() {
    if (window.scrollY > 40) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  }
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  // ------------------------------------------------------------------
  // Mobile menu
  // ------------------------------------------------------------------
  var mobileMenu = document.getElementById('mobile-menu');
  var menuButton = document.getElementById('menu-button');
  var closeMenuButton = document.getElementById('close-menu-button');

  function openMenu() { mobileMenu.classList.add('open'); }
  function closeMenu() { mobileMenu.classList.remove('open'); }

  if (menuButton) menuButton.addEventListener('click', openMenu);
  if (closeMenuButton) closeMenuButton.addEventListener('click', closeMenu);
  mobileMenu.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });

  // ------------------------------------------------------------------
  // HERO — scroll-bound video
  // ------------------------------------------------------------------
  var heroSection = document.getElementById('hero');
  var heroVideo = document.getElementById('hero-video');
  var heroPoster = document.getElementById('hero-poster');
  var heroProgressFill = document.getElementById('hero-progress-fill');
  var heroCounter = document.getElementById('hero-counter');
  var heroTitle = document.getElementById('hero-title');
  var heroSubtitle = document.getElementById('hero-subtitle');

  var useMobile = window.matchMedia('(max-width: 820px) and (orientation: portrait)').matches;
  var videoSource = useMobile ? 'assets/hero-mobile.mp4' : 'assets/hero.mp4';

  var videoDuration = 0;
  var videoReady = false;
  var iosUnlocked = false;

  var messages = [
    { threshold: 0, title: 'Toda casa começa num traço', subtitle: 'Role a página e acompanhe uma casa de alto padrão nascer do papel até a chave na mão — é assim que a Mont Real Engenharia conduz cada projeto.' },
    { threshold: 0.35, title: 'O projeto ganha estrutura', subtitle: 'Cálculo estrutural, engenharia e cronograma físico-financeiro definidos antes do primeiro tijolo.' },
    { threshold: 0.7, title: 'A obra sai do papel', subtitle: 'Execução acompanhada de perto, com controle de qualidade em cada etapa do canteiro.' },
    { threshold: 0.92, title: 'Do esboço à chave na mão', subtitle: 'Do traço a lápis à entrega final — o mesmo padrão de rigor técnico, do início ao fim.' }
  ];

  function tryLoadVideo() {
    heroVideo.src = videoSource;
    heroVideo.load();
  }

  heroVideo.addEventListener('loadedmetadata', function () {
    videoDuration = heroVideo.duration || 0;
  });

  heroVideo.addEventListener('canplaythrough', function () {
    videoReady = true;
    heroVideo.classList.add('ready');
    releaseLoading();
  });

  heroVideo.addEventListener('error', function () {
    // File not available yet: keep the poster and don't block the site.
    releaseLoading();
  });

  tryLoadVideo();

  function unlockIOS() {
    if (iosUnlocked) return;
    iosUnlocked = true;
    var playPromise = heroVideo.play();
    if (playPromise && playPromise.then) {
      playPromise.then(function () { heroVideo.pause(); }).catch(function () {});
    }
  }
  window.addEventListener('touchstart', unlockIOS, { once: true, passive: true });
  window.addEventListener('scroll', unlockIOS, { once: true, passive: true });

  function messageForProgress(p) {
    var chosen = messages[0];
    for (var i = 0; i < messages.length; i++) {
      if (p >= messages[i].threshold) chosen = messages[i];
    }
    return chosen;
  }

  var currentMessage = messages[0];

  function applyHeroProgress(p) {
    p = Math.min(1, Math.max(0, p));

    heroProgressFill.style.width = (p * 100) + '%';
    heroCounter.textContent = Math.round(p * 100) + '%';

    var msg = messageForProgress(p);
    if (msg !== currentMessage) {
      currentMessage = msg;
      heroTitle.textContent = msg.title;
      heroSubtitle.textContent = msg.subtitle;
    }

    if (videoReady && videoDuration > 0) {
      var readyState = heroVideo.readyState;
      if (readyState >= 2) {
        heroVideo.currentTime = p * videoDuration;
      }
    }
  }

  function heroProgress() {
    var rect = heroSection.getBoundingClientRect();
    var totalHeight = heroSection.offsetHeight - window.innerHeight;
    if (totalHeight <= 0) return 0;
    var scrolledAmount = -rect.top;
    return scrolledAmount / totalHeight;
  }

  var tickScheduled = false;
  function scheduleTick() {
    if (tickScheduled) return;
    tickScheduled = true;
    if (document.hidden) {
      applyHeroProgress(heroProgress());
      tickScheduled = false;
      return;
    }
    requestAnimationFrame(function () {
      applyHeroProgress(heroProgress());
      tickScheduled = false;
    });
  }

  window.addEventListener('scroll', scheduleTick, { passive: true });
  window.addEventListener('resize', scheduleTick);
  scheduleTick();

  // ------------------------------------------------------------------
  // Reveals via IntersectionObserver
  // ------------------------------------------------------------------
  var revealElements = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry, index) {
        if (entry.isIntersecting) {
          setTimeout(function () {
            entry.target.classList.add('visible');
          }, (index % 6) * 70);
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });
    revealElements.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealElements.forEach(function (el) { el.classList.add('visible'); });
  }

  // ------------------------------------------------------------------
  // Animated counters
  // ------------------------------------------------------------------
  var counters = document.querySelectorAll('.counter-num');
  function animateCounter(el) {
    var target = parseFloat(el.getAttribute('data-target'));
    var suffix = el.getAttribute('data-suffix') || '';
    var duration = 1400;
    var start = null;

    function step(timestamp) {
      if (!start) start = timestamp;
      var progress = Math.min(1, (timestamp - start) / duration);
      var value = Math.round(target * progress);
      el.textContent = value + (suffix ? suffix : '');
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  if ('IntersectionObserver' in window) {
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { counterObserver.observe(el); });
  } else {
    counters.forEach(animateCounter);
  }

  // ------------------------------------------------------------------
  // FAQ accordion
  // ------------------------------------------------------------------
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var question = item.querySelector('.faq-question');
    question.addEventListener('click', function () {
      var alreadyOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function (other) {
        other.classList.remove('open');
      });
      if (!alreadyOpen) item.classList.add('open');
    });
  });

  // ------------------------------------------------------------------
  // Contact form (placeholder — wire up a real backend later)
  // ------------------------------------------------------------------
  var contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', function (event) {
      event.preventDefault();
      alert('Formulário pronto na interface — falta conectar a um serviço de envio (e-mail, CRM ou API) para receber as mensagens de verdade.');
    });
  }
})();
