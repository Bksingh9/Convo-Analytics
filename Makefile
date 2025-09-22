.PHONY: dev stop backend dashboard models

dev:
	cd backend && uvicorn app.main:app --reload & \
	cd dashboard && npm run dev & \
	wait

stop:
	pkill -f "uvicorn app.main:app" || true

models:
	@echo "Whisper models are downloaded on-demand by faster-whisper. No-op."

backend:
	cd backend && uvicorn app.main:app --reload

dashboard:
	cd dashboard && npm run dev
