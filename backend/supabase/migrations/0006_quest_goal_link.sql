-- 0006: personalized quest engine — goal linkage.
--
-- quests.main_quest_stage_id already exists (Prisma port); this adds the
-- number of progress units a synthesized goal quest logs on that stage when
-- completed (wired in quest.service.completeQuest). Template quests keep 0.

alter table quests
  add column stage_units integer not null default 0;

create index idx_quests_stage on quests (main_quest_stage_id)
  where main_quest_stage_id is not null;
