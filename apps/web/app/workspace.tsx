"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3021";

type Investigation = {
  id: string;
  title: string;
  description?: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  _count?: { entities: number; relationships: number; evidence: number };
};

type TimelineItem = {
  id: string;
  kind: "ENTITY" | "RELATIONSHIP" | "EVIDENCE";
  timestamp: string;
  title: string;
  description?: string;
};

type Entity = { id: string; type: string; name: string; description?: string };
type Relationship = {
  id: string;
  type: string;
  validFrom: string;
  description?: string;
  sourceEntity: Entity;
  targetEntity: Entity;
};
type AuditItem = { id: string; action: string; actorId: string; createdAt: string; actor?: { name: string; email: string } };
type Alert = { id: string; rule: string; severity: "INFO" | "MEDIUM" | "HIGH"; title: string; explanation: string };
type Evidence = { id: string; title: string; url?: string; contentHash?: string };
type EvidenceIntegrity = { integrity: "VALID" | "MISMATCH" | "UNHASHED" };
type Governance = {
  status: Investigation["status"];
  automaticDeletion: boolean;
  reviewDueAt?: string;
  retentionEndsAt?: string;
  policy: string;
};
type Member = { id: string; role: string; user: { id: string; name: string; email: string } };
type LoginResult = {
  token: string;
  user: { name: string; mustChangePassword: boolean; memberships: { organizationId: string; organizationName: string; role: string }[] };
};
type PageResult<T> = { items: T[]; total: number; page: number; pageSize: number };

async function api<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "x-organization-id": "pilot-org",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers
    }
  });
  if (!response.ok) throw new Error(`API error ${response.status}`);
  return response.json() as Promise<T>;
}

