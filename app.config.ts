export default defineAppConfig({
  appName: "AI Dungeon",
  appDescription: "",
  appVersion: "1.0.0",
  ui: {
    primary: "orange",
    gray: "neutral",
    notifications: {
      position: "top-0 right-0",
    },
    notification: {
      progress: {
        base: "absolute bottom-0 end-0 start-0 h-0",
        background: "bg-transparent dark:bg-transparent",
      },
    },
  },
});
