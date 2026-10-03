/** Browser text-to-speech — free pronunciation for every word and NPC line. */
export function speak(text: string, rate = 0.95) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-GB";
  u.rate = rate;
  window.speechSynthesis.speak(u);
}

interface RecognitionLike {
  lang: string;
  interimResults: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type RecognitionCtor = new () => RecognitionLike;

function recognitionCtor(): RecognitionCtor | undefined {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const canListen = () => !!recognitionCtor();

/** Speech-to-text (Chrome/Edge/Safari). Resolves with the transcript. */
export function listenOnce(onText: (text: string) => void): () => void {
  const Ctor = recognitionCtor();
  if (!Ctor) return () => {};
  const r = new Ctor();
  r.lang = "en-US";
  r.interimResults = true;
  r.onresult = (e) => {
    const text = Array.from(e.results)
      .map((res) => res[0].transcript)
      .join(" ");
    onText(text);
  };
  r.start();
  return () => r.stop();
}
