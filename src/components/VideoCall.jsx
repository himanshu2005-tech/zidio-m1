import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAgoraClient } from '../hooks/useAgoraClient';
import { useSpeechTranscription } from '../hooks/useSpeechTranscription';
import { TranscriptChannel, saveTranscript, transcriptToText } from '../services/transcriptService';
import ParticipantVideo from './ParticipantVideo';
import TranscriptPanel from './TranscriptPanel';
import PreJoinLobby from './PreJoinLobby';

export default function VideoCall({ channelName, user, onLeave }) {
  const uidNumeric = useRef(Math.floor(Math.random() * 1_000_000)).current;
  const [tokens, setTokens] = useState(null);
  const [tokenError, setTokenError] = useState(null);
  
  const [preJoinComplete, setPreJoinComplete] = useState(false);
  const [deviceSettings, setDeviceSettings] = useState(null);

  useEffect(() => {
    async function fetchTokens() {
      try {
        const res = await fetch(`/api/token?channel=${channelName}&uid=${uidNumeric}`);
        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setTokens(data);
      } catch (error) {
        console.error('Failed to fetch tokens', error);
        setTokenError(error.message);
      }
    }
    fetchTokens();
  }, [channelName, uidNumeric]);

  const {
    client,
    localVideoTrack,
    remoteUsers,
    joined,
    micOn,
    camOn,
    screenOn,
    error,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    leaveCall,
  } = useAgoraClient({ 
    channelName, 
    uid: uidNumeric, 
    rtcToken: preJoinComplete ? tokens?.rtcToken : null,
    initialMicOn: deviceSettings ? deviceSettings.micOn : true,
    initialCamOn: deviceSettings ? deviceSettings.camOn : true,
    microphoneId: deviceSettings ? deviceSettings.selectedMicId : null,
    cameraId: deviceSettings ? deviceSettings.selectedCamId : null,
  });

  const [transcriptLines, setTranscriptLines] = useState([]);
  const transcriptChannelRef = useRef(null);
  const [participantNames, setParticipantNames] = useState({});
  const [remoteLiveTexts, setRemoteLiveTexts] = useState({});

  // Set up the RTM side-channel for broadcasting captions once we've joined.
  useEffect(() => {
    if (!joined || !tokens?.rtmToken) return;
    const tc = new TranscriptChannel({
      channelName,
      uid: uidNumeric,
      localName: user.displayName || 'You',
      rtmToken: tokens.rtmToken,
      onRemoteLine: (line) => {
        setTranscriptLines((prev) => [...prev, line]);
        setRemoteLiveTexts((prev) => {
          const next = { ...prev };
          delete next[line.speaker];
          return next;
        });
      },
      onRemoteInterim: (line) => {
        if (line.text) {
          setRemoteLiveTexts((prev) => ({ ...prev, [line.speaker]: line.text }));
        } else {
          setRemoteLiveTexts((prev) => {
            const next = { ...prev };
            delete next[line.speaker];
            return next;
          });
        }
      }
    });
    transcriptChannelRef.current = tc;
    tc.connect().catch((err) => console.error('RTM connect failed', err));

    return () => {
      tc.disconnect().catch(() => {});
      transcriptChannelRef.current = null;
    };
  }, [joined, channelName, uidNumeric, tokens, user.displayName]);

  useEffect(() => {
    const tc = transcriptChannelRef.current;
    if (!tc) return;
    
    const interval = setInterval(() => {
      remoteUsers.forEach(u => {
        if (!participantNames[u.uid]) {
          tc.getUserName(u.uid).then(name => {
            if (name) setParticipantNames(prev => ({ ...prev, [u.uid]: name }));
          });
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [remoteUsers, participantNames]);

  // Continuously sync the meeting transcript to Firestore in real-time
  useEffect(() => {
    if (joined) {
      saveTranscript(channelName, transcriptLines, user.uid).catch(err => 
        console.error('Continuous sync failed:', err)
      );
    }
  }, [joined, transcriptLines, channelName, user.uid]);

  const handleFinalLine = useCallback((line) => {
    setTranscriptLines((prev) => [...prev, line]);
    transcriptChannelRef.current?.sendLine(line).catch((err) =>
      console.error('Failed to broadcast transcript line', err)
    );
  }, []);

  const { liveText, isSupported, error: transcriptError } = useSpeechTranscription({
    enabled: joined && micOn,
    speakerName: user.displayName || 'You',
    onFinalLine: handleFinalLine,
    onInterimLine: (line) => {
      transcriptChannelRef.current?.sendInterim(line).catch(console.error);
    }
  });

  const handleLeave = async () => {
    try {
      const finalLines = [...transcriptLines];
      if (liveText) {
        finalLines.push({ speaker: user.displayName || 'You', text: liveText });
      }
      await saveTranscript(channelName, finalLines, user.uid);
    } catch (err) {
      console.error('Failed to save transcript', err);
    }
    await leaveCall();
    onLeave();
  };

  if (tokenError) {
    return (
      <div className="call-screen">
        <div className="call-main">
          <div className="call-error">
            <p>Failed to generate Agora Token: {tokenError}</p>
            <button className="leave-btn" onClick={handleLeave}>Go Back</button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="call-error">
        <p>{error}</p>
        <button onClick={onLeave}>Back</button>
      </div>
    );
  }

  if (!preJoinComplete) {
    return (
      <PreJoinLobby 
        onJoin={(settings) => {
          setDeviceSettings(settings);
          setPreJoinComplete(true);
        }} 
        onCancel={onLeave} 
      />
    );
  }

  return (
    <div className="call-screen">
      <div className="call-main">
        <div className="video-grid">
          <ParticipantVideo 
            videoTrack={localVideoTrack} 
            label={`${user.displayName || 'You'} (You)`} 
            muted={!micOn} 
          />
          {remoteUsers.map((u) => (
            <ParticipantVideo 
              key={u.uid} 
              videoTrack={u.videoTrack} 
              label={participantNames[u.uid] || `Participant ${u.uid}`} 
            />
          ))}
        </div>

        <div className="call-controls-glass">
          <button className={`control-btn ${!micOn ? 'off' : ''}`} onClick={toggleMic} title={micOn ? 'Mute' : 'Unmute'}>
            {micOn ? (
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M128,176a48.05,48.05,0,0,0,48-48V64a48,48,0,0,0-96,0v64A48.05,48.05,0,0,0,128,176ZM96,64a32,32,0,0,1,64,0v64a32,32,0,0,1-64,0Zm104,64a8,8,0,0,1-16,0,56,56,0,0,1-112,0,8,8,0,0,1-16,0,72.08,72.08,0,0,0,64,71.49V232a8,8,0,0,0,16,0V199.49A72.08,72.08,0,0,0,200,128Z"></path></svg>
            ) : (
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M213.92,211.28l-40.42-44.1A71.9,71.9,0,0,0,192,128a8,8,0,0,0-16,0,56.12,56.12,0,0,1-8.52,29.83L142,129.93A47.88,47.88,0,0,0,176,88V64a48,48,0,0,0-96,0V88a47.8,47.8,0,0,0,5.77,22.61L42.08,44.72a8,8,0,0,0-11.76,10.84l176,192a8,8,0,0,0,11.76-10.84ZM96,64a32,32,0,0,1,64,0V88a31.81,31.81,0,0,1-23.77,31L96,75.05Zm-16,64a8,8,0,0,0-16,0,72.08,72.08,0,0,0,56,70.52V232a8,8,0,0,0,16,0V211.83a71.69,71.69,0,0,0,26.46-7.8l-12-13.06A56.24,56.24,0,0,1,136,192,56,56,0,0,1,80,128Z"></path></svg>
            )}
          </button>
          <button className={`control-btn ${!camOn ? 'off' : ''}`} onClick={toggleCam} title={camOn ? 'Turn off camera' : 'Turn on camera'}>
            {camOn ? (
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M216,72H182.26l-11.45-22.92A15.93,15.93,0,0,0,156.49,40H99.51a15.93,15.93,0,0,0-14.32,9.08L73.74,72H40A16,16,0,0,0,24,88V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72ZM99.51,56h57L164.49,72H91.51ZM216,200H40V88H216ZM128,96a52,52,0,1,0,52,52A52.06,52.06,0,0,0,128,96Zm0,88a36,36,0,1,1,36-36A36,36,0,0,1,128,184Z"></path></svg>
            ) : (
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M213.92,211.28l-37-40.42V176a32,32,0,0,1-32,32H56a32,32,0,0,1-32-32V80A32,32,0,0,1,37.33,54L42.08,44.72a8,8,0,0,0-11.76-10.84l176,192a8,8,0,0,0,11.76-10.84ZM40,80v96a16,16,0,0,0,16,16H144.93L40.23,77.7A15.82,15.82,0,0,0,40,80ZM143.74,40a15.93,15.93,0,0,1,12.75,9.08L167.94,72H200a16,16,0,0,1,16,16v88a15.91,15.91,0,0,1-1.63,7L80.64,40Z"></path></svg>
            )}
          </button>
          <button className={`control-btn ${screenOn ? 'active' : ''}`} onClick={toggleScreenShare} title={screenOn ? 'Stop sharing screen' : 'Share screen'}>
            {screenOn ? (
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40H40A16,16,0,0,0,24,56V176a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,136H40V56H216V176ZM165.66,90.34a8,8,0,0,1,0,11.32l-26.35,26.34H152a8,8,0,0,1,0,16H104a8,8,0,0,1-8-8V88a8,8,0,0,1,16,0v12.69l26.34-26.35A8,8,0,0,1,165.66,90.34Z"></path></svg>
            ) : (
              <svg width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M216,40H40A16,16,0,0,0,24,56V176a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm0,136H40V56H216V176ZM165.66,90.34a8,8,0,0,1,0,11.32l-26.35,26.34H152a8,8,0,0,1,0,16H104a8,8,0,0,1-8-8V88a8,8,0,0,1,16,0v12.69l26.34-26.35A8,8,0,0,1,165.66,90.34Z"></path></svg>
            )}
          </button>
          <button className="control-btn leave-btn" onClick={handleLeave} title="Leave Call">
            <svg width="24" height="24" fill="currentColor" viewBox="0 0 256 256"><path d="M234.34,142.66l-44,44a8,8,0,0,1-11.32-11.32l30.35-30.34-60.5-23.53a8,8,0,0,1,4.32-15l64,24A8,8,0,0,1,234.34,142.66ZM24,112V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V176a8,8,0,0,0-16,0v24H40V112H216v24a8,8,0,0,0,16,0V112a16,16,0,0,0-16-16H182.26l-11.45-22.92A15.93,15.93,0,0,0,156.49,64H99.51a15.93,15.93,0,0,0-14.32,9.08L73.74,96H40A16,16,0,0,0,24,112Zm67.51-22.92a15.93,15.93,0,0,1,14.32-9.08h44.34a15.93,15.93,0,0,1,14.32,9.08L171.74,104H84.26ZM128,120a40,40,0,1,0,40,40A40,40,0,0,0,128,120Zm0,64a24,24,0,1,1,24-24A24,24,0,0,1,128,184Z"></path></svg>
          </button>
        </div>
      </div>

      <TranscriptPanel
        lines={transcriptLines}
        liveText={liveText}
        speakerName={user.displayName || 'You'}
        isSupported={isSupported}
        remoteLiveTexts={remoteLiveTexts}
        error={transcriptError}
      />
    </div>
  );
}