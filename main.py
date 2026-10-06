import asyncio
import sqlite3
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from aiogram import Bot, Dispatcher, types
from aiogram.filters import Command
from aiogram.types import WebAppInfo, InlineKeyboardMarkup, InlineKeyboardButton

# === НАСТРОЙКИ ===
BOT_TOKEN = "8243427759:AAHYp6BWrjCRRGdEarYrtloLsMSVGeC1P3I"
WEB_APP_URL = "https://amirhanhabiev75-beep.github.io/football-career/"

# Инициализация БД
def init_db():
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS players (
            telegram_id INTEGER PRIMARY KEY,
            name TEXT,
            age INTEGER,
            ovr INTEGER,
            goals INTEGER,
            club TEXT
        )
    """)
    conn.commit()
    conn.close()

init_db()

# Инициализация бота
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

@dp.message(Command("start"))
async def start_cmd(message: types.Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="⚽ Играть в симулятор", web_app=WebAppInfo(url=WEB_APP_URL))]
    ])
    await message.answer("Привет! Нажми кнопку ниже, чтобы начать футбольную карьеру:", reply_markup=kb)

# FastAPI без блокирующего lifespan
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Запускаем поллинг бота в отдельном независимом фоновом потоке
    asyncio.create_task(run_bot())

async def run_bot():
    try:
        await bot.delete_webhook(drop_pending_updates=True)
        print(">>> Webhook Manybot успешно удален! <<<")
        await dp.start_polling(bot)
    except Exception as e:
        print(f">>> Ошибка связи с Telegram: {e} <<<")

class PlayerData(BaseModel):
    telegram_id: int
    name: str
    age: int
    ovr: int
    goals: int
    club: str

@app.get("/player/{telegram_id}")
def get_player(telegram_id: int):
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute("SELECT name, age, ovr, goals, club FROM players WHERE telegram_id = ?", (telegram_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {"name": row[0], "age": row[1], "ovr": row[2], "goals": row[3], "club": row[4]}
    return {"error": "Not found"}

@app.post("/save")
def save_player(player: PlayerData):
    conn = sqlite3.connect("database.db")
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO players (telegram_id, name, age, ovr, goals, club)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(telegram_id) DO UPDATE SET
            age=excluded.age, ovr=excluded.ovr, goals=excluded.goals, club=excluded.club
    """, (player.telegram_id, player.name, player.age, player.ovr, player.goals, player.club))
    conn.commit()
    conn.close()
    return {"status": "ok"}