import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

if (import.meta.env.DEV) {
  // Debug/e2e handle — never shipped in production builds
  Promise.all([import("./store/game"), import("./store/ui"), import("./game/createGame")]).then(
    ([g, u, c]) => {
      (window as unknown as Record<string, unknown>).__lexoria = {
        useGame: g.useGame,
        useUi: u.useUi,
        game: c.currentGame,
      };
    },
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
