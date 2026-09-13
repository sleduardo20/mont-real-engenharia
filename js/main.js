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
  // Scroll-bound video scenes (generic binder — hero + contained scenes)
  // ------------------------------------------------------------------
  var useMobileVideo = window.matchMedia('(max-width: 820px) and (orientation: portrait)').matches;
  var boundScenes = [];

  function bindScrollVideo(config) {
    var section = config.section;
    var video = config.video;
    var scene = {
      video: video,
      duration: 0,
      ready: false,
      onProgress: config.onProgress || null
    };

    video.src = (useMobileVideo && config.mobileSrc) ? config.mobileSrc : config.desktopSrc;
    video.load();

    video.addEventListener('loadedmetadata', function () {
      scene.duration = video.duration || 0;
    });
    video.addEventListener('canplaythrough', function () {
      scene.ready = true;
      video.classList.add('ready');
      if (config.onReady) config.onReady();
    });
    video.addEventListener('error', function () {
      // File not available yet: keep the poster and don't block the site.
      if (config.onReady) config.onReady();
    });

    scene.progress = function () {
      var rect = section.getBoundingClientRect();
      var totalHeight = section.offsetHeight - window.innerHeight;
      if (totalHeight <= 0) return 0;
      return Math.min(1, Math.max(0, -rect.top / totalHeight));
    };

    scene.apply = function () {
      var p = scene.progress();
      if (scene.ready && scene.duration > 0 && video.readyState >= 2) {
        video.currentTime = p * scene.duration;
      }
      if (scene.onProgress) scene.onProgress(p);
    };

    boundScenes.push(scene);
    return scene;
  }

  function unlockIOS() {
    boundScenes.forEach(function (scene) {
      var playPromise = scene.video.play();
      if (playPromise && playPromise.then) {
        playPromise.then(function () { scene.video.pause(); }).catch(function () {});
      }
    });
  }
  window.addEventListener('touchstart', unlockIOS, { once: true, passive: true });
  window.addEventListener('scroll', unlockIOS, { once: true, passive: true });

  var tickScheduled = false;
  function scheduleTick() {
    if (tickScheduled) return;
    tickScheduled = true;
    if (document.hidden) {
      boundScenes.forEach(function (scene) { scene.apply(); });
      tickScheduled = false;
      return;
    }
    requestAnimationFrame(function () {
      boundScenes.forEach(function (scene) { scene.apply(); });
      tickScheduled = false;
    });
  }

  window.addEventListener('scroll', scheduleTick, { passive: true });
  window.addEventListener('resize', scheduleTick);

  // ---- Hero scene ----
  var heroProgressFill = document.getElementById('hero-progress-fill');
  var heroCounter = document.getElementById('hero-counter');
  var heroTitle = document.getElementById('hero-title');
  var heroSubtitle = document.getElementById('hero-subtitle');

  var heroMessages = [
    { threshold: 0, title: 'Toda casa começa num traço', subtitle: 'Role a página e acompanhe uma casa de alto padrão nascer do papel até a chave na mão — é assim que a Mont Real Engenharia conduz cada projeto.' },
    { threshold: 0.35, title: 'O projeto ganha estrutura', subtitle: 'Cálculo estrutural, engenharia e cronograma físico-financeiro definidos antes do primeiro tijolo.' },
    { threshold: 0.7, title: 'A obra sai do papel', subtitle: 'Execução acompanhada de perto, com controle de qualidade em cada etapa do canteiro.' },
    { threshold: 0.92, title: 'Do esboço à chave na mão', subtitle: 'Do traço a lápis à entrega final — o mesmo padrão de rigor técnico, do início ao fim.' }
  ];
  var currentHeroMessage = heroMessages[0];

  function heroMessageForProgress(p) {
    var chosen = heroMessages[0];
    for (var i = 0; i < heroMessages.length; i++) {
      if (p >= heroMessages[i].threshold) chosen = heroMessages[i];
    }
    return chosen;
  }

  bindScrollVideo({
    section: document.getElementById('hero'),
    video: document.getElementById('hero-video'),
    desktopSrc: 'assets/hero.mp4',
    mobileSrc: 'assets/hero-mobile.mp4',
    onReady: releaseLoading,
    onProgress: function (p) {
      heroProgressFill.style.width = (p * 100) + '%';
      heroCounter.textContent = Math.round(p * 100) + '%';
      var msg = heroMessageForProgress(p);
      if (msg !== currentHeroMessage) {
        currentHeroMessage = msg;
        heroTitle.textContent = msg.title;
        heroSubtitle.textContent = msg.subtitle;
      }
    }
  });

  // ---- About contained scene (sketch -> built house) ----
  var aboutScene = document.getElementById('about-scene');
  if (aboutScene) {
    bindScrollVideo({
      section: aboutScene,
      video: document.getElementById('about-scene-video'),
      desktopSrc: 'assets/hero.mp4'
    });
  }

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
