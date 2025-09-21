import { StackServerApp } from "@stackframe/stack";
import { getConfig } from "./lib/config";

// Initialize Stack Auth conditionally
let stackServerApp: StackServerApp | null = null;

try {
  const config = getConfig();

  if (config.NEXT_PUBLIC_STACK_PROJECT_ID && config.STACK_SECRET_SERVER_KEY) {
    stackServerApp = new StackServerApp({
      tokenStore: "nextjs-cookie", // storing auth tokens in cookies
    });
    console.log('✅ Stack Auth initialized successfully');
  } else {
    console.warn('⚠️ Stack Auth not initialized - missing required environment variables');
    console.warn('Required: NEXT_PUBLIC_STACK_PROJECT_ID, STACK_SECRET_SERVER_KEY');
  }
} catch (error) {
  console.error('❌ Failed to initialize Stack Auth:', error);
  stackServerApp = null;
}

export { stackServerApp };