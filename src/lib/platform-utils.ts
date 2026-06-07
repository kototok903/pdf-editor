type Platform = "linux" | "mac" | "unknown" | "windows";

type PlatformInfo = {
  isMobile: boolean;
  platform: Platform;
  userAgent: string;
};

type PlatformSymbols = {
  alt: string;
  cmd: string;
  command: string;
  control: string;
  ctrl: string;
  meta: string;
  mod: string;
  option: string;
  shift: string;
  super: string;
};

function getPlatformInfo(userAgent = getNavigatorUserAgent()): PlatformInfo {
  return {
    isMobile: detectMobile(userAgent),
    platform: detectPlatform(userAgent),
    userAgent,
  };
}

function getPlatformSymbols(platform = getPlatformInfo().platform) {
  if (platform === "mac") {
    return macPlatformSymbols;
  }

  if (platform === "windows") {
    return windowsPlatformSymbols;
  }

  return linuxPlatformSymbols;
}

function isPlatformModKey(event: { ctrlKey: boolean; metaKey: boolean }) {
  return getPlatformInfo().platform === "mac" ? event.metaKey : event.ctrlKey;
}

function detectPlatform(userAgent: string): Platform {
  const normalizedUserAgent = userAgent.toLowerCase();

  if (normalizedUserAgent.includes("mac")) {
    return "mac";
  }

  if (normalizedUserAgent.includes("win")) {
    return "windows";
  }

  if (normalizedUserAgent.includes("linux")) {
    return "linux";
  }

  return "unknown";
}

function detectMobile(userAgent: string) {
  const normalizedUserAgent = userAgent.toLowerCase();

  return (
    normalizedUserAgent.includes("mobile") ||
    normalizedUserAgent.includes("android") ||
    normalizedUserAgent.includes("iphone") ||
    normalizedUserAgent.includes("ipad") ||
    normalizedUserAgent.includes("ipod")
  );
}

function getNavigatorUserAgent() {
  return typeof navigator === "undefined" ? "" : navigator.userAgent;
}

const macPlatformSymbols: PlatformSymbols = {
  alt: "⌥",
  cmd: "⌘",
  command: "⌘",
  control: "⌃",
  ctrl: "⌃",
  meta: "⌘",
  mod: "⌘",
  option: "⌥",
  shift: "⇧",
  super: "⌘",
};

const windowsPlatformSymbols: PlatformSymbols = {
  alt: "Alt",
  cmd: "⊞",
  command: "⊞",
  control: "Ctrl",
  ctrl: "Ctrl",
  meta: "⊞",
  mod: "Ctrl",
  option: "Alt",
  shift: "Shift",
  super: "⊞",
};

const linuxPlatformSymbols: PlatformSymbols = {
  alt: "Alt",
  cmd: "Super",
  command: "Super",
  control: "Ctrl",
  ctrl: "Ctrl",
  meta: "Super",
  mod: "Ctrl",
  option: "Alt",
  shift: "Shift",
  super: "Super",
};

export {
  detectMobile,
  detectPlatform,
  getPlatformInfo,
  getPlatformSymbols,
  isPlatformModKey,
  type Platform,
  type PlatformInfo,
  type PlatformSymbols,
};
