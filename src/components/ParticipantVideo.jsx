import React, { useEffect, useRef } from 'react';

export default function ParticipantVideo({ videoTrack, label, muted }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (videoTrack && containerRef.current) {
      videoTrack.play(containerRef.current);
    }
    return () => {
      videoTrack?.stop();
    };
  }, [videoTrack]);

  return (
    <div className="video-tile">
      <div ref={containerRef} className="video-surface" />
      {!videoTrack && <div className="video-placeholder">Camera off</div>}
      <span className="video-label">
        {label} {muted && '🔇'}
      </span>
    </div>
  );
}