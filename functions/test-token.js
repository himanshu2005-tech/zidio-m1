const { RtcTokenBuilder, RtmTokenBuilder, RtcRole, RtmRole } = require("agora-token");

try {
  const APP_ID = "b1647d83feb54a45be816f2fa337ca1b";
  const APP_CERTIFICATE = "d460fb7b528b4910983a33b308832b36";
  const channelName = "test";
  const uid = "123456";

  const role = RtcRole.PUBLISHER;
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  const rtcToken = RtcTokenBuilder.buildTokenWithUid(
    APP_ID,
    APP_CERTIFICATE,
    channelName,
    parseInt(uid, 10),
    role,
    privilegeExpiredTs
  );

  const rtmToken = RtmTokenBuilder.buildToken(
    APP_ID,
    APP_CERTIFICATE,
    uid,
    RtmRole.Rtm_User,
    privilegeExpiredTs
  );

  console.log({ rtcToken, rtmToken });
} catch (e) {
  console.error("ERROR:", e.message);
}
