import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database.session import SessionLocal
from app.models.models import User
from app.core.security import verify_password, get_password_hash

db = SessionLocal()
users = db.query(User).all()
print("TOTAL USERS IN DB:", len(users))
for u in users:
    print(f"User: {u.username}, Role: {u.role}")
    valid = verify_password("mantenimiento123", u.hashed_password)
    print(f"Password check ('mantenimiento123'): {valid}")

db.close()
