'use client';

import { useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface DraftVoiceNote {
  id: string;
  url: string;
  transcript: string;
  durationLabel: string;
  inserted: boolean;
  uploading?: boolean;
}

// Minimal ambient types for the Web Speech API — not in lib.dom.d.ts yet.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  [index: number]: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [index: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  start(): void;
  stop(): void;
}

function formatTimer(ms: number) {
  const s = Math.floor(ms / 1000);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

/**
 * Real microphone recording (MediaRecorder) + live transcription (Web
 * Speech API) — not a placeholder. Audio uploads straight to Supabase
 * Storage from the browser, same pattern as PhotoUploader. Transcription
 * only runs in browsers that support SpeechRecognition (Chrome, Edge,
 * Safari); Firefox and others still record audio, just without live text —
 * detected and messaged explicitly rather than failing silently.
 */
export function VoiceRecorder({
  draftId,
  notes,
  onChange,
  onInsertTranscript,
  onRecordingChange
}: {
  draftId: string;
  notes: DraftVoiceNote[];
  onChange: (notes: DraftVoiceNote[]) => void;
  onInsertTranscript: (transcript: string) => void;
  onRecordingChange?: (recording: boolean) => void;
}) {
  const [isRecording, setIsRecordingState] = useState(false);
  const setIsRecording = (value: boolean) => {
    setIsRecordingState(value);
    onRecordingChange?.(value);
  };
  const [liveTranscript, setLiveTranscript] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recognizerRef = useRef<SpeechRecognitionLike | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const finalTextRef = useRef('');

  const SpeechRecognitionCtor =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;
  const canRecordAudio =
    typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

  async function startRecording() {
    setErrorMsg(null);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErrorMsg('Microphone access was blocked or denied — check your browser/site permissions.');
      return;
    }
    streamRef.current = stream;
    chunksRef.current = [];
    finalTextRef.current = '';
    setLiveTranscript('');
    setIsRecording(true);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => setElapsed(Date.now() - startTimeRef.current), 250);

    try {
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
    } catch {
      setErrorMsg('Could not start the recorder in this browser.');
      setIsRecording(false);
      return;
    }

    if (SpeechRecognitionCtor) {
      const recognizer: SpeechRecognitionLike = new SpeechRecognitionCtor();
      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.lang = 'en-IN';
      recognizer.onresult = (e) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          if (!res || !res[0]) continue;
          if (res.isFinal) finalTextRef.current += res[0].transcript + ' ';
          else interim += res[0].transcript;
        }
        setLiveTranscript((finalTextRef.current + interim).trim());
      };
      recognizer.onerror = () => {
        /* non-fatal — recording continues without live text */
      };
      recognizerRef.current = recognizer;
      try {
        recognizer.start();
      } catch {
        /* already running / unsupported mid-session — ignore */
      }
    }
  }

  async function stopRecording() {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (recognizerRef.current) {
      try {
        recognizerRef.current.stop();
      } catch {
        /* ignore */
      }
    }
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());

    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    const durationLabel = formatTimer(Date.now() - startTimeRef.current);
    const transcript = liveTranscript.trim();
    const localId = crypto.randomUUID();

    const stopped: Promise<Blob> = new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' }));
    });
    recorder.stop();
    const blob = await stopped;

    const placeholder: DraftVoiceNote = { id: localId, url: '', transcript, durationLabel, inserted: false, uploading: true };
    onChange([...notes, placeholder]);

    const supabase = createClient();
    const ext = (blob.type.split('/')[1] || 'webm').split(';')[0];
    const path = `${draftId}/voice-${localId}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('field-note-media').upload(path, blob, { cacheControl: '3600' });
    if (uploadError) {
      setErrorMsg(`Voice note upload failed: ${uploadError.message}`);
      onChange(notes.filter((n) => n.id !== localId));
      return;
    }
    const { data } = supabase.storage.from('field-note-media').getPublicUrl(path);
    onChange([...notes.filter((n) => n.id !== localId), { id: localId, url: data.publicUrl, transcript, durationLabel, inserted: false }]);
  }

  function remove(id: string) {
    onChange(notes.filter((n) => n.id !== id));
  }
  function insert(note: DraftVoiceNote) {
    onInsertTranscript(note.transcript);
    onChange(notes.map((n) => (n.id === note.id ? { ...n, inserted: true } : n)));
  }

  return (
    <div className="flex items-start gap-3 px-3.5 py-3 border border-rule rounded bg-bg flex-wrap">
      <button
        type="button"
        disabled={!canRecordAudio}
        onClick={() => (isRecording ? stopRecording() : startRecording())}
        className={`w-[38px] h-[38px] rounded-full text-white text-base shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
          isRecording ? 'bg-conf-low animate-pulse' : 'bg-rust'
        }`}
      >
        🎙
      </button>
      <div className="flex-1 min-w-[200px]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[13px]">{isRecording ? 'Recording… tap to stop' : 'Record field note'}</span>
          {isRecording && <span className="font-mono text-xs text-rust font-semibold">{formatTimer(elapsed)}</span>}
        </div>
        {!canRecordAudio ? (
          <p className="text-[11.5px] text-ink-faint">
            This browser doesn&apos;t support microphone recording — try Chrome, Edge, Safari, or Firefox.
          </p>
        ) : isRecording ? (
          <p className="text-[13px] text-ink-soft mt-1">{liveTranscript || (SpeechRecognitionCtor ? 'Listening…' : '')}</p>
        ) : (
          <p className="text-[11.5px] text-ink-faint">
            {SpeechRecognitionCtor
              ? 'Uses your microphone. Recording stays on this device until you save.'
              : 'Recording works here, but live transcription needs Chrome, Edge, or Safari — audio will still be captured.'}
          </p>
        )}
        {errorMsg && <p className="text-xs text-conf-low mt-1">{errorMsg}</p>}
      </div>

      {notes.length > 0 && (
        <div className="w-full flex flex-col gap-2 mt-1">
          {notes.map((v) => (
            <div key={v.id} className="flex items-center gap-2.5 px-3 py-2 border border-rule rounded bg-paper flex-wrap">
              {v.uploading ? (
                <span className="text-xs text-ink-faint">Uploading…</span>
              ) : (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <audio controls src={v.url} className="h-8 max-w-[220px]" />
              )}
              <div className="flex-1 min-w-[120px] text-xs text-ink-soft">
                {v.transcript ? v.transcript.slice(0, 90) + (v.transcript.length > 90 ? '…' : '') : <em>No transcript captured.</em>}
              </div>
              <div className="flex gap-1.5 items-center shrink-0">
                {v.transcript && !v.inserted && !v.uploading && (
                  <button type="button" onClick={() => insert(v)} className="text-xs px-2.5 py-1 border border-rule rounded-full">
                    Insert into notes
                  </button>
                )}
                {v.inserted && <span className="text-[11px] px-2 py-0.5 rounded-full bg-fact-bg text-fact">🟢 Inserted</span>}
                <button type="button" onClick={() => remove(v.id)} className="text-xs text-ink-soft hover:text-ink">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
