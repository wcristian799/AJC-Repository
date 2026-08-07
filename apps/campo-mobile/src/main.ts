import { App } from "@capacitor/app";
import { Network } from "@capacitor/network";
import { Device } from "@capacitor/device";

document.documentElement.style.cssText="color-scheme:dark;background:#09090b;color:#f4f0ea;font:16px system-ui";
document.body.style.cssText="margin:0;min-height:100vh;display:grid;place-items:center;text-align:center";
Promise.all([Network.getStatus(),Device.getInfo()]).then(([network,device])=>{
  window.localStorage.setItem("ajc.campo.native.v1",JSON.stringify({native:true,connected:network.connected,platform:device.platform,model:device.model}));
});
App.addListener("appUrlOpen",({url})=>{const parsed=new URL(url);if(parsed.pathname.startsWith("/campo"))window.location.assign(url);});
