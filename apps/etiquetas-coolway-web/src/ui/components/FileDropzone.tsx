import { useRef, useState, type ReactNode } from 'react';

interface Props {
  title: string;
  hint: string;
  accept: string;
  multiple?: boolean;
  files: File[];
  onFiles: (files: File[]) => void;
  icon: ReactNode;
}

export function FileDropzone({ title, hint, accept, multiple = false, files, onFiles, icon }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragover, setDragover] = useState(false);

  function pick(list: FileList | null) {
    const arr = Array.from(list ?? []);
    onFiles(multiple ? arr : arr.slice(0, 1));
  }

  return (
    <div
      className={`dropzone ${dragover ? 'dragover' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`${title}. ${hint}`}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragover(true);
      }}
      onDragLeave={() => setDragover(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragover(false);
        pick(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        aria-label={title}
        onChange={(e) => pick(e.target.files)}
      />
      <div className="dz-icon" aria-hidden="true">
        {icon}
      </div>
      <div className="dz-title">{title}</div>
      {files.length === 0 ? (
        <div className="text-secondary small mt-1">{hint}</div>
      ) : (
        <div className="mt-2">
          {files.map((f) => (
            <span key={f.name} className="dz-file">
              {f.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
