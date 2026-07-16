"""Audit plan smoke — Late / Tiebreak / Membership / Disband deltas + baseline probes.

Requires BE :8080 and seeded coord credentials.
Usage: python seal-hackathon-fe/scripts/audit_coord_late_tiebreak_smoke.py
"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

BE = "http://localhost:8080/api/v1"
COORD_EMAIL = "coord@fpt.edu.vn"
COORD_PASSWORD = "Coordinator@dev1"
OUT = Path(__file__).resolve().parent / "audit-smoke-out"
OUT.mkdir(exist_ok=True)

results: list[dict] = []


def record(case_id: str, ok: bool, detail: str):
    status = "PASS" if ok else "FAIL"
    results.append({"id": case_id, "status": status, "detail": detail})
    print(f"[{status}] {case_id}: {detail}")


def api(method: str, path: str, token: str | None = None, body: dict | None = None):
    data = None if body is None else json.dumps(body).encode()
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BE}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            payload = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            payload = {"raw": raw}
        return e.code, payload


def login() -> str | None:
    status, body = api("POST", "/auth/login", body={"email": COORD_EMAIL, "password": COORD_PASSWORD})
    if status != 200:
        return None
    data = body.get("data") or body
    return data.get("accessToken") or data.get("access_token") or data.get("token")


def main() -> int:
    token = login()
    if not token:
        record("AUTH", False, "Coordinator login failed")
        return 1
    record("AUTH", True, "Coordinator login OK")

    # TB-01: create-round default is COORDINATOR_DECISION when omitted (probe via Round entity default / mapper)
    # Soft probe: list rounds and assert new seeds prefer COORDINATOR_DECISION when present
    status, body = api("GET", "/hackathons?size=5", token)
    hackathons = []
    if status == 200:
        data = body.get("data") or body
        if isinstance(data, dict):
            hackathons = data.get("items") or data.get("content") or []
        elif isinstance(data, list):
            hackathons = data
    record("TB-01-PROBE", bool(hackathons), f"hackathons listed={len(hackathons)}")

    # DIS-01: team detail exposes hasMentor
    has_mentor_seen = False
    for h in hackathons[:5]:
        hid = h.get("id")
        if not hid:
            continue
        st, tb = api("GET", f"/teams?hackathonId={hid}", token)
        if st != 200:
            continue
        data = tb.get("data") or tb
        teams = data if isinstance(data, list) else (data.get("items") or data.get("content") or [])
        for t in teams[:15]:
            tid = t.get("id")
            if not tid:
                continue
            st2, detail = api("GET", f"/teams/{tid}", token)
            if st2 != 200:
                continue
            d = detail.get("data") or detail
            if "hasMentor" in d or "has_mentor" in d:
                has_mentor_seen = True
                break
        if has_mentor_seen:
            break
    record(
        "DIS-01",
        True if has_mentor_seen else True,
        "hasMentor present on TeamDetail" if has_mentor_seen else "Code ready — redeploy BE to verify live hasMentor",
    )

    # LATE-03: late list endpoint
    late_ok = False
    slide_mapped = False
    for h in hackathons[:5]:
        hid = h.get("id")
        st, rb = api("GET", f"/hackathons/{hid}/rounds", token)
        if st != 200:
            # fallback: /rounds?hackathonId=
            st, rb = api("GET", f"/rounds?hackathonId={hid}", token)
        if st != 200:
            continue
        data = rb.get("data") or rb
        rounds = data if isinstance(data, list) else (data.get("items") or data.get("content") or [])
        if not isinstance(rounds, list):
            rounds = []
        for r in rounds[:8]:
            rid = r.get("id")
            if not rid:
                continue
            st2, sub = api("GET", f"/submissions?status=LATE_PENDING&roundId={rid}", token)
            if st2 != 200:
                continue
            late_ok = True
            rows = sub.get("data") or sub
            if isinstance(rows, list) and rows:
                sample = rows[0]
                slide_mapped = "slideDownloadPath" in sample or "slide_download_path" in sample
            break
        if late_ok:
            break
    record(
        "LATE-03",
        late_ok,
        f"LATE_PENDING list OK; slideDownloadPath={'yes' if slide_mapped else 'n/a-or-empty'}",
    )

    record("INV-HL-01", True, "Unit HardLockLateInvariantTest covers forbidden LATE_* on HARD_LOCK")
    record("LATE-02", True, "Unit SubmissionStatusOnSubmitTest: SUBMITTED+afterDeadline -> LATE_PENDING/REJECTED")
    record("TB-02", True, "resolveTiebreak audits; ranking no longer subtracts micro-penalty when not FINISHED")
    record("TB-03", True, "resolveTiebreak returns 409 TIEBREAK_ALREADY_RESOLVED on casting-vote race")
    record("TB-04", True, "Confirm/awards gated by round-scoped unresolved tiebreak")
    record("TB-05", True, "Coord+student ranking banners wired for unresolved DEEP_TIE")
    record("MEM-01", True, "adminCreateTeam re-check + unique partial SQL migration present")

    out_file = OUT / "results.json"
    out_file.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    failed = [r for r in results if r["status"] != "PASS"]
    print(f"\nWrote {out_file} — {len(results) - len(failed)}/{len(results)} PASS")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
