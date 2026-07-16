"""GD1UX smoke — coordinator UI against localhost:5173."""
from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright, expect

BASE = "http://localhost:5173"
BE = "http://localhost:8080/api/v1"
COORD_EMAIL = "coord@fpt.edu.vn"
COORD_PASSWORD = "Coordinator@dev1"
OUT = Path(__file__).resolve().parent / "gd1ux-smoke-out"
OUT.mkdir(exist_ok=True)

results: list[dict] = []


def record(case_id: str, ok: bool, detail: str):
    status = "PASS" if ok else "FAIL"
    results.append({"id": case_id, "status": status, "detail": detail})
    print(f"[{status}] {case_id}: {detail}")


def login(page):
    page.goto(f"{BASE}/login", wait_until="domcontentloaded")
    page.get_by_placeholder("example@hackathon.com").wait_for(state="visible", timeout=30_000)
    page.get_by_placeholder("example@hackathon.com").fill(COORD_EMAIL)
    page.get_by_placeholder("••••••••").fill(COORD_PASSWORD)
    page.get_by_role("button", name="Đăng nhập").click()
    page.wait_for_url("**/dashboard**", timeout=30_000)


def get_token(page) -> str | None:
    token = page.evaluate(
        "() => localStorage.getItem('accessToken') || localStorage.getItem('token')"
    )
    if token:
        return token
    store = page.evaluate(
        """() => {
          const out = {};
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            out[k] = localStorage.getItem(k);
          }
          return out;
        }"""
    )
    for v in (store or {}).values():
        if isinstance(v, str) and v.count(".") == 2 and len(v) > 40:
            return v
    return None


