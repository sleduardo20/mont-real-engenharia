(function () {
  'use strict';

  var root = document.documentElement;
  var body = document.body;
  root.classList.remove('no-js');

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
  function pad(n, size) { var s = String(n); while (s.length < size) s = '0' + s; return s; }

  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  // ------------------------------------------------------------------
  // Smooth scroll (desktop only — touch keeps native momentum)
  // ------------------------------------------------------------------
  var lenis = null;
  if (typeof window.Lenis !== 'undefined' && !prefersReducedMotion && finePointer) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      (function raf(time) { lenis.raf(time); requestAnimationFrame(raf); })(0);
    }
  }

  function scrollToTarget(target) {
    if (lenis) {
      lenis.scrollTo(target, { duration: 1.6, easing: function (t) { return 1 - Math.pow(1 - t, 4); } });
    } else if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    } else {
      target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    }
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      var id = link.getAttribute('href');
      if (id === '#' || id === '#main') return;
      var target = id === '#top' ? 0 : document.querySelector(id);
      if (target === null) return;
      event.preventDefault();
      closeMenu();
      scrollToTarget(target);
    });
  });

  // ------------------------------------------------------------------
  // Loader — counts up with the hero video buffer, then wipes away
  // ------------------------------------------------------------------
  var loader = document.getElementById('loader');
  var loaderCount = document.getElementById('loader-count');
  var loaderFill = document.getElementById('loader-fill');
  var loaderTarget = 0.12;
  var loaderShown = 0;
  var loaderReleased = false;
  var loaderStart = performance.now();

  function loaderTick() {
    if (loaderReleased) return;
    loaderShown += (loaderTarget - loaderShown) * 0.08;
    // creep forward slowly so it never looks frozen
    loaderTarget = Math.min(0.92, loaderTarget + 0.0015);
    loaderCount.textContent = pad(Math.round(loaderShown * 100), 3);
    loaderFill.style.transform = 'scaleX(' + loaderShown + ')';
    requestAnimationFrame(loaderTick);
  }
  requestAnimationFrame(loaderTick);

  function releaseLoading() {
    if (loaderReleased) return;
    var wait = Math.max(0, 1100 - (performance.now() - loaderStart));
    loaderReleased = true;
    loaderCount.textContent = '100';
    loaderFill.style.transform = 'scaleX(1)';
    setTimeout(function () {
      loader.classList.add('is-done');
      setTimeout(function () { body.classList.add('is-loaded'); }, 280);
      if (hasGsap) setTimeout(function () { ScrollTrigger.refresh(); }, 1200);
    }, wait + 250);
  }
  setTimeout(releaseLoading, 6000);

  // ------------------------------------------------------------------
  // Header — island hides on scroll down, returns on scroll up
  // ------------------------------------------------------------------
  var header = document.getElementById('header');
  var lastY = window.scrollY;
  function updateHeader() {
    var y = window.scrollY;
    header.classList.toggle('is-solid', y > 40);
    if (!body.classList.contains('menu-open')) {
      if (y > 500 && y > lastY + 6) header.classList.add('is-hidden');
      else if (y < lastY - 6 || y < 500) header.classList.remove('is-hidden');
    }
    lastY = y;
  }
  window.addEventListener('scroll', updateHeader, { passive: true });
  updateHeader();

  // Active section in the nav
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav-desktop a'));
  if ('IntersectionObserver' in window) {
    var navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = '#' + entry.target.id;
        navLinks.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) {
      var section = document.querySelector(a.getAttribute('href'));
      if (section) navObserver.observe(section);
    });
  }

  // ------------------------------------------------------------------
  // Mobile menu
  // ------------------------------------------------------------------
  var mobileMenu = document.getElementById('mobile-menu');
  var menuButton = document.getElementById('menu-button');

  function openMenu() {
    body.classList.add('menu-open', 'is-locked');
    menuButton.setAttribute('aria-expanded', 'true');
    menuButton.setAttribute('aria-label', 'Fechar menu');
    mobileMenu.setAttribute('aria-hidden', 'false');
    header.classList.remove('is-hidden');
    if (lenis) lenis.stop();
  }
  function closeMenu() {
    if (!body.classList.contains('menu-open')) return;
    body.classList.remove('menu-open', 'is-locked');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Abrir menu');
    mobileMenu.setAttribute('aria-hidden', 'true');
    if (lenis) lenis.start();
  }
  menuButton.addEventListener('click', function () {
    if (body.classList.contains('menu-open')) closeMenu(); else openMenu();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeMenu();
  });

  // ------------------------------------------------------------------
  // Scroll-bound video scenes (generic binder — hero + about scene)
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

    if (useMobileVideo && config.mobilePoster && config.poster) {
      config.poster.src = config.mobilePoster;
    }

    video.addEventListener('loadedmetadata', function () {
      scene.duration = video.duration || 0;
    });
    if (config.onBuffer) {
      video.addEventListener('progress', function () {
        if (video.buffered.length && video.duration) {
          config.onBuffer(video.buffered.end(video.buffered.length - 1) / video.duration);
        }
      });
    }
    video.addEventListener('canplaythrough', function () {
      scene.ready = true;
      video.classList.add('ready');
      if (config.onReady) config.onReady();
    });
    video.addEventListener('error', function () {
      // File not available: keep the poster and don't block the site.
      if (config.onReady) config.onReady();
    });

    scene.progress = function () {
      var rect = section.getBoundingClientRect();
      var totalHeight = section.offsetHeight - window.innerHeight;
      if (totalHeight <= 0) return 0;
      return clamp(-rect.top / totalHeight, 0, 1);
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

  // ---- Hero scene: HUD + intro fade + finale line ----
  var hero = document.getElementById('hero');
  var heroIntro = document.getElementById('hero-intro');
  var hudStep = document.getElementById('hud-step');
  var hudStage = document.getElementById('hud-stage');
  var hudPercent = document.getElementById('hud-percent');
  var hudFill = document.getElementById('hud-fill');
  var hudSteps = document.querySelectorAll('.hud-steps li');
  var heroStages = [
    { until: 0.3, label: 'Estrutura de concreto' },
    { until: 0.55, label: 'Vedação e fachada' },
    { until: 0.86, label: 'Acabamento e paisagismo' },
    { until: 1.01, label: 'Entrega das chaves' }
  ];
  var currentStage = -1;

  bindScrollVideo({
    section: hero,
    video: document.getElementById('hero-video'),
    desktopSrc: 'assets/hero.mp4',
    mobileSrc: 'assets/hero-mobile.mp4',
    poster: document.getElementById('hero-poster'),
    mobilePoster: 'assets/poster-mobile.jpg',
    onReady: releaseLoading,
    onBuffer: function (ratio) { loaderTarget = Math.max(loaderTarget, Math.min(0.96, ratio)); },
    onProgress: function (p) {
      hudFill.style.transform = 'scaleX(' + p + ')';
      hudPercent.textContent = pad(Math.round(p * 100), 3) + '%';

      var stage = 0;
      while (stage < heroStages.length - 1 && p >= heroStages[stage].until) stage++;
      if (stage !== currentStage) {
        currentStage = stage;
        hudStep.textContent = pad(stage + 1, 2);
        hudStage.textContent = heroStages[stage].label;
        hudSteps.forEach(function (li, i) { li.classList.toggle('is-active', i <= stage); });
      }

      var fade = clamp((p - 0.03) / 0.15, 0, 1);
      heroIntro.style.opacity = String(1 - fade);
      heroIntro.style.transform = 'translate3d(0,' + (-48 * fade) + 'px,0)';
      heroIntro.style.visibility = fade >= 1 ? 'hidden' : 'visible';

      hero.classList.toggle('is-moving', p > 0.015);
      hero.classList.toggle('is-finale', p > 0.9);
    }
  });

  // ---- About scene (sketch -> built house) ----
  var aboutScene = document.getElementById('about-scene');
  var sceneSteps = document.querySelectorAll('#scene-steps li');
  if (aboutScene) {
    bindScrollVideo({
      section: aboutScene,
      video: document.getElementById('about-scene-video'),
      desktopSrc: 'assets/about-scene.mp4',
      onProgress: function (p) {
        var idx = p < 0.34 ? 0 : (p < 0.68 ? 1 : 2);
        sceneSteps.forEach(function (li, i) { li.classList.toggle('is-active', i === idx); });
      }
    });
  }

  scheduleTick();

  // ------------------------------------------------------------------
  // Reveals via IntersectionObserver
  // ------------------------------------------------------------------
  var revealElements = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !prefersReducedMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      var batchIndex = 0;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        setTimeout(function () { el.classList.add('visible'); }, batchIndex * 90);
        batchIndex++;
        revealObserver.unobserve(el);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealElements.forEach(function (el) { revealObserver.observe(el); });
  } else {
    revealElements.forEach(function (el) { el.classList.add('visible'); });
  }

  // ------------------------------------------------------------------
  // Manifesto — words light up as you read down the page
  // ------------------------------------------------------------------
  var manifesto = document.getElementById('manifesto-text');
  if (manifesto) {
    var words = manifesto.textContent.trim().split(/\s+/);
    manifesto.innerHTML = words.map(function (w) { return '<span class="w">' + w + '</span>'; }).join(' ');
    var wordEls = manifesto.querySelectorAll('.w');
    if (hasGsap && !prefersReducedMotion) {
      gsap.to(wordEls, {
        opacity: 1,
        ease: 'none',
        stagger: 0.12,
        scrollTrigger: { trigger: manifesto, start: 'top 82%', end: 'bottom 42%', scrub: 0.6 }
      });
    } else {
      manifesto.classList.add('is-static');
    }
  }

  // ------------------------------------------------------------------
  // Floor plan — draws itself when it enters the viewport
  // ------------------------------------------------------------------
  var plan = document.getElementById('plan');
  if (plan) {
    if ('IntersectionObserver' in window && !prefersReducedMotion) {
      var planObserver = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          plan.classList.add('is-drawn');
          planObserver.disconnect();
        }
      }, { threshold: 0.35 });
      planObserver.observe(plan);
    } else {
      plan.classList.add('is-drawn');
    }
  }

  // ------------------------------------------------------------------
  // GSAP: horizontal process track + image parallax
  // ------------------------------------------------------------------
  if (hasGsap && !prefersReducedMotion) {
    var processTrack = document.getElementById('process-track');
    var processCount = document.getElementById('process-count');
    var processBarFill = document.getElementById('process-bar-fill');
    var steps = processTrack ? processTrack.querySelectorAll('.step').length : 0;
    var mm = gsap.matchMedia();

    mm.add('(min-width: 901px)', function () {
      function distance() { return Math.max(0, processTrack.scrollWidth - window.innerWidth); }
      gsap.to(processTrack, {
        x: function () { return -distance(); },
        ease: 'none',
        scrollTrigger: {
          trigger: '#process-pin',
          pin: true,
          start: 'top top',
          end: function () { return '+=' + distance(); },
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate: function (self) {
            var idx = Math.min(steps - 1, Math.floor(self.progress * steps * 0.999));
            processCount.textContent = pad(idx + 1, 2);
            processBarFill.style.transform = 'scaleX(' + (0.25 + self.progress * 0.75) + ')';
          }
        }
      });
    });

    gsap.utils.toArray('.band-media, .cta-media').forEach(function (media) {
      gsap.fromTo(media, { yPercent: -7 }, {
        yPercent: 7,
        ease: 'none',
        scrollTrigger: { trigger: media.parentNode, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    gsap.utils.toArray('.band-title, .cta-title').forEach(function (title) {
      gsap.from(title, { yPercent: 30, opacity: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: title, start: 'top 90%' } });
    });

    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  }

  // ------------------------------------------------------------------
  // Animated counters
  // ------------------------------------------------------------------
  function animateCounter(el) {
    var target = parseFloat(el.getAttribute('data-target'));
    if (prefersReducedMotion) { el.textContent = target; return; }
    var duration = 1800;
    var start = null;
    function step(timestamp) {
      if (!start) start = timestamp;
      var t = Math.min(1, (timestamp - start) / duration);
      var eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      el.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll('.counter');
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
  // FAQ
  // ------------------------------------------------------------------
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var question = item.querySelector('.faq-q');
    question.addEventListener('click', function () {
      var wasOpen = item.classList.contains('is-open');
      document.querySelectorAll('.faq-item.is-open').forEach(function (other) {
        other.classList.remove('is-open');
        other.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) {
        item.classList.add('is-open');
        question.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ------------------------------------------------------------------
  // Testimonials — single rotating quote
  // ------------------------------------------------------------------
  var quotesEl = document.getElementById('quotes');
  if (quotesEl) {
    var quotes = Array.prototype.slice.call(quotesEl.querySelectorAll('.quote'));
    var quoteCurrent = document.getElementById('quote-current');
    document.getElementById('quote-total').textContent = pad(quotes.length, 2);
    var activeQuote = 0;
    var quoteTimer = null;

    function goToQuote(index) {
      var next = (index + quotes.length) % quotes.length;
      quotes[activeQuote].classList.remove('is-active');
      quotes[next].classList.add('is-active');
      activeQuote = next;
      quoteCurrent.textContent = pad(next + 1, 2);
    }
    function restartTimer() {
      clearInterval(quoteTimer);
      if (!prefersReducedMotion) quoteTimer = setInterval(function () { goToQuote(activeQuote + 1); }, 8000);
    }
    document.getElementById('quote-prev').addEventListener('click', function () { goToQuote(activeQuote - 1); restartTimer(); });
    document.getElementById('quote-next').addEventListener('click', function () { goToQuote(activeQuote + 1); restartTimer(); });
    quotesEl.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') { goToQuote(activeQuote - 1); restartTimer(); }
      if (event.key === 'ArrowRight') { goToQuote(activeQuote + 1); restartTimer(); }
    });
    quotesEl.addEventListener('mouseenter', function () { clearInterval(quoteTimer); });
    quotesEl.addEventListener('mouseleave', restartTimer);
    restartTimer();
  }

  // ------------------------------------------------------------------
  // Services — rows jump to the form with the service preselected,
  // and on desktop a photo preview follows the cursor
  // ------------------------------------------------------------------
  var nameInput = document.getElementById('name');
  document.querySelectorAll('.service-row').forEach(function (row) {
    row.addEventListener('click', function () {
      var serviceName = row.getAttribute('data-service');
      var radio = document.querySelector('#service-chips input[value="' + serviceName + '"]');
      if (radio) radio.checked = true;
      scrollToTarget(document.getElementById('contact-form'));
      setTimeout(function () { if (nameInput) nameInput.focus({ preventScroll: true }); }, 1400);
    });
  });

  var preview = document.getElementById('service-preview');
  var servicesList = document.getElementById('services-list');
  if (preview && servicesList && finePointer && !prefersReducedMotion && window.innerWidth > 900) {
    var previewImg = preview.querySelector('img');
    var pos = { x: 0, y: 0 };
    var target = { x: 0, y: 0 };
    var previewScale = 0.85;
    var previewActive = false;
    var previewRunning = false;

    function renderPreview() {
      var dx = target.x - pos.x;
      pos.x += dx * 0.14;
      pos.y += (target.y - pos.y) * 0.14;
      previewScale += ((previewActive ? 1 : 0.85) - previewScale) * 0.12;
      var tilt = clamp(dx * 0.04, -8, 8);
      preview.style.transform = 'translate3d(' + pos.x + 'px,' + pos.y + 'px,0) translate(-50%,-50%) rotate(' + tilt + 'deg) scale(' + previewScale + ')';
      if (previewActive || Math.abs(previewScale - 0.85) > 0.005) {
        requestAnimationFrame(renderPreview);
      } else {
        previewRunning = false;
      }
    }
    function startPreview() {
      if (previewRunning) return;
      previewRunning = true;
      requestAnimationFrame(renderPreview);
    }

    servicesList.addEventListener('mousemove', function (event) {
      target.x = event.clientX + 170;
      target.y = event.clientY;
    });
    servicesList.querySelectorAll('.service-row').forEach(function (row) {
      row.addEventListener('mouseenter', function (event) {
        var src = row.getAttribute('data-image');
        if (previewImg.getAttribute('src') !== src) previewImg.setAttribute('src', src);
        if (!previewActive) {
          pos.x = target.x = event.clientX + 170;
          pos.y = target.y = event.clientY;
        }
        previewActive = true;
        preview.classList.add('is-visible');
        startPreview();
      });
    });
    servicesList.addEventListener('mouseleave', function () {
      previewActive = false;
      preview.classList.remove('is-visible');
    });
  }

  // ------------------------------------------------------------------
  // Magnetic buttons (desktop)
  // ------------------------------------------------------------------
  if (finePointer && !prefersReducedMotion) {
    document.querySelectorAll('.magnetic').forEach(function (el) {
      el.addEventListener('mousemove', function (event) {
        var rect = el.getBoundingClientRect();
        var mx = event.clientX - (rect.left + rect.width / 2);
        var my = event.clientY - (rect.top + rect.height / 2);
        el.style.transform = 'translate(' + (mx * 0.18) + 'px,' + (my * 0.3) + 'px)';
      });
      el.addEventListener('mouseleave', function () { el.style.transform = ''; });
    });
  }

  // ------------------------------------------------------------------
  // Contact form — validates inline, then opens the visitor's e-mail app
  // with the request already written (no backend required)
  // ------------------------------------------------------------------
  var contactForm = document.getElementById('contact-form');
  var formStatus = document.getElementById('form-status');
  var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setFieldError(input, hasError) {
    input.closest('.field').classList.toggle('has-error', hasError);
    input.setAttribute('aria-invalid', hasError ? 'true' : 'false');
  }

  if (contactForm) {
    ['name', 'email'].forEach(function (id) {
      var input = document.getElementById(id);
      input.addEventListener('input', function () { setFieldError(input, false); });
    });

    contactForm.addEventListener('submit', function (event) {
      event.preventDefault();
      var name = document.getElementById('name');
      var email = document.getElementById('email');
      var message = document.getElementById('message');
      var service = contactForm.querySelector('input[name="service"]:checked');

      var nameBad = name.value.trim().length < 2;
      var emailBad = !emailPattern.test(email.value.trim());
      setFieldError(name, nameBad);
      setFieldError(email, emailBad);
      if (nameBad) { name.focus(); return; }
      if (emailBad) { email.focus(); return; }

      var serviceName = service ? service.value : 'Orçamento';
      var subject = 'Solicitação de orçamento — ' + serviceName;
      var text = 'Nome: ' + name.value.trim() + '\n' +
        'E-mail: ' + email.value.trim() + '\n' +
        'Serviço: ' + serviceName + '\n\n' +
        (message.value.trim() || '(sem mensagem)');
      window.location.href = 'mailto:contato@montrealengenharia.com.br?subject=' +
        encodeURIComponent(subject) + '&body=' + encodeURIComponent(text);
      formStatus.textContent = 'Abrimos seu aplicativo de e-mail com a solicitação pronta. Se ele não abriu, escreva para contato@montrealengenharia.com.br.';
    });
  }

  // ------------------------------------------------------------------
  // Current year
  // ------------------------------------------------------------------
  var year = String(new Date().getFullYear());
  ['footer-year', 'form-year'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.textContent = year;
  });
})();
