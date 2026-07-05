import { useEffect, useRef, useState, useCallback } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';

const APP_ID = import.meta.env.VITE_AGORA_APP_ID;
const TEMP_TOKEN = import.meta.env.VITE_AGORA_TEMP_TOKEN || null;

/**
 * Manages an Agora RTC connection: joins a channel, publishes the local
 * mic+camera, and keeps a live list of remote users' tracks so the UI
 * can render a tile per participant.
 */
export function useAgoraClient({ channelName, uid, rtcToken, initialMicOn = true, initialCamOn = true, microphoneId = null, cameraId = null }) {
  const clientRef = useRef(null);
  const localTracksRef = useRef({ audioTrack: null, videoTrack: null });

  const [localVideoTrack, setLocalVideoTrack] = useState(null);
  const [remoteUsers, setRemoteUsers] = useState([]);
  const [joined, setJoined] = useState(false);
  const [micOn, setMicOn] = useState(initialMicOn);
  const [camOn, setCamOn] = useState(initialCamOn);
  const [error, setError] = useState(null);

  const upsertRemoteUser = (uid, patch) => {
    setRemoteUsers((prev) => {
      const idx = prev.findIndex((u) => u.uid === uid);
      if (idx === -1) return [...prev, { uid, ...patch }];
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const removeRemoteUser = (uid) => {
    setRemoteUsers((prev) => prev.filter((u) => u.uid !== uid));
  };

  useEffect(() => {
    if (!channelName || !rtcToken) return;
    if (!APP_ID) {
      setError('Missing VITE_AGORA_APP_ID. Check your .env file.');
      return;
    }

    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    clientRef.current = client;
    let cancelled = false;

    const handleUserPublished = async (user, mediaType) => {
      console.log('Agora Event: user-published', user.uid, mediaType);
      await client.subscribe(user, mediaType);
      if (mediaType === 'video') {
        upsertRemoteUser(user.uid, { videoTrack: user.videoTrack });
      }
      if (mediaType === 'audio') {
        upsertRemoteUser(user.uid, { audioTrack: user.audioTrack });
        user.audioTrack.play();
      }
    };

    const handleUserUnpublished = (user, mediaType) => {
      console.log('Agora Event: user-unpublished', user.uid, mediaType);
      if (mediaType === 'video') {
        upsertRemoteUser(user.uid, { videoTrack: null });
      }
    };

    const handleUserLeft = (user) => {
      console.log('Agora Event: user-left', user.uid);
      removeRemoteUser(user.uid);
    };

    client.on('user-published', handleUserPublished);
    client.on('user-unpublished', handleUserUnpublished);
    client.on('user-left', handleUserLeft);
    client.on('user-joined', (user) => console.log('Agora Event: user-joined', user.uid));
    client.on('connection-state-change', (curState, revState, reason) => {
      console.log('Agora Connection State:', curState, 'Reason:', reason);
    });

    (async () => {
      try {
        console.log('Attempting to join channel:', channelName, 'with UID:', uid);
        await client.join(APP_ID, channelName, rtcToken, uid || null);
        console.log('Successfully joined channel!');
        
        let audioTrack = null;
        let videoTrack = null;

        if (initialMicOn) {
          try {
            audioTrack = await AgoraRTC.createMicrophoneAudioTrack(
              microphoneId ? { microphoneId } : undefined
            );
          } catch (err) {
            console.warn('Microphone not available:', err.message);
            setMicOn(false);
          }
        }

        if (initialCamOn) {
          try {
            videoTrack = await AgoraRTC.createCameraVideoTrack(
              cameraId ? { cameraId } : undefined
            );
          } catch (err) {
            console.warn('Camera not available:', err.message);
            setCamOn(false);
          }
        }

        if (cancelled) {
          audioTrack?.close();
          videoTrack?.close();
          return;
        }
        
        localTracksRef.current = { audioTrack, videoTrack };
        if (videoTrack) setLocalVideoTrack(videoTrack);
        
        const tracksToPublish = [audioTrack, videoTrack].filter(Boolean);
        if (tracksToPublish.length > 0) {
          console.log('Publishing local tracks...');
          await client.publish(tracksToPublish);
          console.log('Successfully published local tracks!');
        } else {
          console.log('Joined as viewer (no media tracks available).');
        }
        setJoined(true);
      } catch (err) {
        console.error('Agora join failed', err);
        setError(err.message || 'Failed to join the call.');
      }
    })();

    return () => {
      cancelled = true;
      client.off('user-published', handleUserPublished);
      client.off('user-unpublished', handleUserUnpublished);
      client.off('user-left', handleUserLeft);

      const { audioTrack, videoTrack } = localTracksRef.current;
      audioTrack?.close();
      videoTrack?.close();
      client.leave().catch(() => {});
      setJoined(false);
      setRemoteUsers([]);
    };
  }, [channelName, uid, rtcToken]);

  const toggleMic = useCallback(async () => {
    let track = localTracksRef.current.audioTrack;
    
    if (!track) {
      try {
        track = await AgoraRTC.createMicrophoneAudioTrack(
          microphoneId ? { microphoneId } : undefined
        );
        localTracksRef.current.audioTrack = track;
        if (clientRef.current && joined) {
          await clientRef.current.publish(track);
        }
        setMicOn(true);
      } catch (err) {
        console.warn('Failed to create mic track:', err);
        alert('Could not access microphone: ' + err.message);
      }
      return;
    }

    const next = !micOn;
    await track.setEnabled(next);
    setMicOn(next);
  }, [micOn, joined, microphoneId]);

  const toggleCam = useCallback(async () => {
    let track = localTracksRef.current.videoTrack;
    
    if (!track) {
      try {
        track = await AgoraRTC.createCameraVideoTrack(
          cameraId ? { cameraId } : undefined
        );
        localTracksRef.current.videoTrack = track;
        setLocalVideoTrack(track);
        if (clientRef.current && joined) {
          await clientRef.current.publish(track);
        }
        setCamOn(true);
      } catch (err) {
        console.warn('Failed to create cam track:', err);
        alert('Could not access camera: ' + err.message);
      }
      return;
    }

    const next = !camOn;
    await track.setEnabled(next);
    setCamOn(next);
  }, [camOn, joined, cameraId]);

  const screenTrackRef = useRef(null);
  const [screenOn, setScreenOn] = useState(false);

  const toggleScreenShare = useCallback(async () => {
    if (!clientRef.current || !joined) return;

    if (screenOn) {
      // Turn off screen share
      if (screenTrackRef.current) {
        await clientRef.current.unpublish(screenTrackRef.current).catch(() => {});
        screenTrackRef.current.close();
        screenTrackRef.current = null;
      }
      setScreenOn(false);

      // Restore camera if it was on
      const camTrack = localTracksRef.current.videoTrack;
      if (camOn && camTrack) {
        await clientRef.current.publish(camTrack).catch(() => {});
        setLocalVideoTrack(camTrack);
      } else {
        setLocalVideoTrack(null);
      }
    } else {
      // Turn on screen share
      try {
        // Use "disable" to ensure we only get a single video track, not an array of [video, audio]
        const screenTrack = await AgoraRTC.createScreenVideoTrack({ encoderConfig: "1080p_1" }, "disable");
        
        // Listen for the native "Stop Sharing" button
        screenTrack.on('track-ended', async () => {
          if (screenTrackRef.current) {
            await clientRef.current?.unpublish(screenTrackRef.current).catch(() => {});
            screenTrackRef.current.close();
            screenTrackRef.current = null;
          }
          setScreenOn(false);
          // Restore camera if it was on
          const camTrack = localTracksRef.current.videoTrack;
          if (camOn && camTrack) {
            await clientRef.current?.publish(camTrack).catch(() => {});
            setLocalVideoTrack(camTrack);
          } else {
            setLocalVideoTrack(null);
          }
        });

        screenTrackRef.current = screenTrack;
        
        // Unpublish camera to free the slot
        const camTrack = localTracksRef.current.videoTrack;
        if (camTrack && camOn) {
          await clientRef.current.unpublish(camTrack).catch(() => {});
        }

        await clientRef.current.publish(screenTrack).catch(() => {});
        setLocalVideoTrack(screenTrack);
        setScreenOn(true);
      } catch (err) {
        console.warn('Screen share failed:', err);
        // The user might have cancelled the screen share prompt
      }
    }
  }, [screenOn, joined, camOn]);

  const leaveCall = useCallback(async () => {
    const { audioTrack, videoTrack } = localTracksRef.current;
    audioTrack?.close();
    videoTrack?.close();
    if (screenTrackRef.current) {
      screenTrackRef.current.close();
      screenTrackRef.current = null;
    }
    await clientRef.current?.leave();
    setJoined(false);
    setScreenOn(false);
  }, []);

  return {
    client: clientRef.current,
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
    localAudioTrack: localTracksRef.current.audioTrack,
  };
}