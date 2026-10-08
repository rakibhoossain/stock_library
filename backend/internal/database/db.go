package database

import (
	"log"
	"time"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"stock_library/backend/internal/config"
)

func Connect(cfg *config.Config) (*sqlx.DB, error) {
	db, err := sqlx.Connect("postgres", cfg.DSN())
	if err != nil {
		return nil, err
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(10)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		return nil, err
	}

	log.Printf("Successfully connected to PostgreSQL at %s:%s (db: %s)", cfg.DBHost, cfg.DBPort, cfg.DBName)
	return db, nil
}
