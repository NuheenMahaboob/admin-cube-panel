# backend/database.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 👇 This creates a SQLite database file called products.db
SQLALCHEMY_DATABASE_URL = "sqlite:///./products.db"

# 👇 This engine connects to the SQLite file
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# 👇 This lets us create sessions (like DB connections)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

