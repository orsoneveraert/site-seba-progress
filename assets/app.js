(function () {
  const menuPanel = document.querySelector('[data-menu]');
  const openButton = document.querySelector('[data-menu-open]');
  const closeButton = document.querySelector('[data-menu-close]');
  const rootStyle = document.documentElement.style;
  let lockedScrollY = 0;

  const lockPageScroll = () => {
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.classList.add('menu-open');
    document.body.style.top = '-' + lockedScrollY + 'px';
  };

  const unlockPageScroll = () => {
    if (!document.body.classList.contains('menu-open')) return;
    document.body.classList.remove('menu-open');
    document.body.style.top = '';
    window.scrollTo(0, lockedScrollY);
  };

  const syncMenuButtonPosition = () => {
    if (!openButton) return;
    const buttonRect = openButton.getBoundingClientRect();
    rootStyle.setProperty('--menu-btn-top', buttonRect.top + 'px');
    rootStyle.setProperty('--menu-btn-left', buttonRect.left + 'px');
  };

  const openMenu = () => {
    if (!menuPanel) return;
    syncMenuButtonPosition();
    menuPanel.setAttribute('data-open', 'true');
    menuPanel.setAttribute('aria-hidden', 'false');
    lockPageScroll();
    menuPanel.scrollTop = 0;
  };

  const closeMenu = () => {
    if (!menuPanel) return;
    menuPanel.setAttribute('data-open', 'false');
    menuPanel.setAttribute('aria-hidden', 'true');
    unlockPageScroll();
  };

  if (openButton) {
    syncMenuButtonPosition();
    openButton.addEventListener('click', openMenu);
    window.addEventListener('resize', syncMenuButtonPosition);
    window.addEventListener('scroll', syncMenuButtonPosition, { passive: true });
  }

  if (closeButton) {
    closeButton.addEventListener('click', closeMenu);
  }

  if (menuPanel) {
    menuPanel.addEventListener('click', function (event) {
      if (event.target === menuPanel) closeMenu();
    });

    menuPanel.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      closeMenu();
    }
  });

  const currentFile = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('[data-page-link]').forEach(function (link) {
    const href = link.getAttribute('href');
    if (href === currentFile) {
      link.classList.add('is-active');
    }
  });

  const fitHeroBannerTitle = function () {
    const title = document.querySelector('.hero-banner-text');
    if (!title) return;
    const parent = title.parentElement;
    if (!parent) return;

    // Reset to CSS value before measuring.
    title.style.fontSize = '';

    const available = parent.clientWidth;
    if (!available) return;
    const required = title.scrollWidth;
    if (required <= available) return;

    const current = parseFloat(window.getComputedStyle(title).fontSize);
    if (!current) return;

    const fitted = Math.max(current * (available / required), 18);
    title.style.fontSize = fitted.toFixed(2) + 'px';
  };

  fitHeroBannerTitle();
  window.addEventListener('resize', fitHeroBannerTitle);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitHeroBannerTitle);
  }

  const toDuotonePath = function (src) {
    if (!src || !src.includes('assets/photos/')) return null;
    return src.replace('assets/photos/', 'assets/photos_duotone/');
  };

  document.querySelectorAll('.image-frame img').forEach(function (img) {
    if (img.classList.contains('image-processed') || img.classList.contains('image-original')) return;
    const originalSrc = img.getAttribute('src');
    const processedSrc = toDuotonePath(originalSrc);
    const frame = img.closest('.image-frame');
    if (!processedSrc || !frame) return;

    img.classList.add('image-original');
    img.setAttribute('decoding', 'async');
    if (!img.hasAttribute('loading')) img.setAttribute('loading', 'lazy');

    const processedImg = img.cloneNode();
    processedImg.classList.remove('image-original');
    processedImg.classList.add('image-processed');
    processedImg.setAttribute('src', processedSrc);
    processedImg.setAttribute('alt', '');
    processedImg.setAttribute('aria-hidden', 'true');
    processedImg.setAttribute('decoding', 'async');
    if (!processedImg.hasAttribute('loading')) processedImg.setAttribute('loading', 'lazy');

    const markProcessedReady = function () {
      frame.classList.add('is-processed-ready');
    };

    const removeProcessedLayer = function () {
      processedImg.remove();
      frame.classList.remove('is-processed-ready');
    };

    if (processedImg.complete) {
      if (processedImg.naturalWidth > 0) {
        markProcessedReady();
      } else {
        removeProcessedLayer();
      }
    } else {
      processedImg.addEventListener('load', markProcessedReady, { once: true });
      processedImg.addEventListener('error', removeProcessedLayer, { once: true });
    }

    img.parentNode.insertBefore(processedImg, img.nextSibling);
  });

  const imageFrames = document.querySelectorAll('.image-frame');
  const desktopHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (imageFrames.length && desktopHover) {
    const imageCursor = document.createElement('span');
    imageCursor.className = 'image-cursor';
    imageCursor.setAttribute('aria-hidden', 'true');
    document.body.appendChild(imageCursor);

    const moveCursor = function (event) {
      imageCursor.style.left = event.clientX + 'px';
      imageCursor.style.top = event.clientY + 'px';
    };

    const activateCursor = function (event) {
      moveCursor(event);
      imageCursor.classList.add('is-active');
      document.body.classList.add('image-cursor-active');
    };

    const deactivateCursor = function () {
      imageCursor.classList.remove('is-active');
      document.body.classList.remove('image-cursor-active');
    };

    imageFrames.forEach(function (frame) {
      frame.addEventListener('mouseenter', activateCursor);
      frame.addEventListener('mousemove', moveCursor);
      frame.addEventListener('mouseleave', deactivateCursor);
    });

    window.addEventListener('blur', deactivateCursor);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) deactivateCursor();
    });
  }

  const uploadInput = document.querySelector('[data-upload-input]');
  const uploadList = document.querySelector('[data-upload-list]');
  const uploadFeedback = document.querySelector('[data-upload-feedback]');

  if (uploadInput && uploadList && uploadFeedback) {
    const MAX_FILE_BYTES = 500 * 1024 * 1024;
    const selectedFiles = [];

    const fileKey = function (file) {
      return [file.name, file.size, file.lastModified, file.type].join('::');
    };

    const formatSize = function (bytes) {
      if (!bytes) return '0 B';
      const units = ['B', 'KB', 'MB', 'GB'];
      const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
      const value = bytes / Math.pow(1024, unitIndex);
      const precision = unitIndex < 2 ? 0 : 1;
      return value.toFixed(precision) + ' ' + units[unitIndex];
    };

    const setFeedback = function (message, isError) {
      uploadFeedback.textContent = message || '';
      uploadFeedback.classList.toggle('is-error', Boolean(isError && message));
    };

    const syncInputFiles = function () {
      if (typeof DataTransfer === 'undefined') return;
      const dataTransfer = new DataTransfer();
      selectedFiles.forEach(function (file) {
        dataTransfer.items.add(file);
      });
      uploadInput.files = dataTransfer.files;
    };

    const renderSelectedFiles = function () {
      uploadList.innerHTML = '';

      selectedFiles.forEach(function (file, index) {
        const item = document.createElement('li');
        item.className = 'upload-item';

        const copyWrap = document.createElement('div');
        copyWrap.className = 'upload-item-copy';

        const name = document.createElement('p');
        name.className = 'upload-item-name';
        name.textContent = file.name;

        const meta = document.createElement('p');
        meta.className = 'upload-item-meta';
        meta.textContent = formatSize(file.size);

        const removeButton = document.createElement('button');
        removeButton.className = 'upload-remove';
        removeButton.type = 'button';
        removeButton.textContent = 'Retirer';
        removeButton.setAttribute('data-upload-remove-index', String(index));
        removeButton.setAttribute('aria-label', 'Retirer ' + file.name);

        copyWrap.appendChild(name);
        copyWrap.appendChild(meta);
        item.appendChild(copyWrap);
        item.appendChild(removeButton);
        uploadList.appendChild(item);
      });
    };

    uploadInput.addEventListener('change', function () {
      const incomingFiles = Array.from(uploadInput.files || []);
      if (!incomingFiles.length) return;

      const errors = [];

      incomingFiles.forEach(function (file) {
        if (file.size > MAX_FILE_BYTES) {
          errors.push('"' + file.name + '" depasse 500 Mo.');
          return;
        }

        const isDuplicate = selectedFiles.some(function (item) {
          return fileKey(item) === fileKey(file);
        });

        if (!isDuplicate) selectedFiles.push(file);
      });

      syncInputFiles();
      renderSelectedFiles();

      if (errors.length) {
        setFeedback(errors.join(' '), true);
      } else if (selectedFiles.length) {
        setFeedback(selectedFiles.length + ' fichier(s) pret(s) a l envoi.', false);
      } else {
        setFeedback('', false);
      }

      uploadInput.value = '';
    });

    uploadList.addEventListener('click', function (event) {
      const removeButton = event.target.closest('[data-upload-remove-index]');
      if (!removeButton) return;

      const index = Number(removeButton.getAttribute('data-upload-remove-index'));
      if (Number.isNaN(index) || index < 0 || index >= selectedFiles.length) return;

      selectedFiles.splice(index, 1);
      syncInputFiles();
      renderSelectedFiles();

      if (selectedFiles.length) {
        setFeedback(selectedFiles.length + ' fichier(s) pret(s) a l envoi.', false);
      } else {
        setFeedback('', false);
      }
    });
  }

  document.querySelectorAll('[data-textarea-autogrow]').forEach(function (textarea) {
    const resizeTextarea = function () {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    };

    resizeTextarea();
    textarea.addEventListener('input', resizeTextarea);
  });

  const heroMetricRows = Array.from(document.querySelectorAll('.hero-metric'));
  const mobileHeroMetricQuery = window.matchMedia('(max-width: 920px)');

  const buildHeroMetricMobileLine = function (row) {
    let mobileLine = row.querySelector('.hero-metric-mobile-line');
    if (mobileLine) return mobileLine;

    const parts = Array.from(row.children)
      .filter(function (item) {
        return !item.classList.contains('hero-metric-mobile-line');
      })
      .map(function (item) {
        return item.textContent.replace(/\s+/g, ' ').trim();
      })
      .filter(Boolean);

    if (!parts.length) return null;

    mobileLine = document.createElement('p');
    mobileLine.className = 'hero-metric-mobile-line';

    const track = document.createElement('span');
    track.className = 'hero-metric-mobile-track';
    track.textContent = parts.join('  —  ');
    mobileLine.appendChild(track);
    row.appendChild(mobileLine);
    return mobileLine;
  };

  const refreshHeroMetricMobileLines = function () {
    const isMobile = mobileHeroMetricQuery.matches;

    heroMetricRows.forEach(function (row) {
      const mobileLine = buildHeroMetricMobileLine(row);
      if (!mobileLine) return;

      const track = mobileLine.querySelector('.hero-metric-mobile-track');
      if (!track) return;

      mobileLine.classList.remove('is-overflowing');
      mobileLine.style.removeProperty('--hero-scroll-distance');
      mobileLine.style.removeProperty('--hero-scroll-duration');

      if (!isMobile) return;

      const overflow = Math.ceil(track.scrollWidth - mobileLine.clientWidth);
      if (overflow <= 6) return;

      const duration = Math.max(20, Math.min(56, overflow / 9));
      mobileLine.style.setProperty('--hero-scroll-distance', overflow + 'px');
      mobileLine.style.setProperty('--hero-scroll-duration', duration.toFixed(2) + 's');
      mobileLine.classList.add('is-overflowing');
    });
  };

  if (heroMetricRows.length) {
    refreshHeroMetricMobileLines();

    const queuedRefreshHeroMetricMobileLines = function () {
      window.requestAnimationFrame(refreshHeroMetricMobileLines);
    };

    window.addEventListener('resize', queuedRefreshHeroMetricMobileLines);

    if (typeof mobileHeroMetricQuery.addEventListener === 'function') {
      mobileHeroMetricQuery.addEventListener('change', queuedRefreshHeroMetricMobileLines);
    } else if (typeof mobileHeroMetricQuery.addListener === 'function') {
      mobileHeroMetricQuery.addListener(queuedRefreshHeroMetricMobileLines);
    }
  }

  const observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    },
    {
      threshold: 0.18,
      rootMargin: '0px 0px -5% 0px'
    }
  );

  document.querySelectorAll('.fadein').forEach(function (item) {
    observer.observe(item);
  });
})();
