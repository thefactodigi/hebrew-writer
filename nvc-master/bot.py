"""NVC Master — בוט טלגרם מומחה לתקשורת מקרבת, מבוסס Claude.

הבוט טוען את סקיל ה-NVC (skill/) כ-system prompt, שומר היסטוריית שיחה
לכל צ'אט, ועונה בעברית בסגנון של מנחה בכיר לתקשורת מקרבת.
"""

import json
import logging
import os
from pathlib import Path

import anthropic
from dotenv import load_dotenv
from telegram import Update
from telegram.constants import ChatAction
from telegram.ext import (
    Application,
    CommandHandler,
    ContextTypes,
    MessageHandler,
    filters,
)

load_dotenv()

logging.basicConfig(
    format="%(asctime)s %(name)s %(levelname)s %(message)s", level=logging.INFO
)
logging.getLogger("httpx").setLevel(logging.WARNING)
log = logging.getLogger("nvc-master")

BASE_DIR = Path(__file__).parent
SKILL_DIR = BASE_DIR / "skill"
HISTORY_FILE = BASE_DIR / "histories.json"

MODEL = os.environ.get("CLAUDE_MODEL", "claude-opus-5")
# מספר ההודעות (משתמש + בוט) שנשמרות בהקשר של כל צ'אט
MAX_HISTORY_MESSAGES = int(os.environ.get("MAX_HISTORY_MESSAGES", "60"))
# אורך הודעה מקסימלי בטלגרם הוא 4096 תווים
TELEGRAM_CHUNK = 4000

TELEGRAM_FRAMING = """\
# הקשר: אתה בוט טלגרם

אתה מדבר עם המשתמש בצ'אט טלגרם אישי. המשתמש משתף אותך בהתלבטויות, ריבים,
רגשות והודעות שהוא רוצה לנסח, ואתה עונה כמו מנחה בכיר לתקשורת מקרבת.

התאם את עצמך למדיום:
- תשובות באורך של הודעת צ'אט: קצרות וממוקדות. עדיף שתי הודעות קצרות בשיחה
  מתגלגלת מאשר מסה אחת ארוכה.
- בלי עיצוב Markdown (בלי כוכביות, סולמיות או כותרות). טקסט רגיל בלבד,
  אפשר רשימות פשוטות עם מקף כשזה באמת עוזר.
- זו שיחה מתמשכת: זכור מה סופר קודם, ואל תפתח כל תשובה מהתחלה.

ההנחיות המלאות שלך כמומחה לתקשורת מקרבת:
"""


def _strip_frontmatter(text: str) -> str:
    if text.startswith("---"):
        end = text.find("\n---", 3)
        if end != -1:
            return text[end + 4 :].lstrip("\n")
    return text


def build_system_prompt() -> str:
    parts = [TELEGRAM_FRAMING]
    parts.append(_strip_frontmatter((SKILL_DIR / "SKILL.md").read_text(encoding="utf-8")))
    for name in ("feelings-and-needs.md", "deep-processes.md", "worked-examples.md"):
        ref = (SKILL_DIR / "references" / name).read_text(encoding="utf-8")
        parts.append(f"\n\n---\n\n# חומר עזר ({name})\n\n{ref}")
    return "\n".join(parts)


SYSTEM_PROMPT = build_system_prompt()

client = anthropic.AsyncAnthropic()


def load_histories() -> dict[str, list]:
    if HISTORY_FILE.exists():
        try:
            return json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            log.warning("histories.json corrupt, starting fresh")
    return {}


histories: dict[str, list] = load_histories()


def save_histories() -> None:
    HISTORY_FILE.write_text(
        json.dumps(histories, ensure_ascii=False), encoding="utf-8"
    )


def allowed_user_ids() -> set[int]:
    raw = os.environ.get("TELEGRAM_ALLOWED_USER_IDS", "").strip()
    ids = set()
    for x in raw.replace(" ", "").split(","):
        if not x:
            continue
        if x.lstrip("-").isdigit():
            ids.add(int(x))
        else:
            log.warning(
                "TELEGRAM_ALLOWED_USER_IDS: מתעלם מ-%r — צריך מזהה מספרי "
                "(קבל אותו מ-@userinfobot), לא שם משתמש", x
            )
    return ids


ALLOWED_IDS = allowed_user_ids()


def is_allowed(update: Update) -> bool:
    if not ALLOWED_IDS:
        return True
    return update.effective_user is not None and update.effective_user.id in ALLOWED_IDS


async def ask_claude(chat_id: int, user_text: str) -> str:
    history = histories.setdefault(str(chat_id), [])
    history.append({"role": "user", "content": user_text})

    response = await client.beta.messages.create(
        model=MODEL,
        max_tokens=16000,
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        system=[
            {
                "type": "text",
                "text": SYSTEM_PROMPT,
                "cache_control": {"type": "ephemeral"},
            }
        ],
        messages=history,
    )

    if response.stop_reason == "refusal":
        history.pop()
        return "מצטער, אני לא יכול לעזור עם הבקשה הזאת. אפשר לנסות לנסח אחרת?"

    reply = "\n".join(b.text for b in response.content if b.type == "text").strip()
    if not reply:
        history.pop()
        return "לא הצלחתי לנסח תשובה, נסה שוב."

    history.append({"role": "assistant", "content": reply})
    # שומרים רק את הזנב האחרון של השיחה כדי לא לנפח עלויות
    if len(history) > MAX_HISTORY_MESSAGES:
        del history[: len(history) - MAX_HISTORY_MESSAGES]
    save_histories()
    return reply


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_allowed(update):
        return
    await update.message.reply_text(
        "היי, אני כאן בשבילך. אפשר לשתף אותי בהתלבטות, בריב, בהודעה שקשה לנסח, "
        "או בכל דבר שיושב לך על הלב, ונחשוב על זה יחד דרך תקשורת מקרבת.\n\n"
        "פקודות: /reset מתחיל שיחה נקייה."
    )


async def cmd_reset(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_allowed(update):
        return
    histories.pop(str(update.effective_chat.id), None)
    save_histories()
    await update.message.reply_text("התחלנו מחדש. מה על הלב?")


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not is_allowed(update) or not update.message or not update.message.text:
        return
    chat_id = update.effective_chat.id
    await context.bot.send_chat_action(chat_id=chat_id, action=ChatAction.TYPING)

    try:
        reply = await ask_claude(chat_id, update.message.text)
    except anthropic.AuthenticationError:
        reply = "בעיית התחברות ל-API של Anthropic. בדוק את ANTHROPIC_API_KEY."
    except anthropic.RateLimitError:
        reply = "יש עומס רגעי, נסה שוב בעוד דקה."
    except anthropic.APIStatusError as e:
        log.error("API error %s: %s", e.status_code, e.message)
        reply = "משהו השתבש מולי, נסה שוב בעוד רגע."
    except anthropic.APIConnectionError:
        reply = "בעיית רשת מול השרת, נסה שוב בעוד רגע."

    for i in range(0, len(reply), TELEGRAM_CHUNK):
        await update.message.reply_text(reply[i : i + TELEGRAM_CHUNK])


def main() -> None:
    token = os.environ.get("TELEGRAM_BOT_TOKEN")
    if not token:
        raise SystemExit("חסר TELEGRAM_BOT_TOKEN בקובץ .env")
    if not (os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN")):
        log.warning("ANTHROPIC_API_KEY לא מוגדר; ה-SDK ינסה מקורות אחרים (ant auth)")

    app = Application.builder().token(token).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("reset", cmd_reset))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    log.info("NVC Master is up (model=%s)", MODEL)
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()
