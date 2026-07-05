import AgoraRTM from 'agora-rtm-sdk';
import { db } from '../config/firebase';
import { collection, setDoc, doc, serverTimestamp, arrayUnion } from 'firebase/firestore';

const APP_ID = import.meta.env.VITE_AGORA_APP_ID;

export class TranscriptChannel {
  constructor({ channelName, uid, localName, rtmToken, onRemoteLine, onRemoteInterim }) {
    this.channelName = channelName;
    this.uid = String(uid); // RTM expects a string UID
    this.localName = localName;
    this.rtmToken = rtmToken;
    this.onRemoteLine = onRemoteLine;
    this.onRemoteInterim = onRemoteInterim;
    this.client = null;
    this.channel = null;
  }

  async connect() {
    if (!APP_ID) {
      console.error('Agora APP ID not provided for RTM.');
      return;
    }
    this.client = AgoraRTM.createInstance(APP_ID);

    await this.client.login({ uid: this.uid, token: this.rtmToken });

    if (this.localName) {
      await this.client.addOrUpdateLocalUserAttributes({ name: this.localName }).catch(err => 
        console.warn('Failed to set local user attributes:', err)
      );
    }

    this.channel = this.client.createChannel(this.channelName);
    
    this.channel.on('ChannelMessage', (message, memberId) => {
      if (message.text) {
        try {
          const data = JSON.parse(message.text);
          if (data.type === 'interim') {
            if (this.onRemoteInterim) {
              this.onRemoteInterim(data.line);
            }
          } else {
            if (this.onRemoteLine) {
              this.onRemoteLine(data);
            }
          }
        } catch (err) {
          console.error('Failed to parse incoming transcript line', err);
        }
      }
    });

    await this.channel.join();
  }

  async getUserName(uid) {
    if (!this.client) return null;
    try {
      const attrs = await this.client.getUserAttributes(String(uid));
      return attrs?.name || null;
    } catch (err) {
      console.warn('Failed to fetch user attributes for', uid, err);
      return null;
    }
  }

  async sendLine(line) {
    if (this.channel) {
      await this.channel.sendMessage({ text: JSON.stringify(line) });
    }
  }

  async sendInterim(line) {
    if (this.channel) {
      await this.channel.sendMessage({ text: JSON.stringify({ type: 'interim', line }) }).catch(() => {});
    }
  }



  async disconnect() {
    if (this.channel) {
      await this.channel.leave();
    }
    if (this.client) {
      await this.client.logout();
    }
  }
}

export async function saveTranscript(channelName, transcriptLines, userId) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const meetingDocId = `${channelName}_${today}`;
    
    await setDoc(doc(db, 'transcripts', meetingDocId), {
      channelName,
      lines: transcriptLines, // The latest participant to leave overwrites the lines, ensuring the most complete record
      participantIds: arrayUnion(userId || 'unknown'),
      createdAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Error saving transcript:', error);
    throw error;
  }
}

export function transcriptToText(transcriptLines) {
  return transcriptLines.map((line) => `${line.speaker}: ${line.text}`).join('\n');
}
