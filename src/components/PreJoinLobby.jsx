import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import DeviceSettings from './DeviceSettings';

export default function PreJoinLobby({ onJoin, onCancel }) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  
  const [selectedMicId, setSelectedMicId] = useState(null);
  const [selectedCamId, setSelectedCamId] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  
  const videoRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const localAudioTrackRef = useRef(null);

  // Initialize preview tracks
  useEffect(() => {
    let mounted = true;
    
    const initTracks = async () => {
      try {
        if (camOn) {
          const vTrack = await AgoraRTC.createCameraVideoTrack(
            selectedCamId ? { cameraId: selectedCamId } : undefined
          );
          if (mounted) {
            localVideoTrackRef.current = vTrack;
            if (videoRef.current) vTrack.play(videoRef.current);
          } else {
            vTrack.close();
          }
        }
        
        if (micOn) {
          const aTrack = await AgoraRTC.createMicrophoneAudioTrack(
            selectedMicId ? { microphoneId: selectedMicId } : undefined
          );
          if (mounted) {
            localAudioTrackRef.current = aTrack;
          } else {
            aTrack.close();
          }
        }
      } catch (err) {
        console.warn('Failed to init preview tracks', err);
      }
    };

    initTracks();

    return () => {
      mounted = false;
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
    };
  }, [selectedCamId, selectedMicId, camOn, micOn]); // Re-init when devices or toggles change

  const toggleMic = () => setMicOn(p => !p);
  const toggleCam = () => setCamOn(p => !p);

  const handleJoin = () => {
    // Pass the selected device choices to the parent
    onJoin({
      micOn,
      camOn,
      selectedMicId,
      selectedCamId
    });
  };

  return (
    <div className="lobby-screen">
      <div className="lobby-container">
        <h1>Ready to join?</h1>
        
        <div className="lobby-preview-box">
          <div className="lobby-video-container" ref={videoRef}>
            {!camOn && (
              <div className="lobby-video-off">
                Camera is off
              </div>
            )}
          </div>
          
          <div className="lobby-controls">
            <button className={`control-btn ${!micOn ? 'off' : ''}`} onClick={toggleMic}>
              {micOn ? 'Mic On' : 'Mic Off'}
            </button>
            <button className={`control-btn ${!camOn ? 'off' : ''}`} onClick={toggleCam}>
              {camOn ? 'Cam On' : 'Cam Off'}
            </button>
            <button className="control-btn" onClick={() => setShowSettings(true)}>
              Settings
            </button>
          </div>
        </div>

        <div className="lobby-actions">
          <button className="primary-btn join-btn" onClick={handleJoin}>Join Now</button>
          <button className="secondary-btn" onClick={onCancel}>Cancel</button>
        </div>
      </div>

      {showSettings && (
        <DeviceSettings 
          onClose={() => setShowSettings(false)}
          selectedMicId={selectedMicId}
          setSelectedMicId={setSelectedMicId}
          selectedCamId={selectedCamId}
          setSelectedCamId={setSelectedCamId}
        />
      )}
    </div>
  );
}
