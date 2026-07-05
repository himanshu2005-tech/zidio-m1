import React, { useEffect, useRef } from 'react';

export default function TranscriptPanel({ lines, liveText, speakerName, isSupported, remoteLiveTexts = {}, error }) {
  const logRef = useRef(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [lines, liveText, remoteLiveTexts, error]);

  const hasRemoteInterims = Object.values(remoteLiveTexts).some(text => text.length > 0);

  if (lines.length === 0 && !liveText && !hasRemoteInterims && !error && isSupported) {
    return null;
  }

  return (
    <aside className="transcript-panel">
      {!isSupported && (
        <p className="transcript-warning">
          Live captioning unsupported. Try Chrome.
        </p>
      )}
      {error && (
        <p className="transcript-warning" style={{ color: '#ff6b6b' }}>
          {error}
        </p>
      )}

      <div className="transcript-log" ref={logRef}>
        {lines.map((line, i) => (
          <p key={i} className="transcript-line">
            <span className="transcript-speaker">{line.speaker}:</span> {line.text}
          </p>
        ))}
        {liveText && (
          <p className="transcript-line transcript-interim">
            <span className="transcript-speaker">{speakerName}:</span> {liveText}
          </p>
        )}
        {Object.entries(remoteLiveTexts).map(([speaker, text]) => {
          if (!text) return null;
          return (
            <p key={speaker} className="transcript-line transcript-interim">
              <span className="transcript-speaker">{speaker}:</span> {text}
            </p>
          );
        })}
      </div>
    </aside>
  );
}