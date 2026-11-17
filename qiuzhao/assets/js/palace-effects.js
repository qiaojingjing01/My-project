/* Offline scene and interaction cues. Unlock audio directly from a user gesture. */
(function (root) {
  'use strict';
  const EMOTIONS = Object.freeze({ anger: 650, tension: 580, approval: 620, discovery: 620 });
  const CUES = Object.freeze({ confirm: true, page: true, clue: true, locked: true, chapter: true, ending: true });
  // Registers for synthesized cues; recorded reactions are supplied by PalaceVoices.
  const REGISTERS = Object.freeze({ recruiter: 158, rival: 180, mentor: 190, examiner: 150, specialist: 170, npc: 166 });
  // Reactions are opt-in per line: an emotional narration must never impersonate a character.
  const VOICE_CUES = Object.freeze({
    huaAnger: { role: 'rival', emotion: 'anger' },
    shenCalm: { role: 'mentor', emotion: 'approval' },
    queenCaution: { role: 'examiner', emotion: 'tension' }
  });
  const PENDING_TTL = 700;
  const channels = { story: null, ui: null };
  const pending = { story: null, ui: null };
  const retiring = new Set();
  let enabled = true, context = null, unlocked = false, opening = null;
  let voiceContext = null;
  const voiceBuffers = new Map();
  let session = 0, contextGeneration = 0, visualGeneration = 0;
  let visualTimer = null, visualStage = null;
  let musicElement = null, duckState = null, duckTimer = null, duckGeneration = 0, duckSuppressed = false;

  function safe(action) { try { return action(); } catch (_) { return undefined; } }
  function now() { return root.performance && typeof root.performance.now === 'function' ? root.performance.now() : Date.now(); }
  function clearTimer(timer) { if (timer !== null) safe(() => root.clearTimeout(timer)); }
  function has(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }
  function audioAvailable() { return Boolean(root.AudioContext || root.webkitAudioContext); }
  function clearPending() { pending.story = null; pending.ui = null; }
  function hasAudio() { return Boolean(channels.story || channels.ui || retiring.size); }

  function clearVisual() {
    clearTimer(visualTimer); visualTimer = null;
    if (visualStage) {
      safe(() => visualStage.removeAttribute('data-emotion'));
      safe(() => visualStage.removeAttribute('data-emotion-role'));
      visualStage = null;
    }
  }
  function showVisual(emotion, role) {
    visualGeneration += 1; clearVisual();
    const token = visualGeneration;
    const stage = safe(() => root.document && root.document.getElementById('stage'));
    if (!stage) return;
    visualStage = stage;
    safe(() => stage.offsetWidth);
    safe(() => stage.setAttribute('data-emotion-role', role));
    safe(() => stage.setAttribute('data-emotion', emotion));
    visualTimer = root.setTimeout(() => { if (token === visualGeneration) clearVisual(); }, EMOTIONS[emotion]);
  }

  function cancelDuckTimer() {
    duckGeneration += 1; clearTimer(duckTimer); duckTimer = null;
  }
  function ownsVolume(state) {
    return state && Math.abs(Number(state.element.volume) - state.lastApplied) < 0.002;
  }
  function abandonDuck() { cancelDuckTimer(); duckState = null; duckSuppressed = true; }
  function restoreMusic(immediate) {
    const state = duckState;
    if (!state) { cancelDuckTimer(); return; }
    if (!ownsVolume(state)) { abandonDuck(); return; }
    if (!immediate) { rampMusic(state.baseVolume, 160, true); return; }
    cancelDuckTimer(); safe(() => { state.element.volume = state.baseVolume; }); duckState = null;
  }
  function rampMusic(target, duration, restoring) {
    const state = duckState;
    if (!state) return;
    if (!ownsVolume(state)) { abandonDuck(); return; }
    cancelDuckTimer();
    const token = duckGeneration, started = now(), from = Number(state.element.volume);
    function step() {
      if (token !== duckGeneration || duckState !== state) return;
      if (!ownsVolume(state)) { abandonDuck(); return; }
      if (!restoring && (state.element.paused || state.element.muted)) { restoreMusic(true); return; }
      const progress = Math.min(1, Math.max(0, (now() - started) / duration));
      const eased = progress * progress * (3 - 2 * progress);
      const value = from + (target - from) * eased;
      const written = safe(() => { state.element.volume = value; return true; });
      if (!written) { abandonDuck(); return; }
      state.lastApplied = Number(state.element.volume);
      if (progress === 1) { duckTimer = null; if (restoring) duckState = null; return; }
      duckTimer = root.setTimeout(step, 16);
    }
    step();
  }
  function updateDuck() {
    if (!hasAudio()) { duckSuppressed = false; restoreMusic(false); return; }
    const element = musicElement;
    if (!element || element.paused || element.muted || duckSuppressed) return;
    if (!duckState) {
      const volume = Number(element.volume);
      if (!Number.isFinite(volume) || volume <= 0) return;
      duckState = { element, baseVolume: volume, lastApplied: volume };
    } else if (!ownsVolume(duckState)) { abandonDuck(); return; }
    // 0.42 becomes 0.16; a quieter user setting stays proportionally quieter.
    rampMusic(duckState.baseVolume * 0.38, 80, false);
  }
  function setMusicElement(element) {
    restoreMusic(true);
    musicElement = element && Number.isFinite(Number(element.volume)) ? element : null;
    duckSuppressed = false;
    if (hasAudio()) updateDuck();
  }

  function disconnectRun(run) {
    if (!run) return;
    clearTimer(run.timer);
    safe(() => run.output.disconnect());
    for (const source of run.sources) safe(() => source.stop());
    for (const node of run.nodes) safe(() => node.disconnect());
    retiring.delete(run);
    if (channels[run.channel] === run) channels[run.channel] = null;
  }
  function stopChannel(channel, soft) {
    for (const run of [...retiring]) if (run.channel === channel) disconnectRun(run);
    const run = channels[channel]; channels[channel] = null;
    if (!run) return;
    if (soft && context && context.state === 'running') {
      try {
        clearTimer(run.timer);
        const at = context.currentTime;
        run.output.gain.cancelScheduledValues(at);
        run.output.gain.setValueAtTime(run.gain, at);
        run.output.gain.linearRampToValueAtTime(0, at + 0.004);
        for (const source of run.sources) safe(() => source.stop(at + 0.005));
        retiring.add(run);
        run.timer = root.setTimeout(() => { disconnectRun(run); updateDuck(); }, 6);
        return;
      } catch (_) { /* Immediate stop remains a safe scheduling fallback. */ }
    }
    disconnectRun(run);
  }
  function clearAudio() {
    stopChannel('story', false); stopChannel('ui', false);
    for (const run of [...retiring]) disconnectRun(run);
    restoreMusic(true); duckSuppressed = false;
  }
  function stop() {
    session += 1; clearPending(); clearAudio();
    visualGeneration += 1; clearVisual();
  }
  function setEnabled(value) {
    enabled = Boolean(value);
    if (!enabled) { session += 1; clearPending(); clearAudio(); }
    return enabled;
  }

  function unlock() {
    if (context && context.state === 'running' && unlocked) return Promise.resolve(true);
    if (opening) return opening;
    const activation = safe(() => root.navigator && root.navigator.userActivation);
    if (activation && !activation.isActive) { clearPending(); return Promise.resolve(false); }
    const Constructor = root.AudioContext || root.webkitAudioContext;
    if (!Constructor) { clearPending(); return Promise.resolve(false); }
    if (!context || context.state === 'closed') context = safe(() => new Constructor({ latencyHint: 'interactive' })) || null;
    if (!context) { clearPending(); return Promise.resolve(false); }
    const current = context, token = contextGeneration;
    const resumed = safe(() => current.state === 'running' ? undefined : current.resume());
    opening = Promise.resolve(resumed).then(() => {
      if (token !== contextGeneration || context !== current) return false;
      unlocked = current.state === 'running';
      if (unlocked && enabled) flushPending(); else clearPending();
      return unlocked;
    }, () => {
      if (context === current) { unlocked = false; clearPending(); }
      return false;
    }).then(result => { if (token === contextGeneration) opening = null; return result; });
    return opening;
  }

  function track(run, node) { run.nodes.push(node); return node; }
  function filter(run, type, frequency, q, target) {
    const node = track(run, context.createBiquadFilter()); node.type = type;
    node.frequency.setValueAtTime(frequency, run.start); node.Q.setValueAtTime(q, run.start); node.connect(target); return node;
  }
  function envelope(run, target, at, duration, peak, attack) {
    const gain = track(run, context.createGain());
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(peak, at + (attack || 0.016));
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    gain.gain.setValueAtTime(0, at + duration + 0.005); gain.connect(target); return gain;
  }
  function tone(run, type, from, to, offset, duration, peak, target) {
    const source = track(run, context.createOscillator()); run.sources.push(source);
    const at = run.start + offset; source.type = type;
    source.frequency.setValueAtTime(from, at); source.frequency.exponentialRampToValueAtTime(to, at + duration);
    source.connect(envelope(run, target || run.output, at, duration, peak));
    source.start(at); source.stop(at + duration + 0.012); run.end = Math.max(run.end, at + duration + 0.012);
  }
  function breath(run, offset, duration, peak, paper) {
    const at = run.start + offset, length = Math.max(1, Math.ceil(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate), data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (paper ? 0.65 + 0.35 * Math.sin(i / context.sampleRate * 125) : 1);
    const source = track(run, context.createBufferSource()); run.sources.push(source); source.buffer = buffer;
    const low = filter(run, 'lowpass', paper ? 2600 : 1600, 0.5, run.output);
    const band = filter(run, 'highpass', paper ? 750 : 500, 0.5, low);
    source.connect(envelope(run, band, at, duration, peak, 0.025));
    source.start(at); source.stop(at + duration + 0.012); run.end = Math.max(run.end, at + duration + 0.012);
  }
  function recordedVoice(run, voice) {
    if (!has(VOICE_CUES, voice)) return false;
    const clip = root.PalaceVoices && root.PalaceVoices[voice];
    if (!clip || typeof clip.pcm16 !== 'string' || !Number.isInteger(clip.sampleRate) || clip.sampleRate < 8000 || clip.sampleRate > 48000) return false;
    try {
      if (voiceContext !== context) { voiceBuffers.clear(); voiceContext = context; }
      let buffer = voiceBuffers.get(voice);
      if (!buffer) {
        const bytes = root.atob(clip.pcm16), length = bytes.length / 2;
        if (!Number.isInteger(length) || length < 1 || length > clip.sampleRate * 5) return false;
        buffer = context.createBuffer(1, length, clip.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < length; i += 1) {
          const sample = bytes.charCodeAt(i * 2) | (bytes.charCodeAt(i * 2 + 1) << 8);
          data[i] = (sample >= 32768 ? sample - 65536 : sample) / 32768;
        }
        voiceBuffers.set(voice, buffer);
      }
      const source = track(run, context.createBufferSource()); run.sources.push(source);
      source.buffer = buffer; source.connect(run.output);
      const end = run.start + buffer.length / buffer.sampleRate;
      source.start(run.start); source.stop(end + 0.005); run.end = Math.max(run.end, end + 0.005);
      return true;
    } catch (_) { return false; }
  }
  function deskTap(run, offset, strength) {
    tone(run, 'sine', 178, 82, offset, 0.105, 0.29 * strength);
    tone(run, 'triangle', 820, 315, offset + 0.003, 0.045, 0.10 * strength);
    breath(run, offset, 0.055, 0.12 * strength, true);
  }
  function sceneSound(run, emotion, role, voice) {
    const cue = has(VOICE_CUES, voice) ? VOICE_CUES[voice] : null;
    if (cue && cue.emotion === emotion && cue.role === role && recordedVoice(run, voice)) return;
    if (role === 'recruiter' && emotion === 'approval') {
      // A quick brush mark followed by a stamp on the application register.
      breath(run, 0, 0.09, 0.20, true); breath(run, 0.075, 0.11, 0.16, true);
      deskTap(run, 0.19, 0.65); return;
    }
    if (role === 'specialist' && emotion === 'discovery') {
      // The examiner taps the desk twice, then unfolds the work sample.
      deskTap(run, 0, 0.56); deskTap(run, 0.13, 0.44);
      breath(run, 0.23, 0.24, 0.28, true); return;
    }
    if (role === 'mentor' && emotion === 'approval') {
      tone(run, 'sine', 588, 584, 0, 0.29, 0.19);
      tone(run, 'sine', 882, 878, 0.08, 0.28, 0.11);
      tone(run, 'sine', 1176, 1170, 0.15, 0.22, 0.045); return;
    }
    if (emotion === 'anger') {
      // An impact cue, not a synthesized imitation of an angry human voice.
      deskTap(run, 0, role === 'rival' ? 1.05 : 0.8);
      tone(run, 'sine', 84, 46, 0.025, 0.24, 0.20);
    } else if (emotion === 'tension') {
      tone(run, 'sine', 90, 48, 0, 0.36, 0.26);
      tone(run, 'triangle', 345, 245, 0.005, 0.18, 0.14);
      breath(run, 0.025, 0.12, 0.026, false);
    } else if (emotion === 'approval') {
      tone(run, 'sine', 660, 658, 0, 0.34, 0.24); tone(run, 'sine', 990, 988, 0.09, 0.38, 0.136); tone(run, 'sine', 1320, 1316, 0, 0.20, 0.029);
    } else {
      breath(run, 0, 0.18, 0.105, true); tone(run, 'sine', 588, 584, 0.13, 0.29, 0.228); tone(run, 'sine', 1176, 1168, 0.13, 0.18, 0.042);
    }
  }
  function interactionSound(run, type) {
    if (type === 'confirm') {
      tone(run, 'sine', 228, 148, 0, 0.18, 0.24); tone(run, 'triangle', 440, 438, 0.035, 0.16, 0.10);
    } else if (type === 'page') {
      breath(run, 0, 0.19, 0.42, true); tone(run, 'sine', 310, 235, 0.015, 0.12, 0.075);
    } else if (type === 'clue') {
      tone(run, 'sine', 784, 780, 0, 0.21, 0.19); tone(run, 'sine', 1176, 1170, 0.065, 0.22, 0.11);
    } else if (type === 'locked') {
      tone(run, 'sine', 190, 152, 0, 0.13, 0.23); tone(run, 'sine', 142, 128, 0.10, 0.13, 0.17);
    } else if (type === 'chapter') {
      tone(run, 'sine', 128, 72, 0, 0.32, 0.28); tone(run, 'triangle', 264, 262, 0.075, 0.31, 0.14); tone(run, 'sine', 396, 394, 0.12, 0.28, 0.09);
    } else {
      tone(run, 'sine', 220, 220, 0, 0.42, 0.21); tone(run, 'triangle', 330, 330, 0.09, 0.40, 0.16); tone(run, 'sine', 440, 440, 0.18, 0.35, 0.13);
    }
  }
  function startSound(channel, request) {
    if (!enabled || !unlocked || !context || context.state !== 'running') return false;
    let run;
    try {
      const output = context.createGain(), gain = channel === 'story' ? 0.72 : 0.78;
      run = { channel, output, gain, nodes: [output], sources: [], timer: null, start: context.currentTime + 0.008, end: context.currentTime };
      channels[channel] = run;
      output.gain.setValueAtTime(gain, run.start); output.connect(context.destination);
      if (channel === 'story') sceneSound(run, request.type, request.role, request.voice); else interactionSound(run, request.type);
      run.timer = root.setTimeout(() => { disconnectRun(run); updateDuck(); }, Math.ceil((run.end - context.currentTime) * 1000) + 40);
      updateDuck(); return true;
    } catch (_) { disconnectRun(run); updateDuck(); return false; }
  }
  function requestSound(channel, type, role, voice) {
    pending[channel] = null; stopChannel(channel, true);
    if (!enabled) { updateDuck(); return false; }
    const request = { type, role, voice, at: now(), session };
    if (unlocked && context && context.state === 'running') return startSound(channel, request);
    if (audioAvailable()) pending[channel] = request;
    updateDuck(); return false;
  }
  function flushPending() {
    for (const channel of ['story', 'ui']) {
      const request = pending[channel]; pending[channel] = null;
      if (request && enabled && request.session === session && now() - request.at <= PENDING_TTL) startSound(channel, request);
    }
  }
  function play(emotion, role, voice) {
    if (!has(EMOTIONS, emotion)) return false;
    const register = has(REGISTERS, role) ? role : 'npc'; showVisual(emotion, register);
    return requestSound('story', emotion, register, voice);
  }
  function cue(type) { return has(CUES, type) ? requestSound('ui', type, 'npc') : false; }
  function dispose() {
    stop(); const previous = context;
    contextGeneration += 1; context = null; opening = null; unlocked = false; musicElement = null;
    voiceContext = null; voiceBuffers.clear();
    return previous ? Promise.resolve(safe(() => previous.close())).then(() => undefined, () => undefined) : Promise.resolve();
  }
  root.PalaceEffects = Object.freeze({ unlock, setEnabled, play, cue, setMusicElement, stop, dispose });
})(globalThis);
