(function () {
  'use strict';

  var reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------------
  // Tela de carregamento
  // ------------------------------------------------------------------
  var telaCarregamento = document.getElementById('tela-carregamento');
  var carregamentoLiberado = false;

  function liberarCarregamento() {
    if (carregamentoLiberado) return;
    carregamentoLiberado = true;
    telaCarregamento.classList.add('oculta');
  }
  setTimeout(liberarCarregamento, 6000);

  // ------------------------------------------------------------------
  // Header com fundo ao rolar
  // ------------------------------------------------------------------
  var header = document.getElementById('header');
  function atualizarHeader() {
    if (window.scrollY > 40) header.classList.add('rolado');
    else header.classList.remove('rolado');
  }
  window.addEventListener('scroll', atualizarHeader, { passive: true });
  atualizarHeader();

  // ------------------------------------------------------------------
  // Menu mobile
  // ------------------------------------------------------------------
  var menuMobile = document.getElementById('menu-mobile');
  var botaoMenu = document.getElementById('botao-menu');
  var botaoFecharMenu = document.getElementById('botao-fechar-menu');

  function abrirMenu() { menuMobile.classList.add('aberto'); }
  function fecharMenu() { menuMobile.classList.remove('aberto'); }

  if (botaoMenu) botaoMenu.addEventListener('click', abrirMenu);
  if (botaoFecharMenu) botaoFecharMenu.addEventListener('click', fecharMenu);
  menuMobile.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', fecharMenu);
  });

  // ------------------------------------------------------------------
  // HERO — scroll binding do vídeo
  // ------------------------------------------------------------------
  var heroSecao = document.getElementById('hero');
  var heroVideo = document.getElementById('hero-video');
  var heroPoster = document.getElementById('hero-poster');
  var heroBarra = document.getElementById('hero-barra');
  var heroContador = document.getElementById('hero-contador');
  var heroTitulo = document.getElementById('hero-titulo');
  var heroSubtitulo = document.getElementById('hero-subtitulo');

  var usaMobile = window.matchMedia('(max-width: 820px) and (orientation: portrait)').matches;
  var origemVideo = usaMobile ? 'assets/hero-mobile.mp4' : 'assets/hero.mp4';

  var videoDuracao = 0;
  var videoPronto = false;
  var destravadoIOS = false;

  var mensagens = [
    { limite: 0, titulo: 'Toda casa começa num traço', sub: 'Role a página e acompanhe uma casa de alto padrão nascer do papel até a chave na mão — é assim que a Mont Real Engenharia conduz cada projeto.' },
    { limite: 0.35, titulo: 'O projeto ganha estrutura', sub: 'Cálculo estrutural, engenharia e cronograma físico-financeiro definidos antes do primeiro tijolo.' },
    { limite: 0.7, titulo: 'A obra sai do papel', sub: 'Execução acompanhada de perto, com controle de qualidade em cada etapa do canteiro.' },
    { limite: 0.92, titulo: 'Do esboço à chave na mão', sub: 'Do traço a lápis à entrega final — o mesmo padrão de rigor técnico, do início ao fim.' }
  ];

  function tentarCarregarVideo() {
    heroVideo.src = origemVideo;
    heroVideo.load();
  }

  heroVideo.addEventListener('loadedmetadata', function () {
    videoDuracao = heroVideo.duration || 0;
  });

  heroVideo.addEventListener('canplaythrough', function () {
    videoPronto = true;
    heroVideo.classList.add('pronto');
    liberarCarregamento();
  });

  heroVideo.addEventListener('error', function () {
    // Sem o arquivo ainda: mantém o poster e não trava o site.
    liberarCarregamento();
  });

  tentarCarregarVideo();

  function destravarIOS() {
    if (destravadoIOS) return;
    destravadoIOS = true;
    var p = heroVideo.play();
    if (p && p.then) {
      p.then(function () { heroVideo.pause(); }).catch(function () {});
    }
  }
  window.addEventListener('touchstart', destravarIOS, { once: true, passive: true });
  window.addEventListener('scroll', destravarIOS, { once: true, passive: true });

  function mensagemParaProgresso(p) {
    var escolhida = mensagens[0];
    for (var i = 0; i < mensagens.length; i++) {
      if (p >= mensagens[i].limite) escolhida = mensagens[i];
    }
    return escolhida;
  }

  var mensagemAtual = mensagens[0];

  function aplicarProgressoHero(p) {
    p = Math.min(1, Math.max(0, p));

    heroBarra.style.width = (p * 100) + '%';
    heroContador.textContent = Math.round(p * 100) + '%';

    var msg = mensagemParaProgresso(p);
    if (msg !== mensagemAtual) {
      mensagemAtual = msg;
      heroTitulo.textContent = msg.titulo;
      heroSubtitulo.textContent = msg.sub;
    }

    if (videoPronto && videoDuracao > 0) {
      var readyState = heroVideo.readyState;
      if (readyState >= 2) {
        heroVideo.currentTime = p * videoDuracao;
      }
    }
  }

  function progressoHero() {
    var rect = heroSecao.getBoundingClientRect();
    var alturaTotal = heroSecao.offsetHeight - window.innerHeight;
    if (alturaTotal <= 0) return 0;
    var rolado = -rect.top;
    return rolado / alturaTotal;
  }

  var tickAgendado = false;
  function agendarTick() {
    if (tickAgendado) return;
    tickAgendado = true;
    if (document.hidden) {
      aplicarProgressoHero(progressoHero());
      tickAgendado = false;
      return;
    }
    requestAnimationFrame(function () {
      aplicarProgressoHero(progressoHero());
      tickAgendado = false;
    });
  }

  window.addEventListener('scroll', agendarTick, { passive: true });
  window.addEventListener('resize', agendarTick);
  agendarTick();

  // ------------------------------------------------------------------
  // Reveals com IntersectionObserver
  // ------------------------------------------------------------------
  var elementosRevelar = document.querySelectorAll('.revelar');
  if ('IntersectionObserver' in window && !reduzirMovimento) {
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada, indice) {
        if (entrada.isIntersecting) {
          setTimeout(function () {
            entrada.target.classList.add('visivel');
          }, (indice % 6) * 70);
          observador.unobserve(entrada.target);
        }
      });
    }, { threshold: 0.15 });
    elementosRevelar.forEach(function (el) { observador.observe(el); });
  } else {
    elementosRevelar.forEach(function (el) { el.classList.add('visivel'); });
  }

  // ------------------------------------------------------------------
  // Contadores animados
  // ------------------------------------------------------------------
  var contadores = document.querySelectorAll('.contador-num');
  function animarContador(el) {
    var alvo = parseFloat(el.getAttribute('data-alvo'));
    var sufixo = el.getAttribute('data-sufixo') || '';
    var duracao = 1400;
    var inicio = null;

    function passo(timestamp) {
      if (!inicio) inicio = timestamp;
      var progresso = Math.min(1, (timestamp - inicio) / duracao);
      var valor = Math.round(alvo * progresso);
      el.textContent = valor + (sufixo ? sufixo : '');
      if (progresso < 1) requestAnimationFrame(passo);
    }
    requestAnimationFrame(passo);
  }

  if ('IntersectionObserver' in window) {
    var observadorContador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        if (entrada.isIntersecting) {
          animarContador(entrada.target);
          observadorContador.unobserve(entrada.target);
        }
      });
    }, { threshold: 0.6 });
    contadores.forEach(function (el) { observadorContador.observe(el); });
  } else {
    contadores.forEach(animarContador);
  }

  // ------------------------------------------------------------------
  // FAQ acordeão
  // ------------------------------------------------------------------
  document.querySelectorAll('.faq-item').forEach(function (item) {
    var pergunta = item.querySelector('.faq-pergunta');
    pergunta.addEventListener('click', function () {
      var jaAberto = item.classList.contains('aberto');
      document.querySelectorAll('.faq-item.aberto').forEach(function (outro) {
        outro.classList.remove('aberto');
      });
      if (!jaAberto) item.classList.add('aberto');
    });
  });

  // ------------------------------------------------------------------
  // Formulário de contato (placeholder — plugar backend real depois)
  // ------------------------------------------------------------------
  var formulario = document.getElementById('formulario-contato');
  if (formulario) {
    formulario.addEventListener('submit', function (evento) {
      evento.preventDefault();
      alert('Formulário pronto na interface — falta conectar a um serviço de envio (e-mail, CRM ou API) para receber as mensagens de verdade.');
    });
  }
})();
