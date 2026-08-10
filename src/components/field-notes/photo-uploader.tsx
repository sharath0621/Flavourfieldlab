'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface DraftPhoto {
  id: string;
  url: string;
  caption: string;
  uploading?: boolean;
}

/**
 * Uploads directly to Supabase Storage from the browser (spec §25 — fast
 * photo capture on mobile, no server round-trip for the file bytes). Photos
 * land under `${draftId}/...` in the public `field-note-media` bucket;
 * `createFieldNote` later just persists the resulting URLs as `media` rows.
 *
 * Three ways in: the file picker, dragging a file onto the tile, and
 * pasting (Cmd/Ctrl+V) an image from the clipboard — the fast path for
 * screenshots.
 */
export function PhotoUploader({
  draftId,
  photos,
  onChange
}: {
  draftId: string;
  photos: DraftPhoto[];
  onChange: (photos: DraftPhoto[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Keep a live ref to the latest photos/onChange so the document-level
  // paste listener (subscribed once) never closes over a stale array.
  const photosRef = useRef(photos);
  const onChangeRef = useRef(onChange);
  photosRef.current = photos;
  onChangeRef.current = onChange;

  async function handleFiles(files: FileList | File[] | null) {
    if (!files) return;
    const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;
    setError(null);
    const supabase = createClient();

    for (const file of list) {
      const localId = crypto.randomUUID();
      const placeholder: DraftPhoto = { id: localId, url: '', caption: '', uploading: true };
      onChangeRef.current([...photosRef.current, placeholder]);

      const path = `${draftId}/${localId}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const { error: uploadError } = await supabase.storage.from('field-note-media').upload(path, file, {
        cacheControl: '3600',
        upsert: false
      });

      if (uploadError) {
        setError(`Upload failed for ${file.name}: ${uploadError.message}`);
        onChangeRef.current(photosRef.current.filter((p) => p.id !== localId));
        continue;
      }

      const { data } = supabase.storage.from('field-note-media').getPublicUrl(path);
      onChangeRef.current([...photosRef.current.filter((p) => p.id !== localId), { id: localId, url: data.publicUrl, caption: '' }]);
    }
  }

  // Clipboard paste — subscribed once for the component's lifetime, cleaned
  // up on unmount, so it never stacks duplicate listeners across re-renders.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') && active !== document.body) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      Array.from(items).forEach((item) => {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      });
      if (files.length) void handleFiles(files);
    }
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftId]);

  function updateCaption(id: string, caption: string) {
    onChange(photos.map((p) => (p.id === id ? { ...p, caption } : p)));
  }
  function remove(id: string) {
    onChange(photos.filter((p) => p.id !== id));
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2.5">
        {photos.map((p) => (
          <div key={p.id} className="w-24">
            <div className="w-24 h-24 rounded bg-bg-alt border border-rule relative overflow-hidden flex items-center justify-center">
              {p.uploading ? (
                <span className="text-xs text-ink-faint">Uploading…</span>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt={p.caption || 'Field photo'} className="w-full h-full object-cover" />
              )}
              {!p.uploading && (
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  className="absolute top-1 right-1 w-[18px] h-[18px] rounded-full bg-ink/70 text-white text-[11px] leading-none"
                >
                  ✕
                </button>
              )}
            </div>
            <input
              type="text"
              placeholder="Caption (optional)"
              value={p.caption}
              onChange={(e) => updateCaption(p.id, e.target.value)}
              className="w-full mt-1 text-[10.5px] px-1.5 py-1 border border-rule rounded-sm"
            />
          </div>
        ))}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            void handleFiles(e.dataTransfer.files);
          }}
          className={`w-24 h-24 border-[1.5px] border-dashed rounded flex flex-col items-center justify-center gap-1 text-ink-faint text-[11px] cursor-pointer ${
            dragOver ? 'border-rust bg-rust-bg' : 'border-rule bg-bg'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <span className="text-xl">＋</span> Add photos
        </label>
      </div>
      <p className="text-[11px] text-ink-faint mt-1.5">Drag a file in, or paste (⌘V) a screenshot straight from your clipboard.</p>
      {error && <p className="text-xs text-conf-low mt-2">{error}</p>}
    </div>
  );
}