export function Workspace() {
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<LoginResult["user"] | null>(null);
  const [email, setEmail] = useState("pilot@chronolens.local");
  const [password, setPassword] = useState("chronolens-pilot");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [investigationTotal, setInvestigationTotal] = useState(0);
  const [selected, setSelected] = useState<Investigation | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [timelinePage, setTimelinePage] = useState(1);
  const [timelineTotal, setTimelineTotal] = useState(0);
  const [audit, setAudit] = useState<AuditItem[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [entityPage, setEntityPage] = useState(1);
  const [entityTotal, setEntityTotal] = useState(0);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [relationshipTotal, setRelationshipTotal] = useState(0);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [evidenceTotal, setEvidenceTotal] = useState(0);
  const [evidenceIntegrity, setEvidenceIntegrity] = useState<Record<string, EvidenceIntegrity["integrity"]>>({});
  const [governance, setGovernance] = useState<Governance | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [csv, setCsv] = useState("type,name,aliases,description,confidence,firstSeen\nORGANIZATION,Northstar Labs,Northstar|NS Labs,Partenaire observe,0.86,2026-05-10\nPERSON,Amadou Kone,,Analyste cite dans les sources,0.78,2026-05-14");
  const [imported, setImported] = useState("");
  const [evidenceTitle, setEvidenceTitle] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceDate, setEvidenceDate] = useState("");
  const [evidenceNotes, setEvidenceNotes] = useState("");
  const [entityName, setEntityName] = useState("");
  const [entityType, setEntityType] = useState("PERSON");
  const [entityDescription, setEntityDescription] = useState("");
  const [sourceEntityId, setSourceEntityId] = useState("");
  const [targetEntityId, setTargetEntityId] = useState("");
  const [relationshipType, setRelationshipType] = useState("ASSOCIATED");
  const [relationshipDate, setRelationshipDate] = useState("");
  const [relationshipDescription, setRelationshipDescription] = useState("");
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [memberRole, setMemberRole] = useState("ANALYST");
  const [error, setError] = useState("");

  const loadInvestigations = useCallback(async () => {
    if (!token) return;
    try {
      setError("");
      const data = await api<PageResult<Investigation>>("/investigations?page=1&pageSize=50", token);
      setInvestigations(data.items);
      setInvestigationTotal(data.total);
      setSelected((current) => current ?? data.items[0] ?? null);
    } catch {
      setError("Session invalide ou API indisponible.");
    }
  }, [token]);

  const loadSelected = useCallback(async (investigation: Investigation) => {
    const [timelineItems, auditItems, entityItems, relationshipItems, alertItems, evidenceItems, governanceItem] = await Promise.all([
      api<PageResult<TimelineItem>>(`/investigations/${investigation.id}/timeline?page=${timelinePage}&pageSize=25`, token),
      api<AuditItem[]>(`/investigations/${investigation.id}/audit`, token),
      api<PageResult<Entity>>(`/entities?investigationId=${investigation.id}&page=${entityPage}&pageSize=25`, token),
      api<PageResult<Relationship>>(`/relationships?investigationId=${investigation.id}&page=1&pageSize=50`, token),
      api<Alert[]>(`/investigations/${investigation.id}/alerts`, token),
      api<PageResult<Evidence>>(`/evidence?investigationId=${investigation.id}&page=1&pageSize=50`, token),
      api<Governance>(`/investigations/${investigation.id}/governance`, token)
    ]);
    setTimeline(timelineItems.items);
    setTimelineTotal(timelineItems.total);
    setAudit(auditItems);
    setEntities(entityItems.items);
    setEntityTotal(entityItems.total);
    setRelationships(relationshipItems.items);
    setRelationshipTotal(relationshipItems.total);
    setAlerts(alertItems);
    setEvidence(evidenceItems.items);
    setEvidenceTotal(evidenceItems.total);
    setEvidenceIntegrity({});
    setGovernance(governanceItem);
  }, [entityPage, timelinePage, token]);

  const loadMembers = useCallback(async () => {
    if (!token || profile?.memberships[0]?.role !== "OWNER") return;
    setMembers(await api<Member[]>("/members", token));
  }, [profile, token]);

  useEffect(() => {
    const savedToken = window.localStorage.getItem("chronolens-token");
    if (savedToken) setToken(savedToken);
  }, []);

  useEffect(() => {
    void loadInvestigations();
  }, [loadInvestigations]);

  useEffect(() => {
    if (!token || profile) return;
    void api<{ user: LoginResult["user"] }>("/auth/me", token)
      .then((result) => setProfile(result.user))
      .catch(clearSession);
  }, [profile, token]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (!selected) {
      setTimeline([]);
      setAudit([]);
      return;
    }
    void loadSelected(selected).catch(() => setError("Impossible de charger le dossier."));
  }, [loadSelected, selected]);

  async function login(event: FormEvent) {
    event.preventDefault();
    try {
      const result = await api<LoginResult>("/auth/login", undefined, {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      window.localStorage.setItem("chronolens-token", result.token);
      setProfile(result.user);
      setToken(result.token);
      setError("");
    } catch {
      setError("Connexion refusee. Verifiez les identifiants.");
    }
  }

  function clearSession() {
    window.localStorage.removeItem("chronolens-token");
    setToken("");
    setProfile(null);
    setInvestigations([]);
    setInvestigationTotal(0);
    setSelected(null);
    setTimelinePage(1);
    setTimelineTotal(0);
  }

  async function logout() {
    try {
      await api("/auth/logout", token, { method: "POST" });
    } finally {
      clearSession();
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/auth/change-password", token, {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setCurrentPassword("");
      setNewPassword("");
      setProfile((current) => current ? { ...current, mustChangePassword: false } : current);
    } catch {
      setError("Changement refuse. Utilisez le mot de passe actuel et un nouveau secret de 12 caracteres minimum.");
    }
  }

  async function createInvestigation(event: FormEvent) {
    event.preventDefault();
    try {
      const investigation = await api<Investigation>("/investigations", token, {
        method: "POST",
        body: JSON.stringify({ title, description, tags: ["pilot"] })
      });
      setTitle("");
      setDescription("");
      await loadInvestigations();
      setSelected(investigation);
    } catch {
      setError("Impossible de creer l'investigation.");
    }
  }

  async function importCsv(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    try {
      const result = await api<{ imported: number; skipped: number }>("/entities/import-csv", token, {
        method: "POST",
        body: JSON.stringify({ investigationId: selected.id, csv })
      });
      setImported(`${result.imported} entites importees · ${result.skipped} ignorees`);
      await loadInvestigations();
      await loadSelected(selected);
    } catch {
      setError("Import CSV refuse. Verifiez les colonnes et les valeurs.");
    }
  }

  async function addEvidence(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    try {
      await api("/evidence", token, {
        method: "POST",
        body: JSON.stringify({
          investigationId: selected.id,
          source: "URL",
          title: evidenceTitle,
          url: evidenceUrl,
          capturedAt: new Date().toISOString(),
          occurredAt: evidenceDate ? new Date(evidenceDate).toISOString() : undefined,
          notes: evidenceNotes
        })
      });
      setEvidenceTitle("");
      setEvidenceUrl("");
      setEvidenceDate("");
      setEvidenceNotes("");
      await loadInvestigations();
      await loadSelected(selected);
    } catch {
      setError("Impossible d'enregistrer la preuve. Verifiez les champs.");
    }
  }

  async function verifyEvidence(id: string) {
    try {
      const result = await api<EvidenceIntegrity>(`/evidence/${id}/verify`, token);
      setEvidenceIntegrity((current) => ({ ...current, [id]: result.integrity }));
    } catch {
      setError("Impossible de verifier cette preuve.");
    }
  }

  async function backfillEvidence() {
    if (!selected) return;
    try {
      await api(`/evidence/backfill?investigationId=${selected.id}`, token, { method: "POST" });
      await loadSelected(selected);
    } catch {
      setError("Impossible de regulariser les preuves historiques.");
    }
  }

  async function archiveInvestigation() {
    if (!selected || selected.status === "ARCHIVED") return;
    try {
      const investigation = await api<Investigation>(`/investigations/${selected.id}/archive`, token, { method: "POST" });
      setSelected(investigation);
      await loadInvestigations();
      await loadSelected(investigation);
    } catch {
      setError("Impossible d'archiver le dossier.");
    }
  }

  async function addEntity(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    try {
      await api("/entities", token, {
        method: "POST",
        body: JSON.stringify({
          investigationId: selected.id,
          type: entityType,
          name: entityName,
          description: entityDescription,
          aliases: [],
          metadata: {}
        })
      });
      setEntityName("");
      setEntityDescription("");
      await loadInvestigations();
      await loadSelected(selected);
    } catch {
      setError("Impossible d'ajouter l'entite.");
    }
  }

  async function addRelationship(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    try {
      await api("/relationships", token, {
        method: "POST",
        body: JSON.stringify({
          investigationId: selected.id,
          sourceEntityId,
          targetEntityId,
          type: relationshipType,
          description: relationshipDescription,
          validFrom: new Date(relationshipDate).toISOString()
        })
      });
      setRelationshipDescription("");
      setRelationshipDate("");
      await loadInvestigations();
      await loadSelected(selected);
    } catch {
      setError("Impossible d'ajouter la relation. Verifiez les entites et la date.");
    }
  }

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const result = await api<PageResult<Entity>>(`/entities?investigationId=${selected.id}&q=${encodeURIComponent(search)}&page=1&pageSize=25`, token);
    setEntityPage(1);
    setEntities(result.items);
    setEntityTotal(result.total);
  }

  async function downloadExport(format: "json" | "timeline.csv") {
    if (!selected) return;
    const response = await fetch(`${API_URL}/investigations/${selected.id}/export/${format}`, {
      headers: { Authorization: `Bearer ${token}`, "x-organization-id": "pilot-org" }
    });
    if (!response.ok) {
      setError("Export indisponible.");
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `chronolens-${selected.id}.${format === "json" ? "json" : "csv"}`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function addMember(event: FormEvent) {
    event.preventDefault();
    try {
      await api("/members", token, {
        method: "POST",
        body: JSON.stringify({ name: memberName, email: memberEmail, password: memberPassword, role: memberRole })
      });
      setMemberName("");
      setMemberEmail("");
      setMemberPassword("");
      await loadMembers();
    } catch {
      setError("Impossible de creer le membre. Verifiez l'email et le mot de passe.");
    }
  }

  const validEvidence = Object.values(evidenceIntegrity).filter((status) => status === "VALID").length;
  const mismatchEvidence = Object.values(evidenceIntegrity).filter((status) => status === "MISMATCH").length;
  const unhashedEvidence = evidence.filter((item) => !item.contentHash).length;
  const canWrite = profile?.memberships[0]?.role !== "VIEWER";

  if (!token) {
    return (
      <main className="login-shell">
        <section className="panel login-panel">
          <p className="eyebrow">ChronoLens secure workspace</p>
          <h1>Connexion analyste</h1>
          <p className="empty">Accedez aux investigations de votre organisation.</p>
          {error && <p className="error">{error}</p>}
          <form onSubmit={login}>
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" required />
            <input value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mot de passe" type="password" required />
            <button className="primary" type="submit">Se connecter</button>
          </form>
        </section>
      </main>
    );
  }

  if (profile?.mustChangePassword) {
    return (
      <main className="login-shell">
        <section className="panel login-panel">
          <p className="eyebrow">Securite du compte</p>
          <h1>Changez votre mot de passe</h1>
          <p className="empty">Votre mot de passe initial est temporaire. Choisissez un secret personnel avant d&apos;acceder aux dossiers.</p>
          {error && <p className="error">{error}</p>}
          <form onSubmit={changePassword}>
            <input value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Mot de passe actuel" type="password" required />
            <input value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Nouveau mot de passe" type="password" minLength={12} required />
            <button className="primary" type="submit">Mettre a jour le mot de passe</button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main>
      <header>
        <div><p className="eyebrow">Temporal intelligence workspace</p><h1>ChronoLens</h1></div>
        <div className="session"><span className="status">{profile?.memberships[0]?.role ?? "SESSION"}</span><button className="link-button" onClick={() => void logout()}>Deconnexion</button></div>
      </header>
      <section className="hero">
        <div><p className="eyebrow">Investigation OSINT</p><h2>Reliez les faits au bon moment.</h2><p>Centralisez les sources publiques, les entites et les relations temporelles dans un dossier tracable.</p></div>
        <div className="metric"><strong>{investigationTotal}</strong><span>investigations chargees</span></div>
      </section>
      {error && <p className="error">{error}</p>}
      <div className="grid">
        <aside className="panel">
          <div className="panel-title"><h3>Dossiers</h3><span>{investigationTotal}</span></div>
          <div className="cases">
            {investigations.map((investigation) => <button className={selected?.id === investigation.id ? "case active" : "case"} key={investigation.id} onClick={() => { setTimelinePage(1); setSelected(investigation); }}><strong>{investigation.title}</strong><small>{investigation.description || "Sans description"}</small><span>{investigation._count?.entities ?? 0} entites · {investigation._count?.evidence ?? 0} preuves</span></button>)}
          </div>
          <form onSubmit={createInvestigation}><h3>Nouveau dossier</h3><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titre" minLength={3} required /><textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Contexte de l'investigation" /><button className="primary" type="submit">Creer l&apos;investigation</button></form>
        </aside>
        <section className="panel timeline">
          <div className="panel-title"><div><p className="eyebrow">Timeline</p><h3>{selected?.title ?? "Selectionnez un dossier"}</h3></div><span>{timelineTotal} evenements</span></div>
          <div className="export-actions"><button onClick={() => void downloadExport("json")} disabled={!selected}>Exporter JSON</button><button onClick={() => void downloadExport("timeline.csv")} disabled={!selected}>Exporter CSV</button></div>
          <div className="timeline-list">{timeline.map((item) => <article className="timeline-item" key={`${item.kind}-${item.id}`}><div className={`dot ${item.kind.toLowerCase()}`} /><div><time>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(item.timestamp))}</time><h4>{item.title}</h4>{item.description && <p>{item.description}</p>}<small>{item.kind}</small></div></article>)}</div>
          <div className="pagination"><button onClick={() => setTimelinePage((page) => Math.max(1, page - 1))} disabled={timelinePage === 1}>Precedent</button><span>Page {timelinePage}</span><button onClick={() => setTimelinePage((page) => page + 1)} disabled={timelinePage * 25 >= timelineTotal}>Suivant</button></div>
        </section>
      </div>
      <div className="operations">
        <section className="panel"><div className="panel-title"><div><p className="eyebrow">Ingestion</p><h3>Importer des entites CSV</h3></div><span>max. 500 lignes</span></div><form onSubmit={importCsv}><textarea className="csv" value={csv} onChange={(event) => setCsv(event.target.value)} aria-label="Contenu CSV" /><button className="primary" type="submit" disabled={!selected}>Importer dans le dossier selectionne</button>{imported && <small className="success">{imported}</small>}</form></section>
        <section className="panel"><div className="panel-title"><div><p className="eyebrow">Tracabilite</p><h3>Journal d&apos;audit</h3></div><span>{audit.length} actions</span></div><div className="audit-list">{audit.map((item) => <article className="audit-item" key={item.id}><strong>{item.action.replaceAll("_", " ")}</strong><small>{item.actor?.name ?? item.actorId} · {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</small></article>)}</div></section>
      </div>
      <section className="panel evidence-panel">
        <div className="panel-title"><div><p className="eyebrow">Capture guidee</p><h3>Ajouter une preuve publique</h3></div><span>URL source</span></div>
        <form className="evidence-form" onSubmit={addEvidence}><input value={evidenceTitle} onChange={(event) => setEvidenceTitle(event.target.value)} placeholder="Titre de la preuve" required /><input value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://source.example/article" type="url" required /><input value={evidenceDate} onChange={(event) => setEvidenceDate(event.target.value)} aria-label="Date du fait" type="date" /><textarea value={evidenceNotes} onChange={(event) => setEvidenceNotes(event.target.value)} placeholder="Notes analyste" /><button className="primary" type="submit" disabled={!selected}>Enregistrer la preuve</button></form>
      </section>
      <section className="panel evidence-panel">
        <div className="panel-title"><div><p className="eyebrow">Chaine de preuve</p><h3>Integrite des preuves</h3></div><span>{evidenceTotal} empreintes</span></div>
        <div className="integrity-summary"><span>{validEvidence} valides</span><span>{unhashedEvidence} historiques</span><span className={mismatchEvidence ? "has-mismatch" : ""}>{mismatchEvidence} anomalies</span>{canWrite && <button onClick={() => void backfillEvidence()} disabled={!selected || !unhashedEvidence}>Empreinter les historiques</button>}</div>
        <div className="evidence-list">{evidence.map((item) => <article key={item.id}><div><strong>{item.title}</strong><small className="hash">{item.contentHash ?? "preuve historique sans empreinte"}</small></div><button onClick={() => void verifyEvidence(item.id)}>Verifier</button><span className={`integrity ${evidenceIntegrity[item.id]?.toLowerCase() ?? ""}`}>{evidenceIntegrity[item.id] ?? "NON VERIFIEE"}</span></article>)}{!evidence.length && <p className="empty">Aucune preuve enregistree pour ce dossier.</p>}</div>
      </section>
      <section className="panel evidence-panel">
        <div className="panel-title"><div><p className="eyebrow">Gouvernance</p><h3>Retention du dossier</h3></div><span>{governance?.status ?? "AUCUN DOSSIER"}</span></div>
        {governance ? <div className="governance-card"><p>{governance.policy}</p><div><span>Suppression automatique</span><strong>{governance.automaticDeletion ? "ACTIVE" : "DESACTIVEE"}</strong></div>{governance.reviewDueAt && <div><span>Prochaine revue</span><strong>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(governance.reviewDueAt))}</strong></div>}{governance.retentionEndsAt && <div><span>Fin de retention</span><strong>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(governance.retentionEndsAt))}</strong></div>}{canWrite && <button onClick={() => void archiveInvestigation()} disabled={governance.status === "ARCHIVED"}>Archiver le dossier</button>}</div> : <p className="empty">Selectionnez un dossier pour consulter sa gouvernance.</p>}
      </section>
      <section className="panel evidence-panel">
        <div className="panel-title"><div><p className="eyebrow">Signaux faibles</p><h3>Alertes explicables</h3></div><span>{alerts.length} alertes</span></div>
        <div className="alert-list">{alerts.map((alert) => <article className={`signal ${alert.severity.toLowerCase()}`} key={alert.id}><strong>{alert.title}</strong><p>{alert.explanation}</p><small>{alert.severity} · {alert.rule}</small></article>)}{!alerts.length && <p className="empty">Aucun signal explicable detecte pour ce dossier.</p>}</div>
      </section>
      <div className="operations">
        <section className="panel">
          <div className="panel-title"><div><p className="eyebrow">Graphe</p><h3>Ajouter une entite</h3></div><span>{entityTotal} entites</span></div>
          <form onSubmit={addEntity}>
            <select value={entityType} onChange={(event) => setEntityType(event.target.value)} aria-label="Type d'entite">
              {["PERSON", "ORGANIZATION", "LOCATION", "EVENT", "DOCUMENT", "ASSET", "CONCEPT"].map((type) => <option key={type}>{type}</option>)}
            </select>
            <input value={entityName} onChange={(event) => setEntityName(event.target.value)} placeholder="Nom de l'entite" required />
            <textarea value={entityDescription} onChange={(event) => setEntityDescription(event.target.value)} placeholder="Description de l'entite" />
            <button className="primary" type="submit" disabled={!selected}>Ajouter l&apos;entite</button>
          </form>
          <form className="search-form" onSubmit={runSearch}><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une entite" /><button type="submit">Rechercher</button></form>
          <div className="entity-list">{entities.map((entity) => <article key={entity.id}><strong>{entity.name}</strong><small>{entity.type}</small></article>)}</div>
          <div className="pagination"><button onClick={() => setEntityPage((page) => Math.max(1, page - 1))} disabled={entityPage === 1}>Precedent</button><span>Page {entityPage}</span><button onClick={() => setEntityPage((page) => page + 1)} disabled={entityPage * 25 >= entityTotal}>Suivant</button></div>
        </section>
        <section className="panel">
          <div className="panel-title"><div><p className="eyebrow">Temporalite</p><h3>Ajouter une relation</h3></div><span>{relationshipTotal} relations</span></div>
          <form onSubmit={addRelationship}>
            <select value={sourceEntityId} onChange={(event) => setSourceEntityId(event.target.value)} aria-label="Entite source" required><option value="">Source</option>{entities.map((entity) => <option value={entity.id} key={entity.id}>{entity.name}</option>)}</select>
            <select value={targetEntityId} onChange={(event) => setTargetEntityId(event.target.value)} aria-label="Entite cible" required><option value="">Cible</option>{entities.map((entity) => <option value={entity.id} key={entity.id}>{entity.name}</option>)}</select>
            <select value={relationshipType} onChange={(event) => setRelationshipType(event.target.value)} aria-label="Type de relation">{["ASSOCIATED", "PARTNER", "EMPLOYEE", "BOARD_MEMBER", "INVESTOR", "SUPPLIER", "CUSTOMER", "MENTIONED_WITH"].map((type) => <option key={type}>{type}</option>)}</select>
            <input value={relationshipDate} onChange={(event) => setRelationshipDate(event.target.value)} aria-label="Date de debut de relation" type="date" required />
            <textarea value={relationshipDescription} onChange={(event) => setRelationshipDescription(event.target.value)} placeholder="Contexte de la relation" />
            <button className="primary" type="submit" disabled={!selected}>Ajouter la relation</button>
          </form>
          <div className="relationship-list">{relationships.map((relationship) => <article key={relationship.id}><strong>{relationship.sourceEntity.name} {relationship.type} {relationship.targetEntity.name}</strong><small>{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(relationship.validFrom))}</small></article>)}</div>
        </section>
      </div>
      {profile?.memberships[0]?.role === "OWNER" && <section className="panel evidence-panel">
        <div className="panel-title"><div><p className="eyebrow">Equipe</p><h3>Membres de l&apos;organisation</h3></div><span>{members.length} membres</span></div>
        <form className="member-form" onSubmit={addMember}><input value={memberName} onChange={(event) => setMemberName(event.target.value)} placeholder="Nom du membre" required /><input value={memberEmail} onChange={(event) => setMemberEmail(event.target.value)} placeholder="Email du membre" type="email" required /><input value={memberPassword} onChange={(event) => setMemberPassword(event.target.value)} placeholder="Mot de passe initial" type="password" minLength={8} required /><select aria-label="Role du membre" value={memberRole} onChange={(event) => setMemberRole(event.target.value)}><option>ANALYST</option><option>VIEWER</option></select><button className="primary" type="submit">Ajouter le membre</button></form>
        <div className="entity-list">{members.map((member) => <article key={member.id}><strong>{member.user.name}</strong><small>{member.user.email} · {member.role}</small></article>)}</div>
      </section>}
    </main>
  );
}