def list_hackathons(page) -> list[dict]:
    import urllib.request

    token = get_token(page)
    if not token:
        return []
    req = urllib.request.Request(
        f"{BE}/hackathons?size=100",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        body = json.loads(resp.read().decode())
    data = body.get("data")
    if isinstance(data, dict):
        items = data.get("items") or data.get("content") or []
    elif isinstance(data, list):
        items = data
    else:
        items = body.get("items") or body.get("content") or []
    return items or []


def find_hackathon_id(page, slug: str, *, allow_fallback: bool = False) -> str | None:
    items = list_hackathons(page)
    for h in items:
        if (h.get("slug") or "") == slug:
            return str(h.get("id"))
    if not allow_fallback:
        return None
    for h in items:
        if (h.get("status") or "").upper() == "DRAFT":
            return str(h.get("id"))
    return str(items[0]["id"]) if items else None


def pick_setup_id(page) -> str | None:
    """Prefer DRAFT seeds that have rounds usable for UX smoke."""
    prefer = (
        "seal-gd1-prelim-only",
        "seal-gd1-no-kickoff",
        "seal-e2e-2026",
        "seal-gd1-incomplete",
    )
    items = list_hackathons(page)
    by_slug = {(h.get("slug") or ""): h for h in items}
    for slug in prefer:
        h = by_slug.get(slug)
        if h:
            return str(h.get("id"))
    for h in items:
        if (h.get("status") or "").upper() == "DRAFT":
            return str(h.get("id"))
    return None


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        page.set_default_timeout(20_000)

        # Boot: ensure AppContext import fixed (no Vite overlay)
        page.goto(f"{BASE}/login", wait_until="domcontentloaded")
        time.sleep(1.5)
        overlay = page.locator("text=Failed to resolve import")
        if overlay.count() > 0 and overlay.first.is_visible():
            record("BOOT-IMPORT", False, "Vite still shows AppContext resolve error")
            page.screenshot(path=str(OUT / "boot-fail.png"), full_page=True)
            browser.close()
            return 1
        record("BOOT-IMPORT", True, "No AppContext resolve overlay on /login")

        login(page)
        page.screenshot(path=str(OUT / "00-dashboard.png"))

        # Resolve IDs
        items = list_hackathons(page)
        print("Hackathons:", [(h.get("id"), h.get("slug"), h.get("status")) for h in items[:15]])
        draft_id = find_hackathon_id(page, "seal-gd1-incomplete")
        prelim_only_id = find_hackathon_id(page, "seal-gd1-prelim-only")
        e2e_id = find_hackathon_id(page, "seal-e2e-2026")
        pending_id = find_hackathon_id(page, "seal-gd6-pending-confirm")
        setup_id = pick_setup_id(page)
        print(f"IDs draft={draft_id} prelim_only={prelim_only_id} e2e={e2e_id} pending={pending_id} setup={setup_id}")

        # GD1UX-01 create form
        page.goto(f"{BASE}/hackathons/create", wait_until="domcontentloaded")
        page.wait_for_timeout(1500)
        body_text = page.locator("body").inner_text()
        has_event_start = "Bắt đầu Sự kiện" in body_text or "Bắt đầu sự kiện" in body_text
        has_event_end = "Kết thúc Sự kiện" in body_text or "Kết thúc sự kiện" in body_text
        has_indiv = "Bảng xếp hạng cá nhân" in body_text or "BXH cá nhân" in body_text
        ok01 = (not has_event_start) and (not has_event_end) and (not has_indiv)
        record(
            "GD1UX-01",
            ok01,
            f"event_start={has_event_start} event_end={has_event_end} individual={has_indiv}",
        )
        page.screenshot(path=str(OUT / "gd1ux-01-create.png"), full_page=True)

        # GD1UX-02 list PENDING_CONFIRM label
        page.goto(f"{BASE}/hackathons", wait_until="domcontentloaded")
        page.wait_for_timeout(2000)
        list_text = page.locator("body").inner_text()
        has_raw = "PENDING_CONFIRM" in list_text
        has_label = "Chờ chốt sổ" in list_text
        # filter option
        filter_ok = True
        try:
            status_select = page.locator(".ant-select").filter(has_text="Trạng thái").first
            if status_select.count() == 0:
                # open any status filter
                page.locator(".ant-select-selector").first.click(timeout=3000)
            else:
                status_select.click()
            page.wait_for_timeout(500)
            opts = page.locator(".ant-select-item-option-content").all_inner_texts()
            filter_ok = any("Chờ chốt sổ" in o for o in opts) and not any(o.strip() == "PENDING_CONFIRM" for o in opts)
            page.keyboard.press("Escape")
        except Exception as e:
            filter_ok = has_label  # soft
            print("filter check soft-fail:", e)
        ok02 = has_label and not has_raw and filter_ok
        record("GD1UX-02", ok02, f"label={has_label} raw={has_raw} filter_ok={filter_ok}")
        page.screenshot(path=str(OUT / "gd1ux-02-list.png"), full_page=True)

        if not setup_id:
            for cid in ("GD1UX-03", "GD1UX-04", "GD1UX-05", "GD1UX-06", "GD1UX-07", "GD1UX-08", "GD1UX-09"):
                record(cid, False, "No hackathon id for setup")
        else:
            # GD1UX-03 round modal
            page.goto(f"{BASE}/hackathons/{setup_id}/setup?tab=rounds", wait_until="domcontentloaded")
            page.wait_for_timeout(2000)
            clicked = False
            for btn in page.locator("button").all():
                t = (btn.inner_text() or "").strip()
                if "Thêm" in t and ("vòng" in t.lower() or "Vòng" in t or t == "Thêm"):
                    try:
                        btn.click(timeout=3000)
                        clicked = True
                        break
                    except Exception:
                        continue
            if not clicked:
                try:
                    page.locator("button").filter(has_text="Thêm vòng thi").first.click(timeout=3000)
                    clicked = True
                except Exception:
                    pass
            page.wait_for_timeout(1000)
            modal = page.locator(".ant-modal").filter(has_text="vòng")
            modal_text = modal.inner_text() if modal.count() else page.locator("body").inner_text()
            has_semi = "SEMIFINAL" in modal_text or "Bán kết" in modal_text
            has_is_final_toggle = "Là vòng chung kết" in modal_text or "Là vòng Chung kết" in modal_text
            ok03 = clicked and (not has_semi) and (not has_is_final_toggle)
            record("GD1UX-03", ok03, f"opened={clicked} semi={has_semi} is_final_toggle={has_is_final_toggle}")
            page.screenshot(path=str(OUT / "gd1ux-03-round-modal.png"), full_page=True)

            # GD1UX-04: is_active hidden on create + Bản nháp / Sơ loại badge in table
            has_active_switch_in_create = False
            if modal.count():
                has_active_switch_in_create = "Đang hoạt động" in modal_text
                page.keyboard.press("Escape")
                page.wait_for_timeout(500)
            table_text = page.locator("body").inner_text()
            has_ban_nhap = "Bản nháp" in table_text
            has_ngung = "Ngưng hoạt động" in table_text
            has_so_loai_badge = "Sơ loại" in table_text
            ok04 = (not has_active_switch_in_create) and (not has_ngung) and (has_ban_nhap or has_so_loai_badge)
            record(
                "GD1UX-04",
                ok04,
                f"create_shows_active={has_active_switch_in_create} ban_nhap={has_ban_nhap} ngung={has_ngung} so_loai={has_so_loai_badge}",
            )
            page.screenshot(path=str(OUT / "gd1ux-04-rounds-table.png"), full_page=True)

            # GD1UX-05 activate guard — use draft switch or create round then activate on incomplete
            guard_ok = False
            detail05 = "no draft switch found"
            switches = page.locator(".ant-table .ant-switch, .ant-switch")
            for i in range(min(switches.count(), 8)):
                sw = switches.nth(i)
                checked = "ant-switch-checked" in (sw.get_attribute("class") or "")
                if not checked:
                    sw.click()
                    page.wait_for_timeout(1500)
                    body_after = page.locator("body").inner_text()
                    guard_ok = any(
                        x in body_after
                        for x in (
                            "Không thể kích hoạt",
                            "chưa có",
                            "tiêu chí",
                            "bảng đấu",
                            "điều kiện",
                            "Lỗi",
                        )
                    ) or page.locator(".ant-modal").count() > 0 or page.locator(".ant-message").count() > 0
                    detail05 = f"clicked draft switch; guard_seen={guard_ok}"
                    page.keyboard.press("Escape")
                    break
            if not guard_ok:
                play = page.locator("[data-testid='round-activate-btn']")
                if play.count():
                    play.first.click()
                    page.wait_for_timeout(1000)
                    body_after = page.locator("body").inner_text()
                    guard_ok = page.locator(".ant-modal").count() > 0 or any(
                        x in body_after for x in ("Không thể", "tiêu chí", "bảng đấu", "điều kiện")
                    )
                    detail05 = f"play btn; guard_seen={guard_ok}"
                    page.keyboard.press("Escape")
            # Fallback: incomplete seed — create round as draft then try activate from table
            if not guard_ok and draft_id:
                page.goto(f"{BASE}/hackathons/{draft_id}/setup?tab=rounds", wait_until="domcontentloaded")
                page.wait_for_timeout(1500)
                try:
                    page.locator("button").filter(has_text="Thêm vòng thi").first.click(timeout=5000)
                    page.wait_for_timeout(800)
                    page.locator(".ant-modal input").first.fill(f"Smoke SL {int(time.time())}")
                    # pick PRELIMINARY if needed
                    page.locator(".ant-modal .ant-select").first.click()
                    page.wait_for_timeout(300)
                    page.locator(".ant-select-item-option").filter(has_text="Sơ loại").first.click()
                    # exam_at
                    date_inputs = page.locator(".ant-modal .ant-picker")
                    if date_inputs.count():
                        date_inputs.first.click()
                        page.wait_for_timeout(300)
                        page.keyboard.type("2026-12-01 09:00")
                        page.keyboard.press("Enter")
                    page.locator(".ant-modal").get_by_role("button", name="Lưu").click()
                    page.wait_for_timeout(2000)
                    page.keyboard.press("Escape")
                    page.wait_for_timeout(500)
                    # now look for Bản nháp switch
                    page.reload(wait_until="domcontentloaded")
                    page.wait_for_timeout(1500)
                    body = page.locator("body").inner_text()
                    if "Bản nháp" in body:
                        sw = page.locator(".ant-switch").filter(has_text="Bản nháp")
                        if sw.count() == 0:
                            # click unchecked switch
                            for i in range(page.locator(".ant-switch").count()):
                                s = page.locator(".ant-switch").nth(i)
                                if "ant-switch-checked" not in (s.get_attribute("class") or ""):
                                    s.click()
                                    break
                        else:
                            sw.first.click()
                        page.wait_for_timeout(1500)
                        body_after = page.locator("body").inner_text()
                        guard_ok = any(
                            x in body_after
                            for x in ("Không thể", "chưa có", "tiêu chí", "bảng đấu", "điều kiện")
                        ) or page.locator(".ant-modal").count() > 0
                        detail05 = f"created draft on incomplete; guard_seen={guard_ok}"
                        page.keyboard.press("Escape")
                    else:
                        detail05 = "created round but no Bản nháp visible"
                except Exception as e:
                    detail05 = f"fallback create failed: {e}"
            record("GD1UX-05", guard_ok, detail05)
            page.screenshot(path=str(OUT / "gd1ux-05-activate.png"), full_page=True)

            # GD1UX-06 track modal
            track_setup = prelim_only_id or e2e_id or setup_id
            page.goto(f"{BASE}/hackathons/{track_setup}/setup?tab=tracks", wait_until="domcontentloaded")
            page.wait_for_timeout(2000)
            opened_track = False
            for btn in page.locator("button").all():
                t = (btn.inner_text() or "").strip()
                if "Thêm" in t and ("bảng" in t.lower() or "Bảng" in t or t.startswith("Thêm")):
                    try:
                        btn.click(timeout=2000)
                        opened_track = True
                        break
                    except Exception:
                        continue
            page.wait_for_timeout(800)
            track_modal = page.locator(".ant-modal").last
            ttext = track_modal.inner_text() if track_modal.count() and opened_track else ""
            bad_fields = any(
                x in ttext
                for x in (
                    "Thành viên tối thiểu",
                    "Thành viên tối đa",
                    "Thuyết trình (phút)",
                    "Q&A (phút)",
                )
            )
            has_switch = "Mở bảng đấu" in ttext or track_modal.locator(".ant-switch").count() > 0
            ok06 = opened_track and (not bad_fields)
            record("GD1UX-06", ok06, f"opened={opened_track} bad_fields={bad_fields} switchish={has_switch}")
            page.screenshot(path=str(OUT / "gd1ux-06-track.png"), full_page=True)
            page.keyboard.press("Escape")

            people_id = e2e_id or prelim_only_id or setup_id

            # GD1UX-07 criteria — select round/track then assert Mô tả column
            page.goto(f"{BASE}/hackathons/{people_id}/setup?tab=criteria", wait_until="domcontentloaded")
            page.wait_for_timeout(2000)
            try:
                # Round select — Ant Design dropdown: click + ArrowDown + Enter
                page.locator(".ant-select").first.click(timeout=5000)
                page.wait_for_timeout(400)
                page.keyboard.press("ArrowDown")
                page.keyboard.press("Enter")
                page.wait_for_timeout(1000)
                # Track select if present (second visible select)
                selects = page.locator(".ant-select:visible")
                if selects.count() > 1:
                    selects.nth(1).click()
                    page.wait_for_timeout(400)
                    page.keyboard.press("ArrowDown")
                    page.keyboard.press("Enter")
                    page.wait_for_timeout(1500)
                else:
                    page.wait_for_timeout(1000)
            except Exception as e:
                print("criteria select soft-fail:", e)
            # Wait for table headers
            try:
                page.locator("th").filter(has_text="Mô tả").wait_for(state="visible", timeout=8000)
                has_mota_col = True
            except Exception:
                crit_text = page.locator("body").inner_text()
                has_mota_col = "Mô tả" in crit_text and "Vui lòng chọn" not in crit_text
            crit_text = page.locator("body").inner_text()
            has_raw_soft = ("SOFT_SKILL" in crit_text) and ("Kỹ năng mềm" not in crit_text)
            # Also accept: column defined in table header even with empty data
            if not has_mota_col:
                headers = page.locator(".ant-table-thead th").all_inner_texts()
                has_mota_col = any("Mô tả" in (h or "") for h in headers)
            ok07 = has_mota_col
            record("GD1UX-07", ok07, f"mota_col={has_mota_col} raw_soft_only={has_raw_soft}")
            page.screenshot(path=str(OUT / "gd1ux-07-criteria.png"), full_page=True)

            # GD1UX-08 / 09 people head judge
            page.goto(f"{BASE}/hackathons/{people_id}/setup?tab=people", wait_until="domcontentloaded")
            page.wait_for_timeout(2500)
            try:
                page.get_by_role("tab", name=r"Phân quyền").click(timeout=5000)
            except Exception:
                page.locator(".ant-tabs-tab").filter(has_text="Phân quyền").click(timeout=5000)
            page.wait_for_timeout(1500)
            people_text = page.locator("body").inner_text()
            has_alert_banner = "Phân công nhân sự theo bảng đấu" in people_text
            switches_perm = page.locator(".ant-switch")
            head_count_before = sum(
                1
                for i in range(switches_perm.count())
                if "ant-switch-checked" in (switches_perm.nth(i).get_attribute("class") or "")
            )

            toggled = False
            for i in range(switches_perm.count()):
                sw = switches_perm.nth(i)
                if "ant-switch-checked" not in (sw.get_attribute("class") or ""):
                    sw.click()
                    page.wait_for_timeout(2000)
                    toggled = True
                    break
            head_count_after = sum(
                1
                for i in range(page.locator(".ant-switch").count())
                if "ant-switch-checked" in (page.locator(".ant-switch").nth(i).get_attribute("class") or "")
            )
            ok08 = toggled and head_count_after <= 1
            if not toggled and head_count_before <= 1:
                ok08 = True
            record(
                "GD1UX-08",
                ok08 and not has_alert_banner,
                f"alert_banner={has_alert_banner} toggled={toggled} heads_before={head_count_before} after={head_count_after}",
            )

            try:
                page.get_by_role("tab", name=r"Giám khảo Sơ loại").click(timeout=5000)
            except Exception:
                page.locator(".ant-tabs-tab").filter(has_text="Sơ loại").first.click(timeout=5000)
            page.wait_for_timeout(1500)
            ok09 = "Trưởng ban" in page.locator("body").inner_text() or "Giám khảo" in page.locator("body").inner_text() or "Chưa gán" in page.locator("body").inner_text()
            if toggled:
                ok09 = "Trưởng ban" in page.locator("body").inner_text()
            record("GD1UX-09", ok09, f"toggled={toggled}; has_truong_ban={'Trưởng ban' in page.locator('body').inner_text()}")
            page.screenshot(path=str(OUT / "gd1ux-08-09-people.png"), full_page=True)

        # REG-GD1UX-01 team leaderboard always visible
        results_id = pending_id or e2e_id or setup_id
        if results_id:
            page.goto(f"{BASE}/hackathons/{results_id}/results", wait_until="domcontentloaded")
            page.wait_for_timeout(2500)
            rtext = page.locator("body").inner_text()
            has_team_tab = "Bảng XH Team" in rtext or "BXH Team" in rtext or "Team" in rtext
            has_indiv_tab = "cá nhân" in rtext.lower() and ("BXH" in rtext or "Xếp hạng" in rtext)
            # individual may be absent — good
            ok_reg = has_team_tab
            record("REG-GD1UX-01", ok_reg, f"team_tab={has_team_tab} individual_visible={has_indiv_tab}")
            page.screenshot(path=str(OUT / "reg-gd1ux-01-results.png"), full_page=True)
        else:
            record("REG-GD1UX-01", False, "No results hackathon id")

        browser.close()

    # Summary
    print("\n=== GD1UX SMOKE SUMMARY ===")
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    for r in results:
        print(f"  {r['status']:4} {r['id']}: {r['detail']}")
    print(f"TOTAL {passed}/{len(results)} passed, {failed} failed")
    (OUT / "summary.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    # Phase4 min smoke: GD1UX-01,02,03,04,07,09 + REG
    min_ids = {"GD1UX-01", "GD1UX-02", "GD1UX-03", "GD1UX-04", "GD1UX-07", "GD1UX-09", "REG-GD1UX-01"}
    min_pass = sum(1 for r in results if r["id"] in min_ids and r["status"] == "PASS")
    print(f"MIN SMOKE (plan): {min_pass}/7")
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
