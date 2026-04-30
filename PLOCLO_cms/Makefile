# 1. Variables
PM = npm
# Using variables for Docker commands
BUILD_CMD = docker compose up -d --build
START_CMD = docker compose up -d
DOWN_CMD = docker compose down

# 2. Phony Targets
.PHONY: dev build start backend frontend service clean

# 3. New Target to match your request: 'service'
service:
	$(BUILD_CMD)
# OR if you want it to build and start:
# service:
# 	$(BUILD_CMD)

down:
	$(DOWN_CMD)

# 4. Main Targets
all: dev # 'make' defaults to 'dev'

dev: backend frontend
	@echo "Development environment is up and running."

backend:
	@echo "Installing and starting backend..."
	cd backend && $(PM) install
	cd backend && $(PM) run dev &

frontend:
	@echo "Installing and starting frontend..."
	cd frontend && $(PM) install
	cd frontend && $(PM) run dev &

build:
	@echo "Building production code..."
	cd backend && $(PM) install && $(PM) run build
	cd frontend && $(PM) install && $(PM) run build

start: build
	@echo "Starting production services..."
	cd backend && $(PM) run start &
	cd frontend && $(PM) run start &

# 5. Cleanup Target (Always good to include)
clean:
	@echo "Cleaning node modules and build directories..."
	rm -rf backend/node_modules frontend/node_modules
	rm -rf backend/dist frontend/.next