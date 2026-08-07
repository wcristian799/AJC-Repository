import type { CapacitorConfig } from "@capacitor/cli";

const campoUrl=process.env.AJC_CAMPO_URL?.trim()||"https://ajcmvp.vercel.app/campo/login";
if(!/^https:\/\//.test(campoUrl)) throw new Error("AJC_CAMPO_URL deve usar HTTPS");
const config:CapacitorConfig={
  appId:"com.ajctransportes.campo",
  appName:"AJC Campo",
  webDir:"dist",
  server:{url:campoUrl,cleartext:false,allowNavigation:[new URL(campoUrl).hostname]},
  android:{allowMixedContent:false},
  plugins:{Camera:{saveToGallery:false},SplashScreen:{launchAutoHide:true,backgroundColor:"#09090b"}},
};
export default config;
