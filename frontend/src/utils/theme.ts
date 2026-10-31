import { theme } from "./constants";
import "ace-builds";
import { themesByName } from "ace-builds/src-noconflict/ext-themelist";

export const getTheme = (): UserTheme => {
  return (document.documentElement.className as UserTheme) || theme;
};

export const setTheme = (newTheme: UserTheme) => {
  const html = document.documentElement;
  if (!newTheme) {
    html.className = getMediaPreference();
  } else {
    html.className = newTheme;
  }
  try {
    localStorage.setItem("theme", newTheme);
  } catch (e) {
    // ignore localstorage errors
  }
};

export const toggleTheme = (): void => {
  const activeTheme = getTheme();
  if (activeTheme === "light") {
    setTheme("dark");
  } else {
    setTheme("light");
  }
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
  } else if (getTheme() === "dark") {
    return "ace/theme/twilight";
  } else {
    return "ace/theme/chrome";
  }
};

/**
 * Automatically sync theme from parent OSM container when embedded in an iframe,
 * or from shared localStorage / storage events / postMessage.
 */
export const syncThemeFromParent = (): boolean => {
  let isEmbedded = false;
  try {
    if (window.self !== window.top && window.parent) {
      isEmbedded = true;
      const parentDoc = window.parent.document;
      if (parentDoc && parentDoc.documentElement) {
        const parentHtml = parentDoc.documentElement;
        const applyFromParent = () => {
          let parentTheme = "";
          try {
            parentTheme = (window.parent.localStorage?.getItem("theme") || "").toLowerCase();
          } catch (err) {
            // cross-origin localStorage access fallback
          }
          const isDark =
            parentHtml.classList.contains("dark") ||
            parentTheme.includes("dark");

          setTheme(isDark ? "dark" : "light");
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
    }
  } catch (e) {
    // Cross-origin restriction fallback
  }

  // Cross-origin or same-origin postMessage listener
  window.addEventListener("message", (event) => {
    try {
      if (!event.data) return;
      const dataStr =
        typeof event.data === "string"
          ? event.data
          : event.data.theme || event.data.type || "";
      const lower = String(dataStr).toLowerCase();
      if (lower.includes("dark")) {
        setTheme("dark");
      } else if (lower.includes("light")) {
        setTheme("light");
      }
    } catch (err) {
      // ignore
    }
  });

  // Storage listener (syncs across tabs or iframe on same domain)
  window.addEventListener("storage", (event) => {
    if (event.key === "theme" && event.newValue) {
      const lower = event.newValue.toLowerCase();
      setTheme(lower.includes("dark") ? "dark" : "light");
    }
  });

  // Check saved theme in localStorage
  try {
    const saved = localStorage.getItem("theme");
    if (saved && !isEmbedded) {
      setTheme(saved.toLowerCase().includes("dark") ? "dark" : "light");
      return true;
    }
  } catch (e) {
    // ignore
  }

  return isEmbedded;
};
