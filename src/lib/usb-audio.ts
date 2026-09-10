import { t } from "./messages";

export interface AudioInputDevice {
  deviceId: string;
  label: string;
}

export interface UsbAudioAnalysers {
  waveform: AnalyserNode;
  spectrum: AnalyserNode;
}

export interface UsbAudioSession {
  context: AudioContext;
  analysers: UsbAudioAnalysers;
  stream: MediaStream;
  stop: () => void;
}

export function isLikelyS1AudioDevice(label: string): boolean {
  const n = label.toLowerCase();
  return (
    /s-?1/.test(n) ||
    (/digital audio interface/.test(n) && /s-?1|aira|compact/.test(n)) ||
    /aira\s*compact/.test(n)
  );
}

export function isAudioInputSupported(): boolean {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

export async function listAudioInputDevices(): Promise<AudioInputDevice[]> {
  if (!isAudioInputSupported()) return [];

  let devices = await navigator.mediaDevices.enumerateDevices();
  if (devices.every((d) => !d.label)) {
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
      tmp.getTracks().forEach((t) => t.stop());
      devices = await navigator.mediaDevices.enumerateDevices();
    } catch {
      /* permission denied — return unlabeled list */
    }
  }

  return devices
    .filter((d) => d.kind === "audioinput")
    .map((d) => ({
      deviceId: d.deviceId,
      label: d.label || t("audioInputUnlabeled", { id: d.deviceId.slice(0, 6) }),
    }));
}

export function pickS1AudioDevice(devices: AudioInputDevice[]): AudioInputDevice | undefined {
  return devices.find((d) => isLikelyS1AudioDevice(d.label));
}

export async function startUsbAudioCapture(deviceId?: string): Promise<UsbAudioSession> {
  const audio: MediaTrackConstraints = {
    echoCancellation: false,
    autoGainControl: false,
    noiseSuppression: false,
  };
  if (deviceId) audio.deviceId = { exact: deviceId };

  const stream = await navigator.mediaDevices.getUserMedia({ audio });
  const context = new AudioContext({ latencyHint: "interactive" });
  if (context.state === "suspended") await context.resume();

  const waveform = context.createAnalyser();
  // Extra headroom so rising-edge trigger + display window always fit in one buffer.
  waveform.fftSize = 4096;
  waveform.smoothingTimeConstant = 0;

  const spectrum = context.createAnalyser();
  spectrum.fftSize = 2048;
  spectrum.smoothingTimeConstant = 0.12;
  spectrum.minDecibels = -78;
  spectrum.maxDecibels = -12;

  const source = context.createMediaStreamSource(stream);
  source.connect(waveform);
  source.connect(spectrum);

  return {
    context,
    analysers: { waveform, spectrum },
    stream,
    stop: () => {
      source.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      void context.close();
    },
  };
}
