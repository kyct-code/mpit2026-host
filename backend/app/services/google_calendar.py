from __future__ import annotations

import json
from datetime import date, timedelta
from typing import Optional
from urllib.parse import urlencode

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from app.core.config import settings
from app.models.event import Event
from app.models.user import User

SCOPES = ["https://www.googleapis.com/auth/calendar"]

_calendar_service = None


def _build_credentials():
    if settings.GOOGLE_SERVICE_ACCOUNT_JSON:
        info = json.loads(settings.GOOGLE_SERVICE_ACCOUNT_JSON)
        return service_account.Credentials.from_service_account_info(
            info,
            scopes=SCOPES,
        )

    if settings.GOOGLE_SERVICE_ACCOUNT_FILE:
        return service_account.Credentials.from_service_account_file(
            settings.GOOGLE_SERVICE_ACCOUNT_FILE,
            scopes=SCOPES,
        )

    return None


def _get_service():
    global _calendar_service
    if _calendar_service is not None:
        return _calendar_service

    if not settings.GOOGLE_CALENDAR_ENABLED:
        return None

    creds = _build_credentials()
    if creds is None:
        return None

    _calendar_service = build("calendar", "v3", credentials=creds, cache_discovery=False)
    return _calendar_service


def create_calendar_event_for_event(
    event: Event,
    owner: User,
) -> Optional[str]:
    """
    Create a Google Calendar event for our domain Event.

    Returns HTML link to the calendar event, if created.
    """
    if not settings.GOOGLE_CALENDAR_ENABLED:
        return None
    if not settings.GOOGLE_CALENDAR_ID:
        return None

    service = _get_service()
    if service is None:
        return None

    start_date: date = event.event_date or date.today()
    end_date = start_date + timedelta(days=1)

    summary = event.title
    description_parts: list[str] = []
    if event.format:
        description_parts.append(f"Формат: {event.format}")
    if event.guests_count is not None:
        description_parts.append(f"Гостей: {event.guests_count}")
    if event.budget is not None:
        description_parts.append(f"Бюджет: {event.budget} ₽")
    if event.notes:
        description_parts.append("")
        description_parts.append(event.notes)
    description = "\n".join(description_parts) if description_parts else ""

    body = {
        "summary": summary,
        "description": description or None,
        "start": {
            "date": start_date.isoformat(),
            "timeZone": settings.GOOGLE_TIMEZONE,
        },
        "end": {
            "date": end_date.isoformat(),
            "timeZone": settings.GOOGLE_TIMEZONE,
        },
    }

    created = (
        service.events()
        .insert(
            calendarId=settings.GOOGLE_CALENDAR_ID,
            body=body,
            sendUpdates="all",
        )
        .execute()
    )

    return created.get("htmlLink")


def build_google_calendar_invite_link(event: Event) -> Optional[str]:
    """
    Builds a Google Calendar "TEMPLATE" link that pre-fills guests (emails).
    """
    if not event.guest_emails:
        return None

    emails = [e.strip() for e in (event.guest_emails or "").split(",") if e.strip()]
    if not emails:
        return None

    start_date: date = event.event_date or date.today()
    end_date = start_date + timedelta(days=1)
    dates = f"{start_date.strftime('%Y%m%d')}/{end_date.strftime('%Y%m%d')}"

    details_parts: list[str] = []
    if event.format:
        details_parts.append(f"Формат: {event.format}")
    if event.guests_count is not None:
        details_parts.append(f"Гостей: {event.guests_count}")
    if event.budget is not None:
        details_parts.append(f"Бюджет: {event.budget} ₽")
    if event.notes:
        details_parts.append("")
        details_parts.append(event.notes)

    query = {
        "action": "TEMPLATE",
        "text": event.title,
        "dates": dates,
        "details": "\n".join(details_parts) if details_parts else "",
        "add": ",".join(emails),
        "ctz": settings.GOOGLE_TIMEZONE,
    }
    return "https://calendar.google.com/calendar/render?" + urlencode(query)


def diagnose_calendar_access() -> dict:
    out: dict = {
        "enabled": bool(settings.GOOGLE_CALENDAR_ENABLED),
        "calendar_id": settings.GOOGLE_CALENDAR_ID,
        "service_account_file": settings.GOOGLE_SERVICE_ACCOUNT_FILE,
        "service_account_json_present": bool(settings.GOOGLE_SERVICE_ACCOUNT_JSON),
    }

    service = _get_service()
    if service is None:
        out["service"] = "not_initialized"
        return out

    try:
        cal_list = service.calendarList().list(maxResults=50).execute()
        out["calendar_list_count"] = len(cal_list.get("items", []))
        out["calendar_list_ids"] = [c.get("id") for c in cal_list.get("items", []) if c.get("id")]
    except HttpError as e:
        out["calendar_list_error"] = str(e)
    except Exception as e:
        out["calendar_list_error"] = repr(e)

    return out