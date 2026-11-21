// Own the microphone, analyser and timers together so every exit releases them.
export async function capture(
  onMeter: (ms: number, level: number) => void,
  onStop: (blob: Blob) => void,
  onError: () => void,
) {
  const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(
    (type) => MediaRecorder.isTypeSupported(type),
  );
  if (!mimeType) throw new Error("Unsupported recorder");
  // Unlock Web Audio during the tap, before Safari presents its permission sheet.
  const context = new AudioContext();
  let stream: MediaStream | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let limit: ReturnType<typeof setTimeout> | undefined;
  let recorder: MediaRecorder | undefined;
  function dispose() {
    clearInterval(timer);
    clearTimeout(limit);
    if (recorder) {
      recorder.onstop = null;
      recorder.onerror = null;
      recorder.ondataavailable = null;
      if (recorder.state !== "inactive") recorder.stop();
    }
    stream?.getTracks().forEach((track) => track.stop());
    if (context.state !== "closed") void context.close().catch(() => {});
  }
  try {
    void context.resume().catch(() => {});
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const media = new MediaRecorder(stream, {
      mimeType,
      audioBitsPerSecond: 64000,
    });
    recorder = media;
    const analyser = context.createAnalyser();
    context.createMediaStreamSource(stream).connect(analyser);
    analyser.fftSize = 256;
    const samples = new Uint8Array(analyser.fftSize);
    const chunks: Blob[] = [];
    let elapsed = 0;
    let since = performance.now();
    const duration = () =>
      elapsed + (media.state === "recording" ? performance.now() - since : 0);
    const stop = () => {
      if (media.state !== "inactive") media.stop();
    };
    const arm = () => {
      limit = setTimeout(stop, Math.max(0, 90000 - elapsed));
    };
    media.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    media.onstop = () => {
      const result = new Blob(chunks, { type: media.mimeType });
      dispose();
      onStop(result);
    };
    media.onerror = () => {
      dispose();
      onError();
    };
    media.start(500);
    arm();
    timer = setInterval(() => {
      analyser.getByteTimeDomainData(samples);
      const rms = Math.sqrt(
        samples.reduce((sum, n) => sum + ((n - 128) / 128) ** 2, 0) /
          samples.length,
      );
      onMeter(
        Math.min(90000, duration()),
        media.state === "recording" ? Math.min(1, rms * 4) : 0,
      );
    }, 100);
    return {
      stop,
      dispose,
      pause() {
        elapsed = duration();
        media.pause();
        clearTimeout(limit);
      },
      resume() {
        media.resume();
        since = performance.now();
        arm();
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
