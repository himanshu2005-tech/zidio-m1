import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import pkg from 'agora-token';
const { RtcTokenBuilder, RtcRole, RtmTokenBuilder } = pkg;

function agoraTokenServer() {
  return {
    name: 'agora-token-server',
    configureServer(server) {
      server.middlewares.use('/api/token', (req, res) => {
        // Load env variables (Vite doesn't load them automatically in middlewares)
        const env = loadEnv(server.config.mode, process.cwd(), '');
        const appId = env.VITE_AGORA_APP_ID;
        const appCert = env.VITE_AGORA_APP_CERTIFICATE;
        
        if (!appId || !appCert) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing VITE_AGORA_APP_ID or VITE_AGORA_APP_CERTIFICATE in .env' }));
          return;
        }

        const url = new URL(req.url, 'http://localhost');
        const channelName = url.searchParams.get('channel');
        const uidStr = url.searchParams.get('uid');
        
        if (!channelName || !uidStr) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Missing channel or uid query parameters' }));
          return;
        }

        const expirationTimeInSeconds = 3600;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

        try {
          const rtcToken = RtcTokenBuilder.buildTokenWithUid(
            appId, 
            appCert, 
            channelName, 
            parseInt(uidStr, 10), 
            RtcRole.PUBLISHER, 
            privilegeExpiredTs, 
            privilegeExpiredTs
          );

          const rtmToken = RtmTokenBuilder.buildToken(
            appId,
            appCert,
            uidStr,
            privilegeExpiredTs
          );
          
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ rtcToken, rtmToken }));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), agoraTokenServer()],
  server: { port: 5173 },
});