/* LORD MUSIC — app logic (plain JS, no build step) */
(function () {
  const E = window.engine;
  const BANDS = window.LM_EQ_BANDS;
  const $ = (s, r = document) => r.querySelector(s);
  const app = $("#app");
  const saved = JSON.parse(localStorage.getItem("lm-state") || "{}");

  const S = {
    tab: "home", libTab: "Songs", query: "",
    theme: saved.theme || "blue", mode: saved.mode || "dark",
    current: null, shuffle: !!saved.shuffle, repeat: saved.repeat || "off",
    likes: new Set(saved.likes || ["d1", "d2"]), recent: saved.recent || ["d1", "d3", "d4", "d5"],
    eqOn: saved.eqOn ?? true, preset: saved.preset || "Custom", eq: saved.eq || [3, 5, 3, 2, 0, -1, -1, 1, 3, 4],
    bass: saved.bass ?? 4, virt: saved.virt ?? 0.6, volume: saved.volume ?? 0.85,
    sleepAt: null, sleepLabel: "Off", playerOpen: false, view: "art", sheet: null,
  };
  let tracks = window.LM_DEMO.slice();
  let order = []; // play order (ids)

  function persist() {
    localStorage.setItem("lm-state", JSON.stringify({
      theme: S.theme, mode: S.mode, shuffle: S.shuffle, repeat: S.repeat, likes: [...S.likes], recent: S.recent.slice(0, 12),
      eqOn: S.eqOn, preset: S.preset, eq: S.eq, bass: S.bass, virt: S.virt, volume: S.volume,
    }));
  }
  const byId = (id) => tracks.find((t) => t.id === id);
  const cur = () => byId(S.current);
  const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hash = (str) => { let h = 7; for (const c of String(str)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

  // ---------- icons
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    lib: '<path d="M4 4v16M9 4v16"/><path d="m14 4.5 4.5 15"/>',
    eq: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    play: '<path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" fill="currentColor" stroke="none"/>',
    pause: '<rect x="6" y="4" width="4.2" height="16" rx="1.4" fill="currentColor" stroke="none"/><rect x="13.8" y="4" width="4.2" height="16" rx="1.4" fill="currentColor" stroke="none"/>',
    next: '<path d="M5 5.5v13a.8.8 0 0 0 1.25.66l9.5-6.5a.8.8 0 0 0 0-1.32l-9.5-6.5A.8.8 0 0 0 5 5.5z" fill="currentColor" stroke="none"/><rect x="17" y="5" width="2.6" height="14" rx="1" fill="currentColor" stroke="none"/>',
    prev: '<path d="M19 5.5v13a.8.8 0 0 1-1.25.66l-9.5-6.5a.8.8 0 0 1 0-1.32l9.5-6.5A.8.8 0 0 1 19 5.5z" fill="currentColor" stroke="none"/><rect x="4.4" y="5" width="2.6" height="14" rx="1" fill="currentColor" stroke="none"/>',
    shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
    repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
    heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
    down: '<path d="m6 9 6 6 6-6"/>',
    more: '<circle cx="12" cy="5" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="12" cy="19" r="1.4" fill="currentColor"/>',
    lyrics: '<path d="M4 6h16M4 12h10M4 18h7"/><circle cx="18" cy="17" r="2.5"/><path d="M20.5 17V10"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
    queue: '<path d="M3 6h13M3 12h13M3 18h9M19 14v7M16 18l3 3 3-3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    system: '<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    back: '<path d="M19 12H5M12 19l-7-7 7-7"/>',
    vol: '<path d="M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  };
  const ic = (n, s = 22, w = 2) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${P[n]}</svg>`;
  const logo = (s = 44) => `<svg width="${s}" height="${s * 1.1}" viewBox="0 0 100 110"><defs><linearGradient id="lg${s}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent-2)"/><stop offset="1" stop-color="var(--accent)"/></linearGradient></defs><path d="M4 18 L28 36 L50 2 L72 36 L96 18 L96 58 C96 84 76 100 50 110 C24 100 4 84 4 58 Z" fill="url(#lg${s})"/><path d="M53 40 L53 76 A11 9 0 1 1 47 69 L47 34 L66 40 L66 49 L53 45 Z" fill="var(--on-accent)"/></svg>`;

  // ---------- generated album art
  function art(t) {
    if (t.pic) return `<img src="${t.pic}" alt="">`;
    const h = t.art ? t.art.hue : hash(t.id) % 360;
    const m = t.art ? t.art.motif : "initial";
    const c1 = `hsl(${h} 70% 8%)`, c2 = `hsl(${h} 85% 55%)`, c3 = `hsl(${(h + 30) % 360} 90% 70%)`;
    let g = "";
    const id = "a" + t.id.replace(/\W/g, "");
    if (m === "crown") g = `<circle cx="50" cy="60" r="34" fill="${c2}" opacity=".18"/><path d="M24 66 L28 38 L40 52 L50 30 L60 52 L72 38 L76 66 Z" fill="none" stroke="${c3}" stroke-width="2.4" stroke-linejoin="round"/><path d="M24 70 H76" stroke="${c3}" stroke-width="3"/>${[28, 50, 72].map((x, i) => `<circle cx="${x}" cy="${[38, 30, 38][i]}" r="2.6" fill="${c3}"/>`).join("")}`;
    else if (m === "throne") g = `<path d="M30 92 V44 a20 20 0 0 1 40 0 V92" fill="none" stroke="${c2}" stroke-width="2"/><path d="M38 92 V48 a12 12 0 0 1 24 0 V92" fill="${c2}" opacity=".18"/><path d="M42 52 L46 58 L50 50 L54 58 L58 52 V64 C58 70 54 73 50 75 C46 73 42 70 42 64 Z" fill="${c3}"/>${[0, 1, 2, 3].map((i) => `<rect x="${26 - i * 4}" y="${80 + i * 4}" width="${48 + i * 8}" height="3" fill="${c2}" opacity="${0.5 - i * 0.1}"/>`).join("")}`;
    else if (m === "skyline") g = `<circle cx="66" cy="34" r="12" fill="${c3}" opacity=".7"/>${[[6, 50, 14], [22, 36, 12], [36, 58, 10], [48, 28, 14], [64, 46, 12], [78, 40, 16]].map(([x, y, w]) => `<rect x="${x}" y="${y}" width="${w}" height="${100 - y}" fill="hsl(${h} 50% ${12 + (x % 9)}%)"/>` + Array.from({ length: 5 }, (_, k) => `<rect x="${x + 3}" y="${y + 6 + k * 8}" width="2.5" height="3" fill="${c3}" opacity="${(x + k) % 3 ? 0.9 : 0.2}"/>`).join("")).join("")}`;
    else if (m === "moon") g = `<circle cx="50" cy="44" r="26" fill="${c3}" opacity=".85"/><circle cx="60" cy="38" r="22" fill="${c1}"/><path d="M0 84 Q25 70 50 80 T100 76 V100 H0 Z" fill="${c2}" opacity=".35"/>`;
    else if (m === "waves") g = [0, 1, 2, 3, 4, 5].map((i) => `<path d="M-5 ${36 + i * 10} Q 20 ${26 + i * 10} 45 ${36 + i * 10} T 105 ${36 + i * 10}" fill="none" stroke="${i % 2 ? c2 : c3}" stroke-width="2" opacity="${1 - i * 0.13}"/>`).join("");
    else if (m === "sun") g = `<circle cx="50" cy="62" r="24" fill="${c3}"/>${[0, 1, 2, 3, 4].map((i) => `<rect x="0" y="${64 + i * 7}" width="100" height="${2 + i}" fill="${c1}"/>`).join("")}`;
    else if (m === "rays") g = Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2; return `<line x1="50" y1="50" x2="${50 + Math.cos(a) * 70}" y2="${50 + Math.sin(a) * 70}" stroke="${c3}" stroke-width="${i % 2 ? 0.6 : 1.6}" opacity=".55"/>`; }).join("") + `<circle cx="50" cy="50" r="12" fill="${c3}"/>`;
    else if (m === "road") g = `<path d="M44 40 L56 40 L96 100 L4 100 Z" fill="hsl(${h} 40% 10%)"/>${[0, 1, 2, 3].map((i) => `<rect x="${49.2 - i * 0.6}" y="${46 + i * 13}" width="${1.6 + i * 1.2}" height="${4 + i * 3}" fill="${c3}"/>`).join("")}<path d="M0 40 H100" stroke="${c2}" stroke-width="1.2"/>${[10, 22, 76, 88].map((x) => `<circle cx="${x}" cy="36" r="1.6" fill="${c3}"/>`).join("")}`;
    else g = `<text x="50" y="62" text-anchor="middle" font-family="var(--font)" font-size="34" font-weight="800" fill="${c3}">${esc((t.title || "?").slice(0, 2).toUpperCase())}</text>`;
    return `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h} 60% 18%)"/><stop offset="1" stop-color="${c1}"/></linearGradient></defs><rect width="100" height="100" fill="url(#${id})"/>${g}</svg>`;
  }

  // ---------- theme
  function applyTheme() {
    const mode = S.mode === "system" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : S.mode;
    document.documentElement.dataset.theme = S.theme;
    document.documentElement.dataset.mode = mode;
    app.dataset.theme = S.theme; app.dataset.mode = mode;
    document.body.dataset.theme = S.theme; document.body.dataset.mode = mode;
    $('meta[name="theme-color"]').content = getComputedStyle(app).getPropertyValue("--bg").trim() || "#07080C";
  }
  matchMedia("(prefers-color-scheme: light)").addEventListener?.("change", () => S.mode === "system" && applyTheme());

  // ---------- playback
  function syncEngine() {
    BANDS.forEach((_, i) => E.setEq(i, S.eqOn ? S.eq[i] : 0));
    E.setBass(S.eqOn ? S.bass : 0);
    E.setVirt(S.eqOn ? S.virt : 0);
    E.setVolume(S.volume);
  }
  function buildOrder(startId) {
    const ids = filteredSongs().map((t) => t.id);
    const base = ids.includes(startId) ? ids : tracks.map((t) => t.id);
    if (S.shuffle) {
      const rest = base.filter((x) => x !== startId).sort(() => Math.random() - 0.5);
      order = [startId, ...rest];
    } else order = base;
  }
  function playTrack(id, { fromList = true } = {}) {
    const t = byId(id); if (!t) return;
    if (fromList || !order.includes(id)) buildOrder(id);
    S.current = id;
    S.recent = [id, ...S.recent.filter((x) => x !== id)].slice(0, 12);
    E.init(); syncEngine();
    E.load(t, true);
    persist(); setMedia(); render();
  }
  function toggle() {
    if (!S.current) return playTrack(filteredSongs()[0]?.id || tracks[0].id);
    E.playing ? E.pause() : E.play();
    render();
  }
  function step(dir) {
    if (!S.current) return;
    if (dir < 0 && E.position() > 4) { E.seek(0); return; }
    if (!order.length) buildOrder(S.current);
    let i = order.indexOf(S.current) + dir;
    if (i >= order.length) i = 0;
    if (i < 0) i = order.length - 1;
    const wasPlaying = E.playing || dir > 0;
    S.current = order[i];
    E.load(cur(), wasPlaying);
    S.recent = [S.current, ...S.recent.filter((x) => x !== S.current)].slice(0, 12);
    persist(); setMedia(); render();
  }
  E.onEnd = () => {
    if (S.sleepLabel === "End of track") { setSleep(null, "Off"); render(); return; }
    if (S.repeat === "one") { E.seek(0); E.play(); render(); return; }
    const last = order.indexOf(S.current) === order.length - 1;
    if (last && S.repeat === "off") { E.seek(0); render(); return; }
    step(1);
  };
  function setMedia() {
    const t = cur(); if (!t || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: t.artist, album: t.album || "LORD MUSIC", artwork: [{ src: t.pic || "icon-512.png", sizes: "512x512" }] });
    navigator.mediaSession.setActionHandler("play", () => { E.play(); render(); });
    navigator.mediaSession.setActionHandler("pause", () => { E.pause(); render(); });
    navigator.mediaSession.setActionHandler("nexttrack", () => step(1));
    navigator.mediaSession.setActionHandler("previoustrack", () => step(-1));
  }
  let sleepTimer = null;
  function setSleep(min, label) {
    clearTimeout(sleepTimer); S.sleepAt = null; S.sleepLabel = label;
    if (min) { S.sleepAt = Date.now() + min * 60000; sleepTimer = setTimeout(() => { E.pause(); setSleep(null, "Off"); toast("Sleep timer: music paused"); render(); }, min * 60000); }
  }

  // ---------- library helpers
  function filteredSongs() {
    const q = S.query.trim().toLowerCase();
    let list = tracks;
    if (q) list = list.filter((t) => (t.title + " " + t.artist + " " + (t.album || "")).toLowerCase().includes(q));
    return list;
  }
  const groupBy = (key) => { const m = new Map(); for (const t of filteredSongs()) { const k = t[key] || "Unknown"; if (!m.has(k)) m.set(k, []); m.get(k).push(t); } return [...m]; };

  // ---------- views
  const row = (t, i) => {
    const now = t.id === S.current;
    return `<button class="row ${now ? "now" : ""} ${E.playing ? "" : "paused"}" data-play="${t.id}">
      <div class="art">${art(t)}</div>
      <div class="meta"><b>${now ? '<span class="eqbars"><i></i><i></i><i></i></span>' : ""}${esc(t.title)}</b><span>${esc(t.artist)}</span></div>
      ${S.likes.has(t.id) ? `<span style="color:var(--accent)">${ic("heart", 16)}</span>` : ""}
      <span class="dur">${fmt(t.duration)}</span>
      <span class="icon-btn" data-more="${t.id}" style="width:32px;height:32px;color:var(--muted)">${ic("more", 18)}</span>
    </button>`;
  };
  function homeView() {
    const songs = filteredSongs();
    const recent = S.recent.map(byId).filter(Boolean);
    let body = "";
    if (S.libTab === "Songs") {
      body = `${!S.query && recent.length ? `<h2>Recently played <a data-act="shuffleAll">Shuffle all</a></h2>
        <div class="carousel">${recent.map((t) => `<button class="card" data-play="${t.id}"><div class="art">${art(t)}<span class="play">${ic(t.id === S.current && E.playing ? "pause" : "play", 14)}</span></div><b>${esc(t.title)}</b><span>${esc(t.artist)}</span></button>`).join("")}</div>` : ""}
        <h2>${S.query ? `Results <a data-act="clearq">Clear</a>` : `All songs <span style="font-size:14px;color:var(--muted);font-weight:400">${songs.length} tracks</span>`}</h2>
        ${songs.length ? songs.map(row).join("") : `<div class="empty">Nothing matches “${esc(S.query)}”</div>`}
        <button class="import" data-act="import">${ic("plus", 20)} Add your own music</button>`;
    } else if (S.libTab === "Albums" || S.libTab === "Artists") {
      const groups = groupBy(S.libTab === "Albums" ? "album" : "artist");
      body = `<div class="grid2" style="margin-top:18px">${groups.map(([name, list]) => `<button class="tile" data-play="${list[0].id}"><div class="art">${art(list[0])}</div><b>${esc(name)}</b><span>${list.length} song${list.length > 1 ? "s" : ""}</span></button>`).join("")}</div>`;
    } else if (S.libTab === "Favorites") {
      const fav = songs.filter((t) => S.likes.has(t.id));
      body = `<h2>Favorites</h2>${fav.length ? fav.map(row).join("") : `<div class="empty">Tap the heart on any song to keep it here.</div>`}`;
    }
    return `<div class="top"><div class="brand">${logo(40)}<div class="word"><b>LORD</b><small>MUSIC</small></div></div>
      <div style="display:flex"><button class="icon-btn" data-act="import" aria-label="Add music">${ic("folder")}</button><button class="icon-btn" data-tab="settings" aria-label="Settings">${ic("gear")}</button></div></div>
      <label class="search">${ic("search", 20)}<input id="q" placeholder="Search songs, albums, artists…" value="${esc(S.query)}" autocomplete="off"></label>
      <div class="tabs">${["Songs", "Albums", "Artists", "Favorites"].map((x) => `<button data-lib="${x}" class="${S.libTab === x ? "on" : ""}">${x}</button>`).join("")}</div>
      ${body}`;
  }
  function libraryView() {
    const mine = tracks.filter((t) => t.user);
    const fav = tracks.filter((t) => S.likes.has(t.id));
    return `<div class="top"><h1 class="title">Library</h1><button class="icon-btn" data-act="import">${ic("plus")}</button></div>
      <div class="grid2">
        <button class="tile" data-lib-go="Favorites"><div class="art" style="display:grid;place-items:center;background:linear-gradient(135deg,var(--accent),var(--accent-2));color:var(--on-accent)">${ic("heart", 46, 1.6)}</div><b>Favorites</b><span>${fav.length} songs</span></button>
        <button class="tile" data-act="shuffleAll"><div class="art" style="display:grid;place-items:center;background:var(--surface-2);color:var(--accent)">${ic("shuffle", 46, 1.6)}</div><b>Shuffle all</b><span>${tracks.length} songs</span></button>
      </div>
      <h2>Your files <span style="font-size:14px;color:var(--muted);font-weight:400">${mine.length}</span></h2>
      ${mine.length ? mine.map(row).join("") : `<div class="empty">Import MP3, M4A, FLAC, WAV or OGG files.<br>They stay on this device.</div>`}
      <button class="import" data-act="import">${ic("folder", 20)} Import music files</button>
      <h2>Demo collection</h2>${tracks.filter((t) => !t.user).map(row).join("")}`;
  }
  function eqView() {
    const dial = (key, label, val, txt, min, max) => {
      const p = (val - min) / (max - min), a0 = 135, sweep = 270, a = a0 + p * sweep;
      const pt = (deg, r) => [60 + r * Math.cos((deg * Math.PI) / 180), 60 + r * Math.sin((deg * Math.PI) / 180)];
      const [sx, sy] = pt(a0, 50), [ex, ey] = pt(a, 50), [kx, ky] = pt(a, 30);
      const [fx, fy] = pt(a0 + sweep, 50);
      return `<div class="dial"><b>${label}</b><span>${txt}</span>
        <svg class="knob-dial" data-dial="${key}" data-min="${min}" data-max="${max}" viewBox="0 0 120 120">
          <path d="M${sx} ${sy} A50 50 0 1 1 ${fx} ${fy}" fill="none" stroke="var(--surface-2)" stroke-width="7" stroke-linecap="round"/>
          ${p > 0.001 ? `<path class="arc" d="M${sx} ${sy} A50 50 0 ${p * sweep > 180 ? 1 : 0} 1 ${ex} ${ey}" fill="none" stroke="var(--accent)" stroke-width="7" stroke-linecap="round"/>` : ""}
          <circle cx="60" cy="60" r="38" fill="var(--surface-2)"/><circle cx="60" cy="60" r="34" fill="var(--surface)"/>
          <circle cx="${kx}" cy="${ky}" r="5" fill="var(--accent)"/></svg>
        <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted)"><span style="color:var(--muted);font-weight:400">${key === "bass" ? "0 dB" : "0%"}</span><span style="color:var(--muted);font-weight:400">${key === "bass" ? "+12 dB" : "100%"}</span></div></div>`;
    };
    return `<div class="top"><h1 class="title">Equalizer</h1><button class="switch ${S.eqOn ? "on" : ""}" data-act="eqToggle" aria-label="Equalizer on/off"></button></div>
      <div class="chip-row">${["Custom", ...Object.keys(window.LM_PRESETS)].map((p) => `<button class="chip ${S.preset === p ? "on" : ""}" data-preset="${p}">${p}</button>`).join("")}</div>
      <div class="eq-card ${S.eqOn ? "" : "off"}"><div class="eq"><div class="scale"><span>+12</span><span>0</span><span>-12</span></div>
        ${BANDS.map((f, i) => { const v = S.eq[i], pos = (12 - v) / 24 * 100; return `<div class="band"><div class="track" data-band="${i}"><div class="fill" style="${v >= 0 ? `top:${pos}%;bottom:50%` : `top:50%;bottom:${100 - pos}%`}"></div><div class="knob" style="top:${pos}%"></div></div><label>${f >= 1000 ? f / 1000 + "K" : f}</label></div>`; }).join("")}
      </div></div>
      <div class="dials ${S.eqOn ? "" : "off"}">${dial("bass", "Bass", S.bass, "+" + S.bass + " dB", 0, 12)}${dial("virt", "Virtualizer", S.virt, Math.round(S.virt * 100) + "%", 0, 1)}</div>
      <div class="set-group" style="margin-top:12px"><div class="set-row"><div style="color:var(--muted)">${ic("vol")}</div><input type="range" min="0" max="1" step="0.01" value="${S.volume}" data-range="volume"><b style="min-width:44px;text-align:right">${Math.round(S.volume * 100)}%</b></div></div>`;
  }
  function settingsView() {
    const sw = (k, label, a, b) => `<button class="swatch ${S.theme === k ? "on" : ""}" data-theme-pick="${k}"><i style="background:linear-gradient(135deg, ${a} 50%, ${b} 50%)">${S.theme === k ? `<span style="color:#fff;mix-blend-mode:difference">${ic("check", 26, 3)}</span>` : ""}</i>${label}</button>`;
    return `<div class="top"><button class="icon-btn" data-tab="home">${ic("back")}</button><h1 class="title" style="flex:1;margin-left:6px">Appearance</h1></div>
      <div class="label">THEME</div>
      <div class="set-group"><div class="swatches">${sw("blue", "Blue & Black", "#1E6BFF", "#0A0A0F")}${sw("gold", "Yellow & Black", "#FFC400", "#0A0A0F")}${sw("graphite", "Graphite Gray", "#B9BFCA", "#2A2C33")}</div></div>
      <div class="label">MODE</div>
      <div class="seg">${[["dark", "moon", "Dark"], ["light", "sun", "Light"], ["system", "system", "System"]].map(([k, i, l]) => `<button class="${S.mode === k ? "on" : ""}" data-mode-pick="${k}">${ic(i, 20)}${l}</button>`).join("")}</div>
      <div class="label">PLAYBACK</div>
      <div class="set-group">
        <button class="set-row" data-act="sleep"><div><b>Sleep timer</b><span>${S.sleepLabel === "Off" ? "Off" : S.sleepLabel}</span></div>${ic("moon", 20)}</button>
        <button class="set-row" data-act="shuffleToggle"><div><b>Shuffle</b><span>Play songs in random order</span></div><span class="switch ${S.shuffle ? "on" : ""}"></span></button>
        <button class="set-row" data-act="repeatCycle"><div><b>Repeat</b><span>${{ off: "Off", all: "All songs", one: "Current song" }[S.repeat]}</span></div>${ic("repeat", 20)}</button>
        <button class="set-row" data-tab="eq"><div><b>Equalizer</b><span>${S.eqOn ? S.preset : "Off"}</span></div>${ic("eq", 20)}</button>
      </div>
      <div class="label">LIBRARY</div>
      <div class="set-group">
        <button class="set-row" data-act="import"><div><b>Import music</b><span>Files are saved on this device only</span></div>${ic("folder", 20)}</button>
        <button class="set-row" data-act="clearFiles"><div><b>Remove imported files</b><span>${tracks.filter((t) => t.user).length} files</span></div>${ic("trash", 20)}</button>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;margin-top:34px;color:var(--muted);font-size:14px">${logo(34)}LORD MUSIC · v1.0</div>`;
  }
  function dock() {
    const t = cur();
    const nav = [["home", "home", "Home"], ["library", "lib", "Library"], ["eq", "eq", "Equalizer"], ["settings", "gear", "Settings"]];
    return `${t ? `<div class="mini" data-act="open" role="button"><div class="bar" id="miniBar"></div><div class="art">${art(t)}</div><div class="meta"><b>${esc(t.title)}</b><span>${esc(t.artist)}</span></div>
      <button class="icon-btn" data-act="toggle" aria-label="Play/pause">${ic(E.playing ? "pause" : "play", 24)}</button><button class="icon-btn" data-act="next" aria-label="Next">${ic("next", 22)}</button></div>` : ""}
      <nav class="nav">${nav.map(([k, i, l]) => `<button class="${S.tab === k ? "on" : ""}" data-tab="${k}">${ic(i, 22)}${l}</button>`).join("")}</nav>`;
  }
  function waveBars(t) {
    const h = hash(t.id);
    return Array.from({ length: 56 }, (_, i) => { const v = 0.25 + 0.75 * Math.abs(Math.sin(i * 0.37 + h) * Math.cos(i * 0.11 + h / 7)); return `<i style="height:${Math.round(v * 100)}%"></i>`; }).join("");
  }
  function lyricLines(t) {
    if (!t.lyrics) return [];
    const n = Math.max(1, Math.floor((t.duration - 8) / 6));
    return Array.from({ length: n }, (_, i) => t.lyrics[i % t.lyrics.length]);
  }
  function playerView() {
    const t = cur(); if (!t) return "";
    const lyr = lyricLines(t);
    return `<div class="p-top"><button class="icon-btn" data-act="close" aria-label="Close">${ic("down", 26)}</button>
      <div class="lbl">Playing from<b>${esc(t.album || "Your files")}</b></div><button class="icon-btn" data-more="${t.id}">${ic("more")}</button></div>
      ${S.view === "lyrics"
        ? `<div class="lyrics">${lyr.length ? `<div class="inner" id="lyrInner">${lyr.map((l, i) => `<p data-l="${i}">${esc(l)}</p>`).join("")}</div>` : `<div class="empty" style="padding-top:140px">No lyrics for this track</div>`}</div>`
        : `<div class="art big-art">${art(t)}</div>`}
      <div class="p-meta"><div style="min-width:0"><b>${esc(t.title)}</b><span>${esc(t.artist)}</span></div>
        <button class="icon-btn ${S.likes.has(t.id) ? "on" : ""}" data-like="${t.id}" aria-label="Like">${S.likes.has(t.id) ? `<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">${P.heart}</svg>` : ic("heart", 26)}</button></div>
      <div class="wave" id="wave">${waveBars(t)}</div>
      <div class="times"><span id="tNow">0:00</span><span>${fmt(t.duration)}</span></div>
      <div class="controls">
        <button class="icon-btn mode-btn ${S.shuffle ? "on" : ""}" data-act="shuffleToggle" aria-label="Shuffle">${ic("shuffle", 22)}</button>
        <button class="icon-btn" data-act="prev" aria-label="Previous">${ic("prev", 30)}</button>
        <button class="playbtn" data-act="toggle" aria-label="Play/pause">${ic(E.playing ? "pause" : "play", 34)}</button>
        <button class="icon-btn" data-act="next" aria-label="Next">${ic("next", 30)}</button>
        <button class="icon-btn mode-btn ${S.repeat !== "off" ? "on" : ""}" data-act="repeatCycle" aria-label="Repeat">${ic("repeat", 22)}${S.repeat === "one" ? '<span class="one">1</span>' : ""}</button>
      </div>
      <div class="p-tools" style="margin-top:22px">
        <button data-act="goEq">${ic("eq", 22)}Equalizer</button>
        <button class="${S.view === "lyrics" ? "on" : ""}" data-act="lyrics">${ic("lyrics", 22)}Lyrics</button>
        <button class="${S.sleepLabel !== "Off" ? "on" : ""}" data-act="sleep">${ic("moon", 22)}${S.sleepLabel === "Off" ? "Sleep timer" : `<span id="sleepLeft">${S.sleepLabel}</span>`}</button>
        <button data-act="queue">${ic("queue", 22)}Queue</button>
      </div>`;
  }
  function sheetView() {
    if (!S.sheet) return "";
    if (S.sheet === "sleep") {
      const opts = [["Off", null], ["15 minutes", 15], ["30 minutes", 30], ["45 minutes", 45], ["1 hour", 60], ["End of track", 0]];
      return `<div class="grab"></div><h3>Sleep timer</h3>${opts.map(([l, m]) => `<button class="opt ${S.sleepLabel === l ? "on" : ""}" data-sleep="${m}" data-sleep-l="${l}">${l}${S.sleepLabel === l ? ic("check", 20) : ""}</button>`).join("")}`;
    }
    if (S.sheet === "queue") {
      if (!order.length && S.current) buildOrder(S.current);
      const i = order.indexOf(S.current);
      const up = order.slice(i + 1).concat(S.repeat === "all" ? order.slice(0, i) : []).map(byId).filter(Boolean);
      return `<div class="grab"></div><h3>Up next</h3>${up.length ? up.slice(0, 30).map(row).join("") : `<div class="empty">End of the queue</div>`}`;
    }
    if (S.sheet.startsWith("more:")) {
      const t = byId(S.sheet.slice(5)); if (!t) return "";
      return `<div class="grab"></div><div class="row" style="padding:0 0 10px"><div class="art">${art(t)}</div><div class="meta"><b>${esc(t.title)}</b><span>${esc(t.artist)} · ${esc(t.album || "")}</span></div></div>
        <button class="opt" data-sheet-act="next:${t.id}">Play next ${ic("queue", 20)}</button>
        <button class="opt" data-like="${t.id}">${S.likes.has(t.id) ? "Remove from favorites" : "Add to favorites"} ${ic("heart", 20)}</button>
        ${t.user ? `<button class="opt" data-sheet-act="del:${t.id}">Delete from library ${ic("trash", 20)}</button>` : ""}`;
    }
    return "";
  }

  // ---------- render
  let lastTab = null;
  function render() {
    const sc = $(".screen");
    const keep = sc && lastTab === S.tab ? sc.scrollTop : 0;
    const focusQ = document.activeElement && document.activeElement.id === "q";
    const caret = focusQ ? document.activeElement.selectionStart : 0;
    const view = { home: homeView, library: libraryView, eq: eqView, settings: settingsView }[S.tab]();
    app.innerHTML = `<div class="screen">${view}</div><div class="dock">${dock()}</div>
      <section class="player ${S.playerOpen ? "open" : ""} ${E.playing ? "" : "paused"}" id="player">${playerView()}</section>
      <div class="sheet-bg ${S.sheet ? "open" : ""}" data-act="closeSheet"></div><div class="sheet ${S.sheet ? "open" : ""}">${sheetView()}</div>
      <div class="toast" id="toast"></div><div class="drop" id="drop">Drop music files to import</div>`;
    $(".screen").scrollTop = keep; lastTab = S.tab;
    if (focusQ) { const q = $("#q"); q.focus(); q.setSelectionRange(caret, caret); }
    if (navigator.mediaSession) navigator.mediaSession.playbackState = E.playing ? "playing" : "paused";
    tick(true);
  }
  let toastT;
  function toast(msg) { const el = $("#toast"); if (!el) return; el.textContent = msg; el.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove("show"), 2200); }

  // ---------- live loop (progress, lyrics, glow)
  const freq = new Uint8Array(128);
  let lastLine = -1, lvl = 0;
  function tick(force) {
    const t = cur();
    if (t) {
      const pos = E.position(), p = Math.min(1, pos / (t.duration || 1));
      const bar = $("#miniBar"); if (bar) bar.style.width = p * 100 + "%";
      const tn = $("#tNow"); if (tn) tn.textContent = fmt(pos);
      const w = $("#wave");
      if (w) { const n = w.children.length, k = Math.round(p * n); for (let i = 0; i < n; i++) w.children[i].classList.toggle("past", i < k); }
      const inner = $("#lyrInner");
      if (inner) {
        const li = Math.max(0, Math.floor((pos - 8) / 6));
        if (li !== lastLine || force) {
          lastLine = li;
          inner.querySelectorAll("p").forEach((el, i) => el.classList.toggle("on", i === li));
          const on = inner.children[li]; if (on) inner.style.transform = `translateY(${-on.offsetTop + 20}px)`;
        }
      }
      if (S.sleepAt) { const s = $("#sleepLeft"); if (s) s.textContent = fmt((S.sleepAt - Date.now()) / 1000); }
      let target = 0;
      if (E.playing && E.levels(freq)) { let sum = 0; for (let i = 0; i < 24; i++) sum += freq[i]; target = Math.min(1, sum / (24 * 200)); }
      lvl += (target - lvl) * 0.25;
      const pl = $("#player"); if (pl) pl.style.setProperty("--lvl", lvl.toFixed(3));
    }
  }
  (function loop() { tick(false); requestAnimationFrame(loop); })();

  // ---------- events
  app.addEventListener("click", (e) => {
    const el = e.target.closest("[data-more],[data-like],[data-play],[data-act],[data-tab],[data-lib],[data-lib-go],[data-preset],[data-theme-pick],[data-mode-pick],[data-sleep-l],[data-sheet-act]");
    if (!el) return;
    const d = el.dataset;
    if (d.more) { e.stopPropagation(); S.sheet = "more:" + d.more; return render(); }
    if (d.like) { S.likes.has(d.like) ? S.likes.delete(d.like) : S.likes.add(d.like); persist(); if (S.sheet) S.sheet = null; return render(); }
    if (d.play) { S.sheet = null; if (d.play === S.current) { toggle(); return; } return playTrack(d.play); }
    if (d.tab) { S.tab = d.tab; S.playerOpen = false; return render(); }
    if (d.lib) { S.libTab = d.lib; return render(); }
    if (d.libGo) { S.tab = "home"; S.libTab = d.libGo; return render(); }
    if (d.preset) { S.preset = d.preset; if (d.preset !== "Custom") S.eq = window.LM_PRESETS[d.preset].slice(); S.eqOn = true; syncEngine(); persist(); return render(); }
    if (d.themePick) { S.theme = d.themePick; applyTheme(); persist(); return render(); }
    if (d.modePick) { S.mode = d.modePick; applyTheme(); persist(); return render(); }
    if (d.sleepL) { const m = d.sleep === "null" ? null : Number(d.sleep); setSleep(m || null, d.sleepL); S.sheet = null; if (d.sleepL !== "Off") toast("Sleep timer: " + d.sleepL); return render(); }
    if (d.sheetAct) {
      const [a, id] = d.sheetAct.split(":");
      if (a === "next") { if (!S.current) { S.sheet = null; return playTrack(id); } order = order.filter((x) => x !== id); order.splice(order.indexOf(S.current) + 1, 0, id); toast("Playing next"); }
      if (a === "del") removeTrack(id);
      S.sheet = null; return render();
    }
    switch (d.act) {
      case "toggle": e.stopPropagation(); return toggle();
      case "next": e.stopPropagation(); return step(1);
      case "prev": return step(-1);
      case "open": S.playerOpen = true; return render();
      case "close": S.playerOpen = false; return render();
      case "lyrics": S.view = S.view === "lyrics" ? "art" : "lyrics"; lastLine = -1; return render();
      case "goEq": S.tab = "eq"; S.playerOpen = false; return render();
      case "sleep": S.sheet = "sleep"; return render();
      case "queue": S.sheet = "queue"; return render();
      case "closeSheet": S.sheet = null; return render();
      case "shuffleToggle": S.shuffle = !S.shuffle; if (S.current) buildOrder(S.current); persist(); toast(S.shuffle ? "Shuffle on" : "Shuffle off"); return render();
      case "repeatCycle": S.repeat = { off: "all", all: "one", one: "off" }[S.repeat]; persist(); toast({ off: "Repeat off", all: "Repeat all", one: "Repeat one" }[S.repeat]); return render();
      case "shuffleAll": S.shuffle = true; persist(); { const ids = tracks.map((t) => t.id); return playTrack(ids[Math.floor(Math.random() * ids.length)]); }
      case "clearq": S.query = ""; return render();
      case "eqToggle": S.eqOn = !S.eqOn; syncEngine(); persist(); return render();
      case "import": return $("#filePick").click();
      case "clearFiles": tracks.filter((t) => t.user).forEach((t) => removeTrack(t.id)); toast("Imported files removed"); return render();
    }
  });
  app.addEventListener("input", (e) => {
    if (e.target.id === "q") { S.query = e.target.value; render(); }
    if (e.target.dataset.range === "volume") { S.volume = +e.target.value; E.setVolume(S.volume); e.target.nextElementSibling.textContent = Math.round(S.volume * 100) + "%"; persist(); }
  });
  // drag: seek wave, eq bands, dials
  app.addEventListener("pointerdown", (e) => {
    const wave = e.target.closest("#wave"), band = e.target.closest("[data-band]"), dial = e.target.closest("[data-dial]");
    if (!wave && !band && !dial) return;
    e.preventDefault();
    const startY = e.clientY, startVal = dial ? S[dial.dataset.dial] : 0;
    const move = (ev) => {
      if (wave) { const r = wave.getBoundingClientRect(); const p = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)); wave.dataset.p = p; [...wave.children].forEach((c, i) => c.classList.toggle("past", i < p * wave.children.length)); $("#tNow").textContent = fmt(p * cur().duration); }
      if (band) {
        const r = band.getBoundingClientRect(); const v = Math.round(Math.max(-12, Math.min(12, 12 - ((ev.clientY - r.top) / r.height) * 24)));
        const i = +band.dataset.band; if (S.eq[i] !== v) { S.eq[i] = v; S.preset = "Custom"; S.eqOn = true; syncEngine(); persist(); updateEqDom(); }
      }
      if (dial) {
        const k = dial.dataset.dial, min = +dial.dataset.min, max = +dial.dataset.max;
        let v = startVal + ((startY - ev.clientY) / 160) * (max - min);
        v = Math.max(min, Math.min(max, v)); v = k === "bass" ? Math.round(v) : Math.round(v * 100) / 100;
        if (v !== S[k]) { S[k] = v; S.eqOn = true; syncEngine(); persist(); updateEqDom(); }
      }
    };
    const up = () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      if (wave && wave.dataset.p != null && cur()) { E.seek(+wave.dataset.p * cur().duration); }
    };
    move(e);
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  });
  let eqRaf = 0;
  function updateEqDom() { cancelAnimationFrame(eqRaf); eqRaf = requestAnimationFrame(() => { const sc = $(".screen").scrollTop; render(); $(".screen").scrollTop = sc; }); }
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    if (e.code === "Space") { e.preventDefault(); toggle(); }
    if (e.code === "ArrowRight" && cur()) E.seek(E.position() + 10);
    if (e.code === "ArrowLeft" && cur()) E.seek(E.position() - 10);
    if (e.code === "Escape") { S.sheet = null; S.playerOpen = false; render(); }
  });

  // ---------- importing your own music (IndexedDB keeps it on device)
  const DB = new Promise((res) => {
    if (!window.indexedDB) return res(null);
    const r = indexedDB.open("lord-music", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("tracks", { keyPath: "id" });
    r.onsuccess = () => res(r.result); r.onerror = () => res(null);
  });
  const dbDo = async (mode, fn) => { const db = await DB; if (!db) return null; return new Promise((res) => { const tx = db.transaction("tracks", mode); const req = fn(tx.objectStore("tracks")); tx.oncomplete = () => res(req && req.result); tx.onerror = () => res(null); }); };

  function readID3(buf) {
    const v = new DataView(buf), out = {};
    if (v.byteLength < 10 || String.fromCharCode(v.getUint8(0), v.getUint8(1), v.getUint8(2)) !== "ID3") return out;
    const ver = v.getUint8(3);
    const ss = (o) => (v.getUint8(o) << 21) | (v.getUint8(o + 1) << 14) | (v.getUint8(o + 2) << 7) | v.getUint8(o + 3);
    const size = ss(6); let o = 10;
    const dec = (bytes, enc) => { try { return new TextDecoder(enc === 0 ? "latin1" : enc === 3 ? "utf-8" : enc === 2 ? "utf-16be" : "utf-16").decode(bytes).replace(/\0/g, "").trim(); } catch { return ""; } };
    while (o + 10 < Math.min(size + 10, v.byteLength)) {
      const id = String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
      if (!/^[A-Z0-9]{4}$/.test(id)) break;
      const fs = ver === 4 ? ss(o + 4) : v.getUint32(o + 4);
      const body = new Uint8Array(buf, o + 10, Math.min(fs, v.byteLength - o - 10));
      if (id === "TIT2") out.title = dec(body.subarray(1), body[0]);
      if (id === "TPE1") out.artist = dec(body.subarray(1), body[0]);
      if (id === "TALB") out.album = dec(body.subarray(1), body[0]);
      if (id === "APIC") {
        const enc = body[0]; let i = 1; while (body[i]) i++; const mime = dec(body.subarray(1, i), 0) || "image/jpeg"; i += 2;
        if (enc === 1 || enc === 2) { while (i < body.length - 1 && (body[i] || body[i + 1])) i += 2; i += 2; } else { while (body[i]) i++; i++; }
        out.pic = new Blob([body.subarray(i)], { type: mime.includes("/") ? mime : "image/" + mime.toLowerCase() });
      }
      o += 10 + fs;
    }
    return out;
  }
  const durationOf = (url) => new Promise((res) => { const a = new Audio(); a.preload = "metadata"; a.onloadedmetadata = () => res(isFinite(a.duration) ? a.duration : 0); a.onerror = () => res(0); a.src = url; });
  function hydrate(rec) {
    return { id: rec.id, user: true, title: rec.title, artist: rec.artist, album: rec.album, duration: rec.duration, url: URL.createObjectURL(rec.blob), pic: rec.pic ? URL.createObjectURL(rec.pic) : null };
  }
  async function importFiles(files) {
    const list = [...files].filter((f) => f.type.startsWith("audio/") || /\.(mp3|m4a|aac|flac|wav|ogg|opus)$/i.test(f.name));
    if (!list.length) return toast("No audio files found");
    toast(`Importing ${list.length} file${list.length > 1 ? "s" : ""}…`);
    let first = null;
    for (const f of list) {
      const tag = readID3(await f.slice(0, 1024 * 1024).arrayBuffer());
      const name = f.name.replace(/\.[^.]+$/, "");
      const [a, b] = name.includes(" - ") ? name.split(" - ") : [null, name];
      const tmp = URL.createObjectURL(f);
      const rec = { id: "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), title: tag.title || b, artist: tag.artist || a || "Unknown artist", album: tag.album || "Your files", duration: await durationOf(tmp), blob: f, pic: tag.pic || null };
      URL.revokeObjectURL(tmp);
      await dbDo("readwrite", (st) => st.put(rec));
      const t = hydrate(rec); tracks.push(t); first = first || t.id;
    }
    S.tab = "library"; render(); toast(`${list.length} song${list.length > 1 ? "s" : ""} added`);
  }
  function removeTrack(id) {
    const t = byId(id); if (!t) return;
    if (S.current === id) { E.pause(); S.current = null; }
    tracks = tracks.filter((x) => x.id !== id); order = order.filter((x) => x !== id);
    dbDo("readwrite", (st) => st.delete(id));
  }
  $("#filePick").addEventListener("change", (e) => { importFiles(e.target.files); e.target.value = ""; });
  let dragN = 0;
  window.addEventListener("dragenter", (e) => { e.preventDefault(); dragN++; $("#drop")?.classList.add("show"); });
  window.addEventListener("dragleave", () => { if (--dragN <= 0) { dragN = 0; $("#drop")?.classList.remove("show"); } });
  window.addEventListener("dragover", (e) => e.preventDefault());
  window.addEventListener("drop", (e) => { e.preventDefault(); dragN = 0; $("#drop")?.classList.remove("show"); importFiles(e.dataTransfer.files); });

  // ---------- boot
  applyTheme(); render();
  dbDo("readonly", (st) => st.getAll()).then((recs) => { if (recs && recs.length) { tracks = tracks.concat(recs.map(hydrate)); render(); } });
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
