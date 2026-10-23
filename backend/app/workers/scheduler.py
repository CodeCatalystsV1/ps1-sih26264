from apscheduler.schedulers.background import BackgroundScheduler
from backend.app.core.database import SessionLocal
from backend.app.core.config import settings
from backend.app.services.deadline_service import evaluate_case_deadlines

scheduler = BackgroundScheduler()

def scheduled_deadline_check():
    db = SessionLocal()
    try:
        evaluate_case_deadlines(db)
    except Exception as e:
        print(f"Error during scheduled deadline check: {e}")
    finally:
        db.close()

def start_scheduler():
    if settings.ENABLE_SCHEDULER:
        scheduler.add_job(
            scheduled_deadline_check,
            'interval',
            minutes=settings.DEADLINE_CHECK_INTERVAL_MINUTES,
            id='deadline_monitor',
            replace_existing=True
        )
        scheduler.start()
        print(f"AICTE ICMS Deadline Scheduler started (Interval: {settings.DEADLINE_CHECK_INTERVAL_MINUTES} min)")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()
