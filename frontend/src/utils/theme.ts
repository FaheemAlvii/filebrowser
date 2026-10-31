import { theme, isEmbedded } from "./constants";
import "ace-builds";
import { themesByName } from "ace-builds/src-noconflict/ext-themelist";

const THEME_CLASSES = ["dark", "light", "corporate", "minimal", "vibrant"];

export const getTheme = (): UserTheme => {
  return (document.documentElement.className as UserTheme) || theme;
};

export const applyThemeClasses = (classes: string[] | DOMTokenList, themeName?: string) => {
  const html = document.documentElement;
  const wasEmbedded = html.classList.contains("embedded") || isEmbedded;

  THEME_CLASSES.forEach((cls) => html.classList.remove(cls));

  const classList = Array.from(classes);
  let hasDark = classList.includes("dark");
  let variant = "";

  for (const name of ["corporate", "minimal", "vibrant"]) {
    if (classList.includes(name)) {
      variant = name;
      break;
    }
  }

  if (themeName) {
    const lower = themeName.toLowerCase();
    if (lower.includes("dark")) hasDark = true;
    for (const name of ["corporate", "minimal", "vibrant"]) {
      if (lower.includes(name)) variant = name;
    }
  }

  if (variant) {
    html.classList.add(variant);
  }
  if (hasDark) {
    html.classList.add("dark");
  } else {
    html.classList.add("light");
  }

  if (wasEmbedded) {
    html.classList.add("embedded");
  }

  const compositeTheme = variant
    ? hasDark
      ? `${variant}-dark`
      : variant
    : hasDark
    ? "dark"
    : "light";

  try {
    localStorage.setItem("theme", compositeTheme);
  } catch (e) {
    // ignore
  }
};

export const setTheme = (newTheme: UserTheme) => {
  const html = document.documentElement;
  const wasEmbedded = html.classList.contains("embedded") || isEmbedded;

  THEME_CLASSES.forEach((cls) => html.classList.remove(cls));

  const lower = (newTheme || "").toLowerCase();
  let variant = "";
  for (const name of ["corporate", "minimal", "vibrant"]) {
    if (lower.includes(name)) variant = name;
  }
  const isDark = lower.includes("dark") || (!lower && getMediaPreference() === "dark");

  if (variant) html.classList.add(variant);
  if (isDark) html.classList.add("dark");
  else html.classList.add("light");

  if (wasEmbedded) html.classList.add("embedded");

  try {
    localStorage.setItem("theme", newTheme || (isDark ? "dark" : "light"));
  } catch (e) {
    // ignore
  }
};

export const toggleTheme = (): void => {
  const html = document.documentElement;
  const isDark = html.classList.contains("dark");
  let variant = "";
  for (const name of ["corporate", "minimal", "vibrant"]) {
    if (html.classList.contains(name)) variant = name;
  }

  const nextDark = !isDark;
  const nextTheme = variant ? (nextDark ? `${variant}-dark` : variant) : (nextDark ? "dark" : "light");
  setTheme(nextTheme);
};

export const getMediaPreference = (): UserTheme => {
  const hasDarkPreference = window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches;
  if (hasDarkPreference) {
    return "dark";
  } else {
    return "light";
  }
};

export const getEditorTheme = (themeName: string) => {
  if (!themeName.startsWith("ace/theme/")) {
    themeName = `ace/theme/${themeName}`;
  }
  const themeKey = themeName.replace("ace/theme/", "");
  if (themesByName[themeKey] !== undefined) {
    return themeName;
  } else if (document.documentElement.classList.contains("dark")) {
    return "ace/theme/twilight";
  } else {
    return "ace/theme/chrome";
  }
};

/**
 * Automatically sync all themes from parent OSM container when embedded in an iframe,
 * or from URL params / shared localStorage / postMessage.
 */
export const syncThemeFromParent = (): boolean => {
  const embedded = isEmbedded;
  const html = document.documentElement;
  if (embedded) {
    html.classList.add("embedded");
  }

  // 1. Check URL query param ?theme=... (works across all origins, protocols, and ports)
  try {
    const urlTheme = new URLSearchParams(window.location.search).get("theme");
    if (urlTheme) {
      setTheme(urlTheme);
    }
  } catch (e) {
    // ignore
  }

  // 2. Safe check if window.parent is same-origin before touching window.parent.document
  let canAccessParentDoc = false;
  try {
    if (window.self !== window.top && window.parent) {
      canAccessParentDoc = window.parent.location.origin === window.location.origin;
    }
  } catch (e) {
    canAccessParentDoc = false;
  }

  if (canAccessParentDoc) {
    try {
      const parentDoc = window.parent.document;
      if (parentDoc && parentDoc.documentElement) {
        const parentHtml = parentDoc.documentElement;
        const applyFromParent = () => {
          let parentTheme = "";
          try {
            parentTheme = (window.parent.localStorage?.getItem("theme") || "").toLowerCase();
          } catch (err) {
            // cross-origin localStorage fallback
          }
          applyThemeClasses(parentHtml.classList, parentTheme);
        };

        applyFromParent();

        // Observe class changes on parent <html> element in real-time
        const observer = new MutationObserver(() => {
          applyFromParent();
        });
        observer.observe(parentHtml, {
          attributes: true,
          attributeFilter: ["class"],
        });
      }
    } catch (e) {
      // Cross-origin restriction fallback
    }
  }

  // 3. PostMessage listener (works seamlessly across all origins, protocols, ports)
  window.addEventListener("message", (event) => {
    try {
      if (!event.data) return;
      const dataStr =
        typeof event.data === "string"
          ? event.data
          : event.data.theme || event.data.type || "";
      if (dataStr && !dataStr.startsWith("OSFM_")) {
        setTheme(dataStr);
      }
    } catch (err) {
      // ignore
    }
  });

  // Notify parent container that OSFM is ready to receive theme
  try {
    if (window.self !== window.top && window.parent) {
      window.parent.postMessage({ type: "OSFM_READY" }, "*");
    }
  } catch (e) {
    // ignore
  }

  // 4. Storage listener (syncs across tabs or iframe on same domain)
  window.addEventListener("storage", (event) => {
    if (event.key === "theme" && event.newValue) {
      setTheme(event.newValue);
    }
  });

  // 5. Check saved theme in localStorage
  try {
    const saved = localStorage.getItem("theme");
    if (saved && !embedded) {
      setTheme(saved);
      return true;
    }
  } catch (e) {
    // ignore
  }

  return embedded;
};
