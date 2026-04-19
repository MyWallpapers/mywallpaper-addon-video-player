import { jsx as s, jsxs as M } from "react/jsx-runtime";
import { useRef as w, useState as g, useMemo as A, useEffect as d } from "react";
import { useFiles as U, useSettings as I, useViewport as L } from "@mywallpaper/sdk-react";
const F = {
  sourceType: "file",
  videoUrl: "",
  autoplay: !0,
  loop: !0,
  muted: !0,
  showControls: !1,
  clickToTogglePlayback: !0,
  playbackRate: 1,
  volume: 100,
  startAtSeconds: 0,
  preload: "metadata",
  objectFit: "contain",
  borderRadius: 24,
  backgroundColor: "#0C0C0D"
}, $ = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
  ogg: "video/ogg",
  mov: "video/quicktime",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo"
};
function N(o) {
  return { ...F, ...o };
}
function y(o) {
  const l = o.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(l)) return l;
  if (/^#[0-9a-fA-F]{3}$/.test(l)) {
    const [, e, c, a] = l;
    return `#${e}${e}${c}${c}${a}${a}`;
  }
  return F.backgroundColor;
}
function j(o) {
  const l = o.split(".").pop()?.toLowerCase().split("?")[0] ?? "";
  return $[l] ?? "";
}
function q() {
  const o = U(), l = I(), e = N(l), c = L(), a = w(null), n = w(null), [T, m] = g(null), [h, u] = g(null), [E, f] = g(!1), i = e.sourceType === "url" ? e.videoUrl.trim() : T, b = A(() => i ? j(i) : "", [i]), p = !!i, C = Math.max(0, Math.min(48, e.borderRadius));
  d(() => {
    if (e.sourceType !== "file") {
      n.current && (o.release(n.current), n.current = null), m(null);
      return;
    }
    let t = !1;
    return u(null), o.request("videoFile").then((r) => {
      if (t) {
        r && o.release(r);
        return;
      }
      n.current && n.current !== r && o.release(n.current), n.current = r, m(r);
    }).catch((r) => {
      t || (m(null), u(r instanceof Error ? r.message : "Unable to load local file"));
    }), () => {
      t = !0;
    };
  }, [o, e.sourceType]), d(() => () => {
    n.current && (o.release(n.current), n.current = null);
  }, [o]), d(() => {
    const t = a.current;
    t && (t.muted = e.muted, t.loop = e.loop, t.controls = e.showControls, t.playbackRate = e.playbackRate, t.volume = Math.max(0, Math.min(1, e.volume / 100)));
  }, [e.loop, e.muted, e.playbackRate, e.showControls, e.volume, i]), d(() => {
    const t = a.current;
    if (!t) return;
    const r = () => {
      f(!0), e.startAtSeconds > 0 && Number.isFinite(t.duration) && (t.currentTime = Math.min(e.startAtSeconds, Math.max(0, t.duration || e.startAtSeconds)));
    }, S = () => {
      u("This video format is not supported here"), f(!1);
    };
    return t.addEventListener("loadedmetadata", r), t.addEventListener("error", S), () => {
      t.removeEventListener("loadedmetadata", r), t.removeEventListener("error", S);
    };
  }, [e.startAtSeconds, i]), d(() => {
    const t = a.current;
    !t || !p || (f(!1), u(null), e.autoplay ? t.play().catch(() => {
    }) : t.pause());
  }, [p, e.autoplay, i]);
  const x = () => {
    if (!e.clickToTogglePlayback) return;
    const t = a.current;
    if (!(!t || !p)) {
      if (t.paused) {
        t.play().catch(() => {
        });
        return;
      }
      t.pause();
    }
  }, v = {
    width: "100%",
    height: "100%",
    padding: 0,
    margin: 0,
    overflow: "hidden",
    position: "relative",
    borderRadius: C,
    background: y(e.backgroundColor),
    display: "grid",
    placeItems: "center"
  }, k = {
    width: "100%",
    height: "100%",
    display: "grid",
    placeItems: "center",
    padding: 20,
    textAlign: "center",
    color: "#F4F4F5",
    background: y(e.backgroundColor),
    fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
    fontSize: c.width < 360 ? 14 : 15,
    lineHeight: 1.4
  }, R = {
    width: "100%",
    height: "100%",
    objectFit: e.objectFit,
    display: "block",
    background: y(e.backgroundColor)
  };
  return h ? /* @__PURE__ */ s("div", { style: v, children: /* @__PURE__ */ s("div", { style: k, children: h }) }) : p ? /* @__PURE__ */ M("div", { style: v, onClick: x, children: [
    /* @__PURE__ */ s(
      "video",
      {
        ref: a,
        src: i ?? void 0,
        style: R,
        autoPlay: e.autoplay,
        loop: e.loop,
        muted: e.muted,
        controls: e.showControls,
        playsInline: !0,
        preload: e.preload,
        children: b ? /* @__PURE__ */ s("source", { src: i ?? void 0, type: b }) : null
      }
    ),
    !E && !e.showControls ? /* @__PURE__ */ s(
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
          fontSize: c.width < 360 ? 14 : 15,
          pointerEvents: "none"
        },
        children: "Loading video"
      }
    ) : null
  ] }) : /* @__PURE__ */ s("div", { style: v, children: /* @__PURE__ */ s("div", { style: k, children: e.sourceType === "file" ? "Select a local video file" : "Enter a direct video URL" }) });
}
export {
  q as default
};
