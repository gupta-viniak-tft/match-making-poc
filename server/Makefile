PROJECT_NAME := match-maker
COMPOSE := docker compose

.PHONY: build up down logs ps shell

build:
	$(COMPOSE) build

up:
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

shell:
	$(COMPOSE) exec db psql -U matchuser -d matchmaker

restart:
	$(COMPOSE) down && $(COMPOSE) up --build
