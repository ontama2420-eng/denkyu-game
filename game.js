(() => {
  const stage = document.querySelector('#stage');
  const movies = [...document.querySelectorAll('.movie')];
  const music = document.querySelector('#music');
  const overlay = document.querySelector('#overlay');
  const target = document.querySelector('#target');
  const panel = document.querySelector('#panel');
  const heading = document.querySelector('#heading');
  const message = document.querySelector('#message');
  const action = document.querySelector('#action');
  const coordinates = document.querySelector('#coordinates');
  const bufferedClips = new Map();
  let room;
  let index = 0;
  let clip;
  let movie;
  let transition;
  let ready = false;
  let debug = new URLSearchParams(location.search).get('debug') === '1';
  let point = '';

  function showPanel(title, detail, label, onClick) {
    heading.textContent = title;
    message.textContent = detail;
    message.hidden = !detail;
    action.textContent = label;
    action.onclick = onClick;
    panel.hidden = false;
  }

  function updateDebug() {
    stage.classList.toggle('debug', debug);
    coordinates.hidden = !debug || !clip;
    if (!clip) return;
    const hit = clip.hit?.join(', ');
    coordinates.textContent = [clip.id, hit && `範囲 [x, y, 幅, 高さ] = [${hit}]`, point]
      .filter(Boolean).join('\n');
  }

  function layoutOverlay() {
    if (!ready || !movie.videoWidth) return;
    const { width, height } = stage.getBoundingClientRect();
    const scale = Math.min(width / movie.videoWidth, height / movie.videoHeight);
    const imageWidth = movie.videoWidth * scale;
    const imageHeight = movie.videoHeight * scale;
    overlay.style.left = `${(width - imageWidth) / 2}px`;
    overlay.style.top = `${(height - imageHeight) / 2}px`;
    overlay.style.width = `${imageWidth}px`;
    overlay.style.height = `${imageHeight}px`;
  }

  function prepare(video, nextRoom, nextClip) {
    const path = nextRoom.directory + nextClip.file;
    const source = bufferedClips.get(path) ?? path;
    video.muted = !nextRoom.videoSound;
    video.loop = Boolean(nextClip.hit);
    if (video.getAttribute('src') !== source || video.error) {
      video.src = source;
    } else if (video.currentTime > 0) {
      video.currentTime = 0;
    }
  }

  function playClip() {
    transition?.abort();
    transition = new AbortController();
    const { signal } = transition;
    clip = room.clips[index];
    ready = false;
    point = '';
    overlay.hidden = true;
    target.hidden = true;
    if (clip.hit) {
      const [x, y, width, height] = clip.hit;
      target.style.left = `${x / REFERENCE.width * 100}%`;
      target.style.top = `${y / REFERENCE.height * 100}%`;
      target.style.width = `${width / REFERENCE.width * 100}%`;
      target.style.height = `${height / REFERENCE.height * 100}%`;
      target.setAttribute('aria-label', clip.label);
    }
    const incoming = movies.find(video => video !== movie);
    movie?.pause();
    prepare(incoming, room, clip);

    function reveal() {
      movie?.classList.remove('is-visible');
      movie = incoming;
      movie.classList.add('is-visible');
      panel.hidden = true;
      ready = true;
      layoutOverlay();
      overlay.hidden = false;
      target.hidden = !clip.hit;
      updateDebug();

      const following = room.clips[index + 1];
      const standby = movies.find(video => video !== movie);
      if (following) {
        prepare(standby, room, following);
      } else if (Object.hasOwn(ROOMS, room.next)) {
        const nextRoom = ROOMS[room.next];
        prepare(standby, nextRoom, nextRoom.clips[0]);
      }
    }

    function playbackError() {
      if (signal.aborted) return;
      transition.abort();
      incoming.pause();
      ready = false;
      overlay.hidden = true;
      const path = room.directory + clip.file;
      const bufferedSource = bufferedClips.get(path);
      if (bufferedSource && incoming.getAttribute('src') === bufferedSource) {
        bufferedClips.delete(path);
        URL.revokeObjectURL(bufferedSource);
        playClip();
        return;
      }
      showPanel('動画を再生できません', clip.file, 'もう一度試す', playClip);
    }

    incoming.addEventListener('error', playbackError, { once: true, signal });
    if ('requestVideoFrameCallback' in incoming) {
      const frame = incoming.requestVideoFrameCallback(reveal);
      signal.addEventListener('abort', () => incoming.cancelVideoFrameCallback(frame), { once: true });
    } else {
      incoming.addEventListener('playing', reveal, { once: true, signal });
    }
    incoming.play().catch(playbackError);
  }

  function enterRoom(id) {
    room = ROOMS[id];
    index = 0;
    music.pause();
    music.removeAttribute('src');
    music.load();
    if (room.music) {
      music.src = room.music;
      music.play().catch(error => console.warn('BGMを再生できません', error));
    }
    playClip();
  }

  function advance() {
    index += 1;
    if (index < room.clips.length) {
      playClip();
      return;
    }
    if (Object.hasOwn(ROOMS, room.next)) {
      enterRoom(room.next);
      return;
    }
    transition.abort();
    clip = null;
    ready = false;
    overlay.hidden = true;
    for (const video of movies) {
      video.classList.remove('is-visible');
      video.removeAttribute('src');
      video.load();
    }
    movie = null;
    prepare(movies[0], ROOMS.room1, ROOMS.room1.clips[0]);
    music.pause();
    updateDebug();
    showPanel('おしまい', 'つづきは制作中です', 'もう一度遊ぶ', () => enterRoom('room1'));
    action.focus();
  }

  function inspectPoint(event) {
    if (!debug || !ready || overlay.hidden) return;
    const bounds = overlay.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    point = x >= 0 && x < 1 && y >= 0 && y < 1
      ? `x = ${Math.floor(x * REFERENCE.width)}, y = ${Math.floor(y * REFERENCE.height)}`
      : '動画の表示範囲外';
    updateDebug();
  }

  for (const video of movies) {
    video.addEventListener('ended', () => {
      if (ready && video === movie && !clip.hit && video.ended) advance();
    });
  }
  target.addEventListener('click', () => {
    if (clip?.hit && ready && panel.hidden) advance();
  });
  stage.addEventListener('pointermove', event => {
    if (event.pointerType === 'mouse') inspectPoint(event);
  });
  stage.addEventListener('pointerdown', inspectPoint);
  document.addEventListener('keydown', event => {
    if (event.key.toLowerCase() === 'd' && !event.repeat && !event.ctrlKey && !event.metaKey && !event.altKey) {
      debug = !debug;
      updateDebug();
    }
  });
  new ResizeObserver(layoutOverlay).observe(stage);
  showPanel('電球くん', '', 'START', () => enterRoom('room1'));

  async function prepareStart() {
    const firstRoom = ROOMS.room1;
    if (location.protocol === 'https:' || location.protocol === 'http:') {
      action.disabled = true;
      message.hidden = false;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 45000);
      let loaded = 0;
      message.textContent = `動画を準備しています（0 / ${firstRoom.clips.length}）`;
      await Promise.allSettled(firstRoom.clips.map(async item => {
        const path = firstRoom.directory + item.file;
        const response = await fetch(path, { signal: controller.signal });
        if (!response.ok) throw new Error(path);
        const video = await response.blob();
        bufferedClips.set(path, URL.createObjectURL(video));
        loaded += 1;
        message.textContent = `動画を準備しています（${loaded} / ${firstRoom.clips.length}）`;
      }));
      clearTimeout(timer);
      message.hidden = true;
      action.disabled = false;
    }
    prepare(movies[0], firstRoom, firstRoom.clips[0]);
  }

  prepareStart();
})();
