from fastapi import Depends
from sqlalchemy.orm import Session

from .db import get_db as _get_db


def get_db_session(db: Session = Depends(_get_db)) -> Session:
    return db
