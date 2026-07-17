import { createApp } from "./app.js";
import { config } from "./config.js";
import { registerDailyQuestCron } from "./cron/daily-quests.js";
import { registerSchedulerCron } from "./cron/scheduler.js";
import { registerHealthPingCron } from "./cron/health-ping.js";

const app = createApp();

app.listen(config.PORT, () => {
  console.log(`ARISE//OS backend listening on :${config.PORT}`);
  if (config.CRON_ENABLED) {
    registerDailyQuestCron();
    registerSchedulerCron();
    registerHealthPingCron();
    console.log("Crons registered: daily quests (00:00 IST) + scheduler tick (minutely) + health-ping (every 14 min)");
  }
});
