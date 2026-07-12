export interface RewardDef {
  title: string;
  description: string;
  cost: number;
  icon: string;
}

/** Starter reward shop — all customisable/editable by the player later. */
export const DEFAULT_REWARDS: RewardDef[] = [
  { title: "1 Hour Guilt-Free Gaming", description: "Play anything, zero guilt, timer optional.", cost: 40, icon: "gamepad" },
  { title: "Movie Night", description: "Watch a full movie of your choice.", cost: 70, icon: "film" },
  { title: "Favourite Food Order", description: "Order the meal you've been craving.", cost: 90, icon: "utensils" },
  { title: "Rest Evening", description: "A fully unscheduled evening. Do nothing.", cost: 60, icon: "moon" },
  { title: "Small Gaming Item", description: "Buy a small in-game or desk item.", cost: 150, icon: "package" },
  { title: "Buy a Game", description: "Purchase a new game you want.", cost: 400, icon: "shopping-bag" },
  { title: "Gear Upgrade", description: "Upgrade a piece of your gaming/desk setup.", cost: 900, icon: "cpu" },
];
