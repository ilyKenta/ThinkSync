import React, { useState, useEffect } from "react";
import "./InviteCollaborators.css";

type Collaborator = {
  user_ID: string;
  fname: string;
  sname: string;
  department: string;
  acc_role: string;
  res_area?: string;
  qualification?: string;
};

interface InviteCollaboratorsProps {
  projectId: string;
  projectTitle: string;
  projectDescription: string;
  onClose: () => void;
}

const InviteCollaborators: React.FC<InviteCollaboratorsProps> = ({
  projectId,
  projectTitle,
  projectDescription,
  onClose,
}) => {
  const [search, setSearch] = useState("");
  const [searchType, setSearchType] = useState("name");
  const [results, setResults] = useState<Collaborator[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  useEffect(() => {
    setSearch("");
    setSearchType("name");
    setResults([]);
    setSelected([]);
    setLoading(false);
    setError(null);
    setInviteLoading(false);
  }, [projectId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResults([]);
    try {
      const token = localStorage.getItem("jwt");
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(
        "http://localhost:5000/api/collaborations/search",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ searchTerm: search, searchType }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Search failed");
      }
      const data = await res.json();
      setResults(data.collaborators || []);
    } catch (err: any) {
      setError(err.message || "Search error");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleInvite = async () => {
    setInviteLoading(true);
    try {
      const token = localStorage.getItem("jwt");
      if (!token) throw new Error("Not authenticated");
      for (const userId of selected) {
        await fetch("http://localhost:5000/api/collaborations/invite", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            project_ID: projectId,
            recipient_ID: userId,
            proposed_role: "Collaborator",
          }),
        });
      }
      alert(
        `Invitations sent to: ${results
          .filter((u) => selected.includes(u.user_ID))
          .map((u) => u.fname + " " + u.sname)
          .join(", ")}
\n\nProject: ${projectTitle}\n${projectDescription}`
      );
      setSelected([]);
      setResults([]);
      setSearch("");
      onClose();
    } catch (err: any) {
      alert("Error sending invitations: " + (err.message || err));
    } finally {
      setInviteLoading(false);
    }
  };

  return (
    <dialog className="modal-overlay">
      <section className="invite-collaborators-container">
        <h2 className="invite-title">Invite Collaborators</h2>
        <form onSubmit={handleSearch} className="invite-search-form">
          <section className="invite-search-fields">
            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              className="invite-search-select"
            >
              <option value="name">Name</option>
              <option value="skill">Skill set</option>
              <option value="position">Position</option>
            </select>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search by ${searchType}`}
              className="invite-search-input"
            />
            <button
              type="submit"
              disabled={loading}
              className="invite-search-button"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </section>
        </form>
        {error && <p className="invite-error-text">{error}</p>}
        <section className="invite-results-list">
          {results.length === 0 && !loading && <p>No results.</p>}
          {results.map((u) => (
            <section key={u.user_ID} className="invite-user-entry">
              <input
                type="checkbox"
                checked={selected.includes(u.user_ID)}
                onChange={() => handleSelect(u.user_ID)}
                className="invite-user-checkbox"
              />
              <p className="invite-user-text">
                <strong>
                  {u.fname} {u.sname}
                </strong>{" "}
                | {u.acc_role} | {u.res_area || ""}{" "}
                {u.qualification ? `| ${u.qualification}` : ""}
              </p>
            </section>
          ))}
        </section>
        <section className="invite-actions">
          <button
            onClick={handleInvite}
            disabled={selected.length === 0 || inviteLoading}
            className="invite-submit-button"
          >
            {inviteLoading ? "Sending..." : "Send Invitation"}
          </button>
          <button onClick={onClose} className="invite-cancel-button">
            Cancel
          </button>
        </section>
      </section>
    </dialog>
  );
};

export default InviteCollaborators;
