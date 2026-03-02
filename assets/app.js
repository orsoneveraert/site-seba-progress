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

  const themeToggles = Array.from(document.querySelectorAll('[data-theme-toggle]'));
  const feedbackToggles = [];
  const themeMedia = window.matchMedia('(prefers-color-scheme: dark)');
  const themeStorageKey = 'site-theme-preference';
  const feedbackPageKey = window.location.pathname.split('/').pop() || 'index.html';
  const feedbackStorageKey = 'site-feedback-notes:' + feedbackPageKey;
  const feedbackCollabConfig =
    window.FEEDBACK_COLLAB && typeof window.FEEDBACK_COLLAB === 'object' ? window.FEEDBACK_COLLAB : null;
  const feedbackCollabEnabled = Boolean(
    feedbackCollabConfig &&
      feedbackCollabConfig.enabled &&
      feedbackCollabConfig.supabaseUrl &&
      feedbackCollabConfig.supabaseAnonKey
  );

  themeToggles.forEach(function (toggle) {
    let controls = toggle.closest('.theme-controls');

    if (!controls && toggle.parentNode) {
      controls = document.createElement('div');
      controls.className = 'theme-controls';
      toggle.parentNode.insertBefore(controls, toggle);
      controls.appendChild(toggle);
    }

    if (!controls) return;

    let feedbackToggle = controls.querySelector('[data-feedback-toggle]');
    if (!feedbackToggle) {
      feedbackToggle = document.createElement('button');
      feedbackToggle.className = 'theme-toggle feedback-toggle';
      feedbackToggle.type = 'button';
      feedbackToggle.setAttribute('data-feedback-toggle', '');
      feedbackToggle.setAttribute('aria-label', 'Afficher les commentaires');
      feedbackToggle.setAttribute('title', 'Afficher les commentaires');
      feedbackToggle.textContent = 'F';
      controls.appendChild(feedbackToggle);
    }

    feedbackToggles.push(feedbackToggle);
  });

  const readStoredTheme = function () {
    try {
      const stored = window.localStorage.getItem(themeStorageKey);
      if (stored === 'dark' || stored === 'light') return stored;
    } catch (error) {
      return null;
    }
    return null;
  };

  const writeStoredTheme = function (theme) {
    try {
      window.localStorage.setItem(themeStorageKey, theme);
    } catch (error) {
      // Ignore storage errors (private mode, blocked storage, etc.).
    }
  };

  const systemTheme = function () {
    return themeMedia.matches ? 'dark' : 'light';
  };

  const syncThemeToggleUi = function (theme) {
    const label = theme === 'dark' ? 'D' : 'L';
    const action = theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre';

    themeToggles.forEach(function (toggle) {
      toggle.textContent = label;
      toggle.setAttribute('aria-label', action);
      toggle.setAttribute('title', action);
    });
  };

  const applyTheme = function (theme) {
    document.documentElement.setAttribute('data-theme', theme);
    syncThemeToggleUi(theme);
  };

  let preferredTheme = readStoredTheme();
  applyTheme(preferredTheme || systemTheme());

  themeToggles.forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      preferredTheme = next;
      writeStoredTheme(next);
      applyTheme(next);
    });
  });

  const onSystemThemeChange = function () {
    if (preferredTheme) return;
    applyTheme(systemTheme());
  };

  if (typeof themeMedia.addEventListener === 'function') {
    themeMedia.addEventListener('change', onSystemThemeChange);
  } else if (typeof themeMedia.addListener === 'function') {
    themeMedia.addListener(onSystemThemeChange);
  }

  if (feedbackToggles.length) {
    const feedbackLayer = document.createElement('div');
    feedbackLayer.className = 'feedback-layer';
    feedbackLayer.setAttribute('aria-hidden', 'true');
    document.body.appendChild(feedbackLayer);
    const feedbackClose = document.createElement('button');
    feedbackClose.className = 'feedback-close';
    feedbackClose.type = 'button';
    feedbackClose.textContent = 'X';
    feedbackClose.setAttribute('aria-label', 'Quitter le mode commentaires');
    feedbackClose.setAttribute('title', 'Quitter le mode commentaires');
    feedbackClose.setAttribute('aria-hidden', 'true');
    feedbackClose.tabIndex = -1;
    document.body.appendChild(feedbackClose);

    let feedbackVisible = false;
    let selectedNote = null;
    let dragState = null;
    let noteCounter = 0;
    let isApplyingRemote = false;
    let isRemoteWriteInFlight = false;
    let remoteSyncQueued = false;
    let remotePollTimer = null;
    let hasPulledRemote = false;
    const collabPollMs = Math.max(
      900,
      Number(
        feedbackCollabConfig && Number.isFinite(Number(feedbackCollabConfig.pollMs))
          ? Number(feedbackCollabConfig.pollMs)
          : 2400
      )
    );
    const collabTable =
      feedbackCollabConfig && typeof feedbackCollabConfig.table === 'string' && feedbackCollabConfig.table.trim()
        ? feedbackCollabConfig.table.trim()
        : 'feedback_notes';
    const collabBaseUrl =
      feedbackCollabConfig && typeof feedbackCollabConfig.supabaseUrl === 'string'
        ? feedbackCollabConfig.supabaseUrl.replace(/\/+$/, '')
        : '';
    const collabApiKey =
      feedbackCollabConfig && typeof feedbackCollabConfig.supabaseAnonKey === 'string'
        ? feedbackCollabConfig.supabaseAnonKey
        : '';
    const collabEndpoint = collabBaseUrl ? collabBaseUrl + '/rest/v1/' + collabTable : '';
    const collabPageFilterValue = encodeURIComponent(feedbackPageKey);
    const noteResizeObserver =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(function (entries) {
            entries.forEach(function (entry) {
              const note = entry.target;
              clampNoteToViewport(note);
            });
            persistNotes();
          })
        : null;

    const getLayerHeight = function () {
      return Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
        window.innerHeight
      );
    };

    const syncFeedbackLayerSize = function () {
      feedbackLayer.style.height = getLayerHeight() + 'px';
    };

    const readStoredNotes = function () {
      try {
        const raw = window.localStorage.getItem(feedbackStorageKey);
        const parsed = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(parsed)) return [];
        return parsed;
      } catch (error) {
        return [];
      }
    };

    const writeStoredNotes = function (notes) {
      try {
        window.localStorage.setItem(feedbackStorageKey, JSON.stringify(notes));
      } catch (error) {
        // Ignore storage errors.
      }
    };

    const collabHeaders = function (preferValue) {
      const headers = {
        apikey: collabApiKey,
        Authorization: 'Bearer ' + collabApiKey,
        'Content-Type': 'application/json'
      };
      if (preferValue) headers.Prefer = preferValue;
      return headers;
    };

    const fetchRemoteNotes = async function () {
      if (!feedbackCollabEnabled || !collabEndpoint) return null;

      try {
        const response = await window.fetch(
          collabEndpoint +
            '?page_path=eq.' +
            collabPageFilterValue +
            '&select=id,x,y,w,h,text,updated_at&order=updated_at.asc',
          {
            method: 'GET',
            headers: collabHeaders('')
          }
        );

        if (!response.ok) return null;
        const payload = await response.json();
        return Array.isArray(payload) ? payload : [];
      } catch (error) {
        return null;
      }
    };

    const upsertRemoteNotes = async function (notes) {
      if (!feedbackCollabEnabled || !collabEndpoint) return;
      if (!Array.isArray(notes) || !notes.length) return;

      const payload = notes.map(function (item) {
        return {
          id: item.id,
          page_path: feedbackPageKey,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          text: item.text
        };
      });

      try {
        await window.fetch(collabEndpoint, {
          method: 'POST',
          headers: collabHeaders('resolution=merge-duplicates'),
          body: JSON.stringify(payload)
        });
      } catch (error) {
        // Ignore network errors and keep local behavior.
      }
    };

    const deleteRemoteNote = async function (noteId) {
      if (!feedbackCollabEnabled || !collabEndpoint || !noteId) return;

      try {
        await window.fetch(
          collabEndpoint +
            '?id=eq.' +
            encodeURIComponent(noteId) +
            '&page_path=eq.' +
            collabPageFilterValue,
          {
            method: 'DELETE',
            headers: collabHeaders('')
          }
        );
      } catch (error) {
        // Ignore network errors and keep local behavior.
      }
    };

    const parsePx = function (value, fallback) {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    };

    const clamp = function (value, min, max) {
      return Math.min(Math.max(value, min), max);
    };

    const serializeNotes = function () {
      return Array.from(feedbackLayer.querySelectorAll('.feedback-note')).map(function (note) {
        const editor = note.querySelector('.feedback-note-editor');
        return {
          id: note.getAttribute('data-note-id') || '',
          x: Math.round(parsePx(note.style.left, note.offsetLeft)),
          y: Math.round(parsePx(note.style.top, note.offsetTop)),
          w: Math.round(parsePx(note.style.width, note.offsetWidth)),
          h: Math.round(parsePx(note.style.height, note.offsetHeight)),
          text: editor ? editor.value : ''
        };
      });
    };

    const flushRemoteSync = async function () {
      if (!feedbackCollabEnabled || isApplyingRemote) return;
      if (isRemoteWriteInFlight) {
        remoteSyncQueued = true;
        return;
      }

      isRemoteWriteInFlight = true;
      const snapshot = serializeNotes();
      await upsertRemoteNotes(snapshot);
      isRemoteWriteInFlight = false;

      if (remoteSyncQueued) {
        remoteSyncQueued = false;
        flushRemoteSync();
      }
    };

    const persistNotes = function () {
      writeStoredNotes(serializeNotes());
      if (feedbackCollabEnabled && !isApplyingRemote) {
        flushRemoteSync();
      }
    };

    const setFeedbackUi = function () {
      feedbackToggles.forEach(function (toggle) {
        toggle.classList.toggle('is-active', feedbackVisible);
        const label = feedbackVisible ? 'Masquer les commentaires' : 'Afficher les commentaires';
        toggle.setAttribute('aria-label', label);
        toggle.setAttribute('title', label);
      });

      feedbackLayer.classList.toggle('is-active', feedbackVisible);
      feedbackLayer.setAttribute('aria-hidden', feedbackVisible ? 'false' : 'true');
      feedbackClose.classList.toggle('is-active', feedbackVisible);
      feedbackClose.setAttribute('aria-hidden', feedbackVisible ? 'false' : 'true');
      feedbackClose.tabIndex = feedbackVisible ? 0 : -1;
    };

    const selectNote = function (note, focusNote) {
      if (selectedNote === note) {
        if (focusNote) note.focus({ preventScroll: true });
        return;
      }

      if (selectedNote) {
        selectedNote.classList.remove('is-selected');
      }

      selectedNote = note || null;

      if (selectedNote) {
        selectedNote.classList.add('is-selected');
        if (focusNote) selectedNote.focus({ preventScroll: true });
      }
    };

    const removeNote = function (note) {
      if (!note) return;
      const noteId = note.getAttribute('data-note-id') || '';
      if (noteResizeObserver) noteResizeObserver.unobserve(note);
      if (selectedNote === note) selectedNote = null;
      note.remove();
      persistNotes();
      if (feedbackCollabEnabled) {
        deleteRemoteNote(noteId);
      }
    };

    const clampNoteToViewport = function (note) {
      if (!note) return;
      syncFeedbackLayerSize();

      const maxLeft = Math.max(feedbackLayer.clientWidth - note.offsetWidth, 0);
      const maxTop = Math.max(getLayerHeight() - note.offsetHeight, 0);
      const currentLeft = parsePx(note.style.left, note.offsetLeft);
      const currentTop = parsePx(note.style.top, note.offsetTop);

      note.style.left = clamp(currentLeft, 0, maxLeft) + 'px';
      note.style.top = clamp(currentTop, 0, maxTop) + 'px';
    };

    const fitNoteToContent = function (note) {
      const editor = note.querySelector('.feedback-note-editor');
      if (!editor) return;

      const overflow = editor.scrollHeight - editor.clientHeight;
      if (overflow <= 1) return;

      note.style.height = Math.max(note.offsetHeight + overflow + 8, note.offsetHeight) + 'px';
      clampNoteToViewport(note);
    };

    const createNote = function (noteData, shouldFocusEditor) {
      noteCounter += 1;
      const id = noteData.id || 'n-' + Date.now() + '-' + noteCounter;
      const note = document.createElement('article');
      note.className = 'feedback-note';
      note.setAttribute('data-note-id', id);
      note.tabIndex = 0;
      note.style.left = parsePx(noteData.x, 40) + 'px';
      note.style.top = parsePx(noteData.y, 40) + 'px';
      note.style.width = Math.max(parsePx(noteData.w, 184), 140) + 'px';
      note.style.height = Math.max(parsePx(noteData.h, 184), 140) + 'px';

      const handle = document.createElement('div');
      handle.className = 'feedback-note-handle';
      handle.setAttribute('aria-hidden', 'true');

      const editor = document.createElement('textarea');
      editor.className = 'feedback-note-editor';
      editor.placeholder = 'Commentaire...';
      editor.value = typeof noteData.text === 'string' ? noteData.text : '';

      note.appendChild(handle);
      note.appendChild(editor);
      feedbackLayer.appendChild(note);

      clampNoteToViewport(note);
      fitNoteToContent(note);

      if (noteResizeObserver) {
        noteResizeObserver.observe(note);
      }

      const isPointerInResizeCorner = function (event) {
        const rect = note.getBoundingClientRect();
        const zone = 18;
        return event.clientX >= rect.right - zone && event.clientY >= rect.bottom - zone;
      };

      const startDragging = function (event) {
        if (event.button !== 0) return;
        if (event.target.closest('.feedback-note-editor')) return;
        if (isPointerInResizeCorner(event)) return;
        event.preventDefault();
        selectNote(note, true);

        dragState = {
          note: note,
          pointerId: event.pointerId,
          startX: event.pageX,
          startY: event.pageY,
          startLeft: parsePx(note.style.left, note.offsetLeft),
          startTop: parsePx(note.style.top, note.offsetTop)
        };

        note.setPointerCapture(event.pointerId);
        document.body.classList.add('feedback-dragging');
      };

      note.addEventListener('pointerdown', function (event) {
        selectNote(note, false);
        startDragging(event);
      });

      note.addEventListener('focus', function () {
        selectNote(note, false);
      });

      editor.addEventListener('focus', function () {
        selectNote(note, false);
      });

      editor.addEventListener('input', function () {
        fitNoteToContent(note);
        persistNotes();
      });

      handle.addEventListener('pointerdown', startDragging);

      note.addEventListener('pointermove', function (event) {
        if (!dragState || dragState.note !== note || dragState.pointerId !== event.pointerId) return;
        event.preventDefault();

        const dx = event.pageX - dragState.startX;
        const dy = event.pageY - dragState.startY;
        const maxLeft = Math.max(feedbackLayer.clientWidth - note.offsetWidth, 0);
        const maxTop = Math.max(getLayerHeight() - note.offsetHeight, 0);
        note.style.left = clamp(dragState.startLeft + dx, 0, maxLeft) + 'px';
        note.style.top = clamp(dragState.startTop + dy, 0, maxTop) + 'px';
      });

      const stopDragging = function (event) {
        if (!dragState || dragState.note !== note || dragState.pointerId !== event.pointerId) return;
        dragState = null;
        document.body.classList.remove('feedback-dragging');
        persistNotes();
      };

      note.addEventListener('pointerup', stopDragging);
      note.addEventListener('pointercancel', stopDragging);

      note.addEventListener('pointerup', function () {
        persistNotes();
      });

      if (shouldFocusEditor) {
        selectNote(note, false);
        editor.focus({ preventScroll: true });
      }

      return note;
    };

    const findNoteById = function (noteId) {
      return Array.from(feedbackLayer.querySelectorAll('.feedback-note')).find(function (note) {
        return note.getAttribute('data-note-id') === noteId;
      });
    };

    const applyRemoteNotes = function (remoteNotes) {
      if (!Array.isArray(remoteNotes)) return;
      isApplyingRemote = true;

      const remoteById = new Map();
      remoteNotes.forEach(function (item) {
        if (!item || !item.id) return;
        remoteById.set(String(item.id), item);
      });

      Array.from(feedbackLayer.querySelectorAll('.feedback-note')).forEach(function (note) {
        const noteId = note.getAttribute('data-note-id') || '';
        if (!noteId || remoteById.has(noteId)) return;
        if (noteResizeObserver) noteResizeObserver.unobserve(note);
        if (selectedNote === note) selectedNote = null;
        note.remove();
      });

      remoteById.forEach(function (item, noteId) {
        const existing = findNoteById(noteId);
        if (!existing) {
          createNote(item, false);
          return;
        }

        const editor = existing.querySelector('.feedback-note-editor');
        const editorFocused = editor && document.activeElement === editor;
        const isDragging = dragState && dragState.note === existing;

        if (!isDragging) {
          existing.style.left = Math.max(parsePx(item.x, 0), 0) + 'px';
          existing.style.top = Math.max(parsePx(item.y, 0), 0) + 'px';
        }

        existing.style.width = Math.max(parsePx(item.w, existing.offsetWidth), 140) + 'px';
        existing.style.height = Math.max(parsePx(item.h, existing.offsetHeight), 140) + 'px';

        if (editor && !editorFocused) {
          editor.value = typeof item.text === 'string' ? item.text : '';
          fitNoteToContent(existing);
        }

        clampNoteToViewport(existing);
      });

      isApplyingRemote = false;
      writeStoredNotes(serializeNotes());
    };

    const pollRemoteNotes = async function (seedWhenEmpty) {
      if (!feedbackCollabEnabled) return;
      const remoteNotes = await fetchRemoteNotes();
      if (!remoteNotes) return;

      if (seedWhenEmpty && !remoteNotes.length) {
        const localSnapshot = serializeNotes();
        if (localSnapshot.length) {
          await upsertRemoteNotes(localSnapshot);
          const seededRemote = await fetchRemoteNotes();
          if (seededRemote) applyRemoteNotes(seededRemote);
          hasPulledRemote = true;
          return;
        }
      }

      applyRemoteNotes(remoteNotes);
      hasPulledRemote = true;
    };

    const stopRemotePolling = function () {
      if (!remotePollTimer) return;
      window.clearInterval(remotePollTimer);
      remotePollTimer = null;
    };

    const startRemotePolling = function () {
      if (!feedbackCollabEnabled || remotePollTimer) return;
      remotePollTimer = window.setInterval(function () {
        if (!feedbackVisible || document.hidden) return;
        pollRemoteNotes(false);
      }, collabPollMs);
    };

    const loadedNotes = readStoredNotes();
    loadedNotes.forEach(function (item) {
      createNote(item, false);
    });
    syncFeedbackLayerSize();
    setFeedbackUi();

    if (feedbackCollabEnabled) {
      document.documentElement.classList.add('feedback-collab-enabled');
      pollRemoteNotes(true);
    }

    const setFeedbackVisible = function (nextVisible) {
      if (feedbackVisible === nextVisible) return;

      feedbackVisible = nextVisible;
      if (!feedbackVisible) {
        selectNote(null, false);
        dragState = null;
        document.body.classList.remove('feedback-dragging');
        stopRemotePolling();
      } else if (feedbackCollabEnabled) {
        if (!hasPulledRemote) {
          pollRemoteNotes(false);
        }
        startRemotePolling();
      }
      syncFeedbackLayerSize();
      setFeedbackUi();
    };

    const toggleFeedback = function () {
      setFeedbackVisible(!feedbackVisible);
    };

    feedbackToggles.forEach(function (toggle) {
      toggle.addEventListener('pointerdown', function (event) {
        event.stopPropagation();
      });
      toggle.addEventListener('click', function () {
        toggleFeedback();
      });
    });

    feedbackClose.addEventListener('pointerdown', function (event) {
      event.stopPropagation();
    });

    feedbackClose.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      setFeedbackVisible(false);
    });

    feedbackLayer.addEventListener('pointerdown', function (event) {
      if (!feedbackVisible) return;
      if (event.target !== feedbackLayer || event.button !== 0) return;

      selectNote(null, false);
      const note = createNote(
        {
          x: event.pageX - 92,
          y: event.pageY - 92,
          w: 184,
          h: 184,
          text: ''
        },
        true
      );

      clampNoteToViewport(note);
      persistNotes();
    });

    document.addEventListener('keydown', function (event) {
      if (!feedbackVisible) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        setFeedbackVisible(false);
        return;
      }

      if (!selectedNote) return;
      if (event.key !== 'Backspace' && event.key !== 'Delete') return;

      const activeElement = document.activeElement;
      if (activeElement && activeElement.classList.contains('feedback-note-editor')) return;

      event.preventDefault();
      removeNote(selectedNote);
    });

    window.addEventListener('resize', function () {
      syncFeedbackLayerSize();
      Array.from(feedbackLayer.querySelectorAll('.feedback-note')).forEach(function (note) {
        clampNoteToViewport(note);
      });
      persistNotes();
    });

    window.addEventListener('scroll', syncFeedbackLayerSize, { passive: true });
  }

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
