// Audio Chime using Web Audio API (no external sound files required)
export function playChimeSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // Friendly 2-tone melodic chime: C5 (523.25 Hz) followed by G5 (783.99 Hz)
    const tones = [
      { freq: 523.25, time: 0, duration: 0.4 },
      { freq: 783.99, time: 0.18, duration: 0.6 },
    ];

    tones.forEach((tone) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(tone.freq, ctx.currentTime + tone.time);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + tone.time);
      gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + tone.time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + tone.time + tone.duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + tone.time);
      osc.stop(ctx.currentTime + tone.time + tone.duration);
    });
  } catch (err) {
    console.debug('Audio chime playback omitted:', err);
  }
}
