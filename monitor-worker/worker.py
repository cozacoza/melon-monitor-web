"""
멜론티켓 모니터 워커
- Supabase DB에서 활성 모니터링 목록을 읽어서
- 멜론 내부 API로 회차별 가격 체크
- 조건 충족 시 Discord 알림 + DB 상태 업데이트
"""

import os
import re
import time
import requests
from datetime import datetime, timezone

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

BASE_API = "https://tktapi.melon.com/api/product/schedule"

MELON_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "ko-KR,ko;q=0.9",
    "Referer": "https://ticket.melon.com/",
    "X-Requested-With": "XMLHttpRequest",
}

COMMON_PARAMS = {
    "pocCode": "SC0002",
    "perfTypeCode": "GN0002",
    "sellTypeCode": "ST0001",
    "seatCntDisplayYn": "N",
    "interlockTypeCode": "IL0002",
    "corpCodeNo": "",
    "reflashYn": "N",
    "requestservicetype": "P",
}

SB_HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}


# ─── Supabase ────────────────────────────────────────────────

def get_active_monitors():
    res = requests.get(
        f"{SUPABASE_URL}/rest/v1/monitors?status=eq.active&select=*",
        headers=SB_HEADERS, timeout=10
    )
    res.raise_for_status()
    return res.json()


def update_monitor(monitor_id, payload):
    requests.patch(
        f"{SUPABASE_URL}/rest/v1/monitors?id=eq.{monitor_id}",
        headers=SB_HEADERS, json=payload, timeout=10
    )


# ─── 멜론 API ────────────────────────────────────────────────

def melon_get(path, extra_params):
    params = {**COMMON_PARAMS, **extra_params}
    res = requests.get(f"{BASE_API}/{path}", params=params, headers=MELON_HEADERS, timeout=10)
    res.raise_for_status()
    return res.json().get("data", {})


def get_daylist(prod_id):
    return melon_get("daylist.json", {"prodId": prod_id}).get("perfDaylist") or []


def get_timelist(prod_id, perf_day):
    return melon_get("timelist.json", {"prodId": prod_id, "perfDay": perf_day}).get("perfTimelist") or []


def get_gradelist(prod_id, perf_day, schedule_no):
    return melon_get("gradelist.json", {
        "prodId": prod_id,
        "perfDay": perf_day,
        "scheduleNoArray": schedule_no,
        "seatPoc": "1",
        "cancelCloseDt": "",
    }).get("seatGradelist") or []


# ─── 날짜/시간 파싱 ──────────────────────────────────────────

def parse_target(target_datetime):
    """'2026-06-10 19:30' → ('20260610', '1930')"""
    if not target_datetime:
        return "", ""
    parts = target_datetime.strip().split()
    date_digits = re.sub(r"\D", "", parts[0])
    if len(date_digits) == 6:
        date_digits = "20" + date_digits
    time_digits = re.sub(r"\D", "", parts[1]) if len(parts) > 1 else ""
    return date_digits, time_digits.zfill(4)[:4] if time_digits else ""


# ─── Discord ─────────────────────────────────────────────────

def send_discord(webhook_url, title, concert_url, perf_day, perf_time, grades, matched, threshold):
    date_str  = f"{perf_day[:4]}-{perf_day[4:6]}-{perf_day[6:]}"
    time_str  = f"{perf_time[:2]}:{perf_time[2:]}" if len(perf_time) == 4 else ""
    round_str = f"{date_str} {time_str}".strip()
    now       = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    matched_str = ", ".join(f"{g['seatGradeName']} {int(g['basePrice']):,}원" for g in matched)
    all_str     = ", ".join(f"{g['seatGradeName']} {int(g['basePrice']):,}원" for g in grades)

    payload = {
        "content": f"@everyone 🔔 **{title}** [{round_str}] — {threshold:,}원 이상 티켓 발견!",
        "embeds": [{
            "title": f"🎟️ {title} [{round_str}] 티켓 감지!",
            "description": f"**{threshold:,}원 이상** 티켓이 발견됐어요!\n\n🔥 해당 티켓: **{matched_str}**\n지금 바로 확인하세요 👇",
            "color": 0xFF4500,
            "fields": [
                {"name": "🎭 공연명",    "value": title,    "inline": False},
                {"name": "🗓 날짜",      "value": date_str, "inline": True},
                {"name": "🕐 시간",      "value": time_str or "미정", "inline": True},
                {"name": "💰 전체 가격", "value": all_str,  "inline": False},
            ],
            "url": concert_url,
            "footer": {"text": f"멜론티켓 모니터 | {now}"},
        }],
    }

    r = requests.post(webhook_url, json=payload, timeout=10)
    r.raise_for_status()


# ─── 메인 체크 ───────────────────────────────────────────────

def check_monitor(monitor):
    prod_id        = monitor["prod_id"]
    title          = monitor.get("concert_title") or f"공연 {prod_id}"
    threshold      = monitor["price_threshold"]
    target_dt      = monitor.get("target_datetime") or ""
    webhook_url    = monitor["discord_webhook"]
    concert_url    = monitor["concert_url"]

    print(f"\n  [{title}] prodId={prod_id}, 기준={threshold:,}원, 회차={target_dt or '전체'}")

    target_date, target_time = parse_target(target_dt)

    daylist = get_daylist(prod_id)
    if not daylist:
        print("  → 날짜 목록 없음")
        return False

    if target_date:
        daylist = [d for d in daylist if d.get("perfDay") == target_date]
        if not daylist:
            print(f"  → 지정 날짜 {target_date} 없음")
            return False

    alerted = False
    for day in daylist:
        perf_day = day["perfDay"]
        timelist = get_timelist(prod_id, perf_day)
        if not timelist:
            continue

        if target_time:
            timelist = [t for t in timelist if t.get("perfTime") == target_time]

        for slot in timelist:
            schedule_no = slot["scheduleNo"]
            perf_time   = slot.get("perfTime", "")
            casting     = slot.get("casting", "")

            grades  = get_gradelist(prod_id, perf_day, schedule_no)
            matched = [g for g in grades if int(g["basePrice"]) >= threshold]

            date_str = f"{perf_day[:4]}-{perf_day[4:6]}-{perf_day[6:]}"
            time_str = f"{perf_time[:2]}:{perf_time[2:]}" if len(perf_time) == 4 else ""
            price_str = ", ".join(f"{g['seatGradeName']} {int(g['basePrice']):,}원" for g in grades)
            print(f"  [{date_str} {time_str}] {price_str}" + (f" | {casting}" if casting else ""))

            if matched:
                print(f"  🎯 조건 충족! → Discord 알림 전송")
                send_discord(webhook_url, title, concert_url, perf_day, perf_time, grades, matched, threshold)
                alerted = True

            time.sleep(0.3)

    return alerted


def main():
    print(f"[{datetime.now().strftime('%H:%M:%S')}] 워커 시작")

    monitors = get_active_monitors()
    print(f"활성 모니터링: {len(monitors)}개")

    for monitor in monitors:
        now_utc = datetime.now(timezone.utc).isoformat()
        try:
            alerted = check_monitor(monitor)
            update_monitor(monitor["id"], {
                "last_checked_at": now_utc,
                **({"status": "alerted", "last_alerted_at": now_utc} if alerted else {}),
            })
        except Exception as e:
            print(f"  [ERROR] {e}")
            update_monitor(monitor["id"], {"last_checked_at": now_utc})

    print(f"\n[{datetime.now().strftime('%H:%M:%S')}] 완료")


if __name__ == "__main__":
    main()
