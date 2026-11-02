"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import inventoryService from "@/lib/inventory";

export default function InventoryQrRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    inventoryService.getEquipmentByQrCode(params.qrCodeId)
      .then((item) => {
        if (active) router.replace(`/Inventory/${encodeURIComponent(item._id || item.id)}`);
      })
      .catch((err) => { if (active) setError(err.message || "This QR label could not be resolved."); });
    return () => { active = false; };
  }, [params.qrCodeId, router]);

  return (
    <main className="nb-dark bg-paper text-ink min-h-[60vh]">
      <div className="nb-container py-20">
        {error ? <div role="alert" className="nb-card p-6"><h1 className="m-0 text-xl font-semibold">QR code unavailable</h1><p className="mt-2 text-sm text-ink-muted">{error}</p></div> : <p role="status" className="text-sm text-ink-muted">Opening inventory item…</p>}
      </div>
    </main>
  );
}
