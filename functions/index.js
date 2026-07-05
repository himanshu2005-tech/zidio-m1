const { onRequest } = require("firebase-functions/v2/https");
const { RtcTokenBuilder, RtcRole, RtmTokenBuilder } = require("agora-token");
const cors = require("cors")({ origin: true });

const APP_ID = "b1647d83feb54a45be816f2fa337ca1b";
const APP_CERTIFICATE = "d460fb7b528b4910983a33b308832b36";

exports.agoraToken = onRequest({ invoker: 'public', cors: true }, (req, res) => {
  cors(req, res, () => {
    try {
      const channelName = req.query.channel;
      const uid = req.query.uid;

      if (!channelName || !uid) {
        return res.status(400).json({ error: "Missing channel or uid parameter" });
      }

      if (!APP_ID || !APP_CERTIFICATE) {
        return res.status(500).json({ error: "Missing Agora App ID or Certificate" });
      }

      const expirationTimeInSeconds = 3600;
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

      const rtcToken = RtcTokenBuilder.buildTokenWithUid(
        APP_ID,
        APP_CERTIFICATE,
        channelName,
        parseInt(uid, 10),
        RtcRole.PUBLISHER,
        privilegeExpiredTs,
        privilegeExpiredTs
      );

      const rtmToken = RtmTokenBuilder.buildToken(
        APP_ID,
        APP_CERTIFICATE,
        uid,
        privilegeExpiredTs
      );

      res.status(200).json({ rtcToken, rtmToken });
    } catch (error) {
      console.error("Token generation failed:", error);
      res.status(500).json({ error: "Internal Server Error: " + error.message });
    }
  });
});
