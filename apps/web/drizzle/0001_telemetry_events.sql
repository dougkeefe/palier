CREATE TABLE "telemetry_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"correct" boolean NOT NULL,
	"response_ms" integer NOT NULL,
	"rest_bucket" smallint NOT NULL,
	"bank_version" integer NOT NULL,
	"received_on" date NOT NULL
);
