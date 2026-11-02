"use client";

import { useMemo } from "react";

export default function InventoryQrCode({ equipmentId, qrCodeId, equipmentName }) {
  const itemUrl = useMemo(() => {
    if (typeof window === "undefined" || !qrCodeId) return "";
    return new URL(`/Inventory/qr/${encodeURIComponent(qrCodeId)}`, window.location.origin).toString();
  }, [qrCodeId]);

  const qrUrl = useMemo(() => itemUrl
    ? `https://quickchart.io/qr?size=240&margin=2&text=${encodeURIComponent(itemUrl)}`
    : "", [itemUrl]);

  if (!itemUrl) return null;

  return (
    <section className="nb-card flex flex-col gap-4 p-6 sm:p-8" aria-labelledby="inventory-qr-title">
      <div>
        <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">Asset identification</span>
        <h2 id="inventory-qr-title" className="m-0 mt-1 font-display text-xl font-semibold">Inventory QR code</h2>
        <p className="m-0 mt-1 text-sm text-ink-muted">Print this label and attach it to {equipmentName || "this item"}. Scanning opens its NewtonBotics inventory page.</p>
      </div>
      <div className="flex flex-wrap items-center gap-5">
        <div className="rounded-lg border border-line bg-white p-2">
          {/* QR contains only the public item URL; no account credentials or permissions. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrUrl} alt={`QR code for ${equipmentName || "inventory item"}`} width="200" height="200" loading="lazy" />
        </div>
        <div className="flex flex-col items-start gap-2">
          <a className="nb-btn nb-btn-primary" href={qrUrl} download={`newtonbotics-${equipmentId}-qr.png`} target="_blank" rel="noreferrer">Download QR label</a>
          <button className="nb-btn nb-btn-secondary" type="button" onClick={() => window.print()}>Print label</button>
          <span className="max-w-sm break-all font-mono text-xs text-ink-muted">{itemUrl}</span>
        </div>
      </div>
      <p className="m-0 text-xs text-ink-muted">Scanning resolves an opaque asset identifier. Requests, approvals and stock changes still require the normal authenticated workflow.</p>
    </section>
  );
}
