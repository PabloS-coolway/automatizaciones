import { useRef, useState, type ReactNode } from 'react';
import { CheckCircleFill, X } from 'react-bootstrap-icons';

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
  const filled = files.length > 0;

  function pick(list: FileList | null) {
    const arr = Array.from(list ?? []);
    onFiles(multiple ? arr : arr.slice(0, 1));
  }
  function removeAt(i: number, e: React.MouseEvent) {
    e.stopPropagation();
    onFiles(files.filter((_, idx) => idx !== i));
  }

  return (
    <div
      className={`dropzone ${dragover ? 'dragover' : ''} ${filled ? 'filled' : ''}`}
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
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} hidden aria-label={title} onChange={(e) => pick(e.target.files)} />
      <div className="dz-icon" aria-hidden="true">
        {filled ? <CheckCircleFill /> : icon}
      </div>
      <div className="dz-text">
        <div className="dz-title">
          {title}
          {filled && multiple && <span className="dz-count"> · {files.length}</span>}
        </div>
        {!filled ? (
          <div className="dz-hint">{hint}</div>
        ) : multiple ? (
          <div className="dz-files">
            {files.map((f, i) => (
              <span key={f.name} className="dz-file">
                {f.name}
                <button type="button" className="dz-x" onClick={(e) => removeAt(i, e)} aria-label={`Quitar ${f.name}`}>
                  <X aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="dz-hint dz-single">
            {files[0].name} · <span className="dz-change">cambiar</span>
          </div>
        )}
      </div>
    </div>
  );
}
