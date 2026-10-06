import { useEffect, useState } from "react";
import { getAgentSetupPrompt } from "./agentSetupPrompt";

// Resolve the origin after hydration so the copied endpoint always matches this deployment.
export function useAgentSetupPrompt() {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  return {
    origin,
    prompt: origin ? getAgentSetupPrompt(origin) : "",
  };
}
