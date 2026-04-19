import { jsx, jsxs } from "react/jsx-runtime";
import { useRef, useState, useMemo, useEffect } from "react";
import { useFiles, useSettings, useViewport } from "@mywallpaper/sdk-react";
const DEFAULT_SETTINGS = {
  sourceType: "file",
  videoUrl: "",
  autoplay: true,
  loop: true,
  muted: true,
  showControls: false,
  clickToTogglePlayback: true,
  playbackRate: 1,
  volume: 100,
  startAtSeconds: 0,
  preload: "metadata",
  objectFit: "contain",
  borderRadius: 24,
  backgroundColor: "#0C0C0D"
};
const MIME_BY_EXTENSION = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
  ogg: "video/ogg",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo"
};
function mergeSettings(raw) {
  return { ...DEFAULT_SETTINGS, ...raw };
}
function normalizeHex(value) {
  const trimmed = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed;
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    const [, r, g, b] = trimmed;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return DEFAULT_SETTINGS.backgroundColor;
}
function inferMimeType(url) {
  const ext = url.split(".").pop()?.toLowerCase().split("?")[0] ?? "";
  return MIME_BY_EXTENSION[ext] ?? "";
}
function VideoPlayer() {
  const files = useFiles();
  const rawSettings = useSettings();
  const settings = mergeSettings(rawSettings);
  const viewport = useViewport();
  const videoRef = useRef(null);
  const localUrlRef = useRef(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const sourceUrl = settings.sourceType === "url" ? settings.videoUrl.trim() : fileUrl;
  const sourceMimeType = useMemo(() => sourceUrl ? inferMimeType(sourceUrl) : "", [sourceUrl]);
  const hasSource = Boolean(sourceUrl);
  const radius = Math.max(0, Math.min(48, settings.borderRadius));
  useEffect(() => {
    if (settings.sourceType !== "file") {
      if (localUrlRef.current) {
        files.release(localUrlRef.current);
        localUrlRef.current = null;
      }
      setFileUrl(null);
      return;
    }
    let cancelled = false;
    setLoadError(null);
    void files.request("videoFile").then((url) => {
      if (cancelled) {
        if (url) files.release(url);
        return;
      }
      if (localUrlRef.current && localUrlRef.current !== url) files.release(localUrlRef.current);
      localUrlRef.current = url;
      setFileUrl(url);
    }).catch((error) => {
      if (cancelled) return;
      setFileUrl(null);
      setLoadError(error instanceof Error ? error.message : "Unable to load local file");
    });
    return () => {
      cancelled = true;
    };
  }, [files, settings.sourceType]);
  useEffect(() => {
    return () => {
      if (localUrlRef.current) {
        files.release(localUrlRef.current);
        localUrlRef.current = null;
      }
    };
  }, [files]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = settings.muted;
    video.loop = settings.loop;
    video.controls = settings.showControls;
    video.playbackRate = settings.playbackRate;
    video.volume = Math.max(0, Math.min(1, settings.volume / 100));
  }, [settings.loop, settings.muted, settings.playbackRate, settings.showControls, settings.volume, sourceUrl]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLoadedMetadata = () => {
      setIsReady(true);
      if (settings.startAtSeconds > 0 && Number.isFinite(video.duration)) {
        video.currentTime = Math.min(settings.startAtSeconds, Math.max(0, video.duration || settings.startAtSeconds));
      }
    };
    const onError = () => {
      setLoadError("This video format is not supported here");
      setIsReady(false);
    };
    video.addEventListener("loadedmetadata", onLoadedMetadata);
    video.addEventListener("error", onError);
    return () => {
      video.removeEventListener("loadedmetadata", onLoadedMetadata);
      video.removeEventListener("error", onError);
    };
  }, [settings.startAtSeconds, sourceUrl]);
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hasSource) return;
    setIsReady(false);
    setLoadError(null);
    if (settings.autoplay) {
      void video.play().catch(() => {
      });
    } else {
      video.pause();
    }
  }, [hasSource, settings.autoplay, sourceUrl]);
  const handleTogglePlayback = () => {
    if (!settings.clickToTogglePlayback) return;
    const video = videoRef.current;
    if (!video || !hasSource) return;
    if (video.paused) {
      void video.play().catch(() => {
      });
      return;
    }
    video.pause();
  };
  const wrapperStyle = {
    width: "100%",
    height: "100%",
    padding: 0,
    margin: 0,
    overflow: "hidden",
    borderRadius: radius,
    background: normalizeHex(settings.backgroundColor),
    display: "grid",
    placeItems: "center"
  };
  const emptyStateStyle = {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
    padding: 20,
    textAlign: "center",
    color: "#F4F4F5",
    background: normalizeHex(settings.backgroundColor),
    fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
    fontSize: viewport.width < 360 ? 14 : 15,
    lineHeight: 1.4
  };
  const videoStyle = {
    width: "100%",
    height: "100%",
    objectFit: settings.objectFit,
    display: "block",
    background: normalizeHex(settings.backgroundColor)
  };
  if (loadError) {
    return /* @__PURE__ */ jsx("div", { style: wrapperStyle, children: /* @__PURE__ */ jsx("div", { style: emptyStateStyle, children: loadError }) });
  }
  if (!hasSource) {
    return /* @__PURE__ */ jsx("div", { style: wrapperStyle, children: /* @__PURE__ */ jsx("div", { style: emptyStateStyle, children: settings.sourceType === "file" ? "Select a local video file" : "Enter a direct video URL" }) });
  }
  return /* @__PURE__ */ jsxs("div", { style: wrapperStyle, onClick: handleTogglePlayback, children: [
    /* @__PURE__ */ jsx(
      "video",
      {
        ref: videoRef,
        src: sourceUrl ?? void 0,
        style: videoStyle,
        autoPlay: settings.autoplay,
        loop: settings.loop,
        muted: settings.muted,
        controls: settings.showControls,
        playsInline: true,
        preload: settings.preload,
        children: sourceMimeType ? /* @__PURE__ */ jsx("source", { src: sourceUrl ?? void 0, type: sourceMimeType }) : null
      }
    ),
    !isReady && !settings.showControls ? /* @__PURE__ */ jsx(
      "div",
      {
        style: {
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          background: "rgba(0, 0, 0, 0.2)",
          color: "#F4F4F5",
          fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
          fontSize: viewport.width < 360 ? 14 : 15,
          pointerEvents: "none"
        },
        children: "Loading video"
      }
    ) : null
  ] });
}
export {
  VideoPlayer as default
};
//# sourceMappingURL=index.js.map
