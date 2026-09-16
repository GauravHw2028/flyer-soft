"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Template, templates, Product, Offer, Brand } from "./model";
import { wearMartTemplates } from "./wear-mart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
export type BusinessInfo = {
  isAdmin: boolean;
  email: string;
  business: { id: string; name: string; templates: Template[] } | null;
  balance: number;
  aiEnabled: boolean;
  paymentInstructions: string;
  topups: {
    id: string;
    credits: number;
    reference: string;
    status: string;
    created: string;
  }[];
  ledger: { delta: number; reason: string; created: string }[];
};
async function request<T = unknown>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(
    url,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  const v = (await r.json()) as T & { error?: string };
  if (!r.ok)
    throw Object.assign(
      new Error(v.error || "Request could not be completed."),
      { status: r.status },
    );
  return v;
}
export function useBusiness() {
  const [info, setInfo] = useState<BusinessInfo | null>(null),
    [error, setError] = useState("");
  const refresh = useCallback(async () => {
    try {
      setInfo(await request<BusinessInfo>("/api/business"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { info, refresh, error };
}
export function CreditPanel({
  info,
  refresh,
}: {
  info: BusinessInfo | null;
  refresh: () => Promise<void>;
}) {
  const [credits, setCredits] = useState(50),
    [reference, setReference] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="content-surface business-surface">
      <div className="credit-summary">
        <div>
          <div className="eyebrow">PRODUCT PHOTO STUDIO</div>
          <h2>
            {info?.balance ?? "—"} <small>AI credits</small>
          </h2>
          <p>1 credit per studio enhancement. Your original photo is kept.</p>
        </div>
        <span className="collection-tag">
          {info?.aiEnabled ? "AI CONNECTED" : "AI SETUP PENDING"}
        </span>
      </div>
      <div className="business-columns">
        <form
          className="form-stack"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await request("/api/topups", {
                id: crypto.randomUUID(),
                credits,
                reference,
              });
              setReference("");
              await refresh();
              toast.success("Recharge request sent for payment verification.");
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h3>Recharge by bank transfer or cash</h3>
          <p className="help-text">{info?.paymentInstructions}</p>
          <label className="field">
            <span>Credits requested</span>
            <input
              type="number"
              min="1"
              max="10000"
              required
              value={credits}
              onChange={(e) => setCredits(Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>Payment reference / receipt number</span>
            <input
              required
              minLength={3}
              maxLength={250}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Transfer reference or cash receipt number"
            />
          </label>
          <p className="help-text">
            Confirm the price with your account manager before paying. Credits
            appear only after payment is verified.
          </p>
          <button className="button primary" disabled={busy || !info}>
            {busy ? "Submitting…" : "Submit recharge request"}
          </button>
        </form>
        <div>
          <h3>Recharge requests</h3>
          {!info?.topups.length && (
            <p className="help-text">Your requests will appear here.</p>
          )}
          {info?.topups.map((t) => (
            <div className="business-row" key={t.id}>
              <div>
                <b>{t.credits} credits</b>
                <small>{t.reference}</small>
              </div>
              <span className={"status-pill " + t.status}>{t.status}</span>
            </div>
          ))}
        </div>
      </div>
      <h3>Credit history</h3>
      {info?.ledger.map((l, i) => (
        <div className="business-row" key={i}>
          <div>
            <b>{l.reason}</b>
            <small>{new Date(l.created).toLocaleString()}</small>
          </div>
          <strong>
            {l.delta > 0 ? "+" : ""}
            {l.delta}
          </strong>
        </div>
      ))}
    </section>
  );
}
type Business = {
  id: string;
  name: string;
  email: string;
  templates: Template[];
};
export function AdminPanel({ onPreview }: { onPreview: () => void }) {
  const [state, setState] = useState<{
      businesses: Business[];
      topups: {
        id: string;
        email: string;
        credits: number;
        reference: string;
      }[];
      jobs: { id: string; owner: string; status: string }[];
    } | null>(null),
    [draft, setDraft] = useState<Business | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function load() {
    try {
      setState(await request<NonNullable<typeof state>>("/api/admin"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function action(body: unknown) {
    setBusy(true);
    try {
      await request("/api/admin", body);
      await load();
      toast.success("Saved");
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="content-surface business-surface">
      <div className="section-title">
        <div>
          <h2>Business accounts</h2>
          <p className="help-text">
            Assign up to 10 private templates to each customer’s sign-in email.
          </p>
        </div>
        <button
          className="button primary"
          onClick={() =>
            setDraft({
              id: crypto.randomUUID(),
              name: "",
              email: "",
              templates: [],
            })
          }
        >
          + Add business
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
      <div className="showcase-banner">
        <div>
          <span className="eyebrow">CLIENT SHOWCASE</span>
          <h3>Wear Mart collection</h3>
          <p>
            10 editable designs, including Paper Adventure and Back to School.
          </p>
        </div>
        <button className="button" onClick={onPreview}>
          Open showcase flyer
        </button>
      </div>
      {state?.businesses.map((b) => (
        <div className="business-row" key={b.id}>
          <div>
            <b>{b.name}</b>
            <small>
              {b.email} · {b.templates.length}/10 private templates
            </small>
          </div>
          <button
            className="button small"
            onClick={() => setDraft(structuredClone(b))}
          >
            Manage templates
          </button>
        </div>
      ))}
      {!state?.businesses.length && (
        <p className="help-text">
          Add the customer’s actual sign-in email when you onboard them. The
          showcase does not create a fictitious customer account.
        </p>
      )}
      <h3 className="section-gap">Payments awaiting verification</h3>
      <p className="help-text">
        Check your bank statement or cash receipt before approving. Approval
        adds the requested credits once.
      </p>
      {state?.topups.map((t) => (
        <div className="business-row" key={t.id}>
          <div>
            <b>
              {t.email} · {t.credits} credits
            </b>
            <small>{t.reference}</small>
          </div>
          <div className="toolbar">
            <button
              className="button"
              disabled={busy}
              onClick={() =>
                action({ action: "review", id: t.id, decision: "reject" })
              }
            >
              Reject
            </button>
            <button
              className="button primary"
              disabled={busy}
              onClick={() =>
                action({ action: "review", id: t.id, decision: "approve" })
              }
            >
              Payment verified
            </button>
          </div>
        </div>
      ))}
      {!state?.topups.length && (
        <p className="help-text">No payments waiting.</p>
      )}
      {!!state?.jobs.length && (
        <>
          <h3>AI reservations requiring review</h3>
          <p className="help-text">
            Submission was not confirmed. Check the provider dashboard, then
            refund the reservation if appropriate.
          </p>
          {state.jobs.map((j) => (
            <div className="business-row" key={j.id}>
              <small>{j.id}</small>
              <button
                className="button"
                disabled={busy}
                onClick={() => action({ action: "refund", id: j.id })}
              >
                Refund credit
              </button>
            </div>
          ))}
        </>
      )}
      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="wide-dialog">
          <DialogHeader>
            <DialogTitle>Private business templates</DialogTitle>
            <DialogDescription>
              Only the assigned customer and administrators can access this
              pack.
            </DialogDescription>
          </DialogHeader>
          {draft && (
            <form
              className="form-stack"
              onSubmit={async (e) => {
                e.preventDefault();
                if (await action({ action: "business", ...draft }))
                  setDraft(null);
              }}
            >
              <div className="two-cols">
                <label className="field">
                  <span>Business name</span>
                  <input
                    required
                    maxLength={60}
                    value={draft.name}
                    onChange={(e) =>
                      setDraft({ ...draft, name: e.target.value })
                    }
                  />
                </label>
                <label className="field">
                  <span>Customer sign-in email</span>
                  <input
                    required
                    type="email"
                    value={draft.email}
                    onChange={(e) =>
                      setDraft({ ...draft, email: e.target.value })
                    }
                  />
                </label>
              </div>
              <div className="toolbar">
                <b>{draft.templates.length}/10 assigned</b>
                <button
                  className="button"
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      templates: structuredClone(wearMartTemplates),
                    })
                  }
                >
                  Use Wear Mart 10-pack
                </button>
                <select
                  aria-label="Add private template"
                  className="select-control"
                  value=""
                  disabled={draft.templates.length >= 10}
                  onChange={(e) => {
                    const t = templates.find((t) => t.id === e.target.value);
                    if (t)
                      setDraft({
                        ...draft,
                        templates: [
                          ...draft.templates,
                          {
                            ...t,
                            id: crypto.randomUUID(),
                            name: draft.name + " · " + t.name,
                          },
                        ],
                      });
                  }}
                >
                  <option value="">Add a template…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-template-list">
                {draft.templates.map((t, i) => (
                  <div className="admin-template-row" key={t.id}>
                    <input
                      aria-label={`Template ${i + 1} name`}
                      maxLength={50}
                      required
                      value={t.name}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          templates: draft.templates.map((x, j) =>
                            i === j ? { ...x, name: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <input
                      aria-label={`Template ${i + 1} main color`}
                      type="color"
                      value={t.color}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          templates: draft.templates.map((x, j) =>
                            i === j ? { ...x, color: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <input
                      aria-label={`Template ${i + 1} accent`}
                      type="color"
                      value={t.accent}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          templates: draft.templates.map((x, j) =>
                            i === j ? { ...x, accent: e.target.value } : x,
                          ),
                        })
                      }
                    />
                    <label className="button small">
                      {t.artwork ? "Replace artwork" : "Upload artwork"}
                      <input
                        hidden
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        disabled={busy}
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          setBusy(true);
                          try {
                            const form = new FormData();
                            form.append("file", f);
                            const r = await fetch("/api/assets", {
                              method: "POST",
                              body: form,
                            });
                            const v = (await r.json()) as {
                              url: string;
                              error?: string;
                            };
                            if (!r.ok)
                              throw new Error(v.error || "Upload failed");
                            setDraft({
                              ...draft,
                              templates: draft.templates.map((x, j) =>
                                i === j
                                  ? { ...x, artwork: v.url, style: "artisan" }
                                  : x,
                              ),
                            });
                          } catch (e) {
                            toast.error((e as Error).message);
                          } finally {
                            setBusy(false);
                          }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="bare"
                      aria-label={`Remove template ${i + 1}`}
                      onClick={() =>
                        setDraft({
                          ...draft,
                          templates: draft.templates.filter((_, j) => j !== i),
                        })
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button className="button primary" disabled={busy}>
                Save business & templates
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
export function SlotEditor({
  slot,
  offer,
  products,
  currency,
  onClose,
  onSave,
  onNew,
  onRemove,
}: {
  slot: number | null;
  offer?: Offer;
  products: Product[];
  currency: string;
  onClose: () => void;
  onSave: (p: Offer) => void;
  onNew: () => void;
  onRemove: () => void;
}) {
  const [query, setQuery] = useState(""),
    [draft, setDraft] = useState<Offer | undefined>(offer);
  useEffect(() => {
    setDraft(offer);
    setQuery("");
  }, [slot, offer]);
  const results = products
    .filter((p) =>
      (p.name + " " + (p.arabicName || "") + " " + p.sku)
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .slice(0, 30);
  return (
    <Dialog open={slot !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="app-dialog">
        <DialogHeader>
          <DialogTitle>Product slot {(slot ?? 0) + 1}</DialogTitle>
          <DialogDescription>
            Search your saved products, then set this flyer’s price.
          </DialogDescription>
        </DialogHeader>
        <div className="form-stack">
          <label className="field">
            <span>Find a product</span>
            <input
              autoFocus
              aria-label="Find a product for this slot"
              role="combobox"
              aria-expanded={true}
              aria-controls="slot-results"
              aria-autocomplete="list"
              placeholder="Product name or barcode…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div
            id="slot-results"
            className="slot-results"
            role="listbox"
            aria-label="Matching products"
          >
            {results.map((p) => (
              <button
                type="button"
                role="option"
                aria-selected={draft?.id === p.id}
                className={
                  "slot-result " + (draft?.id === p.id ? "selected" : "")
                }
                key={p.id}
                onClick={() =>
                  setDraft({
                    ...p,
                    offer: p.price,
                    badge: "",
                    showOldPrice: false,
                  })
                }
              >
                {p.image && <img src={p.image} alt="" />}
                <span>
                  <b>{p.name}</b>
                  <small>
                    {p.pack} · {currency} {p.price.toFixed(2)}
                  </small>
                </span>
              </button>
            ))}
            {!results.length && (
              <p className="help-text">
                No matching products. Add one to your library.
              </p>
            )}
          </div>
          <button className="button" onClick={onNew}>
            + Add a new product
          </button>
          {draft && (
            <>
              <div className="slot-selected">
                {draft.image && <img src={draft.image} alt={draft.name} />}
                <b>{draft.name}</b>
              </div>
              <label className="field">
                <span>New price · {currency}</span>
                <input
                  type="number"
                  min="0"
                  max="999999"
                  step=".01"
                  value={draft.offer}
                  onChange={(e) =>
                    setDraft({ ...draft, offer: Number(e.target.value) })
                  }
                />
              </label>
              <label className="check-label">
                <input
                  type="checkbox"
                  checked={draft.showOldPrice ?? draft.price > draft.offer}
                  onChange={(e) =>
                    setDraft({ ...draft, showOldPrice: e.target.checked })
                  }
                />
                Show old price with strikethrough
              </label>
              {(draft.showOldPrice ?? draft.price > draft.offer) && (
                <label className="field">
                  <span>Old price · {currency}</span>
                  <input
                    type="number"
                    min="0"
                    max="999999"
                    step=".01"
                    value={draft.price}
                    onChange={(e) =>
                      setDraft({ ...draft, price: Number(e.target.value) })
                    }
                  />
                </label>
              )}
              <label className="field">
                <span>Offer label (optional)</span>
                <input
                  maxLength={30}
                  value={draft.badge}
                  onChange={(e) =>
                    setDraft({ ...draft, badge: e.target.value })
                  }
                />
              </label>
              <button
                className="button primary"
                disabled={
                  !Number.isFinite(draft.offer) ||
                  draft.offer < 0 ||
                  draft.offer > 999999 ||
                  !Number.isFinite(draft.price) ||
                  draft.price < 0 ||
                  draft.price > 999999
                }
                onClick={() => onSave(draft)}
              >
                Apply to flyer
              </button>
            </>
          )}
          {offer && (
            <button className="bare" onClick={onRemove}>
              Clear this slot
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function LocationFields({
  brand,
  onChange,
}: {
  brand: Brand;
  onChange: (b: Brand) => void;
}) {
  return (
    <>
      <label className="field">
        <span>Arabic store name (optional)</span>
        <input
          dir="auto"
          maxLength={60}
          value={brand.arabicName || ""}
          onChange={(e) => onChange({ ...brand, arabicName: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Location link → QR code</span>
        <input
          type="url"
          maxLength={500}
          placeholder="https://maps.google.com/…"
          value={brand.locationUrl || ""}
          onChange={(e) => onChange({ ...brand, locationUrl: e.target.value })}
        />
      </label>
      <label className="field">
        <span>Store opening hours</span>
        <input
          maxLength={100}
          value={brand.timings || ""}
          onChange={(e) => onChange({ ...brand, timings: e.target.value })}
        />
      </label>
      {brand.branches?.map((b, i) => (
        <div className="branch-fields" key={i}>
          <b>Branch {i + 1}</b>
          <input
            aria-label={`Branch ${i + 1} name`}
            maxLength={40}
            value={b.name}
            onChange={(e) =>
              onChange({
                ...brand,
                branches: brand.branches!.map((x, j) =>
                  j === i ? { ...x, name: e.target.value } : x,
                ),
              })
            }
          />
          <input
            aria-label={`Branch ${i + 1} address`}
            maxLength={140}
            value={b.address}
            onChange={(e) =>
              onChange({
                ...brand,
                branches: brand.branches!.map((x, j) =>
                  j === i ? { ...x, address: e.target.value } : x,
                ),
              })
            }
          />
          <input
            aria-label={`Branch ${i + 1} location link`}
            type="url"
            maxLength={500}
            placeholder="Location link for QR code"
            value={b.url}
            onChange={(e) =>
              onChange({
                ...brand,
                branches: brand.branches!.map((x, j) =>
                  j === i ? { ...x, url: e.target.value } : x,
                ),
              })
            }
          />
          <button
            type="button"
            className="bare"
            onClick={() =>
              onChange({
                ...brand,
                branches: brand.branches!.filter((_, j) => j !== i),
              })
            }
          >
            Remove branch
          </button>
        </div>
      ))}
      {(brand.branches?.length || 0) < 3 && (
        <button
          className="button"
          type="button"
          onClick={() =>
            onChange({
              ...brand,
              branches: [
                ...(brand.branches || []),
                {
                  name: `Branch ${(brand.branches?.length || 0) + 1}`,
                  address: "",
                  url: "",
                },
              ],
            })
          }
        >
          + Add branch (up to 3)
        </button>
      )}
    </>
  );
}
export function EnhanceButton({
  source,
  onApply,
  info,
  refresh,
}: {
  source: string;
  onApply: (url: string) => void;
  info: BusinessInfo | null;
  refresh: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false),
    [result, setResult] = useState(""),
    [job, setJob] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    setResult("");
    setJob(sessionStorage.getItem("flyerly-ai:" + source) || "");
  }, [source]);
  useEffect(() => {
    if (!job) return;
    let alive = true;
    const poll = async () => {
      try {
        const j = await request<{ status: string; result: string }>(
          "/api/enhance?id=" + encodeURIComponent(job),
        );
        if (!alive) return;
        if (j.status === "complete") {
          setResult(j.result);
          setBusy(false);
          setMessage(
            "Check the label and packaging before using the enhanced photo.",
          );
          sessionStorage.removeItem("flyerly-ai:" + source);
          setJob("");
          await refresh();
        } else if (["refunded", "review"].includes(j.status)) {
          setBusy(false);
          setMessage(
            j.status === "refunded"
              ? "The enhancement failed. Your credit was refunded."
              : "Submission needs administrator review. Your original image is safe.",
          );
          setJob("");
          await refresh();
        } else {
          setBusy(true);
          setMessage("Creating your studio photo…");
        }
      } catch (e) {
        if (alive) {
          setBusy(false);
          setMessage((e as Error).message);
        }
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 5000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [job, source, refresh]);
  return (
    <div className="enhance-box">
      <b>AI product photo studio</b>
      <p className="help-text">
        Clean white background, studio lighting · 1 credit. The photo is sent to
        fal.ai for processing.
      </p>
      <button
        type="button"
        className="button"
        disabled={
          busy ||
          !source.startsWith("/api/assets/") ||
          !info?.aiEnabled ||
          !info.balance
        }
        onClick={async () => {
          setBusy(true);
          setMessage("");
          try {
            const id = crypto.randomUUID();
            sessionStorage.setItem("flyerly-ai:" + source, id);
            await request("/api/enhance", { id, source });
            setJob(id);
            await refresh();
          } catch (e) {
            setBusy(false);
            if (e && typeof e === "object" && "status" in e) {
              setJob("");
              sessionStorage.removeItem("flyerly-ai:" + source);
            } else {
              setJob(sessionStorage.getItem("flyerly-ai:" + source) || "");
            }
            setMessage((e as Error).message);
          }
        }}
      >
        {busy ? "Enhancing…" : "✧ Enhance product photo"}
      </button>
      {!info?.aiEnabled && (
        <p className="help-text">
          Connect your fal.ai API key on the server to enable enhancement. No
          credits will be charged until connected.
        </p>
      )}
      {info?.aiEnabled && !info.balance && (
        <p className="help-text">Recharge credits from the AI credits page.</p>
      )}
      {message && (
        <p role="status" className="help-text">
          {message}
        </p>
      )}
      {result && (
        <>
          <div className="enhance-compare">
            <figure>
              <img src={source} alt="Original product" />
              <figcaption>Original</figcaption>
            </figure>
            <figure>
              <img src={result} alt="Enhanced product preview" />
              <figcaption>Enhanced</figcaption>
            </figure>
          </div>
          <button
            className="button primary"
            type="button"
            onClick={() => onApply(result)}
          >
            Use enhanced image
          </button>
        </>
      )}
    </div>
  );
}
