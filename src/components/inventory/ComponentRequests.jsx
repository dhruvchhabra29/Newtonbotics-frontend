"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ClipboardList, PackagePlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import inventoryService from "@/lib/inventory";
import { listInventoryProjects } from "@/lib/inventoryProjects";
import { CardSkeletonGrid } from "@/components/PageSkeletons";
import { Alert, Field } from "./InventoryUi";

const REQUEST_CHIP = { pending: "nb-chip-amber", approved: "nb-chip-green", rejected: "nb-chip-red" };

function displayName(project) {
  return project.title || project.name || "Untitled project";
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function normalizedStatus(status) {
  return ["approved", "rejected"].includes(status) ? status : "pending";
}

export default function ComponentRequests() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const userId = user?.id || user?._id || "";
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");
  const [equipment, setEquipment] = useState([]);
  const [equipmentError, setEquipmentError] = useState("");
  const [requests, setRequests] = useState([]);
  const [componentChoice, setComponentChoice] = useState("");
  const [customComponent, setCustomComponent] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [purpose, setPurpose] = useState("");
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const eligibleProjects = projects;
  const selectedEquipment = equipment.find((item) => String(item._id || item.id) === componentChoice);
  const componentName = componentChoice === "other" ? customComponent.trim() : (selectedEquipment?.name || "");
  const canChooseProject = eligibleProjects.some((project) => String(project._id || project.id) === projectId);
  const submitDisabled = submitting || projectsLoading || !isAuthenticated;

  useEffect(() => {
    let active = true;
    if (authLoading) return () => { active = false; };
    if (!isAuthenticated || !userId) {
      setProjects([]);
      setProjectsLoading(false);
      return () => { active = false; };
    }

    setProjectsLoading(true);
    setProjectsError("");
    setEquipmentError("");
    const controller = new AbortController();
    listInventoryProjects({ signal: controller.signal })
      .then((data) => { if (active) setProjects(data.projects || []); })
      .catch((err) => { if (active && err.name !== "AbortError") setProjectsError(err.message); })
      .finally(() => { if (active) setProjectsLoading(false); });
    inventoryService.listEquipment({ limit: 100, skip: 0 })
      .then((data) => { if (active) setEquipment(data.items || []); })
      .catch((err) => { if (active) setEquipmentError(err.message || "General Lab components could not be loaded."); });
    inventoryService.listMyComponentRequests({ limit: 100, skip: 0 })
      .then((data) => { if (active) setRequests(data.items || []); })
      .catch((err) => { if (active) setError(err.message || "Request history could not be loaded."); });

    return () => {
      active = false;
      controller.abort();
    };
  }, [authLoading, isAuthenticated, userId]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (projectId && !canChooseProject) {
      setError("The selected project is unavailable. Choose another project or leave it blank.");
      return;
    }
    if (!componentName) {
      setError("Select a General Lab component or enter a component name.");
      return;
    }
    const requestedQuantity = Number(quantity);
    if (!Number.isInteger(requestedQuantity) || requestedQuantity < 1) {
      setError("Quantity must be a positive whole number.");
      return;
    }
    if (!purpose.trim()) {
      setError("Add a purpose or justification for this request.");
      return;
    }

    setSubmitting(true);
    try {
      const created = await inventoryService.createComponentRequest({
        ...(projectId ? { projectId } : {}),
        ...(selectedEquipment && componentChoice !== "other" ? { equipmentId: componentChoice } : { componentName }),
        quantity: requestedQuantity,
        purpose: purpose.trim(),
      });
      setRequests((previous) => [created, ...previous]);
      setNotice("Request submitted for administrator approval.");
      setComponentChoice("");
      setCustomComponent("");
      setQuantity("1");
      setPurpose("");
      setProjectId("");
    } catch (submitError) {
      setError(submitError.message || "The component request could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return <main className="nb-dark bg-paper text-ink"><div className="nb-container py-16"><CardSkeletonGrid count={2} variant="inventory" /></div></main>;
  }

  return (
    <main className="nb-dark bg-paper text-ink">
      <header className="nb-blueprint border-b border-line">
        <div className="nb-container flex flex-col gap-5 pb-12 pt-10 sm:pt-14">
          <nav aria-label="Inventory navigation">
            <Link href="/Inventory" className="inline-flex min-h-[44px] items-center gap-2 font-mono text-xs uppercase tracking-[0.06em] text-ink-muted hover:text-ink">
              <ArrowLeft size={16} aria-hidden="true" /> Back to inventory
            </Link>
          </nav>
          <span className="nb-eyebrow">
            <span className="nb-eyebrow-num">[INV]</span> Component requests
          </span>
          <h1 className="nb-h1 m-0">Request components</h1>
          <p className="nb-lead m-0 max-w-[680px]">
            Request any listed component. An administrator reviews availability and decides whether to approve and assign it.
          </p>
        </div>
      </header>

      <div className="nb-container flex flex-col gap-6 pb-28 pt-8">
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-surface px-4 py-3 text-sm">
          <strong className="font-semibold">Requests are reviewed by an administrator.</strong>
          <span className="text-ink-muted">Any active signed-in account can request a part. Approval and allocation are admin-controlled.</span>
        </div>

        {!isAuthenticated ? (
          <section aria-labelledby="request-signin-title" className="nb-card flex flex-col items-start gap-4 p-8 sm:p-10">
            <h2 id="request-signin-title" className="m-0 font-display text-2xl font-semibold tracking-[-0.02em]">Sign in to request components</h2>
            <p className="m-0 text-ink-muted">Sign in with your NewtonBotics account to submit a request.</p>
            <Link href="/auth" className="nb-btn nb-btn-primary">Sign in</Link>
          </section>
        ) : (
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <section aria-labelledby="request-form-title" className="nb-card flex flex-col gap-5 p-6 sm:p-8">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-signal text-ink" aria-hidden="true"><PackagePlus size={20} /></span>
                <div>
                  <h2 id="request-form-title" className="m-0 font-display text-2xl font-semibold tracking-[-0.02em]">New request</h2>
                  <p className="m-0 mt-1 text-sm text-ink-muted">One item per request. Stock changes only through authorized fulfillment.</p>
                </div>
              </div>

              {projectsError && <Alert><p className="m-0">Projects could not be loaded. You can still submit a request without assigning it to a project.</p><p className="m-0 mt-1">{projectsError}</p></Alert>}
              <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
                <Field id="component-request-project" label="Intended project (optional)" hint="This is a request preference only. An administrator confirms the final assignment.">
                  <select id="component-request-project" value={projectId} onChange={(event) => setProjectId(event.target.value)} className="nb-input truncate pr-8">
                    <option value="">No project / not sure</option>
                    {eligibleProjects.map((project) => {
                      const id = String(project._id || project.id);
                      return <option key={id} value={id}>{displayName(project)}</option>;
                    })}
                  </select>
                </Field>

                <Field id="component-request-item" label="Component" required hint={equipmentError ? `${equipmentError} You can still enter a component name manually.` : undefined}>
                  <select id="component-request-item" required value={componentChoice} onChange={(event) => setComponentChoice(event.target.value)} className="nb-input truncate pr-8">
                    <option value="">Choose from General Lab</option>
                    {equipment.map((item) => <option key={item._id || item.id} value={String(item._id || item.id)}>{item.name}</option>)}
                    <option value="other">Other component</option>
                  </select>
                </Field>

                {componentChoice === "other" && (
                  <Field id="component-request-custom" label="Component name" required>
                    <input id="component-request-custom" required maxLength={255} value={customComponent} onChange={(event) => setCustomComponent(event.target.value)} placeholder="Enter the component name" className="nb-input" />
                  </Field>
                )}

                <Field id="component-request-quantity" label="Quantity" required>
                  <input id="component-request-quantity" type="number" required min="1" step="1" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="nb-input max-w-[200px]" />
                </Field>

                <Field id="component-request-purpose" label="Reason / intended use" required>
                  <textarea id="component-request-purpose" required maxLength={2000} rows={4} value={purpose} onChange={(event) => setPurpose(event.target.value)} placeholder="Explain why you need these components and how they will be used." className="nb-textarea" />
                </Field>

                {error && <Alert>{error}</Alert>}
                {notice && <Alert kind="success">{notice}</Alert>}
                <button className="nb-btn nb-btn-accent self-start" type="submit" disabled={submitDisabled}>
                  <PackagePlus size={17} aria-hidden="true" /> {submitting ? "Submitting…" : "Submit request"}
                </button>
              </form>
            </section>

            <section aria-labelledby="request-history-title" className="nb-card flex flex-col gap-5 p-6 sm:p-8">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line bg-paper text-ink" aria-hidden="true"><ClipboardList size={20} /></span>
                <div>
                  <h2 id="request-history-title" className="m-0 font-display text-2xl font-semibold tracking-[-0.02em]">My component requests</h2>
                  <p className="m-0 mt-1 text-sm text-ink-muted">Track each request through review.</p>
                </div>
              </div>
              {requests.length === 0 ? (
                <div className="flex flex-col items-start gap-2 rounded-lg border border-dashed border-line-strong p-6">
                  <ClipboardList size={24} aria-hidden="true" className="text-ink-muted" />
                  <h3 className="m-0 font-display text-lg font-semibold">No requests yet</h3>
                  <p className="m-0 text-sm text-ink-muted">Your submitted requests will appear here.</p>
                </div>
              ) : (
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {requests.map((request) => {
                    const status = normalizedStatus(request.status);
                    const requestProjectId = typeof request.projectId === "object" ? request.projectId?._id : request.projectId;
                    const project = eligibleProjects.find((item) => String(item._id || item.id) === String(requestProjectId));
                    const projectName = request.projectTitle || request.projectId?.title || (project && displayName(project));
                    return (
                      <li key={request._id}>
                        <article className="flex flex-col gap-2 rounded-lg border border-line p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className={`nb-chip ${REQUEST_CHIP[status]}`}>{status}</span>
                            <time dateTime={request.createdAt} className="font-mono text-xs text-ink-muted">{formatDate(request.createdAt)}</time>
                          </div>
                          <h3 className="m-0 font-display text-lg font-semibold">
                            {request.componentName} <span className="font-mono text-sm font-normal text-ink-muted">× {request.quantity}</span>
                          </h3>
                          {projectName && <p className="m-0 font-mono text-xs uppercase tracking-[0.06em] text-ink-muted">{projectName}</p>}
                          <p className="m-0 text-sm text-ink-body">{request.purpose}</p>
                          {status === "approved" && <p className="m-0 text-sm font-semibold text-[#166534]">Approved quantity: {request.approvedQuantity ?? request.quantity}</p>}
                          {request.reviewNotes && <p className="m-0 text-sm text-ink-muted">Review note: {request.reviewNotes}</p>}
                        </article>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
