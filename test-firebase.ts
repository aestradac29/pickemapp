import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
try {
  initializeApp({ apiKey: undefined, projectId: undefined, appId: undefined } as any);
  console.log("Init success");
  getAuth();
  console.log("Auth success");
} catch (e: any) {
  console.error(e.message);
}
