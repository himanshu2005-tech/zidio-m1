import React, { useState, useEffect } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

export default function DeviceSettings({ 
  onClose, 
  selectedMicId, 
  setSelectedMicId, 
  selectedCamId, 
  setSelectedCamId 
}) {
  const [microphones, setMicrophones] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchDevices = async () => {
      try {
        // Request permissions first by creating temp tracks if needed, but getDevices usually works if permissions were already granted
        const mics = await AgoraRTC.getMicrophones();
        const cams = await AgoraRTC.getCameras();
        
        if (mounted) {
          setMicrophones(mics);
          setCameras(cams);
          if (!selectedMicId && mics.length > 0) setSelectedMicId(mics[0].deviceId);
          if (!selectedCamId && cams.length > 0) setSelectedCamId(cams[0].deviceId);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to get devices:', err);
        setLoading(false);
      }
    };
    fetchDevices();

    // Listen for device changes (plugging in new webcam/mic)
    const handleDeviceChange = () => fetchDevices();
    AgoraRTC.onMicrophoneChanged = handleDeviceChange;
    AgoraRTC.onCameraChanged = handleDeviceChange;

    return () => {
      mounted = false;
      AgoraRTC.onMicrophoneChanged = undefined;
      AgoraRTC.onCameraChanged = undefined;
    };
  }, [selectedMicId, selectedCamId, setSelectedMicId, setSelectedCamId]);

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel fade-in">
        <div className="modal-header">
          <h2>Device Settings</h2>
          <button className="close-btn" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <p>Loading devices...</p>
          ) : (
            <>
              <div className="setting-group">
                <label>Microphone</label>
                <select 
                  className="device-select"
                  value={selectedMicId || ''} 
                  onChange={(e) => setSelectedMicId(e.target.value)}
                >
                  {microphones.map((mic) => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || `Microphone ${mic.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="setting-group">
                <label>Camera</label>
                <select 
                  className="device-select"
                  value={selectedCamId || ''} 
                  onChange={(e) => setSelectedCamId(e.target.value)}
                >
                  {cameras.map((cam) => (
                    <option key={cam.deviceId} value={cam.deviceId}>
                      {cam.label || `Camera ${cam.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="primary-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
